/// <reference path="../pb_data/types.d.ts" />
/**
 * ============================================================
 *  PUENTE DE NOTIFICACIONES  ·  PocketBase -> Apps Script
 * ============================================================
 *  DONDE VA ESTE ARCHIVO
 *  Junto al ejecutable de PocketBase, en una carpeta pb_hooks:
 *
 *      pocketbase
 *      pb_hooks/
 *        notify.pb.js      <- este archivo
 *      pb_data/
 *
 *  PocketBase lo carga solo al arrancar. Si lo editas, reinicia
 *  el servidor (o guarda: en local recarga en caliente).
 *
 *  ------------------------------------------------------------
 *  QUE HACE
 *  Cuando entra una reserva nueva en la coleccion "bookings",
 *  avisa al Apps Script, que es quien manda el correo, el
 *  WhatsApp y crea el evento en Google Calendar.
 *
 *  POR QUE ASI Y NO TODO AQUI
 *  Google Calendar exige firmar un token RS256. El motor de
 *  JavaScript de PocketBase solo firma HS256, asi que no puede
 *  hablar con Calendar por si mismo. El Apps Script si puede,
 *  porque corre dentro de la cuenta de Google de la clinica y no
 *  necesita autenticarse contra nada.
 *
 *  ------------------------------------------------------------
 *  CONFIGURACION (variables de entorno, NO se escriben aqui)
 *
 *      NOTIFY_BRIDGE_URL   URL del Apps Script publicado
 *      NOTIFY_SECRET       Contrasena compartida con el script
 *
 *  En PocketHost: Settings -> Environment variables.
 *  En un VPS, en el servicio de systemd:
 *      Environment="NOTIFY_BRIDGE_URL=https://script.google.com/..."
 *      Environment="NOTIFY_SECRET=una-cadena-larga-y-aleatoria"
 *
 *  Van como variables de entorno a proposito: si se escribieran
 *  aqui, acabarian en el repositorio y en el historial de git.
 * ============================================================
 */

onRecordAfterCreateSuccess((e) => {
  // Nota de version: en PocketBase < 0.23 este gancho se llamaba
  // onRecordAfterCreateRequest. Si tu instancia es anterior,
  // cambia el nombre y usa e.record igual que aqui.

  const record = e.record;

  const bridgeUrl = $os.getenv("NOTIFY_BRIDGE_URL");
  const secret    = $os.getenv("NOTIFY_SECRET");

  // Sin configuracion no se intenta nada. La reserva YA quedo
  // guardada: es preferible tener la reserva sin aviso que
  // perder la reserva.
  if (!bridgeUrl || !secret) {
    $app.logger().warn(
      "Reserva guardada pero sin avisar: faltan NOTIFY_BRIDGE_URL o NOTIFY_SECRET",
      "bookingId", record.id
    );
    return e.next();
  }

  const payload = {
    secret: secret,
    booking: {
      id:            record.id,
      fullName:      record.getString("fullName"),
      phone:         record.getString("phone"),
      email:         record.getString("email"),
      modality:      record.getString("modality"),
      preferredDate: record.getString("preferredDate"),
      preferredTime: record.getString("preferredTime"),
      notes:         record.getString("notes")
    }
  };

  try {
    const res = $http.send({
      url:     bridgeUrl,
      method:  "POST",
      body:    JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      timeout: 25 // segundos. Apps Script tarda en despertar.
    });

    if (res.statusCode === 200) {
      // Se marca la reserva como avisada para que el personal
      // vea en el panel cuales salieron y cuales no.
      record.set("notified", true);
      $app.save(record);
    } else {
      $app.logger().error(
        "El puente respondio con error",
        "bookingId", record.id,
        "status", res.statusCode,
        "body", res.raw
      );
    }
  } catch (err) {
    // Muy importante: NO relanzar el error.
    // Si este gancho falla, PocketBase revierte la creacion y el
    // paciente pierde la reserva. Preferimos guardar siempre y
    // que el aviso sea lo que falle.
    $app.logger().error(
      "No se pudo avisar al puente",
      "bookingId", record.id,
      "error", String(err)
    );
  }

  return e.next();
}, "bookings");


/**
 * ------------------------------------------------------------
 *  FRENO ANTI-SPAM
 * ------------------------------------------------------------
 *  La coleccion "bookings" permite crear a cualquiera, porque
 *  cualquier paciente tiene que poder reservar sin cuenta. El
 *  efecto secundario es que alguien podria lanzar cientos de
 *  reservas falsas y llenar de avisos el WhatsApp de la clinica.
 *
 *  Este gancho limita a 3 reservas por correo cada 30 minutos.
 *  Es una medida sencilla; si algun dia hace falta algo mas
 *  serio, lo natural es anadir un captcha en el formulario.
 * ------------------------------------------------------------
 */
onRecordCreateRequest((e) => {
  const email = e.record.getString("email");
  if (!email) return e.next();

  const desde = new Date(Date.now() - 30 * 60 * 1000).toISOString().replace("T", " ");

  const recientes = $app.findRecordsByFilter(
    "bookings",
    "email = {:email} && created > {:desde}",
    "-created",
    5,
    0,
    { email: email, desde: desde }
  );

  if (recientes.length >= 3) {
    throw new BadRequestError(
      "Too many booking requests from this email. Please wait a few minutes or call us directly."
    );
  }

  return e.next();
}, "bookings");
