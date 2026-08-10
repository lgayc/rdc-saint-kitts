/**
 * ============================================================
 *  STUDIES.JS — "Studies & Work" feed
 * ============================================================
 * Goal: let non-technical staff post updates without touching
 * any code. The trick — the site's "editor" is just a Google
 * Sheet (a spreadsheet). Staff add a new post by adding a new
 * row. No login to this codebase required.
 *
 * SHEET COLUMNS (first row = headers, exactly these names):
 *   title | date | excerpt | color | link
 *
 *   - title   : post headline
 *   - date    : e.g. 2026-08-07
 *   - excerpt : 1-2 sentence summary
 *   - color   : hex color for the card accent, e.g. #2dd4bf (optional)
 *   - link    : URL to the full post/PDF/photo (optional)
 *
 * SETUP (one-time, see README.md "Studies & posts" for details):
 *   1. Duplicate the provided Google Sheet template.
 *   2. File -> Share -> Publish to web -> select "Comma-separated
 *      values (.csv)" -> Publish -> copy the link.
 *   3. Paste that link into SITE_CONFIG.studies.sheetCsvUrl
 *      (js/config.js).
 *
 * Until that's set up, the site shows the sample posts bundled
 * in data/sample-studies.json so the section never looks empty.
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", loadStudies);

async function loadStudies() {
  const grid = document.getElementById("studiesGrid");
  if (!grid) return;

  const sheetUrl = SITE_CONFIG.studies.sheetCsvUrl;

  try {
    const posts = sheetUrl
      ? await fetchFromGoogleSheet(sheetUrl)
      : await fetchFromLocalFile();

    renderStudies(grid, posts);
  } catch (err) {
    console.error("Could not load studies feed:", err);
    // Fall back to local sample data so the section still shows something
    try {
      const posts = await fetchFromLocalFile();
      renderStudies(grid, posts);
    } catch {
      grid.innerHTML = `<p class="studies-empty">Check back soon for updates from our team.</p>`;
    }
  }
}

async function fetchFromLocalFile() {
  const res = await fetch("data/sample-studies.json");
  if (!res.ok) throw new Error("Sample studies file not found");
  return res.json();
}

async function fetchFromGoogleSheet(csvUrl) {
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error(`Sheet fetch failed with ${res.status}`);
  const csvText = await res.text();
  return parseCsvToPosts(csvText);
}

/**
 * Minimal CSV parser (handles quoted fields containing commas).
 * Google Sheets' "publish to web as CSV" output is well-formed,
 * so this stays intentionally small rather than pulling in a
 * full CSV-parsing library for one use case.
 */
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
    // Newest first
    .sort((a, b) => new Date(b.date) - new Date(a.date));
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

function renderStudies(grid, posts) {
  if (!posts || !posts.length) {
    grid.innerHTML = `<p class="studies-empty">Check back soon for updates from our team.</p>`;
    return;
  }

  grid.innerHTML = posts.map(postToCardHtml).join("");
}

function postToCardHtml(post) {
  const color = post.color || "#2dd4bf";
  const dateLabel = formatDate(post.date);
  const card = `
    <article class="study-card reveal">
      <div class="study-card-media" style="background: linear-gradient(135deg, ${color}, transparent)"></div>
      <div class="study-card-body">
        <p class="study-card-date">${dateLabel}</p>
        <h3>${escapeHtml(post.title || "Untitled Post")}</h3>
        <p>${escapeHtml(post.excerpt || "")}</p>
      </div>
    </article>
  `;

  return post.link
    ? `<a href="${post.link}" target="_blank" rel="noopener" style="display:block">${card}</a>`
    : card;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr || "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
