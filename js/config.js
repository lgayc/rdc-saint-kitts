/**
 * ============================================================
 *  RDC SAINT KITTS — SITE CONFIGURATION
 * ============================================================
 * This is the ONLY file most future edits should need.
 * Change clinic info, modalities, socials, and integration
 * IDs here — the rest of the site reads from this object.
 *
 * Everything marked PLACEHOLDER was not confirmed from a real
 * source and should be replaced with the clinic's real info.
 * ============================================================
 */

const SITE_CONFIG = {
  // ---------------------------------------------------------
  // 1. CLINIC IDENTITY
  // ---------------------------------------------------------
  clinicName: "RDC Saint Kitts",
  clinicFullName: "Radiology Diagnostic Center — St. Kitts",
  tagline: "Advanced Imaging. Compassionate Care.",
  subTagline: "Serving St. Kitts & Nevis with modern diagnostic radiology.",

  // ---------------------------------------------------------
  // 2. CONTACT INFO
  // Phone + email below were found via public web search of the
  // clinic's Facebook page. Confirm these are correct before launch.
  // ---------------------------------------------------------
  contact: {
    phone: "+1 869-665-7171",
    phoneDisplay: "(869) 665-7171",
    email: "rad.dg.center@gmail.com",
    address: "Basseterre, St. Kitts & Nevis", // PLACEHOLDER — add exact street address
    hours: [
      { days: "Monday – Friday", time: "8:00 AM – 5:00 PM" }, // PLACEHOLDER — confirm real hours
      { days: "Saturday", time: "9:00 AM – 1:00 PM" },        // PLACEHOLDER
      { days: "Sunday", time: "Closed" }
    ]
  },

  // ---------------------------------------------------------
  // 3. SOCIAL LINKS
  // ---------------------------------------------------------
  social: {
    facebook: "https://www.facebook.com/p/Radiology-Diagnostic-Center-SKN-100078177635682/",
    instagram: "https://instagram.com/rdcsaintkitts", // PLACEHOLDER
    whatsapp: "https://wa.me/18696657171" // uses phone number above, edit digits if number changes
  },

  // ---------------------------------------------------------
  // 4. MODALITIES (services offered)
  // Edit, add, or remove entries here — the modalities carousel
  // on the homepage is generated automatically from this list.
  // "icon" is one of the built-in icon keys in js/icons.js
  // ---------------------------------------------------------
  modalities: [
    {
      name: "Digital X-Ray",
      icon: "xray",
      description: "Fast, low-dose digital radiography for bones, chest, and joint imaging."
    },
    {
      name: "Ultrasound (incl. 3D/4D)",
      icon: "ultrasound",
      description: "General, obstetric, and vascular ultrasound with high-resolution 3D/4D imaging."
    },
    {
      name: "CT Scan",
      icon: "ct",
      description: "Detailed cross-sectional imaging for rapid, accurate diagnosis."
    },
    {
      name: "MRI",
      icon: "mri",
      description: "High-field magnetic resonance imaging for soft tissue, brain, and spine studies."
    },
    {
      name: "Mammography",
      icon: "mammography",
      description: "Digital breast imaging for screening and diagnostic evaluation."
    },
    {
      name: "Bone Densitometry (DEXA)",
      icon: "bone",
      description: "Precise bone density scanning for osteoporosis screening."
    }
  ], // PLACEHOLDER LIST — confirm the clinic's real modality lineup and edit above

  // ---------------------------------------------------------
  // 5. BOOKING FORM (appointment notifications)
  // ---------------------------------------------------------
  booking: {
    // Formspree is a free form-backend service — no server needed.
    // 1. Create a free account at https://formspree.io
    // 2. Create a new form, copy its endpoint URL
    // 3. Paste it below, replacing the placeholder
    // See README.md "Booking notifications" section for full steps,
    // including optional Google Calendar + WhatsApp notifications via Zapier.
    formEndpoint: "https://formspree.io/f/REPLACE_WITH_YOUR_FORM_ID",

    // Used only while testing, so submissions have somewhere to go
    // before the real Formspree account is connected.
    testNotificationEmail: "869thesignstudio@gmail.com",

    // Time slots offered in the appointment dropdown
    timeSlots: [
      "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
      "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"
    ]
  },

  // ---------------------------------------------------------
  // 6. STUDIES / WORK TO SHARE
  // Non-technical content editor: staff add posts as ROWS in a
  // Google Sheet (like a spreadsheet). The site fetches that sheet
  // automatically. Full setup guide: README.md "Studies & posts".
  //
  // Leave sheetCsvUrl empty ("") to use the sample posts bundled
  // in data/sample-studies.json instead.
  // ---------------------------------------------------------
  studies: {
    sheetCsvUrl: "" // PLACEHOLDER — paste the "publish to web" CSV link here once ready
  }
};
