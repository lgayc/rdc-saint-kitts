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
  // El idioma va PRIMERO. Si se aplicara despues de dibujar, el
  // visitante veria el sitio parpadear del ingles al español.
  RDC_I18N.apply();
  setupLanguageToggle();

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
   SELECTOR DE IDIOMA
   ----------------------------------------------------------------
   El texto marcado con data-i18n lo cambia RDC_I18N solo. Lo que
   hay que rehacer a mano es lo que se genera desde JavaScript: las
   tarjetas de estudios, los desplegables del formulario y el
   contenido que vino de la base de datos.

   NO se recarga la pagina. Si alguien esta a mitad del formulario
   de reserva, cambiar de idioma no puede borrarle lo que escribio.
   ---------------------------------------------------------------- */
function setupLanguageToggle() {
  const boton = document.getElementById("langToggle");
  if (boton) boton.addEventListener("click", () => RDC_I18N.toggle());

  document.addEventListener("rdc:lang-changed", () => {
    // Se guarda lo que el visitante ya habia elegido en el
    // formulario para devolverselo despues de rehacer las opciones.
    const elegidos = {
      modality: valorDe("modality"),
      preferredTime: valorDe("preferredTime"),
    };

    populateContent();
    RDC_I18N.apply();

    /* Las tarjetas de estudios se acaban de recrear desde cero, y las
       nuevas NO las conoce el observador de animaciones: nacen con
       .reveal, que es opacity:0, y sin nadie que les ponga .in-view se
       quedan invisibles para siempre. El usuario ve el hueco vacio y
       piensa que el sitio se rompio al cambiar de idioma.

       Es el mismo motivo por el que studies.js vuelve a enganchar sus
       tarjetas al repintarlas. */
    engancharReveal(document.getElementById("modalitiesTrack"));

    // El ancho del riel cambia con la longitud de los textos.
    if (typeof window.__RDC_CAROUSEL_UPDATE__ === "function") {
      window.__RDC_CAROUSEL_UPDATE__();
    }

    restaurarValor("modality", elegidos.modality);
    restaurarValor("preferredTime", elegidos.preferredTime);

    // El contenido de la base se guardo tal cual llego, con los dos
    // idiomas dentro, asi que se puede repintar sin volver a pedirlo.
    if (window.__RDC_CONTENT_RAW__ !== undefined) {
      applyEditableContent(window.__RDC_CONTENT_RAW__);
    }

    cerrarModalSiAbierto();
  });
}

/**
 * Engancha a la animacion de aparicion elementos recien creados.
 *
 * Lo que ya estaba a la vista se muestra AL INSTANTE, sin volver a
 * animarse: quien cambia de idioma mirando las tarjetas no quiere
 * verlas desvanecerse y reaparecer, quiere leerlas en el otro idioma.
 * Lo que esta fuera de pantalla se deja al observador, para que
 * conserve su animacion cuando se baje hasta el.
 */
function engancharReveal(raiz) {
  const observer = window.__RDC_OBSERVER__;
  const alto = window.innerHeight || 0;

  (raiz || document).querySelectorAll(".reveal:not(.in-view)").forEach((el) => {
    const r = el.getBoundingClientRect();
    const aLaVista = r.bottom > 0 && r.top < alto;

    if (aLaVista || !observer) el.classList.add("in-view");
    else observer.observe(el);
  });
}

function valorDe(id) {
  const el = document.getElementById(id);
  return el ? el.value : "";
}

function restaurarValor(id, valor) {
  const el = document.getElementById(id);
  if (el && valor) el.value = valor;
}

/** La ventana de detalle se quedaria en el idioma viejo. Se cierra. */
function cerrarModalSiAbierto() {
  const overlay = document.getElementById("modalityModal");
  if (overlay && !overlay.hidden) closeModalityModal();
}


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
  setText("heroSub", RDC_I18N.pick(cfg.subTagline));
  setText("contactAddress", RDC_I18N.pick(cfg.contact.address));
  setText("contactPhone", cfg.contact.phoneDisplay);
  setText("contactEmail", cfg.contact.email);

  renderHeroTitle(RDC_I18N.pick(cfg.tagline));

  // --- Enlaces ------------------------------------------------
  const telHref = `tel:${cfg.contact.phone.replace(/\s/g, "")}`;
  setHref("contactPhone", telHref);
  setHref("callLink", telHref);
  setHref("contactEmail", `mailto:${cfg.contact.email}`);
  setHref("whatsappLink", cfg.social.whatsapp);

  // --- Mapa y como llegar -------------------------------------
  const mapa = cfg.contact.map;
  if (mapa) {
    const punto = `${mapa.lat},${mapa.lng}`;
    const marco = document.getElementById("contactMap");
    // Solo la primera vez. Esta funcion vuelve a correr en cada
    // cambio de idioma, y reponer el src recargaria el mapa entero
    // para cambiar unicamente el idioma de sus botones.
    if (marco && !marco.getAttribute("src")) {
      marco.setAttribute("src",
        "https://www.google.com/maps?q=" + encodeURIComponent(punto) +
        "&z=17&hl=" + encodeURIComponent(RDC_I18N.current()) + "&output=embed");
    }
    setHref("directionsLink",
      "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(punto));
  }

  // --- Resenas ------------------------------------------------
  const google = cfg.contact.google;
  if (google) {
    const ficha = safeUrl(google.placeUrl);
    // Sin enlace corto de Google Business, escribir y leer llevan al
    // mismo sitio: la ficha, con el boton de resenar a la vista.
    setHref("reviewWriteLink", safeUrl(google.reviewUrl) || ficha);
    setHref("reviewReadLink", ficha);
  }

  // --- Horarios -----------------------------------------------
  const hoursList = document.getElementById("hoursList");
  if (hoursList) {
    hoursList.innerHTML = cfg.contact.hours
      .map(h => `<li><span>${escapeText(RDC_I18N.pick(h.days))}</span>` +
                `<span>${escapeText(RDC_I18N.pick(h.time))}</span></li>`)
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
      .map(s => ({ key: s.key, url: safeUrl(s.url) }))
      .filter(s => s.url)
      .map(s => `<a href="${escapeAttr(s.url)}" target="_blank" rel="noopener" aria-label="${escapeAttr(s.key)}">${ICON_SET[s.key] || ""}</a>`)
      .join("");
  }

  // --- Quienes somos ------------------------------------------
  renderAbout(cfg.about);

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
                aria-label="${escapeText(RDC_I18N.pick(m.name))} - ${escapeText(RDC_I18N.t("modalities.cardAria"))}">
          <span class="modality-media">
            ${safeUrl(m.image) ? `<img src="${escapeAttr(safeUrl(m.image))}" alt="" loading="lazy">` : ""}
          </span>
          <span class="modality-body">
            <span class="modality-title">${escapeText(RDC_I18N.pick(m.name))}</span>
            <span class="modality-desc">${escapeText(RDC_I18N.pick(m.description))}</span>
            <span class="modality-more">${escapeText(RDC_I18N.t("modalities.learnMore"))} ${ICON_SET.arrow || ""}</span>
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
  /* Los desplegables llevan VALOR y ETIQUETA separados.
     El valor de cada estudio es siempre su nombre en ingles, aunque
     la etiqueta salga en español. Sin eso, la misma resonancia
     entraria en la base como "MRI" o como "Resonancia magnetica"
     segun el idioma en que estuviera el visitante, y la clinica
     acabaria con dos nombres para el mismo estudio en sus reservas
     y en su calendario. */
  fillSelect("modality", cfg.modalities.map(m => ({
    valor: pickEn(m.name),
    etiqueta: RDC_I18N.pick(m.name),
  })));

  // Las horas son iguales en los dos idiomas ("2:00 PM").
  fillSelect("preferredTime", cfg.booking.timeSlots.map(v => ({
    valor: v, etiqueta: v,
  })));

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
  const resumen = RDC_I18N.pick(d.summary);
  const usos = RDC_I18N.pick(d.uses);
  const duracion = RDC_I18N.pick(d.duration);
  const preparacion = RDC_I18N.pick(d.preparation);

  body.innerHTML = `
    <div class="modal-media">
      ${safeUrl(modality.image) ? `<img src="${escapeAttr(safeUrl(modality.image))}" alt="">` : ""}
    </div>

    <div class="modal-text">
      <p class="eyebrow">${escapeText(RDC_I18N.t("modal.eyebrow"))}</p>
      <h3 id="modalityModalTitle">${escapeText(RDC_I18N.pick(modality.name))}</h3>

      ${resumen ? `<p class="modal-summary">${escapeText(resumen)}</p>` : ""}

      ${(usos && usos.length) ? `
        <h4>${escapeText(RDC_I18N.t("modal.usedFor"))}</h4>
        <ul class="modal-list">
          ${usos.map(u => `<li>${escapeText(u)}</li>`).join("")}
        </ul>
      ` : ""}

      <div class="modal-facts">
        ${duracion ? `
          <div class="modal-fact">
            <span class="modal-fact-label">${escapeText(RDC_I18N.t("modal.duration"))}</span>
            <span class="modal-fact-value">${escapeText(duracion)}</span>
          </div>` : ""}
        ${preparacion ? `
          <div class="modal-fact">
            <span class="modal-fact-label">${escapeText(RDC_I18N.t("modal.preparation"))}</span>
            <span class="modal-fact-value">${escapeText(preparacion)}</span>
          </div>` : ""}
      </div>

      <p class="modal-note">${escapeText(RDC_I18N.t("modal.note"))}</p>

      <a href="#booking" class="btn btn-primary modal-cta" data-close-modal>
        ${escapeText(RDC_I18N.t("modal.cta"))}
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

/**
 * Dibuja la seccion "quienes somos".
 *
 * Todo el texto sale de SITE_CONFIG.about y pasa por pick(), asi que
 * cambia de idioma con el resto del sitio. Si el bloque no existe en
 * la configuracion, la seccion se esconde entera en vez de quedarse
 * como un hueco con un titulo suelto.
 */
function renderAbout(about) {
  const seccion = document.getElementById("about");
  if (!seccion) return;

  if (!about) {
    seccion.hidden = true;
    return;
  }
  seccion.hidden = false;

  setText("aboutHeading", RDC_I18N.pick(about.heading));

  // Parrafos. Se crean como <p> de uno en uno y con textContent, no
  // con innerHTML: este texto lo escribe la clinica y algun dia
  // podria venir de la base de datos.
  const cuerpo = document.getElementById("aboutBody");
  if (cuerpo) {
    cuerpo.innerHTML = "";
    (RDC_I18N.pick(about.body) || []).forEach((parrafo) => {
      const p = document.createElement("p");
      p.textContent = parrafo;
      cuerpo.appendChild(p);
    });
  }

  // Apoyos: la etiqueta viene del diccionario, la explicacion de la
  // configuracion. Van emparejados por posicion.
  const lista = document.getElementById("aboutPillars");
  if (lista) {
    const textos = RDC_I18N.pick(about.pillars) || [];
    lista.innerHTML = "";
    textos.forEach((texto, i) => {
      const li = document.createElement("li");

      const titulo = document.createElement("strong");
      titulo.textContent = RDC_I18N.t(`about.pillar${i + 1}`);

      const detalle = document.createElement("span");
      detalle.textContent = texto;

      li.append(titulo, detalle);
      lista.appendChild(li);
    });
  }

  const img = document.getElementById("aboutImage");
  if (img) {
    const src = safeUrl(about.image);
    if (src) {
      img.src = src;
      img.alt = RDC_I18N.pick(about.heading) || "";
    } else {
      img.remove();
    }
  }
}

function fillSelect(id, options) {
  const select = document.getElementById(id);
  if (!select) return;

  // Se borran solo las opciones que generamos nosotros. La primera
  // ("Elija un estudio") viene del HTML, la traduce RDC_I18N sola y
  // tiene que quedarse donde esta. Sin esta limpieza, cada cambio de
  // idioma añadiria otra tanda de opciones debajo de las anteriores.
  select.querySelectorAll("option[data-generada]").forEach(o => o.remove());

  options.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.valor;
    opt.textContent = item.etiqueta;
    opt.dataset.generada = "1";
    select.appendChild(opt);
  });
}

/** El nombre en ingles de un valor que puede ser objeto o cadena. */
function pickEn(valor) {
  if (valor && typeof valor === "object") return valor.en || "";
  return valor || "";
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

  /* Se guarda la respuesta TAL CUAL, con los dos idiomas dentro.
     Asi, al cambiar de idioma, se repinta sin volver a pedirle nada
     al servidor: el visitante ve el cambio al instante y la clinica
     no gasta una peticion mas de su plan gratuito. */
  window.__RDC_CONTENT_RAW__ = content;

  /* Cada campo llega como { en: "...", es: "..." } desde la base.
     pick() elige, y si el idioma actual esta vacio cae al otro: mas
     vale el titular en ingles que un banner sin titulo. */
  const titulo = RDC_I18N.pick(content.heroTitle);
  const subtitulo = RDC_I18N.pick(content.heroSubtitle);

  if (titulo) renderHeroTitle(titulo);
  if (subtitulo) setText("heroSub", subtitulo);

  renderPromoBar(RDC_I18N.pick(content.promoText));

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
    // Las fotos del banner vienen de la base de datos, o sea del
    // panel. Se filtra el esquema y se quitan comillas y barras
    // invertidas: no puede escaparse de la declaracion CSS porque
    // se asigna por propiedad, pero un valor roto dejaria el banner
    // en blanco y nadie sabria por que.
    el.style.backgroundImage = `url("${safeUrl(slide.image).replace(/["\\]/g, "")}")`;
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

  // Se guarda para poder recolocar el carrusel cuando las tarjetas se
  // redibujan (por ejemplo al cambiar de idioma): el ancho total del
  // riel cambia con la longitud de los textos.
  window.__RDC_CAROUSEL_UPDATE__ = update;

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

/**
 * Igual, pero para valores que van DENTRO de un atributo.
 *
 * escapeText no vale aqui: como pasa por textContent, escapa `<`,
 * `>` y `&`, pero NO las comillas — y son las comillas las que
 * cierran un atributo. Un valor con `"` metido en un `src="..."`
 * se sale del atributo con escapeText, y no con este.
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
 * Escapar comillas evita SALIR del atributo; no evita que el
 * atributo entero sea codigo. `href="javascript:..."` es HTML
 * perfectamente valido y se ejecuta al hacer clic.
 *
 * La explicacion larga esta en js/studies.js, que es donde de
 * verdad hacia falta: alli la direccion la escribe el personal
 * desde el panel. Aqui salen de config.js, o sea de quien edita el
 * codigo — pero cuesta una linea y quita de la ecuacion el "esto
 * es seguro porque nadie va a tocarlo".
 */
function safeUrl(url) {
  const limpio = String(url == null ? "" : url)
    .replace(/[\u0000-\u0020\u007f-\u009f]/g, "");

  if (!limpio) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(limpio)) return limpio;
  return /^(https?|mailto|tel):/i.test(limpio) ? limpio : "";
}
