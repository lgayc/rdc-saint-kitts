/**
 * ============================================================
 *  EDGE FUNCTION · book
 * ============================================================
 *  Único camino por el que entra una reserva.
 *
 *  El navegador NO escribe en la base de datos. Manda aquí, y esta
 *  función valida, guarda con la service_role key y avisa por los
 *  tres canales. Se hizo así, y no dejando que el formulario
 *  inserte directo por PostgREST, por tres razones:
 *
 *    1. Para insertar desde el navegador, `bookings` necesitaría
 *       una política de INSERT pública. Una política mal escrita
 *       ahí expone datos de pacientes, y es un error fácil de
 *       cometer y difícil de notar.
 *    2. La validación del servidor deja de ser opcional. No hay
 *       ninguna ruta que la esquive.
 *    3. El freno anti-spam vive en un solo sitio.
 *
 *  Resultado: `bookings` no tiene ninguna política para anon. Ni
 *  de lectura ni de escritura. Desde el navegador esa tabla,
 *  sencillamente, no existe.
 *
 *  ------------------------------------------------------------
 *  DESPLIEGUE
 *      supabase functions deploy book
 *
 *  Se despliega con verify_jwt activado (el valor por defecto).
 *  El sitio manda la anon key, que es un JWT válido y es pública
 *  por diseño. Así una petición sin ninguna clave se rechaza antes
 *  de llegar a este código.
 * ============================================================
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, corsHeaders } from "../_shared/cors.ts";
import {
  type Booking,
  createCalendarEvent,
  sendEmail,
  sendWhatsApp,
} from "../_shared/notify.ts";

/** Tope de reservas por correo dentro de la ventana. */
const MAX_PER_EMAIL = Number(Deno.env.get("MAX_BOOKINGS_PER_EMAIL") ?? "3");
const WINDOW_MINUTES = Number(Deno.env.get("RATE_LIMIT_WINDOW_MINUTES") ?? "30");
/** Tope por IP en la misma ventana. Más alto: una familia o una
 *  oficina pueden compartir salida a internet legítimamente. */
const MAX_PER_IP = Number(Deno.env.get("MAX_BOOKINGS_PER_IP") ?? "10");

/** Longitudes máximas. Sin esto, alguien puede mandar un megabyte
 *  de texto en "notes" y llenar la base de datos. */
const LIMITS = {
  full_name: 120,
  phone: 40,
  email: 200,
  modality: 120,
  preferred_time: 20,
  notes: 2000,
};


/* ------------------------------------------------------------
   VALIDACIÓN
   ------------------------------------------------------------
   Repite la del navegador (js/booking.js) a propósito. La del
   navegador es comodidad para el paciente; esta es la que de
   verdad protege, porque cualquiera puede saltarse el formulario
   y llamar a esta URL directamente.
   ------------------------------------------------------------ */

interface Incoming {
  fullName?: string;
  phone?: string;
  email?: string;
  modality?: string;
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
  website?: string; // trampa anti-bots
}

function validate(d: Incoming): string[] {
  const errors: string[] = [];

  if (!d.fullName || d.fullName.trim().length < 3) {
    errors.push("El nombre es obligatorio.");
  }

  const digits = String(d.phone ?? "").replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    errors.push("El teléfono es obligatorio y debe ser válido.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(d.email ?? "").trim())) {
    errors.push("El correo es obligatorio y debe ser válido.");
  }

  if (!d.modality?.trim()) errors.push("Falta seleccionar el estudio.");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.preferredDate ?? ""))) {
    errors.push("Falta la fecha o su formato no es válido.");
  } else {
    // Se compara contra la fecha de hoy en UTC. La clínica está en
    // UTC-4 sin horario de verano, así que como mucho esto acepta
    // una reserva para "ayer por la noche" durante unas horas. Es
    // preferible a rechazar por error una del día correcto.
    const chosen = new Date(`${d.preferredDate}T00:00:00Z`);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (Number.isNaN(chosen.getTime())) {
      errors.push("La fecha no es válida.");
    } else if (chosen < today) {
      errors.push("La fecha ya pasó.");
    }
  }

  if (!/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(String(d.preferredTime ?? "").trim())) {
    errors.push("Falta la hora o su formato no es válido.");
  }

  for (const [field, max] of Object.entries(LIMITS)) {
    const key = field === "full_name"
      ? "fullName"
      : field === "preferred_time"
      ? "preferredTime"
      : field;
    const value = (d as Record<string, unknown>)[key];
    if (typeof value === "string" && value.length > max) {
      errors.push(`El campo ${field} es demasiado largo.`);
    }
  }

  return errors;
}


/* ------------------------------------------------------------
   HANDLER
   ------------------------------------------------------------ */

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Método no permitido." }, 405, origin);
  }

  let body: Incoming;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Cuerpo JSON no válido." }, 400, origin);
  }

  // Trampa anti-bots: el formulario lleva un campo oculto que una
  // persona nunca ve ni rellena. Si viene con algo, es un robot.
  // Se responde "ok" para no enseñarle que fue detectado, pero no
  // se guarda ni se avisa de nada.
  if (body.website && body.website.trim() !== "") {
    return jsonResponse({ ok: true, ref: "IGNORED" }, 200, origin);
  }

  const errors = validate(body);
  if (errors.length) {
    return jsonResponse({ ok: false, error: errors.join(" ") }, 400, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    return jsonResponse(
      { ok: false, error: "El servidor no está configurado." },
      500,
      origin,
    );
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const email = body.email!.trim().toLowerCase();
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

  /* --- Freno anti-spam ---------------------------------------
     La tabla acepta reservas sin cuenta, que es lo correcto: un
     paciente no debería registrarse para pedir una cita. El precio
     es que alguien podría lanzar cientos de reservas falsas y
     llenar de avisos el WhatsApp de la clínica.

     Si esto se queda corto algún día, el siguiente paso natural es
     un captcha en el formulario, no bajar más estos números.
     ----------------------------------------------------------- */
  try {
    const { count: byEmail } = await db
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", since);

    if ((byEmail ?? 0) >= MAX_PER_EMAIL) {
      return jsonResponse(
        {
          ok: false,
          error:
            "Ya recibimos varias solicitudes desde este correo. Espera unos minutos o llámanos directamente.",
        },
        429,
        origin,
      );
    }

    if (ip) {
      const { count: byIp } = await db
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("source_ip", ip)
        .gte("created_at", since);

      if ((byIp ?? 0) >= MAX_PER_IP) {
        return jsonResponse(
          { ok: false, error: "Demasiadas solicitudes. Inténtalo más tarde." },
          429,
          origin,
        );
      }
    }
  } catch (err) {
    // Si la comprobación falla, se deja pasar la reserva. Un freno
    // roto no puede ser motivo para rechazar a un paciente real.
    console.error("Freno anti-spam no disponible:", err);
  }

  /* --- Guardar ------------------------------------------------ */
  const { data: saved, error: insertError } = await db
    .from("bookings")
    .insert({
      full_name: body.fullName!.trim(),
      phone: body.phone!.trim(),
      email,
      modality: body.modality!.trim(),
      preferred_date: body.preferredDate,
      preferred_time: body.preferredTime!.trim().toUpperCase(),
      notes: body.notes?.trim() || null,
      source_ip: ip,
    })
    .select("id, ref, full_name, phone, email, modality, preferred_date, preferred_time, notes")
    .single();

  if (insertError || !saved) {
    console.error("No se pudo guardar la reserva:", insertError);
    return jsonResponse(
      {
        ok: false,
        error: "No pudimos registrar tu solicitud. Por favor llámanos.",
      },
      500,
      origin,
    );
  }

  /* --- Avisar -------------------------------------------------
     A partir de aquí la reserva YA está guardada. Pase lo que pase
     con los avisos, la respuesta al paciente es de éxito: su cita
     está pedida.

     Los tres canales van en paralelo y con allSettled, así que uno
     lento no retrasa a los otros y uno que falle no cancela nada.
     ------------------------------------------------------------ */
  const booking = saved as Booking;

  const [emailRes, waRes, calRes] = await Promise.all([
    sendEmail(booking).catch((e) => ({ ok: false, error: String(e) })),
    sendWhatsApp(booking).catch((e) => ({ ok: false, error: String(e) })),
    createCalendarEvent(booking).catch((e) => ({ ok: false, error: String(e) })),
  ]);

  const problems = [
    emailRes.ok ? null : `correo: ${emailRes.error}`,
    waRes.ok ? null : `whatsapp: ${waRes.error}`,
    calRes.ok ? null : `calendar: ${calRes.error}`,
  ].filter(Boolean);

  if (problems.length) {
    console.error(`Avisos con problemas para ${saved.ref}:`, problems.join(" | "));
  }

  // Se anota qué salió y qué no, para que el panel lo muestre. Si
  // esta actualización falla, no se toca la respuesta: la reserva
  // está guardada y eso es lo que importa.
  await db
    .from("bookings")
    .update({
      notified_email: emailRes.ok,
      notified_whatsapp: waRes.ok,
      notified_calendar: calRes.ok,
      calendar_event_id: (calRes as { eventId?: string }).eventId ?? null,
      notify_error: problems.length ? problems.join(" | ") : null,
    })
    .eq("id", saved.id);

  return jsonResponse(
    {
      ok: true,
      ref: saved.ref,
      notified: {
        email: emailRes.ok,
        whatsapp: waRes.ok,
        calendar: calRes.ok,
      },
    },
    200,
    origin,
  );
});
