/**
 * ============================================================
 *  ICON LIBRARY
 * ============================================================
 * Small inline SVG icons used by the modalities carousel and
 * elsewhere. Keeping them as raw strings means the site needs
 * zero external icon fonts/libraries — one less thing to break.
 *
 * To add a new icon: pick a key, add an SVG string, then
 * reference that key from js/config.js (modalities[].icon).
 * ============================================================
 */

const ICONS = {
  xray: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="8" y="6" width="32" height="36" rx="3"/><path d="M16 16h16M16 22h16M16 28h10" stroke-linecap="round"/><circle cx="24" cy="35" r="2" fill="currentColor" stroke="none"/></svg>`,

  ultrasound: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 40c0-11 4.5-19 10-19s10 8 10 19" stroke-linecap="round"/><circle cx="24" cy="14" r="6"/><path d="M24 20v1" stroke-linecap="round"/></svg>`,

  ct: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="24" cy="24" r="16"/><circle cx="24" cy="24" r="7"/><path d="M24 8v9M24 31v9M8 24h9M31 24h9" stroke-linecap="round"/></svg>`,

  mri: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="6" y="18" width="36" height="12" rx="6"/><rect x="16" y="8" width="16" height="10" rx="2"/><path d="M14 30v6M34 30v6" stroke-linecap="round"/></svg>`,

  mammography: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 40V16a14 14 0 0 1 28 0v24" stroke-linecap="round"/><path d="M10 30h28" stroke-linecap="round"/></svg>`,

  bone: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 14a4 4 0 1 1 6.5 3.1l7 7 7-7A4 4 0 1 1 38 20a4 4 0 0 1-3.5-2.1l-7 7 7 7A4 4 0 1 1 34 38a4 4 0 0 1 .1-3.5l-7-7-7 7A4 4 0 1 1 10 30a4 4 0 0 1 3.5 2.1l7-7-7-7A4 4 0 0 1 14 14z"/></svg>`,

  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4" stroke-linecap="round"/></svg>`,

  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 5c0 8.3 6.7 15 15 15l3-4-6-3-2 2c-2.5-1.2-4.8-3.5-6-6l2-2-3-6-4 4z" stroke-linejoin="round"/></svg>`,

  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 6 8 7 8-7" stroke-linecap="round"/></svg>`,

  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 22s7-7.4 7-13a7 7 0 1 0-14 0c0 5.6 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>`,

  facebook: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v6h3v-6h3l1-3h-4v-2c0-.6.4-1 1-1z"/></svg>`,

  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1"/></svg>`,

  whatsapp: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3zm0 16.2a7.1 7.1 0 0 1-3.6-1l-.3-.2-2.7.7.7-2.6-.2-.3A7.2 7.2 0 1 1 12 19.2zm4-5.4c-.2-.1-1.3-.7-1.5-.7s-.4-.1-.5.1-.6.7-.7.9-.3.2-.5.1a5.8 5.8 0 0 1-2.9-2.5c-.2-.4.2-.4.6-1.2a.4.4 0 0 0 0-.4c-.1-.1-.5-1.2-.7-1.7s-.4-.4-.5-.4h-.4a.9.9 0 0 0-.6.3 2.6 2.6 0 0 0-.8 1.9c0 1.1.8 2.2.9 2.4a7.9 7.9 0 0 0 3.5 3.1c1.2.5 1.6.4 2 .4a1.9 1.9 0 0 0 1.3-.9 1.6 1.6 0 0 0 .1-.9c-.1-.1-.2-.2-.4-.3z"/></svg>`,

  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};
