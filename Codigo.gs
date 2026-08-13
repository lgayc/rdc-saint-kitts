/**
 * ================================================================
 *  RDC SAINT KITTS  ·  PUENTE DE NOTIFICACIONES
 * ================================================================
 *  Este archivo NO va en el sitio web. Se pega dentro de Google
 *  Apps Script (script.google.com).
 *
 *  ----------------------------------------------------------------
 *  QUE HACE AHORA (y que ya no hace)
 *
 *  Antes este script guardaba las reservas, servia el panel admin
 *  y manejaba el contenido del sitio. Todo eso paso a PocketBase.
 *
 *  Ahora hace UNA sola cosa: recibe una reserva de PocketBase y
 *  dispara los tres avisos.
 *
 *      PocketBase (guarda la reserva)
 *            |
 *            v  pb_hooks/notify.pb.js
 *      ESTE SCRIPT
 *            |
 *            +--> Correo a la clinica      (MailApp)
 *            +--> WhatsApp                 (CallMeBot)
 *            +--> Evento en Google Calendar(CalendarApp)
 *
 *  ----------------------------------------------------------------
 *  POR QUE SIGUE EXISTIENDO ESTE SCRIPT
 *
 *  Porque corre DENTRO de la cuenta de Google de la clinica. Eso
 *  significa que puede mandar correo y crear eventos en Calendar
 *  sin autenticarse contra nada: sin OAuth, sin claves, sin cuenta
 *  de servicio. Hacer lo mismo desde PocketBase exigiria firmar
 *  tokens RS256, que su motor de JavaScript no soporta.
 *
 *  ----------------------------------------------------------------
 *  INSTALACION
 *
 *  1. script.google.com -> Nuevo proyecto
 *  2. Pega todo este archivo
 *  3. Rellena CONFIG (abajo)
 *  4. Implementar -> Nueva implementacion -> Aplicacion web
 *       Ejecutar como:      Yo
 *       Quien tiene acceso: Cualquier usuario
 *  5. Copia la URL y ponla en PocketBase como NOTIFY_BRIDGE_URL
 *
 *  RECUERDA: cada vez que edites este codigo hay que ir a
 *  Implementar -> Administrar implementaciones -> lapiz ->
 *  Version: Nueva version. Si no, sigue corriendo el codigo viejo.
 *  Este es el error mas comun con Apps Script.
 * ================================================================
 */


/* ================================================================
   1. CONFIGURACION
   ================================================================ */

const CONFIG = {

  // --- Seguridad ----------------------------------------------
  // La URL de este script es publica: cualquiera que la conozca
  // puede llamarla. Sin esta contrasena, un desconocido podria
  // inundar de avisos falsos el correo y el WhatsApp de la
  // clinica. PocketBase la manda en cada peticion.
  //
  // Tiene que ser IDENTICA a la variable NOTIFY_SECRET de
  // PocketBase. Genera algo largo y aleatorio, no una palabra.
  SHARED_SECRET: "CAMBIAME-por-una-cadena-larga-y-aleatoria",

  // --- A donde llegan los avisos ------------------------------
  // OJO: datos DE PRUEBA. Cambiar antes de entregar al cliente.
  NOTIFICATION_EMAIL: "869thesignstudio@gmail.com",

  // Formato: codigo de pais + numero, sin + ni espacios.
  WHATSAPP_NUMBER: "18697629440",

  // Llave de CallMeBot. Como obtenerla: GUIA-RAPIDA.md seccion 2.
  // Si la dejas vacia todo lo demas funciona igual; solo se salta
  // el WhatsApp y queda anotado en el registro.
  CALLMEBOT_APIKEY: "",

  // --- Google Calendar ----------------------------------------
  // "primary" = el calendario principal de la cuenta donde
  // instalaste este script.
  CALENDAR_ID: "primary",
  CREATE_CALENDAR_EVENTS: true,
  APPOINTMENT_MINUTES: 45,

  CLINIC_NAME: "RDC Saint Kitts"
};


/* ================================================================
   2. ENTRADA
   ================================================================ */

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");

    // --- Comprobacion de la contrasena compartida -------------
    // Se compara con una funcion de tiempo constante para no
    // filtrar informacion por lo que tarda en responder.
    if (!secretsMatch(body.secret, CONFIG.SHARED_SECRET)) {
      Logger.log("Peticion rechazada: contrasena incorrecta");
      return json({ ok: false, error: "Unauthorized" });
    }

    const booking = body.booking;
    if (!booking || !booking.fullName) {
      return json({ ok: false, error: "Missing booking data" });
    }

    const summary = buildSummary(booking);

    // Cada aviso va en su propio try. Si el WhatsApp falla, el
    // correo igual sale. Nunca se pierde todo por una pieza.
    const result = {
      email:    safely("correo",   function () { sendEmail(booking, summary); }),
      whatsapp: safely("whatsapp", function () { sendWhatsApp(summary); }),
      calendar: safely("calendar", function () { createCalendarEvent(booking, summary); })
    };

    return json({ ok: true, delivered: result });

  } catch (err) {
    Logger.log("Fallo general: " + err);
    return json({ ok: false, error: String(err) });
  }
}

/**
 * Comprobar que el script esta publicado: pega la URL en el
 * navegador. Si ves "RDC bridge activo", quedo bien.
 */
function doGet() {
  return ContentService
    .createTextOutput("RDC bridge activo - " + new Date().toISOString())
    .setMimeType(ContentService.MimeType.TEXT);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Compara dos cadenas en tiempo constante.
 * Una comparacion normal (a === b) corta en cuanto encuentra una
 * diferencia, y ese tiempo distinto permite adivinar la clave
 * caracter a caracter. Esto recorre siempre todo.
 */
function secretsMatch(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}


/* ================================================================
   3. EL MENSAJE
   ================================================================ */

function buildSummary(b) {
  return [
    "NUEVA RESERVA - " + CONFIG.CLINIC_NAME,
    "",
    "Nombre:   " + b.fullName,
    "Telefono: " + b.phone,
    "Email:    " + b.email,
    "Estudio:  " + b.modality,
    "Fecha:    " + b.preferredDate,
    "Hora:     " + b.preferredTime,
    "Notas:    " + (b.notes || "-"),
    "",
    "Codigo: " + (b.id || "-"),
    "Gestionar en el panel de PocketBase."
  ].join("\n");
}


/* ================================================================
   4. CORREO
   ================================================================ */

function sendEmail(b, summary) {
  MailApp.sendEmail({
    to:      CONFIG.NOTIFICATION_EMAIL,
    subject: "Nueva reserva - " + b.fullName + " (" + b.modality + ")",
    body:    summary
  });
}


/* ================================================================
   5. WHATSAPP  (CallMeBot, gratis)
   ================================================================
   El numero que RECIBE tiene que autorizar el bot una vez. Los
   pasos estan en GUIA-RAPIDA.md, seccion 2.

   Si algun dia hace falta algo mas robusto (mas volumen, varios
   destinatarios), se cambia por Twilio o la API oficial de
   WhatsApp Business: solo hay que reescribir esta funcion, el
   resto del sistema no se entera.
   ================================================================ */

function sendWhatsApp(message) {
  if (!CONFIG.CALLMEBOT_APIKEY) {
    Logger.log("WhatsApp omitido: falta CALLMEBOT_APIKEY");
    return;
  }

  const url = "https://api.callmebot.com/whatsapp.php"
    + "?phone="  + encodeURIComponent(CONFIG.WHATSAPP_NUMBER)
    + "&text="   + encodeURIComponent(message)
    + "&apikey=" + encodeURIComponent(CONFIG.CALLMEBOT_APIKEY);

  UrlFetchApp.fetch(url, { muteHttpExceptions: true });
}


/* ================================================================
   6. GOOGLE CALENDAR
   ================================================================ */

function createCalendarEvent(b, summary) {
  if (!CONFIG.CREATE_CALENDAR_EVENTS) return;

  const start = parseDateTime(b.preferredDate, b.preferredTime);
  if (!start) {
    Logger.log("Fecha/hora no interpretable: " + b.preferredDate + " " + b.preferredTime);
    return;
  }

  const end = new Date(start.getTime() + CONFIG.APPOINTMENT_MINUTES * 60 * 1000);

  const cal = CONFIG.CALENDAR_ID === "primary"
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);

  cal.createEvent(b.modality + " - " + b.fullName, start, end, {
    description: summary,
    location:    CONFIG.CLINIC_NAME
  });
}

/**
 * Convierte "2026-08-15" + "2:00 PM" en un objeto Date.
 * Se hace a mano porque new Date() no interpreta el formato de
 * 12 horas de forma fiable en todos los entornos.
 */
function parseDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;

  const parts = String(dateStr).split("-");
  if (parts.length !== 3) return null;

  const m = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;

  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  const period = m[3].toUpperCase();

  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  return new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10),
    hour,
    minute
  );
}


/* ================================================================
   7. UTILIDAD
   ================================================================ */

/**
 * Ejecuta algo sin dejar que un fallo tumbe el resto.
 * Devuelve true si salio bien, o el texto del error si no.
 */
function safely(label, fn) {
  try {
    fn();
    return true;
  } catch (err) {
    Logger.log("Fallo en '" + label + "': " + err);
    return String(err);
  }
}


/* ================================================================
   8. PRUEBA MANUAL
   ================================================================
   Selecciona "probarAvisos" en el desplegable de funciones de
   Apps Script y dale Ejecutar. Debe llegarte el correo, el
   WhatsApp y aparecer el evento en el calendario, sin necesidad
   de tocar PocketBase ni el formulario.
   ================================================================ */

function probarAvisos() {
  const manana = new Date(Date.now() + 86400000);
  const fecha = Utilities.formatDate(manana, Session.getScriptTimeZone(), "yyyy-MM-dd");

  const booking = {
    id:            "PRUEBA-001",
    fullName:      "Prueba Sistema",
    phone:         "18690000000",
    email:         "prueba@ejemplo.com",
    modality:      "MRI",
    preferredDate: fecha,
    preferredTime: "10:00 AM",
    notes:         "Reserva de prueba generada desde el editor."
  };

  const summary = buildSummary(booking);

  Logger.log({
    email:    safely("correo",   function () { sendEmail(booking, summary); }),
    whatsapp: safely("whatsapp", function () { sendWhatsApp(summary); }),
    calendar: safely("calendar", function () { createCalendarEvent(booking, summary); })
  });
}
