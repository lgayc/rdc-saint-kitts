/**
 * ============================================================
 *  MAIN.JS
 * ============================================================
 *  Maneja todo lo que no es el formulario ni las publicaciones
 *  (esos estan en booking.js y studies.js):
 *
 *    1. Llenar el sitio con los datos de SITE_CONFIG
 *    2. Traer el contenido editable del panel admin
 *    3. Carrusel/slideshow del banner
 *    4. Barra de promocion
 *    5. Menu de navegacion (scroll + movil)
 *    6. Animaciones al hacer scroll
 *    7. Parallax "3D" del banner
 *    8. Carrusel horizontal de servicios
 *    9. Contadores animados
 *
 *  Nada de aqui tiene texto de la clinica escrito a mano: todo
 *  sale de js/config.js o del panel admin.
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", async () => {
  populateContent();
  setupNavbar();
  setupHeroParallax();
  setupModalitiesCarousel();
  setupStatCounters();

  // El observador de animaciones se crea ANTES de pedir el
  // contenido, porque studies.js dibuja sus tarjetas apenas llega
  // la respuesta y necesita engancharlas a el.
  setupRevealAnimations();

  // El contenido del admin (imagenes, promo, textos) se pide al
  // servidor. Si falla o no esta conectado, el sitio sigue
  // funcionando con lo que hay en js/config.js.
  await loadEditableContent();

  document.getElementById("year").textContent = new Date().getFullYear();
});


/* ----------------------------------------------------------------
   1. LLENAR EL SITIO DESDE LA CONFIGURACION
   ---------------------------------------------------------------- */

function populateContent() {
  const cfg = SITE_CONFIG;

  // --- Logo ---------------------------------------------------
  // Se usa en la barra de navegacion. Si el archivo no existe,
  // se cae de vuelta al nombre en texto (ver onerror abajo).
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
      .map(s => `<a href="${s.url}" target="_blank" rel="noopener" aria-label="${s.key}">${ICONS[s.key] || ""}</a>`)
      .join("");
  }

  // --- Tarjetas de servicios ----------------------------------
  // Cada tarjeta: ilustracion arriba, con el iconito encima, y
  // el texto abajo. La ilustracion sale de modalities[].image.
  const track = document.getElementById("modalitiesTrack");
  if (track) {
    track.innerHTML = cfg.modalities
      .map(m => `
        <article class="modality-card reveal" role="listitem">
          <div class="modality-media">
            ${m.image ? `<img src="${m.image}" alt="${m.name}" loading="lazy">` : ""}
            <span class="modality-badge">${ICONS[m.icon] || ""}</span>
          </div>
          <div class="modality-body">
            <h3>${m.name}</h3>
            <p>${m.description}</p>
          </div>
        </article>
      `)
      .join("");
  }

  // --- Opciones del formulario --------------------------------
  fillSelect("modality", cfg.modalities.map(m => m.name));
  fillSelect("preferredTime", cfg.booking.timeSlots);

  // --- Iconos sueltos -----------------------------------------
  // En el HTML hay marcadores tipo <span class="icon" data-icon="phone">.
  // Aqui se rellenan con el SVG correspondiente de js/icons.js.
  // Asi el HTML queda limpio y los iconos viven en un solo lugar.
  document.querySelectorAll("[data-icon]").forEach(el => {
    const svg = ICONS[el.dataset.icon];
    if (svg) el.innerHTML = svg;
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
 *   1. Si el texto trae saltos de linea (el admin puede escribirlos
 *      en el panel), se respetan tal cual.
 *   2. Si no, se corta despues de cada punto seguido.
 *
 * Ejemplo: "Advanced Imaging. Compassionate Care."
 *   -> linea 1: "Advanced Imaging."     (entra por la izquierda)
 *   -> linea 2: "Compassionate Care."   (entra por la derecha)
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
   ----------------------------------------------------------------
   Trae del backend lo que el administrador haya cambiado:
   imagenes del banner, texto de promocion y titulos.

   Si no hay backend conectado, usa lo de js/config.js. El sitio
   nunca se rompe por esto.
   ---------------------------------------------------------------- */

async function loadEditableContent() {
  const apiUrl = SITE_CONFIG.api.url;

  // Sin backend: usar las imagenes que esten en config.js
  if (!apiUrl || !apiUrl.trim()) {
    startHeroSlideshow(SITE_CONFIG.hero.slides);
    announceContentReady(null);
    return;
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "getContent" })
    });

    const result = await response.json();
    if (!result.ok) throw new Error(result.error);

    applyEditableContent(result.content);
  } catch (err) {
    console.warn("No se pudo cargar el contenido del admin, usando el de config.js:", err);
    startHeroSlideshow(SITE_CONFIG.hero.slides);

    // IMPORTANTE: avisar igual aunque haya fallado. Si no,
    // studies.js se queda esperando para siempre y la seccion
    // de publicaciones nunca aparece.
    announceContentReady(null);
  }
}

/**
 * Le avisa a studies.js que ya hay (o no hay) contenido.
 * Se llama SIEMPRE, tanto si la carga salio bien como si fallo.
 */
function announceContentReady(studies) {
  window.__RDC_STUDIES__ = studies;
  document.dispatchEvent(new CustomEvent("rdc:content-loaded"));
}

function applyEditableContent(content) {
  if (!content) content = {};

  // Titulos del banner (si el admin los dejo vacios, se mantiene config.js).
  // Se vuelve a dibujar con la misma animacion de entrada por lados.
  if (content.heroTitle) renderHeroTitle(content.heroTitle);
  if (content.heroSubtitle) setText("heroSub", content.heroSubtitle);

  // Barra de promocion
  renderPromoBar(content.promoText);

  // Imagenes del carrusel: manda el admin; si no hay, usa config.js
  const slides = (content.slides && content.slides.length)
    ? content.slides
    : SITE_CONFIG.hero.slides;

  startHeroSlideshow(slides);

  // Las publicaciones las consume studies.js
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
   ----------------------------------------------------------------
   Las imagenes se apilan una encima de otra y se van cruzando con
   un fundido. Se agrega un leve zoom (efecto Ken Burns) para que
   no se sienta estatico.

   Para cambiar la velocidad: SITE_CONFIG.hero.slideDurationMs
   Para agregar imagenes: usar el panel admin (recomendado) o
   SITE_CONFIG.hero.slides.
   ---------------------------------------------------------------- */

let heroSlideTimer = null;

function startHeroSlideshow(slides) {
  const container = document.getElementById("heroSlides");
  const dotsContainer = document.getElementById("heroDots");
  if (!container) return;

  // Siempre empezar limpio (por si se recarga el contenido)
  clearInterval(heroSlideTimer);
  container.innerHTML = "";
  if (dotsContainer) dotsContainer.innerHTML = "";

  // Sin imagenes: se queda el fondo degradado por defecto. El
  // banner se ve bien igual, solo sin fotos.
  if (!slides || !slides.length) {
    container.classList.remove("has-images");
    return;
  }

  container.classList.add("has-images");

  // Crear una capa por imagen
  slides.forEach((slide, index) => {
    const el = document.createElement("div");
    el.className = "hero-slide" + (index === 0 ? " active" : "");
    el.style.backgroundImage = `url("${slide.image}")`;
    if (slide.caption) el.setAttribute("aria-label", slide.caption);
    container.appendChild(el);

    // Puntos de navegacion (solo si hay mas de una imagen)
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
   Cualquier elemento con class="reveal" aparece con un fundido
   la primera vez que entra en pantalla.
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

  // Guardado para que studies.js pueda animar las tarjetas que
  // se crean despues de cargar.
  window.__RDC_OBSERVER__ = observer;
}


/* ----------------------------------------------------------------
   6. PARALLAX DEL BANNER
   Los circulos borrosos del fondo se mueven a distinta velocidad
   al hacer scroll, lo que da sensacion de profundidad.
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

  // Inclinacion suave siguiendo el mouse (solo escritorio)
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
   Como funciona:
   - La seccion de servicios es muy alta (min-height: 220vh).
   - Adentro, .modalities-pin usa position:sticky, o sea que se
     queda fija en pantalla mientras la seccion alta pasa por
     detras.
   - Aqui medimos cuanto llevas recorrido de esa seccion (de 0 a 1)
     y movemos las tarjetas hacia el lado en esa misma proporcion.

   Resultado: haces scroll normal hacia abajo y las tarjetas se
   desplazan horizontalmente.

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
 * Se usa con lo que escribe el admin (titulo del banner) para que
 * no pueda inyectar etiquetas por accidente ni a proposito.
 */
function escapeText(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : str;
  return div.innerHTML;
}
