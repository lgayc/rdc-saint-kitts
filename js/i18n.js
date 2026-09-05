/**
 * ============================================================
 *  RDC_I18N · el sitio en ingles y en español
 * ============================================================
 *  Tres tipos de texto conviven en esta pagina, y cada uno se
 *  traduce de una forma distinta. Conviene tenerlos claros antes
 *  de tocar nada:
 *
 *    1. TEXTO FIJO  (menu, botones, etiquetas del formulario,
 *       mensajes de error). Vive en el diccionario de este
 *       archivo. En el HTML se marca con data-i18n="clave".
 *
 *    2. TEXTO DE CONFIGURACION  (nombres de los estudios, sus
 *       descripciones, los horarios). Vive en js/config.js, y
 *       ahi cada valor puede ser una cadena suelta o un objeto
 *       { en: "...", es: "..." }. Lo resuelve pick().
 *
 *    3. TEXTO QUE ESCRIBE LA CLINICA  (titular del banner,
 *       promocion, publicaciones). Vive en la base de datos, con
 *       una columna por idioma. Lo resuelve la capa de red, no
 *       este archivo.
 *
 *  ------------------------------------------------------------
 *  POR QUE NO SE RECARGA LA PAGINA AL CAMBIAR DE IDIOMA
 *  Recargar seria mas simple de programar, pero el visitante
 *  pierde el sitio donde estaba y, si iba por la mitad del
 *  formulario de reserva, pierde lo que habia escrito. Cambiar
 *  el idioma no puede costarle a nadie una reserva. Asi que se
 *  repinta el texto en vivo y se avisa por un evento
 *  "rdc:lang-changed" a quien tenga que redibujar algo.
 *
 *  ------------------------------------------------------------
 *  SOBRE LAS TRADUCCIONES MEDICAS
 *  Los nombres de los estudios y sus explicaciones estan
 *  traducidos con el vocabulario que usa un paciente, no con el
 *  de un informe radiologico. "Bone Densitometry" es
 *  "Densitometria osea", no "absorciometria dual de rayos X",
 *  aunque lo segundo sea mas preciso: quien lee esta pagina esta
 *  decidiendo si pedir cita, no redactando un informe.
 *
 *  Aun asi, LO MEDICO LO TIENE QUE REVISAR EL RADIOLOGO, igual
 *  que la version en ingles. Vale para las dos.
 * ============================================================
 */

const RDC_I18N = (function () {
  "use strict";

  const IDIOMAS = ["en", "es"];
  const POR_DEFECTO = "en";
  const CLAVE_GUARDADA = "rdc-lang";

  /* ==========================================================
     DICCIONARIO
     ==========================================================
     Las claves van por seccion para poder encontrarlas. Si una
     clave falta en español, pick() cae al ingles en vez de
     enseñar la clave cruda: mejor una palabra en el idioma
     equivocado que "booking.submit" en mitad de un boton.
     ========================================================== */
  const DICT = {
    en: {
      "lang.switch": "Español",
      "lang.switchAria": "Ver este sitio en español",

      "nav.about": "Who We Are",

      "about.eyebrow": "Who We Are",
      "about.pillar1": "Modern equipment",
      "about.pillar2": "Qualified team",
      "about.pillar3": "Results without the wait",
      "nav.modalities": "Modalities",
      "nav.studies": "Studies & Work",
      "nav.contact": "Contact",
      "nav.staff": "Admin",
      "nav.book": "Book Appointment",
      "nav.toggle": "Toggle menu",

      "hero.eyebrow": "Diagnostic Imaging · St. Kitts & Nevis",
      "hero.ctaBook": "Book an Appointment",
      "hero.ctaServices": "See Our Services",
      "hero.scroll": "Scroll",

      "modalities.eyebrow": "What We Offer",
      "modalities.heading": "Our Modalities",
      "modalities.sub": "Scroll down to move through our services. Tap any card to learn more about the study.",
      "modalities.cardAria": "see details",
      "modalities.learnMore": "Learn more",

      "modal.eyebrow": "Imaging service",
      "modal.usedFor": "Commonly used for",
      "modal.duration": "Typical duration",
      "modal.preparation": "How to prepare",
      "modal.note": "This is general information. Your doctor or our radiologist will confirm what applies to your specific case.",
      "modal.cta": "Book this study",
      "modal.close": "Close",

      "booking.eyebrow": "Book an Appointment",
      "booking.heading": "Let's find you a time.",
      "booking.sub": "Fill out the form and our team will confirm your appointment. Prefer to talk? Call or WhatsApp us directly.",
      "booking.call": "Call the Center",
      "booking.whatsapp": "WhatsApp Us",
      "booking.fullName": "Full Name",
      "booking.phone": "Phone Number",
      "booking.email": "Email",
      "booking.modality": "Imaging Needed",
      "booking.modalityPlaceholder": "Select a modality",
      "booking.date": "Preferred Date",
      "booking.time": "Preferred Time",
      "booking.timePlaceholder": "Select a time",
      "booking.notes": "Notes (optional)",
      "booking.notesPlaceholder": "Anything we should know before your visit?",
      "booking.honeypot": "Leave this field empty",
      "booking.submit": "Request Appointment",
      "booking.submitting": "Sending...",
      "booking.formNote": "Required. We need your phone and email to confirm your appointment.",

      "booking.errName": "Please enter your full name.",
      "booking.errNameShort": "Please enter your complete name.",
      "booking.errPhone": "Phone number is required so we can confirm your appointment.",
      "booking.errPhoneShort": "Please enter a valid phone number (at least 7 digits).",
      "booking.errPhoneLong": "That phone number looks too long.",
      "booking.errEmail": "Email is required so we can send your confirmation.",
      "booking.errEmailBad": "Please enter a valid email address.",
      "booking.errModality": "Please select the imaging service you need.",
      "booking.errDate": "Please choose a date.",
      "booking.errDatePast": "Please choose a date that hasn't passed.",
      "booking.errTime": "Please choose a time.",
      "booking.errForm": "Please fix the highlighted fields before submitting.",
      "booking.okTitle": "Request received.",
      "booking.okBody": "We'll contact you shortly to confirm.",
      "booking.failLead": "We couldn't send your request.",
      "booking.failTail": "You can also call or WhatsApp us:",

      "studies.eyebrow": "From the Center",
      "studies.heading": "Studies & Work We're Sharing",
      "studies.sub": "Updates, news, and imaging highlights from our team.",
      "studies.empty": "Check back soon for updates from our team.",
      "studies.untitled": "Untitled Post",

      "contact.eyebrow": "Visit or Reach Us",
      "contact.heading": "Get in Touch",
      "contact.directions": "Get directions",
      "contact.mapLabel": "Map showing the clinic location",

      "footer.rights": "All rights reserved.",
    },

    es: {
      "lang.switch": "English",
      "lang.switchAria": "View this site in English",

      "nav.about": "Quiénes somos",

      "about.eyebrow": "Quiénes somos",
      "about.pillar1": "Equipos modernos",
      "about.pillar2": "Equipo cualificado",
      "about.pillar3": "Resultados sin esperas",
      "nav.modalities": "Estudios",
      "nav.studies": "Novedades",
      "nav.contact": "Contacto",
      "nav.staff": "Admin",
      "nav.book": "Pedir cita",
      "nav.toggle": "Abrir el menú",

      "hero.eyebrow": "Imagenología diagnóstica · San Cristóbal y Nieves",
      "hero.ctaBook": "Pedir una cita",
      "hero.ctaServices": "Ver nuestros estudios",
      "hero.scroll": "Baja",

      "modalities.eyebrow": "Lo que ofrecemos",
      "modalities.heading": "Nuestros estudios",
      "modalities.sub": "Baja para recorrer nuestros estudios. Toca cualquier tarjeta para saber más.",
      "modalities.cardAria": "ver detalles",
      "modalities.learnMore": "Saber más",

      "modal.eyebrow": "Estudio de imagen",
      "modal.usedFor": "Se usa habitualmente para",
      "modal.duration": "Duración aproximada",
      "modal.preparation": "Cómo prepararse",
      "modal.note": "Esta es información general. Su médico o nuestro radiólogo le confirmará qué aplica en su caso.",
      "modal.cta": "Pedir este estudio",
      "modal.close": "Cerrar",

      "booking.eyebrow": "Pedir una cita",
      "booking.heading": "Busquemos su horario.",
      "booking.sub": "Complete el formulario y nuestro equipo le confirmará la cita. ¿Prefiere hablar? Llámenos o escríbanos por WhatsApp.",
      "booking.call": "Llamar al centro",
      "booking.whatsapp": "Escribir por WhatsApp",
      "booking.fullName": "Nombre completo",
      "booking.phone": "Teléfono",
      "booking.email": "Correo electrónico",
      "booking.modality": "Estudio que necesita",
      "booking.modalityPlaceholder": "Elija un estudio",
      "booking.date": "Fecha preferida",
      "booking.time": "Hora preferida",
      "booking.timePlaceholder": "Elija una hora",
      "booking.notes": "Notas (opcional)",
      "booking.notesPlaceholder": "¿Algo que debamos saber antes de su visita?",
      "booking.honeypot": "Deje este campo vacío",
      "booking.submit": "Solicitar cita",
      "booking.submitting": "Enviando...",
      "booking.formNote": "Obligatorio. Necesitamos su teléfono y su correo para confirmarle la cita.",

      "booking.errName": "Escriba su nombre completo.",
      "booking.errNameShort": "Escriba su nombre completo.",
      "booking.errPhone": "El teléfono es necesario para poder confirmarle la cita.",
      "booking.errPhoneShort": "Escriba un teléfono válido (al menos 7 dígitos).",
      "booking.errPhoneLong": "Ese teléfono parece demasiado largo.",
      "booking.errEmail": "El correo es necesario para enviarle la confirmación.",
      "booking.errEmailBad": "Escriba una dirección de correo válida.",
      "booking.errModality": "Elija el estudio que necesita.",
      "booking.errDate": "Elija una fecha.",
      "booking.errDatePast": "Elija una fecha que no haya pasado.",
      "booking.errTime": "Elija una hora.",
      "booking.errForm": "Corrija los campos marcados antes de enviar.",
      "booking.okTitle": "Solicitud recibida.",
      "booking.okBody": "Le contactaremos en breve para confirmar.",
      "booking.failLead": "No pudimos enviar su solicitud.",
      "booking.failTail": "También puede llamarnos o escribirnos por WhatsApp:",

      "studies.eyebrow": "Desde el centro",
      "studies.heading": "Novedades y trabajo del centro",
      "studies.sub": "Noticias, avisos y casos destacados de nuestro equipo.",
      "studies.empty": "Pronto publicaremos novedades de nuestro equipo.",
      "studies.untitled": "Publicación sin título",

      "contact.eyebrow": "Visítenos o escríbanos",
      "contact.heading": "Cómo contactarnos",
      "contact.directions": "Cómo llegar",
      "contact.mapLabel": "Mapa con la ubicación de la clínica",

      "footer.rights": "Todos los derechos reservados.",
    },
  };

  /* ==========================================================
     ELEGIR EL IDIOMA DE ARRANQUE
     ==========================================================
     Por orden de mando:

       1. ?lang=es en la direccion. Manda sobre todo lo demas
          para que la clinica pueda repartir un enlace directo
          en español por WhatsApp.
       2. Lo que el visitante eligio la vez anterior.
       3. El idioma del navegador.
       4. Ingles, que es el idioma oficial de San Cristobal.
     ========================================================== */
  function normalizar(valor) {
    const v = String(valor || "").toLowerCase().slice(0, 2);
    return IDIOMAS.indexOf(v) !== -1 ? v : null;
  }

  function leerGuardado() {
    try {
      return normalizar(window.localStorage.getItem(CLAVE_GUARDADA));
    } catch {
      // Navegacion privada o almacenamiento bloqueado. No es un
      // error: simplemente no hay preferencia guardada.
      return null;
    }
  }

  function guardar(lang) {
    try {
      window.localStorage.setItem(CLAVE_GUARDADA, lang);
    } catch {
      // Si no se puede guardar, el idioma dura lo que dura la
      // visita. Preferible a romper la pagina.
    }
  }

  function detectar() {
    let desdeUrl = null;
    try {
      desdeUrl = normalizar(new URLSearchParams(location.search).get("lang"));
    } catch {
      desdeUrl = null;
    }

    return desdeUrl
      || leerGuardado()
      || normalizar(navigator.language)
      || POR_DEFECTO;
  }

  let actual = detectar();

  /* ==========================================================
     TRADUCIR
     ========================================================== */

  /** Texto fijo por clave. */
  function t(clave) {
    const tabla = DICT[actual] || DICT[POR_DEFECTO];
    if (Object.prototype.hasOwnProperty.call(tabla, clave)) return tabla[clave];

    // Falta en este idioma: se cae al ingles antes que enseñar la
    // clave. Y se avisa por consola, porque una traduccion que
    // falta hay que arreglarla, no taparla.
    const respaldo = DICT[POR_DEFECTO][clave];
    if (respaldo === undefined) {
      console.warn(`i18n: no existe la clave "${clave}"`);
      return "";
    }
    console.warn(`i18n: falta "${clave}" en ${actual}; se usa el ingles`);
    return respaldo;
  }

  /**
   * Resuelve un valor de config.js que puede venir en dos formas:
   *
   *     "Digital X-Ray"                          -> igual en los dos
   *     { en: "Digital X-Ray", es: "Radiografia" } -> segun idioma
   *
   * Aceptar las dos permite traducir config.js poco a poco: lo que
   * no lleve objeto sigue funcionando tal cual. Tambien vale para
   * arrays, para las listas de "se usa para".
   */
  function pick(valor) {
    if (valor == null) return valor;
    if (Array.isArray(valor)) return valor.map(pick);
    if (typeof valor !== "object") return valor;

    // Un objeto con claves de idioma. Si falta el actual, se cae
    // al ingles, y si tampoco, a lo primero que haya.
    if (valor[actual] !== undefined) return valor[actual];
    if (valor[POR_DEFECTO] !== undefined) return valor[POR_DEFECTO];

    const primero = IDIOMAS.map((l) => valor[l]).find((v) => v !== undefined);
    return primero !== undefined ? primero : valor;
  }

  /* ==========================================================
     PINTAR EL HTML
     ==========================================================
     Recorre el documento y sustituye:

       data-i18n="clave"              -> el texto del elemento
       data-i18n-placeholder="clave"  -> su placeholder
       data-i18n-aria="clave"         -> su aria-label
       data-i18n-title="clave"        -> su title

     Se usa textContent y NO innerHTML: el diccionario es nuestro,
     pero si algun dia una traduccion llega de fuera, esto ya no
     puede inyectar etiquetas.
     ========================================================== */
  function apply(raiz) {
    const root = raiz || document;

    root.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });

    const atributos = [
      ["data-i18n-placeholder", "placeholder"],
      ["data-i18n-aria", "aria-label"],
      ["data-i18n-title", "title"],
    ];

    atributos.forEach(([marca, atributo]) => {
      root.querySelectorAll(`[${marca}]`).forEach((el) => {
        el.setAttribute(atributo, t(el.getAttribute(marca)));
      });
    });

    document.documentElement.lang = actual;
  }

  /* ==========================================================
     CAMBIAR DE IDIOMA
     ========================================================== */
  function set(lang) {
    const nuevo = normalizar(lang);
    if (!nuevo || nuevo === actual) return;

    actual = nuevo;
    guardar(nuevo);
    apply();

    // Quien dibuje contenido a mano (las tarjetas de estudios, las
    // publicaciones, los desplegables del formulario) escucha esto
    // y se redibuja. No se recarga la pagina a proposito: ver la
    // nota de arriba.
    document.dispatchEvent(new CustomEvent("rdc:lang-changed", {
      detail: { lang: nuevo },
    }));
  }

  function toggle() {
    set(actual === "en" ? "es" : "en");
  }

  function current() {
    return actual;
  }

  return { t, pick, apply, set, toggle, current, IDIOMAS };
})();
