/**
 * ============================================================
 *  STUDIES.JS - Seccion "Studies & Work"
 * ============================================================
 *  De donde saca las publicaciones, en orden de prioridad:
 *
 *    1. Del panel admin (si el backend esta conectado).
 *       Es la forma recomendada: el personal las agrega desde
 *       admin.html sin tocar codigo.
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
document.addEventListener("rdc:content-loaded", () => {
  const fromAdmin = window.__RDC_STUDIES__;

  if (fromAdmin && fromAdmin.length) {
    renderStudies(document.getElementById("studiesGrid"), fromAdmin);
  } else {
    loadFallbackStudies();
  }
});


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
      grid.innerHTML = `<p class="studies-empty">Check back soon for updates from our team.</p>`;
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
    grid.innerHTML = `<p class="studies-empty">Check back soon for updates from our team.</p>`;
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

  // Si la publicacion trae imagen se usa como portada;
  // si no, un degradado con el color elegido.
  const media = post.image
    ? `<div class="study-card-media" style="background-image:url('${escapeAttr(post.image)}')"></div>`
    : `<div class="study-card-media" style="background:linear-gradient(135deg, ${escapeAttr(color)}, transparent)"></div>`;

  const card = `
    <article class="study-card reveal">
      ${media}
      <div class="study-card-body">
        <p class="study-card-date">${dateLabel}</p>
        <h3>${escapeHtml(post.title || "Untitled Post")}</h3>
        <p>${escapeHtml(post.excerpt || "")}</p>
      </div>
    </article>
  `;

  return post.link
    ? `<a href="${escapeAttr(post.link)}" target="_blank" rel="noopener" class="study-link">${card}</a>`
    : card;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr || "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/** Evita que texto del admin se interprete como HTML */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : str;
  return div.innerHTML;
}

/** Igual, pero para valores que van dentro de un atributo */
function escapeAttr(str) {
  return String(str == null ? "" : str).replace(/"/g, "&quot;");
}
