/**
 * ================================================================
 *  RDC SAINT KITTS - BACKEND (Google Apps Script)
 * ================================================================
 *  Este archivo NO va en el sitio web. Se pega dentro de Google
 *  Apps Script (script.google.com). Es el "cerebro" del sistema:
 *
 *    - Recibe las reservas del formulario
 *    - Las guarda en una Google Sheet (la base de datos)
 *    - Envia correo a la clinica
 *    - Envia mensaje de WhatsApp
 *    - Crea el evento en Google Calendar
 *    - Le da datos al panel admin (admin.html)
 *    - Guarda los textos e imagenes que el admin edita
 *
 *  Es 100% gratis y no requiere servidor propio.
 *
 *  INSTALACION PASO A PASO: ver GUIA-RAPIDA.md (seccion 1).
 * ================================================================
 */


/* ================================================================
   1. CONFIGURACION - EDITA SOLO ESTA SECCION
   ================================================================ */

const CONFIG = {

  // --- A donde llegan los avisos de reservas -------------------
  // OJO: estos son datos DE PRUEBA. Cambiar antes de entregar.
  NOTIFICATION_EMAIL: "869thesignstudio@gmail.com",

  // Numero de WhatsApp que recibe los avisos.
  // Formato: codigo de pais + numero, sin + ni espacios.
  WHATSAPP_NUMBER: "18697629440",

  // Llave de CallMeBot para enviar WhatsApp gratis.
  // Como obtenerla: ver GUIA-RAPIDA.md (seccion 2). Toma 2 minutos.
  // Si la dejas vacia, todo lo demas funciona igual, solo que no
  // se envia el WhatsApp (se registra un aviso en el log).
  CALLMEBOT_APIKEY: "",

  // --- Google Calendar ----------------------------------------
  // Deja "primary" para usar el calendario principal de la cuenta
  // donde instalaste este script.
  CALENDAR_ID: "primary",
  CREATE_CALENDAR_EVENTS: true,

  // --- Contrasena del panel admin -----------------------------
  // CAMBIA ESTO por algo seguro antes de entregar el sitio.
  ADMIN_PASSWORD: "rdc2026",

  // Cuanto dura la sesion del admin antes de pedir contrasena otra vez
  SESSION_HOURS: 8,

  // --- Nombre de las hojas dentro del Google Sheet -------------
  // (se crean solas la primera vez, no hay que tocarlas)
  SHEET_RESERVATIONS: "Reservas",
  SHEET_CONTENT: "Contenido"
};


/* ================================================================
   2. PUNTOS DE ENTRADA (lo que el sitio web llama)
   ================================================================
   El sitio manda todo por POST a una sola URL, con un campo
   "action" que dice que se quiere hacer. Esto evita problemas de
   CORS y mantiene todo en un solo lugar.
   ================================================================ */

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const action = body.action;

    switch (action) {
      // --- Publico (cualquiera puede llamarlo) ---
      case "book":         return json(createBooking(body.data));
      case "getContent":   return json({ ok: true, content: getPublicContent() });

      // --- Admin (requiere token de sesion valido) ---
      case "login":        return json(login(body.password));
      case "listBookings": return json(requireAuth(body, listBookings));
      case "setBookingStatus":
        return json(requireAuth(body, () => setBookingStatus(body.id, body.status)));
      case "saveContent":
        return json(requireAuth(body, () => saveContent(body.content)));

      default:
        return json({ ok: false, error: "Accion no reconocida: " + action });
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/**
 * doGet solo sirve para comprobar que el script esta publicado.
 * Si abres la URL en el navegador y ves "RDC backend activo",
 * la instalacion quedo bien.
 */
function doGet() {
  return ContentService
    .createTextOutput("RDC backend activo - " + new Date().toISOString())
    .setMimeType(ContentService.MimeType.TEXT);
}

/** Responde en formato JSON */
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


/* ================================================================
   3. RESERVAS
   ================================================================ */

/**
 * Crea una reserva: valida, guarda, y avisa por correo + WhatsApp
 * + Calendar. Esta es la funcion principal del sistema.
 */
function createBooking(data) {
  // --- Validacion en el servidor -----------------------------
  // El navegador ya valida, pero NUNCA hay que confiar solo en eso:
  // alguien podria mandar datos directo sin pasar por el formulario.
  const errors = validateBooking(data);
  if (errors.length) {
    return { ok: false, error: errors.join(" ") };
  }

  const sheet = getSheet(CONFIG.SHEET_RESERVATIONS, [
    "ID", "Fecha registro", "Nombre", "Telefono", "Email",
    "Estudio", "Fecha cita", "Hora cita", "Notas", "Estado"
  ]);

  const id = "RDC-" + Date.now();
  const now = new Date();

  sheet.appendRow([
    id,
    now,
    data.fullName,
    data.phone,
    data.email,
    data.modality,
    data.preferredDate,
    data.preferredTime,
    data.notes || "",
    "Pendiente"
  ]);

  // --- Avisos ------------------------------------------------
  // Cada aviso va en su propio try: si WhatsApp falla, el correo
  // igual sale y la reserva NO se pierde.
  const summary = buildSummary(id, data);

  safely("correo", function () {
    MailApp.sendEmail({
      to: CONFIG.NOTIFICATION_EMAIL,
      subject: "Nueva reserva - " + data.fullName + " (" + data.modality + ")",
      body: summary
    });
  });

  safely("whatsapp", function () {
    sendWhatsApp(summary);
  });

  safely("calendar", function () {
    if (CONFIG.CREATE_CALENDAR_EVENTS) createCalendarEvent(id, data);
  });

  return { ok: true, id: id };
}

/** Reglas de validacion. Devuelve lista de errores (vacia = todo bien) */
function validateBooking(d) {
  const errors = [];
  if (!d) return ["No se recibieron datos."];

  if (!d.fullName || String(d.fullName).trim().length < 3) {
    errors.push("El nombre es obligatorio.");
  }

  // Telefono: obligatorio, al menos 7 digitos
  const digits = String(d.phone || "").replace(/\D/g, "");
  if (digits.length < 7) {
    errors.push("El telefono es obligatorio y debe ser valido.");
  }

  // Correo: obligatorio y con formato valido
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(d.email || ""))) {
    errors.push("El correo es obligatorio y debe ser valido.");
  }

  if (!d.modality) errors.push("Falta seleccionar el estudio.");
  if (!d.preferredDate) errors.push("Falta la fecha.");
  if (!d.preferredTime) errors.push("Falta la hora.");

  return errors;
}

/** Texto que se manda por correo y WhatsApp */
function buildSummary(id, d) {
  return [
    "NUEVA RESERVA - " + CONFIG_CLINIC_NAME(),
    "",
    "Codigo: " + id,
    "Nombre: " + d.fullName,
    "Telefono: " + d.phone,
    "Email: " + d.email,
    "Estudio: " + d.modality,
    "Fecha: " + d.preferredDate,
    "Hora: " + d.preferredTime,
    "Notas: " + (d.notes || "-"),
    "",
    "Revisar en el panel admin del sitio web."
  ].join("\n");
}

function CONFIG_CLINIC_NAME() {
  return "RDC Saint Kitts";
}

/** Lista todas las reservas para el panel admin (mas nuevas primero) */
function listBookings() {
  const sheet = getSheet(CONFIG.SHEET_RESERVATIONS, []);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { ok: true, bookings: [] };

  const rows = values.slice(1).map(function (r) {
    return {
      id: r[0],
      createdAt: r[1] ? new Date(r[1]).toISOString() : "",
      fullName: r[2],
      phone: r[3],
      email: r[4],
      modality: r[5],
      date: r[6] instanceof Date ? Utilities.formatDate(r[6], Session.getScriptTimeZone(), "yyyy-MM-dd") : r[6],
      time: r[7],
      notes: r[8],
      status: r[9] || "Pendiente"
    };
  }).reverse();

  return { ok: true, bookings: rows };
}

/** Cambia el estado de una reserva (Pendiente / Confirmada / Cancelada) */
function setBookingStatus(id, status) {
  const sheet = getSheet(CONFIG.SHEET_RESERVATIONS, []);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === id) {
      sheet.getRange(i + 1, 10).setValue(status); // columna 10 = Estado
      return { ok: true };
    }
  }
  return { ok: false, error: "No se encontro la reserva " + id };
}


/* ================================================================
   4. WHATSAPP (via CallMeBot - gratis)
   ================================================================
   CallMeBot es un servicio gratuito para mandar WhatsApp desde
   codigo. El numero que RECIBE debe autorizarlo una vez (ver
   GUIA-RAPIDA.md seccion 2) y de ahi te da una apikey.

   Para volumen alto o algo mas profesional, se puede cambiar por
   Twilio o la API oficial de WhatsApp Business - solo habria que
   reemplazar el contenido de esta funcion.
   ================================================================ */

function sendWhatsApp(message) {
  if (!CONFIG.CALLMEBOT_APIKEY) {
    Logger.log("WhatsApp no enviado: falta CALLMEBOT_APIKEY en CONFIG.");
    return;
  }

  const url = "https://api.callmebot.com/whatsapp.php"
    + "?phone=" + encodeURIComponent(CONFIG.WHATSAPP_NUMBER)
    + "&text=" + encodeURIComponent(message)
    + "&apikey=" + encodeURIComponent(CONFIG.CALLMEBOT_APIKEY);

  UrlFetchApp.fetch(url, { muteHttpExceptions: true });
}


/* ================================================================
   5. GOOGLE CALENDAR
   ================================================================ */

function createCalendarEvent(id, d) {
  const start = parseDateTime(d.preferredDate, d.preferredTime);
  if (!start) {
    Logger.log("No se pudo interpretar la fecha/hora: " + d.preferredDate + " " + d.preferredTime);
    return;
  }

  const end = new Date(start.getTime() + 45 * 60 * 1000); // 45 min por defecto
  const cal = CONFIG.CALENDAR_ID === "primary"
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);

  cal.createEvent(
    d.modality + " - " + d.fullName,
    start,
    end,
    {
      description: buildSummary(id, d),
      location: "RDC Saint Kitts"
    }
  );
}

/**
 * Convierte "2026-08-15" + "2:00 PM" en un objeto Date.
 * Se hace a mano porque el formato de 12 horas no lo entiende
 * new Date() de forma confiable en todos los entornos.
 */
function parseDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;

  const parts = String(dateStr).split("-");
  if (parts.length !== 3) return null;

  const match = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

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
   6. CONTENIDO EDITABLE (lo que el admin cambia sin tocar codigo)
   ================================================================
   Se guarda como un solo JSON en la hoja "Contenido". Incluye:
     - imagenes del carrusel del banner
     - texto de promocion
     - titulo y subtitulo del banner
     - publicaciones de "Studies & Work"
   ================================================================ */

/** Estructura por defecto la primera vez */
function defaultContent() {
  return {
    heroTitle: "",      // vacio = usa el de js/config.js
    heroSubtitle: "",
    promoText: "",      // si tiene texto, aparece una barra de promo
    slides: [],         // [{ image: "URL", caption: "texto" }]
    studies: []         // [{ title, date, excerpt, color, link }]
  };
}

function getPublicContent() {
  const sheet = getSheet(CONFIG.SHEET_CONTENT, ["JSON"]);
  const raw = sheet.getRange("A2").getValue();

  if (!raw) return defaultContent();
  try {
    return Object.assign(defaultContent(), JSON.parse(raw));
  } catch (err) {
    Logger.log("Contenido corrupto en la hoja, usando valores por defecto: " + err);
    return defaultContent();
  }
}

function saveContent(content) {
  const sheet = getSheet(CONFIG.SHEET_CONTENT, ["JSON"]);
  const merged = Object.assign(defaultContent(), content || {});
  sheet.getRange("A2").setValue(JSON.stringify(merged));
  return { ok: true, content: merged };
}


/* ================================================================
   7. SEGURIDAD DEL PANEL ADMIN
   ================================================================
   Al entrar con la contrasena correcta se genera un token que se
   guarda del lado del servidor con fecha de vencimiento. Cada
   accion del admin manda ese token y aqui se verifica.

   La contrasena NUNCA viaja ni se guarda en el navegador: solo
   el token temporal.
   ================================================================ */

function login(password) {
  if (String(password) !== CONFIG.ADMIN_PASSWORD) {
    Utilities.sleep(800); // frena intentos automatizados de adivinar
    return { ok: false, error: "Contrasena incorrecta." };
  }

  const token = Utilities.getUuid();
  const expires = Date.now() + CONFIG.SESSION_HOURS * 3600 * 1000;

  PropertiesService.getScriptProperties()
    .setProperty("session_" + token, String(expires));

  return { ok: true, token: token, expiresAt: expires };
}

/** Envuelve una accion de admin verificando el token primero */
function requireAuth(body, fn) {
  const props = PropertiesService.getScriptProperties();
  const key = "session_" + body.token;
  const expires = props.getProperty(key);

  if (!expires) {
    return { ok: false, error: "Sesion no valida. Inicia sesion de nuevo.", authFailed: true };
  }
  if (Date.now() > Number(expires)) {
    props.deleteProperty(key);
    return { ok: false, error: "La sesion expiro. Inicia sesion de nuevo.", authFailed: true };
  }

  return fn();
}


/* ================================================================
   8. UTILIDADES INTERNAS
   ================================================================ */

/**
 * Devuelve la hoja pedida; si no existe la crea con sus encabezados.
 * Asi la primera instalacion no requiere preparar nada a mano.
 */
function getSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/**
 * Ejecuta algo sin dejar que un error tumbe el resto del proceso.
 * Se usa para los avisos: si WhatsApp falla, la reserva igual se
 * guarda y el correo igual sale.
 */
function safely(label, fn) {
  try {
    fn();
  } catch (err) {
    Logger.log("Fallo en '" + label + "': " + err);
  }
}


/* ================================================================
   9. PRUEBA MANUAL
   ================================================================
   Selecciona esta funcion en el menu de Apps Script y dale Ejecutar
   para comprobar que el correo, WhatsApp y Calendar funcionan sin
   tener que llenar el formulario del sitio.
   ================================================================ */

function probarSistema() {
  const resultado = createBooking({
    fullName: "Prueba Sistema",
    phone: "18690000000",
    email: "prueba@ejemplo.com",
    modality: "MRI",
    preferredDate: Utilities.formatDate(
      new Date(Date.now() + 86400000), Session.getScriptTimeZone(), "yyyy-MM-dd"
    ),
    preferredTime: "10:00 AM",
    notes: "Reserva de prueba generada automaticamente."
  });

  Logger.log(resultado);
}
