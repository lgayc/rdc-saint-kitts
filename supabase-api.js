/**
 * ============================================================
 *  RDC_API · única capa que habla con Supabase
 * ============================================================
 *  Todo lo que sale a la red pasa por aquí. El resto del sitio
 *  (main.js, booking.js, studies.js, admin.js) llama a estas
 *  funciones y no sabe nada de Supabase. Si algún día hay que
 *  cambiar de backend otra vez, se reescribe este archivo y
 *  nada más.
 *
 *  ------------------------------------------------------------
 *  QUÉ CLAVE VA AQUÍ
 *  La anon key, que es pública por diseño: viaja dentro de
 *  cualquier página web que use Supabase y no hay forma de
 *  esconderla. Lo que la hace segura es Row Level Security en la
 *  base de datos, no el secreto de la clave.
 *
 *  La service_role key NUNCA va en un archivo del navegador.
 *  Esa vive solo en los secretos de las Edge Functions, y salta
 *  todas las políticas de RLS. Si aparece aquí, cualquiera puede
 *  leer la lista completa de pacientes.
 *
 *  ------------------------------------------------------------
 *  CÓMO ENTRAN LAS RESERVAS
 *  No se insertan desde el navegador. Se mandan a la Edge
 *  Function `book`, que valida, guarda y avisa. La tabla
 *  `bookings` no tiene ninguna política para anon: desde aquí es
 *  invisible, tanto para leer como para escribir.
 * ============================================================
 */

const RDC_API = (function () {
  "use strict";

  let client = null;

  function cfg() {
    return (typeof SITE_CONFIG !== "undefined" && SITE_CONFIG.supabase) || {};
  }

  /** ¿Hay una URL y una anon key puestas en config.js? */
  function isConfigured() {
    const c = cfg();
    return Boolean(c.url && c.url.trim() && c.anonKey && c.anonKey.trim());
  }

  /**
   * Cliente perezoso: se crea la primera vez que hace falta.
   * Así el sitio no revienta si supabase-js no cargó (por ejemplo
   * sin conexión): quien llame recibe null y usa su respaldo.
   */
  function db() {
    if (client) return client;
    if (!isConfigured()) return null;

    if (typeof window.supabase === "undefined" || !window.supabase.createClient) {
      console.warn("supabase-js no está cargado. Revisa el <script> en el HTML.");
      return null;
    }

    const c = cfg();
    client = window.supabase.createClient(c.url.trim(), c.anonKey.trim());
    return client;
  }

  /** URL pública de un archivo del Storage. */
  function publicUrl(bucket, path) {
    const d = db();
    if (!d || !path) return "";
    return d.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  /** La imagen puede venir subida al Storage o enlazada de fuera. */
  function imageOf(row, bucket) {
    if (row.image_path) return publicUrl(bucket, row.image_path);
    return row.image_url || "";
  }


  /* ==========================================================
     1. CONTENIDO PÚBLICO
     ==========================================================
     Devuelve exactamente la forma que main.js ya esperaba del
     backend anterior:

        { heroTitle, heroSubtitle, promoText, slides, studies }

     Por eso main.js casi no cambia. Las tres consultas van en
     paralelo, y si una falla se devuelve lo que sí llegó: es
     preferible una portada con las fotos de config.js que una
     página en blanco.
     ========================================================== */

  async function getPublicContent() {
    const d = db();
    if (!d) return null;

    const [contentRes, bannersRes, postsRes] = await Promise.allSettled([
      d.from("site_content").select("*").eq("id", 1).maybeSingle(),
      d.from("banners").select("*").eq("active", true).order("sort", { ascending: true }),
      d.from("posts").select("*").eq("published", true).order("date", { ascending: false }),
    ]);

    const content = contentRes.status === "fulfilled" ? contentRes.value.data : null;
    const banners = bannersRes.status === "fulfilled" ? bannersRes.value.data || [] : [];
    const posts = postsRes.status === "fulfilled" ? postsRes.value.data || [] : [];

    return {
      heroTitle: content?.hero_title || "",
      heroSubtitle: content?.hero_subtitle || "",
      promoText: content?.promo_text || "",

      slides: banners.map((b) => ({
        _id: b.id,
        image: imageOf(b, "banners"),
        caption: b.caption || "",
      })).filter((s) => s.image),

      studies: posts.map((p) => ({
        _id: p.id,
        title: p.title,
        date: p.date,
        excerpt: p.excerpt || "",
        image: imageOf(p, "posts"),
        color: p.accent_color || "#2dd4bf",
        link: p.link || "",
      })),
    };
  }


  /* ==========================================================
     2. ENVIAR UNA RESERVA
     ==========================================================
     Va a la Edge Function, no a la tabla. La anon key viaja en
     la cabecera porque la función se despliega con verify_jwt
     activado: una petición sin ninguna clave se rechaza antes de
     ejecutar código.
     ========================================================== */

  async function submitBooking(data) {
    const c = cfg();
    if (!isConfigured()) throw new Error("Supabase no está configurado.");

    const url = `${c.url.trim().replace(/\/$/, "")}/functions/v1/book`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: c.anonKey.trim(),
        Authorization: `Bearer ${c.anonKey.trim()}`,
      },
      body: JSON.stringify(data),
    });

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error(`El servidor respondió ${response.status}.`);
    }

    // El mensaje del servidor es más útil que un código HTTP:
    // distingue "faltan datos" de "demasiadas solicitudes".
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `El servidor respondió ${response.status}.`);
    }

    return result;
  }


  /* ==========================================================
     3. PANEL DE ADMINISTRACIÓN
     ==========================================================
     Se entra con usuario y contraseña de Supabase Auth. La sesión
     la guarda y renueva supabase-js solo.

     Tener cuenta NO basta: además hay que estar en la tabla
     `staff`. Son dos comprobaciones distintas a propósito, y la
     que manda es la de la base de datos — RLS la aplica en cada
     consulta, sin depender de nada de este archivo.
     ========================================================== */

  const admin = {
    async signIn(email, password) {
      const d = db();
      if (!d) return { ok: false, error: "Supabase no está configurado." };

      const { data, error } = await d.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };

      // Se comprueba aquí solo para dar un mensaje claro. Aunque
      // alguien se saltara esto, RLS no le devolvería una sola
      // reserva.
      const { data: staffRow } = await d
        .from("staff").select("user_id").eq("user_id", data.user.id).maybeSingle();

      if (!staffRow) {
        await d.auth.signOut();
        return {
          ok: false,
          error: "Esta cuenta no tiene acceso al panel. Habla con el administrador.",
        };
      }

      return { ok: true, user: data.user };
    },

    async signOut() {
      const d = db();
      if (d) await d.auth.signOut();
    },

    /** ¿Hay sesión guardada de una visita anterior? */
    async currentSession() {
      const d = db();
      if (!d) return null;
      const { data } = await d.auth.getSession();
      return data.session || null;
    },

    async listBookings() {
      const d = db();
      const { data, error } = await d
        .from("bookings").select("*").order("created_at", { ascending: false });

      if (error) return { ok: false, error: error.message };

      // Se traduce a los nombres que el panel ya usa, para no
      // tocar el código que dibuja las tarjetas.
      return {
        ok: true,
        bookings: (data || []).map((b) => ({
          id: b.id,
          ref: b.ref,
          createdAt: b.created_at,
          fullName: b.full_name,
          phone: b.phone,
          email: b.email,
          modality: b.modality,
          date: b.preferred_date,
          time: b.preferred_time,
          notes: b.notes || "",
          status: b.status,
          notified: {
            email: b.notified_email,
            patient: b.notified_patient,
            whatsapp: b.notified_whatsapp,
            calendar: b.notified_calendar,
          },
          notifyError: b.notify_error || "",
        })),
      };
    },

    /**
     * Cambia el estado de una reserva y avisa al paciente.
     *
     * Esto era un UPDATE directo contra la tabla. Ahora va a la
     * Edge Function `booking-status`, y no por gusto: confirmar
     * una cita tiene que mandarle un correo al paciente, y para
     * mandar correo hace falta la contraseña del SMTP. Un secreto
     * en un archivo .js es un secreto que cualquiera puede leer
     * con Ctrl+U, así que el envío tiene que ocurrir en el
     * servidor. Y si el envío se va allí, el cambio de estado se
     * va con él: de otro modo existiría el caso "se confirmó pero
     * no se avisó".
     *
     * Se manda el token de la sesión, no la anon key: la función
     * comprueba contra la base de datos que quien llama está en
     * la tabla `staff`.
     */
    async setBookingStatus(id, status, options) {
      const c = cfg();
      const d = db();
      if (!d) return { ok: false, error: "Supabase no está configurado." };

      const { data: sessionData } = await d.auth.getSession();
      const token = sessionData && sessionData.session
        ? sessionData.session.access_token
        : null;
      if (!token) {
        return { ok: false, error: "La sesión caducó. Vuelve a entrar." };
      }

      const url = `${c.url.trim().replace(/\/$/, "")}/functions/v1/booking-status`;

      let response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: c.anonKey.trim(),
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id,
            status,
            resend: Boolean(options && options.resend),
          }),
        });
      } catch (err) {
        return { ok: false, error: `Sin conexión con el servidor. ${err}` };
      }

      let result;
      try {
        result = await response.json();
      } catch {
        return { ok: false, error: `El servidor respondió ${response.status}.` };
      }

      if (!response.ok || !result.ok) {
        return {
          ok: false,
          error: result.error || `El servidor respondió ${response.status}.`,
        };
      }

      // `warning` no es un fallo: el estado cambió. Es "cambió,
      // pero al paciente no le llegó el correo", que es justo lo
      // que quien pulsó el botón necesita saber.
      return {
        ok: true,
        notice: result.notice || null,
        emailedTo: result.emailedTo || null,
        warning: result.warning || null,
      };
    },

    async getContent() {
      const content = await getPublicContent();
      return content
        ? { ok: true, content }
        : { ok: false, error: "No se pudo leer el contenido." };
    },

    /**
     * Guarda banners, publicaciones y textos de una vez.
     *
     * Se sincroniza por id en vez de borrar todo y volver a
     * insertar: así una fila que no cambió conserva su id y sus
     * fechas, y sobre todo, si el guardado falla a medias no se
     * queda el sitio sin contenido.
     */
    async saveContent(content) {
      const d = db();
      if (!d) return { ok: false, error: "Supabase no está configurado." };

      try {
        await d.from("site_content").update({
          hero_title: content.heroTitle || null,
          hero_subtitle: content.heroSubtitle || null,
          promo_text: content.promoText || null,
        }).eq("id", 1);

        await syncTable(d, "banners", content.slides || [], (slide, i) => ({
          image_url: slide.image || null,
          caption: slide.caption || null,
          sort: i,
          active: true,
        }));

        await syncTable(d, "posts", content.studies || [], (post, i) => ({
          title: post.title,
          date: post.date || new Date().toISOString().split("T")[0],
          excerpt: post.excerpt || null,
          image_url: post.image || null,
          link: post.link || null,
          accent_color: post.color || "#2dd4bf",
          sort: i,
          published: true,
        }));

        return { ok: true, content: await getPublicContent() };
      } catch (err) {
        return { ok: false, error: err.message || String(err) };
      }
    },

    /**
     * Sube una foto al Storage arrastrándola. Devuelve la URL
     * pública, lista para meter en el campo de imagen.
     *
     * El nombre se genera aquí y no se usa el del archivo: dos
     * personas subiendo "foto.jpg" se pisarían, y un nombre de
     * archivo puede traer acentos o barras que rompen la ruta.
     *
     * LIMITACIÓN CONOCIDA: al quitar una foto de la lista se borra
     * la fila, pero el archivo se queda en el Storage. Son unos
     * pocos kilobytes sueltos y el plan gratuito da 1 GB, así que
     * no corre prisa. Si algún día molesta, se limpia desde
     * Storage → posts / banners a mano. Se dejó así a propósito:
     * borrar el archivo automáticamente es peligroso si esa misma
     * URL quedó pegada en otro sitio.
     */
    async uploadImage(file, bucket) {
      const d = db();
      if (!d) throw new Error("Supabase no está configurado.");

      if (!file.type.startsWith("image/")) {
        throw new Error("Ese archivo no es una imagen.");
      }

      const maxMb = 5;
      if (file.size > maxMb * 1024 * 1024) {
        throw new Error(`La imagen pesa más de ${maxMb} MB. Redúcela antes de subirla.`);
      }

      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error } = await d.storage.from(bucket).upload(name, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw new Error(error.message);

      return publicUrl(bucket, name);
    },
  };

  /**
   * Deja una tabla igual a la lista que llega del panel:
   * actualiza lo que ya existía, inserta lo nuevo y borra lo que
   * el usuario quitó de la lista.
   */
  async function syncTable(d, table, items, mapRow) {
    const keep = items.map((it) => it._id).filter(Boolean);

    // Borrar lo que ya no está en la lista.
    let del = d.from(table).delete();
    del = keep.length
      ? del.not("id", "in", `(${keep.join(",")})`)
      : del.neq("id", "00000000-0000-0000-0000-000000000000"); // borrar todo
    const { error: delError } = await del;
    if (delError) throw new Error(`Al borrar de ${table}: ${delError.message}`);

    for (let i = 0; i < items.length; i++) {
      const row = mapRow(items[i], i);

      if (items[i]._id) {
        const { error } = await d.from(table).update(row).eq("id", items[i]._id);
        if (error) throw new Error(`Al actualizar ${table}: ${error.message}`);
      } else {
        const { data, error } = await d.from(table).insert(row).select("id").single();
        if (error) throw new Error(`Al crear en ${table}: ${error.message}`);
        items[i]._id = data.id; // para que el siguiente guardado lo actualice
      }
    }
  }

  return { isConfigured, getPublicContent, submitBooking, admin };
})();
