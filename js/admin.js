/**
 * ============================================================
 *  ADMIN.JS - Logica del panel de administracion
 * ============================================================
 *  Secciones de este archivo:
 *    1. Estado y arranque
 *    2. Inicio de sesion
 *    3. Comunicacion con el backend
 *   3b. Backend simulado (modo demostracion)
 *    4. Pestanas
 *    5. Reservas
 *    6. Contenido
 *    7. Fotos del banner
 *    8. Promocion y textos
 *    9. Publicaciones
 *   10. Utilidades
 *
 *  SOBRE LA SEGURIDAD:
 *  No hay ninguna contrasena en este archivo. Se entra con una
 *  cuenta de Supabase Auth (correo y contrasena), y supabase-js
 *  guarda y renueva la sesion solo.
 *
 *  Ademas de tener cuenta, el usuario tiene que estar dado de alta
 *  en la tabla `staff`. Son dos comprobaciones distintas a
 *  proposito: si algun dia se habilitara el registro publico por
 *  error, un desconocido tendria cuenta pero seguiria sin poder
 *  ver una sola reserva.
 *
 *  Y lo mas importante: esconder esta pantalla NO es lo que
 *  protege los datos. Lo que decide quien ve que es Row Level
 *  Security dentro de la base. Aunque alguien saltara todo este
 *  archivo y llamara a la API a mano, sin sesion valida de
 *  personal no recibiria ni una fila.
 * ============================================================
 */


/* ----------------------------------------------------------------
   1. ESTADO Y ARRANQUE
   ---------------------------------------------------------------- */

const state = {
  bookings: [],
  filter: "all",
  content: {
    heroTitle: { en: "", es: "" },
    heroSubtitle: { en: "", es: "" },
    promoText: { en: "", es: "" },
    slides: [],
    studies: []
  }
};

/**
 * MODO DEMOSTRACION
 * ----------------------------------------------------------------
 * Cuando todavia no hay backend conectado, el panel funciona con
 * datos de ejemplo para que se pueda ver y probar. Nada se guarda:
 * al recargar, todo vuelve al estado inicial.
 *
 * Se apaga solo en cuanto config.js tenga la url y la anonKey de
 * Supabase: ahi el panel pasa a hablar con la base de verdad y a
 * pedir una cuenta real.
 */
let DEMO = false;

/** True si Supabase esta configurado en js/config.js */
function hasBackend() {
  return typeof RDC_API !== "undefined" && RDC_API.isConfigured();
}

document.addEventListener("DOMContentLoaded", () => {
  if (!hasBackend()) {
    // Sin backend: o entramos en modo demo, o avisamos que falta
    // configurar. Antes aqui solo se mostraba el aviso y no habia
    // manera de entrar al panel para verlo.
    if (SITE_CONFIG.admin && SITE_CONFIG.admin.demoMode) {
      DEMO = true;
      showDemoNotice();
    } else {
      showSetupRequired();
      return;
    }
  } else {
    // Con Supabase conectado hace falta el correo. En demo no,
    // porque ahi solo hay una contrasena de ejemplo.
    const emailRow = document.getElementById("emailRow");
    if (emailRow) emailRow.hidden = false;
    document.getElementById("loginEmail").required = true;
  }

  setupLogin();
  setupTabs();
  setupBookingsUI();
  setupBannerUI();
  setupPromoUI();
  setupPostsUI();

  restoreSession();
});

/** Aviso cuando no hay backend Y el modo demo esta apagado */
function showSetupRequired() {
  document.getElementById("loginScreen").innerHTML = `
    <div class="login-card">
      <h1>Setup Required</h1>
      <p class="login-sub">
        The admin panel isn't connected yet. Open
        <code>js/config.js</code> and fill in <code>supabase.url</code>
        and <code>supabase.anonKey</code>.
      </p>
      <p class="login-sub">See <strong>backend/SUPABASE.md</strong> for the full steps.</p>
    </div>
  `;
}

/** Cartel en el login explicando que es una demostracion */
function showDemoNotice() {
  const banner = document.getElementById("demoNotice");
  if (banner) {
    banner.hidden = false;
    banner.innerHTML = `
      <strong>Demo mode.</strong>
      Sign in with <code>${escapeHtml(SITE_CONFIG.admin.demoPassword)}</code>
      to explore the panel. Sample data only — nothing is saved.
    `;
  }

  const topBar = document.getElementById("demoBar");
  if (topBar) topBar.hidden = false;
}

/**
 * Si ya habia una sesion activa, entrar directo.
 *
 * En modo demostracion no se restaura nada a proposito: cada
 * recarga empieza de cero, que es lo que se espera de una demo.
 * Con Supabase, la sesion la guarda y la renueva supabase-js.
 */
async function restoreSession() {
  if (DEMO) return;

  try {
    const session = await RDC_API.admin.currentSession();
    if (session) enterPanel();
  } catch (err) {
    console.warn("No se pudo recuperar la sesion:", err);
  }
}


/* ----------------------------------------------------------------
   2. INICIO DE SESION
   ---------------------------------------------------------------- */

function setupLogin() {
  const form = document.getElementById("loginForm");
  const statusEl = document.getElementById("loginStatus");
  const btn = document.getElementById("loginBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = (document.getElementById("loginEmail").value || "").trim();
    const password = document.getElementById("password").value;

    if (!password) {
      setStatus(statusEl, "error", "Please enter the password.");
      return;
    }
    if (!DEMO && !email) {
      setStatus(statusEl, "error", "Please enter your email.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Signing in...";
    setStatus(statusEl, "", "");

    try {
      const result = await api("login", { email, password });

      if (!result.ok) {
        setStatus(statusEl, "error", result.error || "Incorrect password.");
        return;
      }

      enterPanel();
    } catch (err) {
      setStatus(statusEl, "error", "Couldn't reach the server. Check your connection.");
      console.error(err);
    } finally {
      btn.disabled = false;
      btn.textContent = "Sign In";
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", logout);
}

function enterPanel() {
  document.getElementById("loginScreen").hidden = true;
  document.getElementById("adminShell").hidden = false;

  loadBookings();
  loadContent();
}

async function logout() {
  if (!DEMO) {
    try {
      await RDC_API.admin.signOut();
    } catch (err) {
      // Aunque falle el cierre remoto, se recarga igual: quien
      // pulsa "salir" espera salir. supabase-js ya borro la sesion
      // local antes de intentar avisar al servidor.
      console.warn("No se pudo cerrar sesion limpiamente:", err);
    }
  }
  location.reload();
}


/* ----------------------------------------------------------------
   3. COMUNICACION CON EL BACKEND
   ----------------------------------------------------------------
   Toda la red pasa por esta unica funcion, que reparte hacia
   RDC_API (js/supabase-api.js) o hacia el backend simulado del
   modo demostracion.

   Este reparto es lo que permitio cambiar de Apps Script a
   Supabase sin tocar nada de las secciones 4 a 9: todas siguen
   recibiendo { ok: true, ... } con los mismos nombres de campo.
   Si algun dia hay que migrar otra vez, el trabajo vuelve a estar
   aqui dentro.
   ---------------------------------------------------------------- */

async function api(action, payload = {}) {
  // En modo demostracion no se sale a internet: se responde con
  // datos de ejemplo guardados en memoria (ver demoApi mas abajo).
  if (DEMO) return demoApi(action, payload);

  switch (action) {
    case "login":
      return RDC_API.admin.signIn(payload.email, payload.password);

    case "listBookings":
      return RDC_API.admin.listBookings();

    case "setBookingStatus":
      return RDC_API.admin.setBookingStatus(payload.id, payload.status);

    case "getContent":
      return RDC_API.admin.getContent();

    case "saveContent":
      return RDC_API.admin.saveContent(payload.content);

    default:
      return { ok: false, error: "Accion no reconocida: " + action };
  }
}


/* ----------------------------------------------------------------
   3b. BACKEND SIMULADO (solo modo demostracion)
   ----------------------------------------------------------------
   Imita lo que haria el Apps Script, pero en memoria. Responde con
   la misma forma { ok: true, ... } para que el resto del panel no
   note la diferencia y no haya que duplicar codigo.

   Nada de esto se guarda: al recargar la pagina vuelve al inicio.
   ---------------------------------------------------------------- */

/** Reservas de ejemplo, con fechas relativas al dia de hoy */
function demoBookings() {
  const day = offset => {
    const d = new Date(Date.now() + offset * 86400000);
    return d.toISOString().split("T")[0];
  };

  return [
    {
      id: "RDC-DEMO-3", createdAt: new Date().toISOString(),
      fullName: "Marcia Williams", phone: "+1 869 765 1122",
      email: "marcia.w@example.com", modality: "MRI",
      date: day(3), time: "10:00 AM",
      notes: "Referred by Dr. Archibald. Lower back pain.",
      status: "Pendiente"
    },
    {
      id: "RDC-DEMO-2", createdAt: new Date().toISOString(),
      fullName: "Devon Bradshaw", phone: "+1 869 662 4410",
      email: "d.bradshaw@example.com", modality: "Digital X-Ray",
      date: day(1), time: "2:00 PM",
      notes: "",
      status: "Confirmada"
    },
    {
      id: "RDC-DEMO-1", createdAt: new Date().toISOString(),
      fullName: "Anita Pemberton", phone: "+1 869 764 8890",
      email: "anita.p@example.com", modality: "Ultrasound (incl. 3D/4D)",
      date: day(-2), time: "9:00 AM",
      notes: "Rescheduled from last week.",
      status: "Cancelada"
    }
  ];
}

// Los datos viven aqui mientras la pagina este abierta
let demoStore = null;

function demoApi(action, payload) {
  // Primera llamada: preparar los datos de ejemplo
  if (!demoStore) {
    demoStore = {
      bookings: demoBookings(),
      content: {
        heroTitle: { en: "", es: "" },
        heroSubtitle: { en: "", es: "" },
        promoText: { en: "", es: "" },
        slides: SITE_CONFIG.hero.slides.slice(),
        studies: []
      }
    };
  }

  switch (action) {
    case "login":
      return payload.password === SITE_CONFIG.admin.demoPassword
        ? { ok: true }
        : { ok: false, error: "Incorrect password. Try the one shown above." };

    case "listBookings":
      return { ok: true, bookings: demoStore.bookings };

    case "setBookingStatus": {
      const booking = demoStore.bookings.find(b => b.id === payload.id);
      if (booking) booking.status = payload.status;
      return { ok: true };
    }

    case "getContent":
      return { ok: true, content: demoStore.content };

    case "saveContent":
      demoStore.content = payload.content;
      return { ok: true, content: demoStore.content };

    default:
      return { ok: false, error: "Unknown action: " + action };
  }
}


/* ----------------------------------------------------------------
   4. PESTANAS
   ---------------------------------------------------------------- */

function setupTabs() {
  document.querySelectorAll(".admin-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".admin-panel").forEach(p => p.classList.remove("active"));

      tab.classList.add("active");
      document.getElementById("panel-" + tab.dataset.tab).classList.add("active");
    });
  });
}


/* ----------------------------------------------------------------
   5. RESERVAS
   ---------------------------------------------------------------- */

function setupBookingsUI() {
  document.getElementById("refreshBookings").addEventListener("click", loadBookings);

  // Filtros por estado
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      state.filter = chip.dataset.filter;
      renderBookings();
    });
  });
}

async function loadBookings() {
  const list = document.getElementById("bookingsList");
  list.innerHTML = `<p class="loading">Loading appointments...</p>`;

  try {
    const result = await api("listBookings");
    if (!result.ok) throw new Error(result.error);

    state.bookings = result.bookings || [];
    renderBookings();
  } catch (err) {
    list.innerHTML = `<p class="error-box">Couldn't load appointments. ${escapeHtml(err.message)}</p>`;
  }
}

function renderBookings() {
  const list = document.getElementById("bookingsList");

  const visible = state.filter === "all"
    ? state.bookings
    : state.bookings.filter(b => b.status === state.filter);

  // El contador de la pestana siempre muestra las pendientes,
  // que son las que requieren accion.
  const pending = state.bookings.filter(b => b.status === "Pendiente").length;
  document.getElementById("bookingCount").textContent = pending;

  if (!visible.length) {
    list.innerHTML = `<p class="empty-box">No appointments in this view.</p>`;
    return;
  }

  list.innerHTML = visible.map(bookingCard).join("");

  // Botones de cada tarjeta
  list.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      updateBookingStatus(btn.dataset.id, btn.dataset.action);
    });
  });
}

function bookingCard(b) {
  const statusClass = {
    "Pendiente": "pending",
    "Confirmada": "confirmed",
    "Cancelada": "cancelled"
  }[b.status] || "pending";

  const statusLabel = {
    "Pendiente": "Pending",
    "Confirmada": "Confirmed",
    "Cancelada": "Cancelled"
  }[b.status] || b.status;

  // Telefono y correo como enlaces: un toque y ya estas llamando
  const phoneDigits = String(b.phone || "").replace(/\D/g, "");

  return `
    <article class="booking-card ${statusClass}">
      <div class="booking-main">
        <div class="booking-top">
          <h3>${escapeHtml(b.fullName)}</h3>
          <span class="status-pill ${statusClass}">${statusLabel}</span>
        </div>

        <p class="booking-service">${escapeHtml(b.modality)}</p>

        <p class="booking-when">
          <strong>${escapeHtml(b.date)}</strong> at <strong>${escapeHtml(b.time)}</strong>
        </p>

        <div class="booking-contact">
          <a href="tel:${escapeAttr(phoneDigits)}">${escapeHtml(b.phone)}</a>
          <a href="mailto:${escapeAttr(b.email)}">${escapeHtml(b.email)}</a>
          <a href="https://wa.me/${escapeAttr(phoneDigits)}" target="_blank" rel="noopener">WhatsApp</a>
        </div>

        ${b.notes ? `<p class="booking-notes">"${escapeHtml(b.notes)}"</p>` : ""}

        ${notifyWarning(b)}

        <p class="booking-id">${escapeHtml(b.ref || b.id)}</p>
      </div>

      <div class="booking-actions">
        ${b.status !== "Confirmada"
          ? `<button class="btn-mini confirm" data-action="Confirmada" data-id="${escapeAttr(b.id)}">Confirm</button>`
          : ""}
        ${b.status !== "Cancelada"
          ? `<button class="btn-mini cancel" data-action="Cancelada" data-id="${escapeAttr(b.id)}">Cancel</button>`
          : ""}
        ${b.status !== "Pendiente"
          ? `<button class="btn-mini" data-action="Pendiente" data-id="${escapeAttr(b.id)}">Reopen</button>`
          : ""}
      </div>
    </article>
  `;
}

/**
 * Avisa cuando alguno de los tres canales no salio.
 *
 * Importa mas de lo que parece: si el WhatsApp fallo, nadie en la
 * clinica se entero de esa reserva por el movil, y solo la va a
 * ver quien abra este panel. Por eso se dice cual fallo, y no un
 * generico "hubo un problema".
 *
 * Las reservas anteriores a Supabase no traen este dato: se
 * detecta con `b.notified` y no se pinta nada para ellas.
 */
function notifyWarning(b) {
  if (!b.notified) return "";

  const failed = [
    b.notified.email ? null : "staff email",
    // Se nombra aparte del anterior a proposito: que el aviso
    // interno saliera no significa que el paciente recibiera su
    // copia, y al reves. Son dos correos distintos.
    b.notified.patient ? null : "patient copy",
    b.notified.whatsapp ? null : "WhatsApp",
    b.notified.calendar ? null : "calendar"
  ].filter(Boolean);

  if (!failed.length) return "";

  return `
    <p class="booking-warning" title="${escapeAttr(b.notifyError || "")}">
      Not delivered to: ${escapeHtml(failed.join(", "))}
    </p>
  `;
}

async function updateBookingStatus(id, status) {
  // Se actualiza en pantalla de inmediato para que se sienta
  // rapido; si el servidor falla, se recarga la lista real.
  const booking = state.bookings.find(b => b.id === id);
  const previous = booking ? booking.status : null;
  if (booking) booking.status = status;
  renderBookings();

  try {
    const result = await api("setBookingStatus", { id, status });
    if (!result.ok) throw new Error(result.error);

    /* --- Que paso con el correo al paciente ------------------
       Confirmar una cita ahora le manda un correo al paciente.
       Quien pulsa el boton tiene que saber si salio, porque de
       eso depende lo siguiente que haga: si no salio, hay que
       coger el telefono.

       Solo se avisa cuando hay algo que contar. Un "correo
       enviado" en cada pulsacion se vuelve ruido y a los dos
       dias nadie lo lee — que es justo cuando falla.
       -------------------------------------------------------- */
    if (result.warning) {
      alert(
        "Status changed to " + status + ", but the patient was NOT notified:\n\n" +
        result.warning +
        "\n\nPlease call the patient."
      );
    } else if (result.emailedTo) {
      showToast(status + ". Email sent to " + result.emailedTo + ".");
    } else if (result.notice === "ya-enviado") {
      showToast("Status changed. The patient had already been notified.");
    }
  } catch (err) {
    if (booking && previous) booking.status = previous;
    renderBookings();
    alert("Couldn't update that appointment: " + err.message);
  }
}


/**
 * Aviso breve que no interrumpe.
 *
 * alert() se reserva para lo que hay que atender ahora mismo:
 * que el correo NO salio. Para lo que salio bien, un alert
 * obligaria a pulsar Aceptar en cada reserva confirmada, y una
 * mañana con quince reservas son quince clics inutiles.
 */
function showToast(message) {
  let box = document.getElementById("rdcToast");
  if (!box) {
    box = document.createElement("div");
    box.id = "rdcToast";
    box.setAttribute("role", "status");
    box.style.cssText =
      "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);" +
      "background:#111827;color:#fff;padding:12px 20px;border-radius:8px;" +
      "font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.25);z-index:9999;" +
      "max-width:90vw;text-align:center;transition:opacity .25s";
    document.body.appendChild(box);
  }
  box.textContent = message;
  box.style.opacity = "1";
  clearTimeout(showToast._t);
  showToast._t = setTimeout(function () { box.style.opacity = "0"; }, 4000);
}


/* ----------------------------------------------------------------
   6. CONTENIDO (compartido por banner, promo y publicaciones)
   ---------------------------------------------------------------- */

async function loadContent() {
  try {
    const result = await api("getContent");
    if (!result.ok) throw new Error(result.error);

    state.content = Object.assign(state.content, result.content || {});

    renderSlides();
    renderPromoFields();
    renderPosts();
  } catch (err) {
    console.error("No se pudo cargar el contenido:", err);
  }
}

/**
 * Guarda TODO el contenido de una vez.
 * Se hace asi (y no por seccion) para que nunca queden datos a
 * medias: el backend siempre recibe el objeto completo.
 */
async function saveContent(statusEl, label) {
  setStatus(statusEl, "", "Saving...");

  try {
    const result = await api("saveContent", { content: state.content });
    if (!result.ok) throw new Error(result.error);

    setStatus(
      statusEl,
      "success",
      DEMO
        ? label + " updated in this demo only — connect the backend to save for real."
        : label + " saved. Refresh the site to see it live."
    );
  } catch (err) {
    setStatus(statusEl, "error", "Couldn't save: " + err.message);
  }
}


/* ----------------------------------------------------------------
   7. FOTOS DEL BANNER
   ---------------------------------------------------------------- */

function setupBannerUI() {
  document.getElementById("addSlide").addEventListener("click", () => {
    state.content.slides.push({ image: "", caption: { en: "", es: "" } });
    renderSlides();
  });

  document.getElementById("saveBanner").addEventListener("click", () => {
    // Descartar filas vacias antes de guardar
    state.content.slides = state.content.slides.filter(s => s.image && s.image.trim());
    renderSlides();
    saveContent(document.getElementById("bannerStatus"), "Banner photos");
  });
}

function renderSlides() {
  const container = document.getElementById("slidesList");

  if (!state.content.slides.length) {
    container.innerHTML = `<p class="empty-box">No photos yet. Click "Add Photo" to start.</p>`;
    return;
  }

  container.innerHTML = state.content.slides.map((slide, i) => `
    <div class="editor-item">
      <div class="editor-preview dropzone" data-drop="banners" data-index="${i}" data-list="slides"
           style="background-image:url('${escapeAttr(safeUrl(slide.image))}')"
           tabindex="0" role="button"
           aria-label="Drop a photo here or click to choose one">
        <span class="dropzone-hint">${slide.image ? "Replace" : "Drop photo<br>or click"}</span>
      </div>

      <div class="editor-fields">
        <div class="form-row">
          <label>Image link <span class="label-hint">(fills in on its own when you drop a photo)</span></label>
          <input type="url" data-slide="${i}" data-field="image"
                 value="${escapeAttr(slide.image)}"
                 placeholder="https://...">
        </div>
        <div class="form-row">
          <label>Caption (optional)</label>
          <div class="lang-pair">
            <div>
              <span class="lang-tag">EN</span>
              <input type="text" data-slide="${i}" data-field="caption" data-lang="en"
                     value="${escapeAttr(normalizarPar(slide.caption).en)}"
                     placeholder="e.g. Our MRI suite">
            </div>
            <div>
              <span class="lang-tag">ES</span>
              <input type="text" data-slide="${i}" data-field="caption" data-lang="es"
                     value="${escapeAttr(normalizarPar(slide.caption).es)}"
                     placeholder="ej. Nuestra sala de resonancia">
            </div>
          </div>
        </div>
      </div>

      <button type="button" class="btn-remove" data-remove-slide="${i}" aria-label="Remove">&times;</button>
    </div>
  `).join("");

  // Escribir cambios en el estado conforme el usuario escribe
  container.querySelectorAll("[data-slide]").forEach(input => {
    input.addEventListener("input", () => {
      const index = Number(input.dataset.slide);
      guardarCampo(state.content.slides[index], input);

      // Actualizar la miniatura en vivo
      if (input.dataset.field === "image") {
        const preview = input.closest(".editor-item").querySelector(".editor-preview");
        preview.style.backgroundImage = `url('${safeUrl(input.value).replace(/['\\]/g, "")}')`;
      }
    });
  });

  container.querySelectorAll("[data-remove-slide]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.content.slides.splice(Number(btn.dataset.removeSlide), 1);
      renderSlides();
    });
  });

  setupDropzones(container);
}


/* ----------------------------------------------------------------
   7b. SUBIR FOTOS ARRASTRANDO
   ----------------------------------------------------------------
   Era el punto que hacia falta de verdad: el personal de la
   clinica no deberia tener que subir una foto a otro sitio, copiar
   el enlace y pegarlo aqui. Se arrastra encima y ya.

   La foto va al Storage de Supabase y lo que se guarda en la fila
   es la URL publica. El campo de enlace sigue existiendo por si
   alguien prefiere pegar una direccion externa: las dos formas
   acaban en el mismo sitio.

   En modo demostracion no se sube nada, porque no hay a donde.
   ---------------------------------------------------------------- */

function setupDropzones(container) {
  container.querySelectorAll(".dropzone").forEach(zone => {
    // Clic: abre el selector de archivos de siempre. Arrastrar no
    // es evidente para todo el mundo, y desde el movil no existe.
    zone.addEventListener("click", () => pickFile(zone));
    zone.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pickFile(zone);
      }
    });

    // Sin estos preventDefault, el navegador abre la imagen en
    // lugar de dejarla caer en la zona.
    ["dragenter", "dragover"].forEach(evt =>
      zone.addEventListener(evt, e => {
        e.preventDefault();
        zone.classList.add("dragging");
      })
    );

    ["dragleave", "drop"].forEach(evt =>
      zone.addEventListener(evt, e => {
        e.preventDefault();
        zone.classList.remove("dragging");
      })
    );

    zone.addEventListener("drop", e => {
      const file = e.dataTransfer && e.dataTransfer.files[0];
      if (file) uploadInto(zone, file);
    });
  });
}

function pickFile(zone) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.addEventListener("change", () => {
    if (input.files[0]) uploadInto(zone, input.files[0]);
  });
  input.click();
}

async function uploadInto(zone, file) {
  const bucket = zone.dataset.drop;              // "banners" o "posts"
  const list = zone.dataset.list;                // "slides" o "studies"
  const index = Number(zone.dataset.index);
  const hint = zone.querySelector(".dropzone-hint");

  if (DEMO) {
    if (hint) hint.textContent = "Demo mode — no uploads";
    return;
  }

  zone.classList.add("uploading");
  if (hint) hint.textContent = "Uploading…";

  try {
    const url = await RDC_API.admin.uploadImage(file, bucket);

    // Se escribe en el estado y se vuelve a dibujar la lista, para
    // que la miniatura y el campo de enlace queden a la vez con el
    // valor nuevo.
    state.content[list][index].image = url;
    list === "slides" ? renderSlides() : renderPosts();
  } catch (err) {
    zone.classList.remove("uploading");
    if (hint) hint.textContent = "Upload failed";
    alert("Couldn't upload that image: " + err.message);
  }
}


/* ----------------------------------------------------------------
   8. PROMOCION Y TEXTOS
   ---------------------------------------------------------------- */

function setupPromoUI() {
  document.getElementById("savePromo").addEventListener("click", () => {
    state.content.promoText = leerPar("promoText");
    state.content.heroTitle = leerPar("heroTitle");
    state.content.heroSubtitle = leerPar("heroSubtitle");

    saveContent(document.getElementById("promoStatus"), "Text");
  });
}

function renderPromoFields() {
  escribirPar("promoText", state.content.promoText);
  escribirPar("heroTitle", state.content.heroTitle);
  escribirPar("heroSubtitle", state.content.heroSubtitle);
}

/* ----------------------------------------------------------------
   CAMPOS EN DOS IDIOMAS
   ----------------------------------------------------------------
   Convenio: el campo en ingles lleva el id normal ("heroTitle") y
   el de español el mismo id con "Es" detras ("heroTitleEs"). Con
   eso, estas dos funciones sirven para todos los pares y no hay que
   escribir seis veces lo mismo.

   par() acepta tambien una cadena suelta porque el contenido
   guardado ANTES de que el sitio fuera bilingue llega asi. Se
   interpreta como el texto en ingles, que es lo que era.
   ---------------------------------------------------------------- */
function normalizarPar(valor) {
  if (valor && typeof valor === "object") {
    return { en: valor.en || "", es: valor.es || "" };
  }
  return { en: valor || "", es: "" };
}

/**
 * Guarda lo que se escribe en un campo del editor.
 *
 * Los campos con data-lang son mitad de un par: escriben dentro de
 * { en, es } y no encima del objeto entero. Sin esta distincion, la
 * primera letra tecleada en el campo en español convertiria el par
 * en una cadena suelta y borraria el ingles de golpe.
 */
function guardarCampo(destino, input) {
  const campo = input.dataset.field;
  const idioma = input.dataset.lang;

  if (!idioma) {
    destino[campo] = input.value;
    return;
  }

  destino[campo] = normalizarPar(destino[campo]);
  destino[campo][idioma] = input.value;
}

function leerPar(id) {
  const en = document.getElementById(id);
  const es = document.getElementById(id + "Es");
  return { en: en ? en.value : "", es: es ? es.value : "" };
}

function escribirPar(id, valor) {
  const par = normalizarPar(valor);
  const en = document.getElementById(id);
  const es = document.getElementById(id + "Es");
  if (en) en.value = par.en;
  if (es) es.value = par.es;
}


/* ----------------------------------------------------------------
   9. PUBLICACIONES
   ---------------------------------------------------------------- */

function setupPostsUI() {
  document.getElementById("addPost").addEventListener("click", () => {
    state.content.studies.unshift({
      title: { en: "", es: "" },
      date: new Date().toISOString().split("T")[0],
      excerpt: { en: "", es: "" },
      image: "",
      color: "#2dd4bf",
      link: ""
    });
    renderPosts();
  });

  document.getElementById("savePosts").addEventListener("click", () => {
    /* Se descartan las publicaciones sin titulo en NINGUNO de los
       dos idiomas. Basta con tener uno: publicar solo en ingles es
       legitimo, y el sitio en español enseña esa version. Lo que no
       tiene sentido es guardar una tarjeta sin titulo en ninguno.

       (Este filtro miraba p.title.trim() cuando el titulo era una
       cadena suelta. Con el par, eso lanzaba TypeError y el boton
       de guardar dejaba de responder.) */
    state.content.studies = state.content.studies.filter(p => {
      const t = normalizarPar(p.title);
      return t.en.trim() || t.es.trim();
    });
    renderPosts();
    saveContent(document.getElementById("postsStatus"), "Posts");
  });
}

function renderPosts() {
  const container = document.getElementById("postsList");

  if (!state.content.studies.length) {
    container.innerHTML = `<p class="empty-box">No posts yet. Click "Add Post" to write one.</p>`;
    return;
  }

  container.innerHTML = state.content.studies.map((post, i) => `
    <div class="editor-item post-item">
      <div class="editor-preview dropzone" data-drop="posts" data-index="${i}" data-list="studies"
           style="background-image:url('${escapeAttr(safeUrl(post.image || ""))}')"
           tabindex="0" role="button"
           aria-label="Drop a cover image here or click to choose one">
        <span class="dropzone-hint">${post.image ? "Replace" : "Drop cover<br>or click"}</span>
      </div>

      <div class="editor-fields">
        <div class="form-row">
          <label>Title</label>
          <div class="lang-pair">
            <div>
              <span class="lang-tag">EN</span>
              <input type="text" data-post="${i}" data-field="title" data-lang="en"
                     value="${escapeAttr(normalizarPar(post.title).en)}" placeholder="Post headline">
            </div>
            <div>
              <span class="lang-tag">ES</span>
              <input type="text" data-post="${i}" data-field="title" data-lang="es"
                     value="${escapeAttr(normalizarPar(post.title).es)}" placeholder="Titular en español">
            </div>
          </div>
        </div>

        <div class="form-row two-col">
          <div>
            <label>Date</label>
            <input type="date" data-post="${i}" data-field="date" value="${escapeAttr(post.date)}">
          </div>
          <div>
            <label>Accent color</label>
            <input type="color" data-post="${i}" data-field="color" value="${escapeAttr(post.color || "#2dd4bf")}">
          </div>
        </div>

        <div class="form-row">
          <label>Summary</label>
          <div class="lang-pair">
            <div>
              <span class="lang-tag">EN</span>
              <textarea data-post="${i}" data-field="excerpt" data-lang="en" rows="2"
                        placeholder="One or two sentences">${escapeHtml(normalizarPar(post.excerpt).en)}</textarea>
            </div>
            <div>
              <span class="lang-tag">ES</span>
              <textarea data-post="${i}" data-field="excerpt" data-lang="es" rows="2"
                        placeholder="Una o dos frases">${escapeHtml(normalizarPar(post.excerpt).es)}</textarea>
            </div>
          </div>
        </div>

        <div class="form-row">
          <label>Cover image link <span class="label-hint">(fills in on its own when you drop a photo)</span></label>
          <input type="url" data-post="${i}" data-field="image"
                 value="${escapeAttr(post.image || "")}" placeholder="https://...">
        </div>

        <div class="form-row">
          <label>Read-more link (optional)</label>
          <input type="url" data-post="${i}" data-field="link"
                 value="${escapeAttr(post.link || "")}" placeholder="https://...">
        </div>
      </div>

      <button type="button" class="btn-remove" data-remove-post="${i}" aria-label="Remove">&times;</button>
    </div>
  `).join("");

  container.querySelectorAll("[data-post]").forEach(input => {
    input.addEventListener("input", () => {
      guardarCampo(state.content.studies[Number(input.dataset.post)], input);
    });
  });

  container.querySelectorAll("[data-remove-post]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.content.studies.splice(Number(btn.dataset.removePost), 1);
      renderPosts();
    });
  });

  setupDropzones(container);
}


/* ----------------------------------------------------------------
   10. UTILIDADES
   ---------------------------------------------------------------- */

function setStatus(el, type, message) {
  if (!el) return;
  el.className = "save-status " + type;
  el.textContent = message;
}

/** Evita que texto guardado se interprete como HTML */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : str;
  return div.innerHTML;
}

/**
 * Igual, pero para valores dentro de atributos HTML.
 *
 * Se anadio la comilla simple: hay valores que caen dentro de un
 * `url('...')` en un atributo style, y ahi es la comilla simple la
 * que delimita. Con solo la doble escapada, una foto cuyo nombre
 * llevara `'` podia inyectar CSS en el panel.
 */
function escapeAttr(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Deja pasar solo direcciones que no ejecutan nada.
 *
 * Aqui protege al propio personal: las direcciones de las fotos se
 * guardan en la base de datos, y este panel las vuelve a pintar.
 * Sin este filtro, un valor guardado una vez se ejecuta cada vez
 * que alguien abre la pestana de contenido. La explicacion completa
 * esta en js/studies.js.
 */
function safeUrl(url) {
  const limpio = String(url == null ? "" : url)
    .replace(/[\u0000-\u0020\u007f-\u009f]/g, "");

  if (!limpio) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(limpio)) return limpio;
  return /^(https?|mailto|tel):/i.test(limpio) ? limpio : "";
}
