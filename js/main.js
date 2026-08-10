/**
 * ============================================================
 *  MAIN.JS
 * ============================================================
 * Handles everything that isn't the booking form or the studies
 * feed (those live in booking.js and studies.js):
 *
 *   1. Populate page text/links from SITE_CONFIG (js/config.js)
 *   2. Navbar scroll state + mobile menu toggle
 *   3. Reveal-on-scroll animations
 *   4. Hero parallax ("3D" floating layers)
 *   5. Horizontal scroll-driven modalities carousel
 *   6. Animated stat counters
 *
 * Everything here reads from SITE_CONFIG / ICONS (defined in
 * config.js / icons.js, loaded before this file) — it does not
 * hardcode clinic content.
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", () => {
  populateContent();
  setupNavbar();
  setupRevealAnimations();
  setupHeroParallax();
  setupModalitiesCarousel();
  setupStatCounters();
  document.getElementById("year").textContent = new Date().getFullYear();
});

/* ----------------------------------------------------------------
   1. POPULATE CONTENT FROM CONFIG
   ---------------------------------------------------------------- */
function populateContent() {
  const cfg = SITE_CONFIG;

  // Text
  setText("brandName", cfg.clinicName);
  setText("footerName", cfg.clinicName);
  setText("heroSub", cfg.subTagline);
  setText("contactAddress", cfg.contact.address);
  setText("contactPhone", cfg.contact.phoneDisplay);
  setText("contactEmail", cfg.contact.email);

  const contactPhoneEl = document.getElementById("contactPhone");
  if (contactPhoneEl) contactPhoneEl.href = `tel:${cfg.contact.phone.replace(/\s/g, "")}`;
  const contactEmailEl = document.getElementById("contactEmail");
  if (contactEmailEl) contactEmailEl.href = `mailto:${cfg.contact.email}`;
  const callLink = document.getElementById("callLink");
  if (callLink) callLink.href = `tel:${cfg.contact.phone.replace(/\s/g, "")}`;
  const whatsappLink = document.getElementById("whatsappLink");
  if (whatsappLink) whatsappLink.href = cfg.social.whatsapp;

  // Hero title supports <br> so keep innerHTML, but content itself
  // still comes from config (avoids hardcoding marketing copy twice)
  const heroTitle = document.getElementById("heroTitle");
  if (heroTitle) heroTitle.innerHTML = cfg.tagline.replace(". ", ".<br>");

  // Hours
  const hoursList = document.getElementById("hoursList");
  if (hoursList) {
    hoursList.innerHTML = cfg.contact.hours
      .map(h => `<li><span>${h.days}</span><span>${h.time}</span></li>`)
      .join("");
  }

  // Social links
  const socialLinks = document.getElementById("socialLinks");
  if (socialLinks) {
    const entries = [
      { key: "facebook", url: cfg.social.facebook },
      { key: "instagram", url: cfg.social.instagram },
      { key: "whatsapp", url: cfg.social.whatsapp }
    ].filter(s => s.url);

    socialLinks.innerHTML = entries
      .map(s => `<a href="${s.url}" target="_blank" rel="noopener" aria-label="${s.key}">${ICONS[s.key] || ""}</a>`)
      .join("");
  }

  // Modality cards (horizontal carousel)
  const track = document.getElementById("modalitiesTrack");
  if (track) {
    track.innerHTML = cfg.modalities
      .map(m => `
        <article class="modality-card reveal" role="listitem">
          <div class="icon">${ICONS[m.icon] || ""}</div>
          <h3>${m.name}</h3>
          <p>${m.description}</p>
        </article>
      `)
      .join("");
  }

  // Booking form: modality options + time slots
  const modalitySelect = document.getElementById("modality");
  if (modalitySelect) {
    cfg.modalities.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.name;
      opt.textContent = m.name;
      modalitySelect.appendChild(opt);
    });
  }

  const timeSelect = document.getElementById("preferredTime");
  if (timeSelect) {
    cfg.booking.timeSlots.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      timeSelect.appendChild(opt);
    });
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value) el.textContent = value;
}

/* ----------------------------------------------------------------
   2. NAVBAR: scrolled state + mobile toggle
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

  // Close mobile menu after tapping a link
  links.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* ----------------------------------------------------------------
   3. REVEAL-ON-SCROLL
   Any element with class="reveal" fades/slides in the first time
   it enters the viewport. Modality cards get this class when they
   are generated above; add class="reveal" to any other element
   you want the same treatment.
   ---------------------------------------------------------------- */
function setupRevealAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  // Re-query periodically isn't needed since modality cards exist
  // by the time DOMContentLoaded fires (populateContent runs first).
  document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

  // Also auto-tag section headings / studies grid for a subtle reveal
  document.querySelectorAll(".section-heading, .study-card, .about-strip-inner")
    .forEach(el => {
      el.classList.add("reveal");
      observer.observe(el);
    });
}

/* ----------------------------------------------------------------
   4. HERO PARALLAX
   The three blurred circles in .hero-layers drift at different
   speeds as the page scrolls, giving a subtle depth/3D feel.
   ---------------------------------------------------------------- */
function setupHeroParallax() {
  const layers = document.querySelectorAll(".hero-layer");
  if (!layers.length) return;

  const speeds = [0.25, 0.4, 0.15];

  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    layers.forEach((layer, i) => {
      layer.style.transform = `translate3d(0, ${y * speeds[i]}px, 0)`;
    });
  }, { passive: true });

  // Gentle mouse-tilt on the hero for extra "3D" feel on desktop
  const hero = document.getElementById("hero");
  hero.addEventListener("mousemove", (e) => {
    const { innerWidth: w, innerHeight: h } = window;
    const x = (e.clientX / w - 0.5) * 12;
    const y = (e.clientY / h - 0.5) * 12;
    hero.querySelector(".hero-content").style.transform =
      `rotateY(${x * 0.3}deg) rotateX(${-y * 0.3}deg)`;
  });
  hero.addEventListener("mouseleave", () => {
    hero.querySelector(".hero-content").style.transform = "rotateY(0) rotateX(0)";
  });
}

/* ----------------------------------------------------------------
   5. HORIZONTAL SCROLL-DRIVEN MODALITIES CAROUSEL
   ----------------------------------------------------------------
   How it works:
   - .modalities-pin is `position: sticky`, so it stays fixed in
     the viewport while its tall parent (.modalities section)
     scrolls underneath it.
   - On every scroll event we work out how far the user has
     scrolled through that tall parent (0 = just entered,
     1 = about to leave) and translate .modalities-track
     horizontally by that same proportion.
   - Net effect: normal vertical scrolling drives the modality
     cards sideways, which reads as a dynamic "3D" transition
     without needing scroll-jacking libraries.

   To change how far it scrolls: adjust `min-height: 220vh` on
   .modalities in css/styles.css (taller section = slower/longer
   horizontal scroll).
   ---------------------------------------------------------------- */
function setupModalitiesCarousel() {
  const section = document.getElementById("modalities");
  const track = document.getElementById("modalitiesTrack");
  if (!section || !track) return;

  function update() {
    const rect = section.getBoundingClientRect();
    const sectionHeight = section.offsetHeight - window.innerHeight;
    if (sectionHeight <= 0) return;

    // progress: 0 when section top hits top of viewport, 1 when section bottom does
    const progress = Math.min(Math.max(-rect.top / sectionHeight, 0), 1);

    const maxScroll = track.scrollWidth - track.parentElement.offsetWidth;
    track.style.transform = `translate3d(${-progress * maxScroll}px, 0, 0)`;
  }

  window.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
  window.addEventListener("resize", () => requestAnimationFrame(update));
  update();
}

/* ----------------------------------------------------------------
   6. ANIMATED STAT COUNTERS
   ---------------------------------------------------------------- */
function setupStatCounters() {
  const counters = document.querySelectorAll(".stat-number");
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
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
