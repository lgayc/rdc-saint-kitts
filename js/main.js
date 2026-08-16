/**
 * ============================================================
 *  MAIN.JS
 * ============================================================
 *  Maneja todo lo que no es el formulario ni las publicaciones
 *  (esos estan en booking.js y studies.js):
 *
 *    1. Llenar el sitio con los datos de SITE_CONFIG
 *   1b. Ventana de detalle de cada modalidad
 *    2. Traer el contenido editable del panel admin
 *    3. Carrusel/slideshow del banner
 *    4. Menu de navegacion
 *    5. Animaciones al hacer scroll
 *    6. Parallax del banner
 *    7. Carrusel horizontal de servicios
 *    8. Contadores animados
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", async () => {
  populateContent();
  setupNavbar();
  setupHeroParallax();
  setupModalitiesCarousel();
  setupModalityModal();
  setupStatCounters();

  // El observador de animaciones se crea ANTES de pedir el
  // contenido, porque studies.js dibuja sus tarjetas apenas llega
  // la respuesta y necesita engancharlas a el.
  setupRevealAnimations();

  await loadEditableContent();

  document.getElementById("year").textContent = new Date().getFullYear();
});


/* ----------------------------------------------------------------
   1. LLENAR EL SITIO DESDE LA CONFIGURACION
   ---------------------------------------------------------------- */

/**
 * Iconos, tolerante a que js/icons.js no haya cargado.
 *
 * Sin esta red, un solo archivo que falte deja la pagina MUERTA: al
 * evaluar ICONS[...] se lanza un ReferenceError, populateContent()
 * se corta a la mitad y ya no se llenan ni el catalogo de servicios
 * ni los desplegables del formulario. El visitante ve una pagina que
 * parece cargada pero no se puede usar, y en la consola solo hay un
 * error que no dice nada de eso.
 *
 * Paso de verdad al subir el sitio sin icons.js. Un SVG decorativo
 * no puede costar el formulario de reservas: si falta, se avisa por
 * consola y se sigue.
 */
const ICON_SET = (typeof ICONS !== "undefined" && ICONS) ? ICONS : {};

if (!Object.keys(ICON_SET).length) {
  console.warn(
    "js/icons.js no cargo: el sitio funciona pero sin iconos. " +
    "Comprueba que el archivo existe y que el <script> apunta bien."
  );
}

function populateContent() {
  const cfg = SITE_CONFIG;

  // --- Logo ---------------------------------------------------
  const logoImg = document.getElementById("brandLogo");
  if (logoImg && cfg.logo) {
    logoImg.src = cfg.logo;
    logoImg.alt = cfg.clinicFullName || cfg.clinicName;
    logoImg.onerror = () => {
      logoImg.style.display = "none";
      const fallback = document.getElementById("brandName");
      if (fallback) fallback.style.display = "inline";
    };
  }

  // --- Textos -------------------------------------------------
  setText("brandName", cfg.clinicName);
  setText("footerName", cfg.clinicName);
  setText("heroSub", cfg.subTagline);
  setText("contactAddress", cfg.contact.address);
  setText("contactPhone", cfg.contact.phoneDisplay);
  setText("contactEmail", cfg.contact.email);

  renderHeroTitle(cfg.tagline);

  // --- Enlaces ------------------------------------------------
  const telHref = `tel:${cfg.contact.phone.replace(/\s/g, "")}`;
  setHref("contactPhone", telHref);
  setHref("callLink", telHref);
  setHref("contactEmail", `mailto:${cfg.contact.email}`);
  setHref("whatsappLink", cfg.social.whatsapp);

  // --- Horarios -----------------------------------------------
  const hoursList = document.getElementById("hoursList");
  if (hoursList) {
    hoursList.innerHTML = cfg.contact.hours
      .map(h => `<li><span>${h.days}</span><span>${h.time}</span></li>`)
      .join("");
  }

  // --- Redes sociales -----------------------------------------
  const socialLinks = document.getElementById("socialLinks");
  if (socialLinks) {
    socialLinks.innerHTML = [
      { key: "facebook", url: cfg.social.facebook },
      { key: "instagram", url: cfg.social.instagram },
      { key: "whatsapp", url: cfg.social.whatsapp }
    ]
      .filter(s => s.url)
      .map(s => `<a href="${s.url}" target="_blank" rel="noopener" aria-label="${s.key}">${ICON_SET[s.key] || ""}</a>`)
      .join("");
  }

  // --- Tarjetas de servicios ----------------------------------
  // Cada tarjeta es un <button> a proposito: se puede activar con
  // el teclado (Tab + Enter) igual que con el mouse, y los lectores
  // de pantalla la anuncian como algo pulsable.
  // El indice queda guardado en data-modality para saber cual abrir.
  const track = document.getElementById("modalitiesTrack");
  if (track) {
    track.innerHTML = cfg.modalities
      .map((m, i) => `
        <button type="button" class="modality-card reveal" data-modality="${i}"
                aria-label="${escapeText(m.name)} - see details">
          <span class="modality-media">
            ${m.image ? `<img src="${m.image}" alt="" loading="lazy">` : ""}
          </span>
          <span class="modality-body">
            <span class="modality-title">${escapeText(m.name)}</span>
            <span class="modality-desc">${escapeText(m.description)}</span>
            <span class="modality-more">Learn more ${ICON_SET.arrow || ""}</span>
          </span>
        </button>
      `)
      .join("");

    track.querySelectorAll("[data-modality]").forEach(card => {
      card.addEventListener("click", () => {
        openModalityModal(Number(card.dataset.modality));
      });
    });
  }

  // --- Opciones del formulario --------------------------------
  fillSelect("modality", cfg.modalities.map(m => m.name));
  fillSelect("preferredTime", cfg.booking.timeSlots);

  // --- Iconos sueltos -----------------------------------------
  document.querySelectorAll("[data-icon]").forEach(el => {
    const svg = ICON_SET[el.dataset.icon];
    if (svg) el.innerHTML = svg;
  });
}


/* ----------------------------------------------------------------
   1b. VENTANA DE DETALLE DE CADA MODALIDAD
   ----------------------------------------------------------------
   Al hacer clic en una tarjeta se abre una ventana con la
   explicacion ampliada que viene de config.js -> modalities[].details

   Detalles de accesibilidad que vale la pena conservar:
   - Se recuerda que elemento tenia el foco para devolverlo al
     cerrar; si no, el teclado se pierde al inicio de la pagina.
   - Se cierra con ESC, con el boton X y tocando el fondo.
   - Se bloquea el scroll del fondo mientras esta abierta.
   ---------------------------------------------------------------- */

let lastFocusedElement = null;

function openModalityModal(index) {
  const modality = SITE_CONFIG.modalities[index];
  const overlay = document.getElementById("modalityModal");
  const body = document.getElementById("modalityModalBody");
  if (!modality || !overlay || !body) return;

  lastFocusedElement = document.activeElement;

  const d = modality.details || {};

  body.innerHTML = `
    <div class="modal-media">
      ${modality.image ? `<img src="${modality.image}" alt="">` : ""}
    </div>

    <div class="modal-text">
      <p class="eyebrow">Imaging service</p>
      <h3 id="modalityModalTitle">${escapeText(modality.name)}</h3>

      ${d.summary ? `<p class="modal-summary">${escapeText(d.summary)}</p>` : ""}

      ${(d.uses && d.uses.length) ? `
        <h4>Commonly used for</h4>
        <ul class="modal-list">
          ${d.uses.map(u => `<li>${escapeText(u)}</li>`).join("")}
        </ul>
      ` : ""}

      <div class="modal-facts">
        ${d.duration ? `
          <div class="modal-fact">
            <span class="modal-fact-label">Typical duration</span>
            <span class="modal-fact-value">${escapeText(d.duration)}</span>
          </div>` : ""}
        ${d.preparation ? `
          <div class="modal-fact">
            <span class="modal-fact-label">How to prepare</span>
            <span class="modal-fact-value">${escapeText(d.preparation)}</span>
          </div>` : ""}
      </div>

      <p class="modal-note">
        This is general information. Your doctor or our radiologist will
        confirm what applies to your specific case.
      </p>

      <a href="#booking" class="btn btn-primary modal-cta" data-close-modal>
        Book this study
      </a>
    </div>
  `;

  overlay.hidden = false;
  document.body.classList.add("modal-open");

  // El foco entra a la ventana para que el teclado siga ahi dentro
  overlay.querySelector(".modal-close").focus();
}

function closeModalityModal() {
  const overlay = document.getElementById("modalityModal");
  if (!overlay || overlay.hidden) return;

  overlay.hidden = true;
  document.body.classList.remove("modal-open");

  // Devolver el foco a la tarjeta desde la que se abrio
  if (lastFocusedElement) lastFocusedElement.focus();
}

function setupModalityModal() {
  const overlay = document.getElementById("modalityModal");
  if (!overlay) return;

  overlay.querySelector(".modal-close")
    .addEventListener("click", closeModalityModal);

  overlay.addEventListener("click", e => {
    // Clic en el fondo oscuro (pero no dentro de la ventana)
    if (e.target === overlay) closeModalityModal();

    // Cualquier elemento marcado con data-close-modal, como el
    // boton de reservar: cierra y deja que el enlace siga.
    if (e.target.closest("[data-close-modal]")) closeModalityModal();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModalityModal();
  });
}


/**
 * TITULO DEL BANNER CON ENTRADA POR LADOS
 * ---------------------------------------------------------------
 * Parte el titulo en lineas y mete cada una en su propio <span>.
 * Luego alterna la clase: la 1ra entra desde la IZQUIERDA, la 2da
 * desde la DERECHA, la 3ra desde la izquierda otra vez, etc.
 * La animacion en si esta en css/styles.css (.hero-line).
 *
 * Como se decide donde cortar la linea:
 *   1. Si el texto trae saltos de linea, se respetan tal cual.
 *   2. Si no, se corta despues de cada punto seguido.
 */
function renderHeroTitle(text) {
  const el = document.getElementById("heroTitle");
  if (!el || !text) return;

  const raw = String(text);

  // Nota: se evita usar lookbehind en la expresion regular porque
  // Safari viejo no lo soporta. Se marca el corte y luego se parte.
  const lines = (raw.indexOf("\n") !== -1 ? raw : raw.replace(/\.\s+/g, ".\n"))
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  el.innerHTML = lines
    .map((line, i) => {
      const side = i % 2 === 0 ? "from-left" : "from-right";
      return `<span class="hero-line ${side}">${escapeText(line)}</span>`;
    })
    .join("");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value) el.textContent = value;
}

function setHref(id, value) {
  const el = document.getElementById(id);
  if (el && value) el.href = value;
}

function fillSelect(id, options) {
  const select = document.getElementById(id);
  if (!select) return;

  options.forEach(value => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    select.appendChild(opt);
  });
}


/* ----------------------------------------------------------------
   2. CONTENIDO EDITABLE DESDE EL PANEL ADMIN
   ---------------------------------------------------------------- */

async function loadEditableContent() {
  // Sin Supabase configurado, el sitio se sirve entero desde
  // config.js y los archivos del repositorio. Sigue funcionando:
  // lo unico que no hay es contenido editable desde el panel.
  if (typeof RDC_API === "undefined" || !RDC_API.isConfigured()) {
    startHeroSlideshow(SITE_CONFIG.hero.slides);
    announceContentReady(null);
    return;
  }

  try {
    const content = await RDC_API.getPublicContent();
    applyEditableContent(content);
  } catch (err) {
    // Este catch tambien cubre el caso de que el proyecto de
    // Supabase este pausado por inactividad. La portada se dibuja
    // igual con las fotos del repositorio, asi que el visitante no
    // ve una pagina rota. Lo que si deja de funcionar es el envio
    // de reservas; de eso avisa booking.js.
    console.warn("No se pudo leer el contenido de Supabase, usando el de config.js:", err);
    startHeroSlideshow(SITE_CONFIG.hero.slides);

    // IMPORTANTE: avisar igual aunque haya fallado. Si no,
    // studies.js se queda esperando para siempre.
    announceContentReady(null);
  }
}

function announceContentReady(studies) {
  window.__RDC_STUDIES__ = studies;
  document.dispatchEvent(new CustomEvent("rdc:content-loaded"));
}

function applyEditableContent(content) {
  if (!content) content = {};

  if (content.heroTitle) renderHeroTitle(content.heroTitle);
  if (content.heroSubtitle) setText("heroSub", content.heroSubtitle);

  renderPromoBar(content.promoText);

  const slides = (content.slides && content.slides.length)
    ? content.slides
    : SITE_CONFIG.hero.slides;

  startHeroSlideshow(slides);
  announceContentReady(content.studies || null);
}

function renderPromoBar(text) {
  const bar = document.getElementById("promoBar");
  if (!bar) return;

  if (text && text.trim()) {
    bar.textContent = text;
    bar.hidden = false;
    document.body.classList.add("has-promo");
  } else {
    bar.hidden = true;
    document.body.classList.remove("has-promo");
  }
}


/* ----------------------------------------------------------------
   3. CARRUSEL DEL BANNER (slideshow)
   ---------------------------------------------------------------- */

let heroSlideTimer = null;

function startHeroSlideshow(slides) {
  const container = document.getElementById("heroSlides");
  const dotsContainer = document.getElementById("heroDots");
  if (!container) return;

  clearInterval(heroSlideTimer);
  container.innerHTML = "";
  if (dotsContainer) dotsContainer.innerHTML = "";

  if (!slides || !slides.length) {
    container.classList.remove("has-images");
    return;
  }

  container.classList.add("has-images");

  slides.forEach((slide, index) => {
    const el = document.createElement("div");
    el.className = "hero-slide" + (index === 0 ? " active" : "");
    el.style.backgroundImage = `url("${slide.image}")`;
    if (slide.caption) el.setAttribute("aria-label", slide.caption);
    container.appendChild(el);

    if (dotsContainer && slides.length > 1) {
      const dot = document.createElement("button");
      dot.className = "hero-dot" + (index === 0 ? " active" : "");
      dot.type = "button";
      dot.setAttribute("aria-label", `Slide ${index + 1}`);
      dot.addEventListener("click", () => goToSlide(index));
      dotsContainer.appendChild(dot);
    }
  });

  if (slides.length > 1 && SITE_CONFIG.hero.enableAutoplay) {
    const duration = SITE_CONFIG.hero.slideDurationMs || 5000;
    heroSlideTimer = setInterval(nextSlide, duration);
  }
}

function nextSlide() {
  const slides = document.querySelectorAll(".hero-slide");
  if (slides.length < 2) return;

  const currentIndex = [...slides].findIndex(s => s.classList.contains("active"));
  goToSlide((currentIndex + 1) % slides.length);
}

function goToSlide(index) {
  const slides = document.querySelectorAll(".hero-slide");
  const dots = document.querySelectorAll(".hero-dot");

  slides.forEach((s, i) => s.classList.toggle("active", i === index));
  dots.forEach((d, i) => d.classList.toggle("active", i === index));
}


/* ----------------------------------------------------------------
   4. NAVEGACION
   ---------------------------------------------------------------- */

function setupNavbar() {
  const navbar = document.getElementById("navbar");
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");

  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 20);
  }, { passive: true });

  toggle.addEventListener("click", () => {
    const isOpen = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  links.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}


/* ----------------------------------------------------------------
   5. ANIMACIONES AL HACER SCROLL
   ---------------------------------------------------------------- */

function setupRevealAnimations() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll(".section-heading, .study-card, .about-strip-inner")
    .forEach(el => el.classList.add("reveal"));

  document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

  window.__RDC_OBSERVER__ = observer;
}


/* ----------------------------------------------------------------
   6. PARALLAX DEL BANNER
   ---------------------------------------------------------------- */

function setupHeroParallax() {
  const layers = document.querySelectorAll(".hero-layer");
  const hero = document.getElementById("hero");
  if (!layers.length || !hero) return;

  const speeds = [0.25, 0.4, 0.15];

  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    layers.forEach((layer, i) => {
      layer.style.transform = `translate3d(0, ${y * speeds[i]}px, 0)`;
    });
  }, { passive: true });

  const content = hero.querySelector(".hero-content");
  if (!content) return;

  hero.addEventListener("mousemove", e => {
    const x = (e.clientX / window.innerWidth - 0.5) * 12;
    const y = (e.clientY / window.innerHeight - 0.5) * 12;
    content.style.transform = `rotateY(${x * 0.3}deg) rotateX(${-y * 0.3}deg)`;
  });

  hero.addEventListener("mouseleave", () => {
    content.style.transform = "rotateY(0) rotateX(0)";
  });
}


/* ----------------------------------------------------------------
   7. CARRUSEL HORIZONTAL DE SERVICIOS
   ----------------------------------------------------------------
   - La seccion de servicios es muy alta (min-height: 220vh).
   - Adentro, .modalities-pin usa position:sticky, o sea que se
     queda fija en pantalla mientras la seccion alta pasa detras.
   - Aqui medimos cuanto llevas recorrido (de 0 a 1) y movemos
     las tarjetas hacia el lado en esa misma proporcion.

   Para que dure mas o menos: cambia min-height en .modalities
   dentro de css/styles.css.
   ---------------------------------------------------------------- */

function setupModalitiesCarousel() {
  const section = document.getElementById("modalities");
  const track = document.getElementById("modalitiesTrack");
  if (!section || !track) return;

  function update() {
    const rect = section.getBoundingClientRect();
    const scrollableHeight = section.offsetHeight - window.innerHeight;
    if (scrollableHeight <= 0) return;

    const progress = Math.min(Math.max(-rect.top / scrollableHeight, 0), 1);
    const maxScroll = track.scrollWidth - track.parentElement.offsetWidth;

    track.style.transform = `translate3d(${-progress * maxScroll}px, 0, 0)`;
  }

  window.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
  window.addEventListener("resize", () => requestAnimationFrame(update));
  update();
}


/* ----------------------------------------------------------------
   8. CONTADORES ANIMADOS
   ---------------------------------------------------------------- */

function setupStatCounters() {
  const counters = document.querySelectorAll(".stat-number");
  if (!counters.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      animateCount(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
}

function animateCount(el) {
  const target = parseInt(el.dataset.count, 10) || 0;
  const suffix = el.dataset.suffix || "";
  const duration = 1200;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}


/* ----------------------------------------------------------------
   9. UTILIDAD
   ---------------------------------------------------------------- */

/**
 * Convierte texto en HTML seguro.
 * Se usa con lo que escribe el admin para que no pueda inyectar
 * etiquetas por accidente ni a proposito.
 */
function escapeText(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : str;
  return div.innerHTML;
}
