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
 *  La contrasena real NO esta en este archivo. Se manda al backend,
 *  que la verifica y devuelve un "token" temporal. Solo ese token
 *  se guarda en el navegador. Si alguien mira el codigo de esta
 *  pagina, no encuentra la contrasena real.
 *  Se cambia en backend/Codigo.gs -> ADMIN_PASSWORD
 * ============================================================
 */


/* ----------------------------------------------------------------
   1. ESTADO Y ARRANQUE
   ---------------------------------------------------------------- */

const state = {
  token: null,
  bookings: [],
  filter: "all",
  content: { heroTitle: "", heroSubtitle: "", promoText: "", slides: [], studies: [] }
};

// Donde se guarda el token entre recargas de pagina
const TOKEN_KEY = "rdc_admin_token";
const TOKEN_EXPIRY_KEY = "rdc_admin_expires";

/**
 * MODO DEMOSTRACION
 * ----------------------------------------------------------------
 * Cuando todavia no hay backend conectado, el panel funciona con
 * datos de ejemplo para que se pueda ver y probar. Nada se guarda:
 * al recargar, todo vuelve al estado inicial.
 *
 * Se apaga solo en cuanto api.url tenga una URL: ahi el panel pasa
 * a hablar con el servidor de verdad y a usar la contrasena real.
 */
let DEMO = false;

/** True si hay un Apps Script configurado */
function hasBackend() {
  return Boolean(SITE_CONFIG.api.url && SITE_CONFIG.api.url.trim());
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
        <code>js/config.js</code> and paste your Google Apps Script
        URL into <code>api.url</code>.
      </p>
      <p class="login-sub">See <strong>GUIA-RAPIDA.md</strong> for the full steps.</p>
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

/** Si ya habia una sesion activa y no vencio, entrar directo */
function restoreSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  const expires = Number(localStorage.getItem(TOKEN_EXPIRY_KEY) || 0);

  if (token && Date.now() < expires) {
    state.token = token;
    enterPanel();
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

    const password = document.getElementById("password").value;
    if (!password) {
      setStatus(statusEl, "error", "Please enter the password.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Signing in...";
    setStatus(statusEl, "", "");

    try {
      const result = await api("login", { password });

      if (!result.ok) {
        setStatus(statusEl, "error", result.error || "Incorrect password.");
        return;
      }

      state.token = result.token;
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(TOKEN_EXPIRY_KEY, String(result.expiresAt));

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

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  state.token = null;
  location.reload();
}


/* ----------------------------------------------------------------
   3. COMUNICACION CON EL BACKEND
   ----------------------------------------------------------------
   Todo pasa por esta unica funcion. Agrega el token
   automaticamente y, si la sesion vencio, saca al usuario.

   Nota tecnica: se usa Content-Type "text/plain" a proposito.
   Con "application/json" el navegador hace una peticion previa
   (preflight CORS) que Apps Script no responde bien.
   ---------------------------------------------------------------- */

async function api(action, payload = {}) {
  // En modo demostracion no se sale a internet: se responde con
  // datos de ejemplo guardados en memoria (ver demoApi mas abajo).
  if (DEMO) return demoApi(action, payload);

  const response = await fetch(SITE_CONFIG.api.url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, token: state.token, ...payload })
  });

  if (!response.ok) throw new Error("El servidor respondio " + response.status);

  const result = await response.json();

  // Sesion vencida o invalida -> volver al login
  if (result.authFailed) {
    alert("Your session expired. Please sign in again.");
    logout();
    throw new Error("Sesion expirada");
  }

  return result;
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
        heroTitle: "",
        heroSubtitle: "",
        promoText: "",
        slides: SITE_CONFIG.hero.slides.slice(),
        studies: []
      }
    };
  }

  switch (action) {
    case "login":
      return payload.password === SITE_CONFIG.admin.demoPassword
        ? { ok: true, token: "demo-token", expiresAt: Date.now() + 8 * 3600 * 1000 }
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
        <p class="booking-id">${escapeHtml(b.id)}</p>
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
  } catch (err) {
    if (booking && previous) booking.status = previous;
    renderBookings();
    alert("Couldn't update that appointment: " + err.message);
  }
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
    state.content.slides.push({ image: "", caption: "" });
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
      <div class="editor-preview" style="background-image:url('${escapeAttr(slide.image)}')"></div>

      <div class="editor-fields">
        <div class="form-row">
          <label>Image link</label>
          <input type="url" data-slide="${i}" data-field="image"
                 value="${escapeAttr(slide.image)}"
                 placeholder="https://...">
        </div>
        <div class="form-row">
          <label>Caption (optional)</label>
          <input type="text" data-slide="${i}" data-field="caption"
                 value="${escapeAttr(slide.caption || "")}"
                 placeholder="e.g. Our MRI suite">
        </div>
      </div>

      <button type="button" class="btn-remove" data-remove-slide="${i}" aria-label="Remove">&times;</button>
    </div>
  `).join("");

  // Escribir cambios en el estado conforme el usuario escribe
  container.querySelectorAll("[data-slide]").forEach(input => {
    input.addEventListener("input", () => {
      const index = Number(input.dataset.slide);
      state.content.slides[index][input.dataset.field] = input.value;

      // Actualizar la miniatura en vivo
      if (input.dataset.field === "image") {
        const preview = input.closest(".editor-item").querySelector(".editor-preview");
        preview.style.backgroundImage = `url('${input.value}')`;
      }
    });
  });

  container.querySelectorAll("[data-remove-slide]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.content.slides.splice(Number(btn.dataset.removeSlide), 1);
      renderSlides();
    });
  });
}


/* ----------------------------------------------------------------
   8. PROMOCION Y TEXTOS
   ---------------------------------------------------------------- */

function setupPromoUI() {
  document.getElementById("savePromo").addEventListener("click", () => {
    state.content.promoText = document.getElementById("promoText").value;
    state.content.heroTitle = document.getElementById("heroTitle").value;
    state.content.heroSubtitle = document.getElementById("heroSubtitle").value;

    saveContent(document.getElementById("promoStatus"), "Text");
  });
}

function renderPromoFields() {
  document.getElementById("promoText").value = state.content.promoText || "";
  document.getElementById("heroTitle").value = state.content.heroTitle || "";
  document.getElementById("heroSubtitle").value = state.content.heroSubtitle || "";
}


/* ----------------------------------------------------------------
   9. PUBLICACIONES
   ---------------------------------------------------------------- */

function setupPostsUI() {
  document.getElementById("addPost").addEventListener("click", () => {
    state.content.studies.unshift({
      title: "",
      date: new Date().toISOString().split("T")[0],
      excerpt: "",
      image: "",
      color: "#2dd4bf",
      link: ""
    });
    renderPosts();
  });

  document.getElementById("savePosts").addEventListener("click", () => {
    state.content.studies = state.content.studies.filter(p => p.title && p.title.trim());
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
      <div class="editor-fields">
        <div class="form-row">
          <label>Title</label>
          <input type="text" data-post="${i}" data-field="title"
                 value="${escapeAttr(post.title)}" placeholder="Post headline">
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
          <textarea data-post="${i}" data-field="excerpt" rows="2"
                    placeholder="One or two sentences">${escapeHtml(post.excerpt || "")}</textarea>
        </div>

        <div class="form-row">
          <label>Cover image link (optional)</label>
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
      state.content.studies[Number(input.dataset.post)][input.dataset.field] = input.value;
    });
  });

  container.querySelectorAll("[data-remove-post]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.content.studies.splice(Number(btn.dataset.removePost), 1);
      renderPosts();
    });
  });
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

/** Igual, pero para valores dentro de atributos HTML */
function escapeAttr(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}
