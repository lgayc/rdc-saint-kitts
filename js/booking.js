/**
 * ============================================================
 *  BOOKING.JS - Formulario de reservas
 * ============================================================
 *  Que hace este archivo:
 *
 *   1. VALIDA el formulario antes de enviar nada.
 *      Sin telefono valido y sin correo valido NO se envia.
 *      Cada campo muestra su propio mensaje de error debajo.
 *
 *   2. ENVIA la reserva a la Edge Function `book` de Supabase,
 *      que la guarda y avisa por correo, WhatsApp y Calendar.
 *      El navegador NO escribe en la base de datos.
 *
 *   3. MODO PRUEBA: si Supabase no esta configurado en
 *      js/config.js, el formulario valida igual pero abre un
 *      correo prellenado en vez de enviarlo. Asi se puede probar
 *      el sitio antes de conectar el backend.
 *
 *  La validacion se repite en el servidor
 *  (supabase/functions/book/index.ts). Eso es a proposito: la del
 *  navegador es por comodidad del usuario, la del servidor es la
 *  que realmente protege, porque cualquiera puede saltarse este
 *  formulario y llamar a la URL directamente.
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("bookingForm");
  if (!form) return;

  setupDateLimits();
  setupLiveValidation(form);

  form.addEventListener("submit", handleBookingSubmit);
});


/* ----------------------------------------------------------------
   1. REGLAS DE VALIDACION
   ----------------------------------------------------------------
   Cada regla devuelve un mensaje de error, o "" si el campo esta
   bien. Para agregar un campo nuevo, agrega su regla aqui.
   ---------------------------------------------------------------- */

const VALIDATORS = {
  fullName(value) {
    if (!value.trim()) return "Please enter your full name.";
    if (value.trim().length < 3) return "Please enter your complete name.";
    return "";
  },

  // OBLIGATORIO - sin esto no se envia
  phone(value) {
    if (!value.trim()) return "Phone number is required so we can confirm your appointment.";
    const digits = value.replace(/\D/g, "");
    if (digits.length < 7) return "Please enter a valid phone number (at least 7 digits).";
    if (digits.length > 15) return "That phone number looks too long.";
    return "";
  },

  // OBLIGATORIO - sin esto no se envia
  email(value) {
    if (!value.trim()) return "Email is required so we can send your confirmation.";
    // Formato basico: algo@algo.algo
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())) {
      return "Please enter a valid email address.";
    }
    return "";
  },

  modality(value) {
    return value ? "" : "Please select the imaging service you need.";
  },

  preferredDate(value) {
    if (!value) return "Please choose a date.";

    const chosen = new Date(value + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (chosen < today) return "Please choose a date that hasn't passed.";
    return "";
  },

  preferredTime(value) {
    return value ? "" : "Please choose a time.";
  }

  // "notes" no se valida: es opcional
};


/* ----------------------------------------------------------------
   2. VALIDACION EN VIVO
   Marca el error cuando el usuario sale del campo, y lo limpia
   apenas empieza a corregirlo. Menos frustrante que avisar solo
   al final.
   ---------------------------------------------------------------- */

function setupLiveValidation(form) {
  Object.keys(VALIDATORS).forEach(fieldName => {
    const field = form.elements[fieldName];
    if (!field) return;

    field.addEventListener("blur", () => validateField(field));
    field.addEventListener("input", () => clearFieldError(field));
    field.addEventListener("change", () => clearFieldError(field));
  });
}

/** Valida un campo y pinta/limpia su error. Devuelve true si esta bien. */
function validateField(field) {
  const validator = VALIDATORS[field.name];
  if (!validator) return true;

  const message = validator(field.value);
  if (message) {
    showFieldError(field, message);
    return false;
  }
  clearFieldError(field);
  return true;
}

/** Valida todo el formulario. Devuelve true solo si TODO esta bien. */
function validateForm(form) {
  let firstInvalid = null;

  Object.keys(VALIDATORS).forEach(fieldName => {
    const field = form.elements[fieldName];
    if (!field) return;

    if (!validateField(field) && !firstInvalid) {
      firstInvalid = field;
    }
  });

  // Lleva al usuario al primer campo con problema
  if (firstInvalid) {
    firstInvalid.focus();
    firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }
  return true;
}

function showFieldError(field, message) {
  field.classList.add("has-error");
  field.setAttribute("aria-invalid", "true");

  const errorEl = getErrorElement(field);
  errorEl.textContent = message;
  errorEl.style.display = "block";
}

function clearFieldError(field) {
  field.classList.remove("has-error");
  field.removeAttribute("aria-invalid");

  const errorEl = getErrorElement(field);
  errorEl.textContent = "";
  errorEl.style.display = "none";
}

/** Busca (o crea) el <p> donde se muestra el error de ese campo */
function getErrorElement(field) {
  let el = field.parentElement.querySelector(".field-error");
  if (!el) {
    el = document.createElement("p");
    el.className = "field-error";
    el.setAttribute("role", "alert");
    field.parentElement.appendChild(el);
  }
  return el;
}


/* ----------------------------------------------------------------
   3. LIMITES DE FECHA
   No se puede reservar en el pasado, ni con menos anticipacion
   que la configurada en SITE_CONFIG.booking.minHoursAhead.
   ---------------------------------------------------------------- */

function setupDateLimits() {
  const dateInput = document.getElementById("preferredDate");
  if (!dateInput) return;

  const minHours = SITE_CONFIG.booking.minHoursAhead || 0;
  const earliest = new Date(Date.now() + minHours * 3600 * 1000);

  dateInput.min = earliest.toISOString().split("T")[0];
}


/* ----------------------------------------------------------------
   4. ENVIO
   ---------------------------------------------------------------- */

async function handleBookingSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const statusEl = document.getElementById("formStatus");
  const submitBtn = document.getElementById("bookingSubmit");

  // PUERTA PRINCIPAL: si algo falta o esta mal, no pasa de aqui.
  if (!validateForm(form)) {
    showStatus(statusEl, "error", "Please fix the highlighted fields before submitting.");
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  data.submittedAt = new Date().toLocaleString();

  const isConnected = typeof RDC_API !== "undefined" && RDC_API.isConfigured();

  setSubmitting(submitBtn, true);
  clearStatus(statusEl);

  try {
    if (isConnected) {
      const result = await sendToBackend(data);
      showStatus(
        statusEl,
        "success",
        `Thank you! Your request was received (ref. ${result.ref}). ` +
          "We'll contact you shortly to confirm."
      );
      form.reset();
    } else {
      // Modo prueba: el backend todavia no esta conectado
      openFallbackEmail(data);
      showStatus(
        statusEl,
        "success",
        "Test mode: the booking system isn't connected yet, so we opened an email draft with your details. See backend/SUPABASE.md to finish setup."
      );
    }
  } catch (err) {
    console.error("Error al enviar la reserva:", err);

    // El mensaje del servidor se muestra tal cual cuando lo hay:
    // distingue "demasiadas solicitudes, espera unos minutos" de
    // un fallo de red, y eso le sirve al paciente. Si no hay
    // mensaje, se cae al telefono, que es la salida que siempre
    // funciona aunque el backend este pausado o caido.
    showStatus(
      statusEl,
      "error",
      (err && err.message ? err.message + " " : "We couldn't send your request. ") +
        "You can also call or WhatsApp us: " +
        SITE_CONFIG.contact.phoneDisplay
    );
  } finally {
    setSubmitting(submitBtn, false);
  }
}

/**
 * Manda la reserva a la Edge Function `book` de Supabase.
 *
 * El navegador NO escribe en la base de datos. La funcion valida
 * otra vez del lado del servidor, guarda con permisos elevados y
 * dispara los avisos. Asi la tabla de reservas no necesita ninguna
 * politica de escritura publica: desde aqui es inalcanzable.
 *
 * Los detalles de red viven en js/supabase-api.js.
 */
async function sendToBackend(data) {
  const result = await RDC_API.submitBooking(data);

  return result;
}

/** Respaldo cuando el backend aun no esta conectado */
function openFallbackEmail(data) {
  const to = SITE_CONFIG.notifications.email;
  const subject = encodeURIComponent(`New appointment request - ${data.fullName}`);
  const body = encodeURIComponent(
    "New booking request from the website:\n\n" +
    `Name: ${data.fullName}\n` +
    `Phone: ${data.phone}\n` +
    `Email: ${data.email}\n` +
    `Service: ${data.modality}\n` +
    `Preferred date: ${data.preferredDate}\n` +
    `Preferred time: ${data.preferredTime}\n` +
    `Notes: ${data.notes || "-"}\n\n` +
    `Submitted: ${data.submittedAt}`
  );

  window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_blank");
}


/* ----------------------------------------------------------------
   5. ESTADO DEL BOTON Y MENSAJES
   ---------------------------------------------------------------- */

function setSubmitting(btn, isSubmitting) {
  btn.disabled = isSubmitting;
  btn.textContent = isSubmitting ? "Sending..." : "Request Appointment";
}

function showStatus(el, type, message) {
  el.className = "form-status " + type;
  el.textContent = message;
}

function clearStatus(el) {
  el.className = "form-status";
  el.textContent = "";
}
