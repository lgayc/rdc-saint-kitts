/**
 * ============================================================
 *  BOOKING.JS — appointment form submission
 * ============================================================
 * This is a STATIC website: there is no server of our own to
 * receive the form, so submissions go to Formspree (a free
 * form-backend service) which then emails the clinic.
 *
 * WHERE THINGS GO ON SUBMIT:
 *   1. Real mode  — SITE_CONFIG.booking.formEndpoint is a real
 *      Formspree URL -> we POST the form data there. Formspree
 *      emails it to whoever is configured on formspree.io.
 *   2. Setup mode — formEndpoint is still the placeholder value
 *      -> we can't send anywhere real yet, so we open a pre-filled
 *      email (mailto:) to SITE_CONFIG.booking.testNotificationEmail
 *      so testing isn't blocked while Formspree gets connected.
 *
 * GOOGLE CALENDAR + WHATSAPP NOTIFICATIONS:
 *   Formspree alone only sends email. To also create a Google
 *   Calendar event and/or send a WhatsApp message when someone
 *   books, connect a free Zapier "Zap" that watches the Formspree
 *   form and adds those two actions. Full step-by-step: README.md
 *   -> "Booking notifications" section.
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("bookingForm");
  if (!form) return;

  form.addEventListener("submit", handleBookingSubmit);
});

async function handleBookingSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const statusEl = document.getElementById("formStatus");
  const submitBtn = document.getElementById("bookingSubmit");
  const cfg = SITE_CONFIG.booking;

  const data = Object.fromEntries(new FormData(form).entries());
  data.clinicName = SITE_CONFIG.clinicName;
  data.submittedAt = new Date().toLocaleString();

  const isConfigured = cfg.formEndpoint && !cfg.formEndpoint.includes("REPLACE_WITH_YOUR_FORM_ID");

  setSubmitting(submitBtn, true);
  statusEl.className = "form-status";
  statusEl.textContent = "";

  try {
    if (isConfigured) {
      await submitToFormspree(cfg.formEndpoint, data);
      showStatus(statusEl, "success", "Thanks! Your request was sent — we'll confirm your appointment shortly.");
      form.reset();
    } else {
      // Setup-mode fallback: no live endpoint yet, so hand the
      // booking to the team via a pre-filled email instead of
      // silently failing.
      openFallbackEmail(cfg.testNotificationEmail, data);
      showStatus(
        statusEl,
        "success",
        "Booking form isn't connected to Formspree yet, so we opened an email draft with your details instead. See README.md to finish setup."
      );
    }
  } catch (err) {
    console.error("Booking submission failed:", err);
    showStatus(statusEl, "error", "Something went wrong sending your request. Please call or WhatsApp us instead.");
  } finally {
    setSubmitting(submitBtn, false);
  }
}

async function submitToFormspree(endpoint, data) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(`Formspree responded with ${response.status}`);
}

function openFallbackEmail(toEmail, data) {
  const subject = encodeURIComponent(`New appointment request — ${data.fullName}`);
  const body = encodeURIComponent(
    `New booking request from the website:\n\n` +
    `Name: ${data.fullName}\n` +
    `Phone: ${data.phone}\n` +
    `Email: ${data.email}\n` +
    `Modality: ${data.modality}\n` +
    `Preferred date: ${data.preferredDate}\n` +
    `Preferred time: ${data.preferredTime}\n` +
    `Notes: ${data.notes || "—"}\n\n` +
    `Submitted: ${data.submittedAt}`
  );
  window.open(`mailto:${toEmail}?subject=${subject}&body=${body}`, "_blank");
}

function setSubmitting(btn, isSubmitting) {
  btn.disabled = isSubmitting;
  btn.textContent = isSubmitting ? "Sending..." : "Request Appointment";
}

function showStatus(el, type, message) {
  el.classList.add(type);
  el.textContent = message;
}
