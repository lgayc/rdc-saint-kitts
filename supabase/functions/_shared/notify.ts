/**
 * ============================================================
 *  AVISOS DE RESERVA  ·  correo · WhatsApp · Google Calendar
 * ============================================================
 *  Los tres canales viven aquí. La regla que los gobierna a todos:
 *
 *      LA RESERVA YA ESTÁ GUARDADA CUANDO ESTO SE EJECUTA.
 *
 *  Ninguna función de este archivo lanza excepciones hacia arriba.
 *  Todas devuelven { ok, error }. Si Gmail está caído, la reserva
 *  no se pierde: se guarda igual y el panel muestra que ese aviso
 *  no salió. Perder una reserva es mucho peor que no avisar de
 *  ella a tiempo.
 * ============================================================
 */

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

export interface Booking {
  ref: string;
  full_name: string;
  phone: string;
  email: string;
  modality: string;
  preferred_date: string; // YYYY-MM-DD
  preferred_time: string; // "2:00 PM"
  notes?: string | null;
}

export interface NotifyResult {
  ok: boolean;
  error?: string;
  eventId?: string;
}

const CLINIC_NAME = Deno.env.get("CLINIC_NAME") ?? "RDC Saint Kitts";
const CLINIC_TZ = Deno.env.get("CLINIC_TIMEZONE") ?? "America/St_Kitts";

/**
 * Resumen completo de la reserva.
 *
 * Se usa en el CORREO y en el evento del CALENDARIO, que van a
 * cuentas de Google de la propia clínica. NO se usa en el WhatsApp:
 * ese sale hacia un tercero y solo lleva el código. Ver la sección 2.
 */
export function buildSummary(b: Booking): string {
  return [
    `NUEVA RESERVA · ${CLINIC_NAME}`,
    "",
    `Código:   ${b.ref}`,
    `Nombre:   ${b.full_name}`,
    `Teléfono: ${b.phone}`,
    `Email:    ${b.email}`,
    `Estudio:  ${b.modality}`,
    `Fecha:    ${b.preferred_date}`,
    `Hora:     ${b.preferred_time}`,
    `Notas:    ${b.notes?.trim() || "-"}`,
    "",
    "Revisar y confirmar en el panel de administración.",
  ].join("\n");
}


/* ============================================================
   1. CORREO  (SMTP de Gmail)
   ============================================================
   Se usa SMTP y no la API de Gmail a propósito: una App Password
   se saca en dos minutos y no caduca, mientras que la API exige
   pasar por OAuth y renovar tokens.

   La App Password NO es la contraseña de la cuenta. Se genera en
   myaccount.google.com/apppasswords y requiere tener la
   verificación en dos pasos activada. Ver backend/SUPABASE.md.
   ============================================================ */

export async function sendEmail(b: Booking): Promise<NotifyResult> {
  const host = Deno.env.get("SMTP_HOST") ?? "smtp.gmail.com";
  const port = Number(Deno.env.get("SMTP_PORT") ?? "465");
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASS");
  const to = Deno.env.get("NOTIFY_EMAIL_TO");

  if (!user || !pass || !to) {
    return { ok: false, error: "Faltan SMTP_USER, SMTP_PASS o NOTIFY_EMAIL_TO" };
  }

  const client = new SMTPClient({
    connection: {
      hostname: host,
      port,
      tls: port === 465, // 465 = TLS directo; 587 = STARTTLS
      auth: { username: user, password: pass },
    },
  });

  try {
    await client.send({
      from: `${CLINIC_NAME} <${user}>`,
      to: to.split(",").map((s) => s.trim()).filter(Boolean),
      // Que el personal pueda darle a "Responder" y escribirle
      // directamente al paciente, sin copiar la dirección a mano.
      replyTo: b.email,
      subject: `Nueva reserva · ${b.full_name} (${b.modality}) · ${b.ref}`,
      content: buildSummary(b),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `SMTP: ${String(err)}` };
  } finally {
    // Sin esto la conexión queda abierta y la función tarda en
    // cerrarse o se corta por timeout.
    try {
      await client.close();
    } catch {
      // Cerrar es de limpieza: si falla, ya da igual.
    }
  }
}


/* ============================================================
   2. WHATSAPP
   ============================================================
   Dos vías, y se elige sola: si están los secretos de la API
   oficial de Meta se usa esa; si no, se cae a CallMeBot.

   POR QUÉ DOS
   La oficial es la correcta para una clínica: permite uso
   comercial, hay un acuerdo de tratamiento de datos y hay a quién
   reclamar. Pero darla de alta lleva su tiempo — verificar el
   negocio con Meta y que aprueben la plantilla no es cosa de un
   rato. CallMeBot deja el aviso funcionando mientras tanto, y en
   cuanto se pongan los secretos de Meta el cambio es automático:
   no hay que tocar ni redesplegar nada.

   >>> NINGUNA DE LAS DOS MANDA NOMBRE, TELÉFONO NI CORREO. <<<

   Va el código, el estudio, la fecha y la hora: lo justo para
   saber si hay que moverse ya o puede esperar. Quién es el
   paciente se mira en el panel, detrás de sesión y de RLS.

   No es paranoia: es el principio de mínimo necesario. Un WhatsApp
   acaba en el móvil personal de alguien, se reenvía, se ve en la
   pantalla de bloqueo y se queda en copias de seguridad que nadie
   controla. El estudio y la hora no identifican a nadie; el nombre
   junto al estudio, sí.

   Si la clínica decide que quiere el detalle completo, es cambiar
   la plantilla en Meta y los parámetros de abajo. Que sea una
   decisión suya y consciente, no el valor por defecto.
   ============================================================ */

export async function sendWhatsApp(b: Booking): Promise<NotifyResult> {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const destinatarios = Deno.env.get("WHATSAPP_TO");

  if (token && phoneNumberId && destinatarios) {
    return await sendViaCloudApi(b, token, phoneNumberId, destinatarios);
  }

  return await sendViaCallMeBot(b);
}


/* --- Vía oficial: WhatsApp Cloud API de Meta ----------------
   Un aviso que sale de la clínica sin que el destinatario haya
   escrito antes es un mensaje "business-initiated", y Meta solo
   los permite con una PLANTILLA APROBADA de antemano. No se puede
   mandar texto libre: hay que registrar la plantilla, esperar la
   aprobación, y luego rellenar sus huecos.

   Por eso el mensaje va como `type: "template"` y los cuatro
   valores viajan como parámetros posicionales, en el mismo orden
   que los {{1}}..{{4}} de la plantilla registrada. El texto exacto
   a registrar está en backend/SUPABASE.md, sección 5b.

   Categoría "utility", que es la barata: son mensajes ligados a
   una acción del cliente, no promoción.
   ------------------------------------------------------------ */

async function sendViaCloudApi(
  b: Booking,
  token: string,
  phoneNumberId: string,
  destinatarios: string,
): Promise<NotifyResult> {
  const version = Deno.env.get("WHATSAPP_API_VERSION") ?? "v23.0";
  const template = Deno.env.get("WHATSAPP_TEMPLATE_NAME") ?? "nueva_reserva";
  const lang = Deno.env.get("WHATSAPP_TEMPLATE_LANG") ?? "es";

  const numeros = destinatarios.split(",").map((s) => s.trim()).filter(Boolean);
  if (!numeros.length) {
    return { ok: false, error: "WHATSAPP_TO está vacío" };
  }

  // Meta rechaza parámetros con saltos de línea, tabulaciones o
  // varios espacios seguidos. Se limpian antes de enviar para que
  // un dato raro no tumbe el aviso entero.
  const limpio = (s: string) => s.replace(/\s+/g, " ").trim();

  const parametros = [b.ref, b.modality, b.preferred_date, b.preferred_time]
    .map((v) => ({ type: "text", text: limpio(String(v ?? "-")) || "-" }));

  const fallos: string[] = [];

  for (const numero of numeros) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: numero,
            type: "template",
            template: {
              name: template,
              language: { code: lang },
              components: [{ type: "body", parameters: parametros }],
            },
          }),
          signal: AbortSignal.timeout(15_000),
        },
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // El mensaje de error de Meta es especifico y util
        // ("plantilla no aprobada", "numero no valido"): se
        // guarda tal cual para que el panel lo muestre.
        fallos.push(
          `${numero}: ${res.status} ${data?.error?.message ?? "sin detalle"}`,
        );
      }
    } catch (err) {
      fallos.push(`${numero}: ${String(err)}`);
    }
  }

  return fallos.length
    ? { ok: false, error: `WhatsApp Cloud API — ${fallos.join(" | ")}` }
    : { ok: true };
}


/* --- Respaldo temporal: CallMeBot ---------------------------
   Gratuito y sin registro, pero su propia documentación dice que
   la API gratuita es SOLO PARA USO PERSONAL. Una clínica no lo
   es, así que esto es un puente mientras llega la aprobación de
   Meta, no un destino. Puede dejar de funcionar cualquier día sin
   aviso y sin nadie a quien reclamar.

   Si se corta, no se pierde nada importante: la reserva ya está
   guardada, el correo sale igual, y el panel marca en ámbar que
   este canal falló.
   ------------------------------------------------------------ */

async function sendViaCallMeBot(b: Booking): Promise<NotifyResult> {
  const phone = Deno.env.get("CALLMEBOT_PHONE");
  const apikey = Deno.env.get("CALLMEBOT_APIKEY");

  if (!phone || !apikey) {
    return {
      ok: false,
      error:
        "WhatsApp sin configurar: faltan los secretos de Meta " +
        "(WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TO) " +
        "y tampoco hay CallMeBot de respaldo",
    };
  }

  const aviso = [
    `${CLINIC_NAME}`,
    `Nueva reserva: ${b.ref}`,
    `${b.modality} · ${b.preferred_date} · ${b.preferred_time}`,
    "Ábrela en el panel de administración.",
  ].join("\n");

  const url = "https://api.callmebot.com/whatsapp.php"
    + `?phone=${encodeURIComponent(phone)}`
    + `&text=${encodeURIComponent(aviso)}`
    + `&apikey=${encodeURIComponent(apikey)}`;

  try {
    // CallMeBot puede quedarse colgado. Sin este freno, la función
    // entera esperaría hasta agotar su tiempo de ejecución.
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      return { ok: false, error: `CallMeBot respondió ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `CallMeBot: ${String(err)}` };
  }
}


/* ============================================================
   3. GOOGLE CALENDAR
   ============================================================
   Esta es la razón por la que el backend es Supabase y no
   PocketBase.

   Google exige un token firmado en RS256. El motor JavaScript de
   PocketBase solo firma HS256, así que obligaba a un híbrido con
   Apps Script. Las Edge Functions corren sobre Deno, que trae
   WebCrypto completo, y firman RS256 sin depender de nada externo.
   Por eso lo de abajo son 40 líneas y no un segundo servicio.

   Se usa una cuenta de servicio (service account). NO hace falta
   delegación en todo el dominio: basta con compartir el calendario
   de la clínica con el correo de la cuenta de servicio, dándole
   permiso para "hacer cambios en los eventos".
   ============================================================ */

/** Convierte la clave PEM PKCS#8 de la cuenta de servicio en una CryptoKey. */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Al guardar la clave como secreto, los saltos de línea suelen
  // llegar como la secuencia literal \n en vez de saltos reales.
  const normalised = pem.replace(/\\n/g, "\n").trim();

  const body = normalised
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");

  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));

  return await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

/** base64url sin relleno, como exige JWT. */
function b64url(data: Uint8Array | string): string {
  const bytes = typeof data === "string"
    ? new TextEncoder().encode(data)
    : data;
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Cambia la cuenta de servicio por un access token de Google. */
async function getAccessToken(): Promise<string> {
  const email = Deno.env.get("GOOGLE_SA_EMAIL");
  const key = Deno.env.get("GOOGLE_SA_PRIVATE_KEY");
  if (!email || !key) {
    throw new Error("Faltan GOOGLE_SA_EMAIL o GOOGLE_SA_PRIVATE_KEY");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: email,
    scope: "https://www.googleapis.com/auth/calendar.events",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    await importPrivateKey(key),
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${b64url(new Uint8Array(signature))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(
      `Google rechazó el token (${res.status}): ${data.error_description ?? data.error ?? "sin detalle"}`,
    );
  }
  return data.access_token as string;
}

/**
 * "2026-08-20" + "2:00 PM"  ->  "2026-08-20T14:00:00"
 *
 * Se hace a mano porque el formato de 12 horas no lo interpreta
 * new Date() de forma fiable. Sin offset a propósito: el campo
 * timeZone que va aparte le dice a Google cómo leerlo, y así el
 * horario de la clínica es el horario del evento.
 */
export function toLocalIso(dateStr: string, timeStr: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;

  const m = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;

  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  const period = m[3].toUpperCase();

  if (hour < 1 || hour > 12 || minute > 59) return null;
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dateStr}T${pad(hour)}:${pad(minute)}:00`;
}

export async function createCalendarEvent(b: Booking): Promise<NotifyResult> {
  const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID");
  if (!calendarId) {
    return { ok: false, error: "Falta GOOGLE_CALENDAR_ID" };
  }

  const start = toLocalIso(b.preferred_date, b.preferred_time);
  if (!start) {
    return {
      ok: false,
      error: `Fecha u hora no interpretable: "${b.preferred_date}" "${b.preferred_time}"`,
    };
  }

  const durationMin = Number(Deno.env.get("APPOINTMENT_MINUTES") ?? "45");
  // Se suma la duración sobre la hora local en texto. Se construye
  // con Date en UTC y se vuelve a serializar sin la Z, para no
  // arrastrar la zona horaria del servidor.
  const endDate = new Date(`${start}Z`);
  endDate.setUTCMinutes(endDate.getUTCMinutes() + durationMin);
  const end = endDate.toISOString().slice(0, 19);

  try {
    const token = await getAccessToken();

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: `${b.modality} · ${b.full_name}`,
          description: buildSummary(b),
          location: CLINIC_NAME,
          start: { dateTime: start, timeZone: CLINIC_TZ },
          end: { dateTime: end, timeZone: CLINIC_TZ },
        }),
        signal: AbortSignal.timeout(20_000),
      },
    );

    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        error: `Calendar respondió ${res.status}: ${data?.error?.message ?? "sin detalle"}`,
      };
    }
    return { ok: true, eventId: data.id };
  } catch (err) {
    return { ok: false, error: `Calendar: ${String(err)}` };
  }
}
