/**
 * ============================================================
 *  ICON LIBRARY
 * ============================================================
 * Iconos SVG en linea. Al estar aqui como texto, el sitio no
 * necesita ninguna libreria de iconos externa: una cosa menos
 * que se pueda romper o que haya que descargar.
 *
 * TODOS usan viewBox 0 0 24 24 y stroke="currentColor", asi que
 * heredan el color y el tamano de donde se pongan. Para cambiar
 * el color de un icono, cambia el color del elemento padre.
 *
 * DISENO: se ven a ~21px en las tarjetas, asi que cada uno tiene
 * una silueta bien distinta de los demas. A ese tamano el detalle
 * fino no se aprecia; lo que importa es la forma general.
 *
 * Para agregar un icono: elige una llave, agrega el SVG, y usa
 * esa llave en js/config.js (modalities[].icon).
 * ============================================================
 */

const ICONS = {

  /* ---------- Modalidades ---------- */

  // Rayos X: emisor arriba, haz abriendose, placa abajo
  xray: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="3.2" r="1.6" fill="currentColor" stroke="none"/>
    <path d="M10.9 5.6 4.5 17.5M13.1 5.6l6.4 11.9"/>
    <path d="M3 20h18"/>
    <path d="M9.5 11h5M9 14h6"/>
  </svg>`,

  // Ultrasonido: transductor arriba, ondas del eco bajando
  ultrasound: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9.2" y="2.5" width="5.6" height="5.2" rx="2"/>
    <path d="M6.5 10.5Q12 15.5 17.5 10.5"/>
    <path d="M4.5 14Q12 20.5 19.5 14"/>
    <path d="M3 18.5q9 6.5 18 0"/>
  </svg>`,

  // CT: anillo con tunel + camilla (silueta redonda)
  ct: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="10" r="7.2"/>
    <circle cx="12" cy="10" r="3"/>
    <path d="M12 2.8v2.4M12 14.8v2.4M4.8 10h2.4M16.8 10h2.4"/>
    <path d="M4 20.5h16"/>
  </svg>`,

  // MRI: iman rectangular con tunel (silueta cuadrada, para que
  // no se confunda con el CT que es redondo)
  mri: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2.5" y="4" width="19" height="12.5" rx="4.5"/>
    <circle cx="12" cy="10.2" r="3.4"/>
    <path d="M6 4.6v11.3M18 4.6v11.3"/>
    <path d="M5 20h14"/>
  </svg>`,

  // Mamografia: columna a la izquierda + dos placas de compresion
  mammography: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3.2 3v18"/>
    <path d="M5.5 5.5h13"/>
    <path d="M6 10.5h13"/>
    <path d="M6 16.5h13"/>
    <path d="M9.5 10.5c0 3.6 1.8 6 3.8 6s3.4-1.6 3.4-4"/>
  </svg>`,

  // Densitometria osea: vertebras apiladas (columna lumbar)
  bone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="8.8" y="2.6" width="6.4" height="3.6" rx="1.4"/>
    <rect x="8.4" y="7.6" width="7.2" height="3.6" rx="1.4"/>
    <rect x="8" y="12.6" width="8" height="3.6" rx="1.4"/>
    <rect x="8.4" y="17.6" width="7.2" height="3.4" rx="1.4"/>
    <path d="M8.8 4.4H6.4M15.2 4.4h2.4M8.4 9.4H5.6M15.6 9.4h2.8"/>
  </svg>`,

  /* ---------- Iconos de interfaz ---------- */

  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="5" width="18" height="16" rx="2.5"/>
    <path d="M3 9.5h18M8 3v4M16 3v4"/>
  </svg>`,

  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6.5 3h-2A1.5 1.5 0 0 0 3 4.6C3 13.1 10.9 21 19.4 21a1.5 1.5 0 0 0 1.6-1.5v-2a1 1 0 0 0-.8-1l-3.4-.7a1 1 0 0 0-1 .4l-.9 1.2a13.6 13.6 0 0 1-5.3-5.3l1.2-.9a1 1 0 0 0 .4-1l-.7-3.4a1 1 0 0 0-1-.8z"/>
  </svg>`,

  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2.5" y="5" width="19" height="14" rx="2.5"/>
    <path d="m3.5 7 7.6 5.6a1.5 1.5 0 0 0 1.8 0L20.5 7"/>
  </svg>`,

  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 21.5s7-6.9 7-12.2A7 7 0 0 0 5 9.3c0 5.3 7 12.2 7 12.2z"/>
    <circle cx="12" cy="9.2" r="2.6"/>
  </svg>`,

  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 6.8V12l3.4 2"/>
  </svg>`,

  /* ---------- Redes sociales (rellenas, no de linea) ---------- */

  facebook: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H16.7V3.6A21 21 0 0 0 14.3 3.5c-2.4 0-4 1.45-4 4.13V9.9H7.6V13h2.7v8z"/>
  </svg>`,

  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="5"/>
    <circle cx="12" cy="12" r="3.8"/>
    <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/>
  </svg>`,

  whatsapp: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.2a9.7 9.7 0 0 0-8.3 14.7L2.3 21.8l5.1-1.35A9.7 9.7 0 1 0 12 2.2zm0 17.6a7.9 7.9 0 0 1-4-1.1l-.3-.17-3 .8.8-2.9-.19-.3A7.9 7.9 0 1 1 12 19.8zm4.4-5.9c-.24-.12-1.42-.7-1.64-.78s-.38-.12-.54.12-.62.78-.76.94-.28.18-.52.06a6.4 6.4 0 0 1-3.2-2.8c-.24-.42.24-.39.69-1.3a.44.44 0 0 0 0-.42c-.06-.12-.54-1.3-.74-1.78s-.39-.4-.54-.41h-.46a.9.9 0 0 0-.64.3 2.7 2.7 0 0 0-.84 2c0 1.18.86 2.32.98 2.48a9 9 0 0 0 3.44 3.04c1.28.55 1.78.6 2.42.5a2.2 2.2 0 0 0 1.45-1 1.8 1.8 0 0 0 .12-1.02c-.06-.1-.22-.16-.46-.28z"/>
  </svg>`,

  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6"/>
  </svg>`
};
