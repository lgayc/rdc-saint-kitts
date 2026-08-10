/**
 * ============================================================
 *  RDC SAINT KITTS - SITE CONFIGURATION / CONFIGURACION
 * ============================================================
 * Este es el UNICO archivo que necesitas editar para cambios
 * normales: datos de contacto, servicios, redes sociales y las
 * conexiones (correo / WhatsApp / panel admin).
 *
 * Lo marcado como PLACEHOLDER hay que reemplazarlo con los
 * datos reales de la clinica antes de entregar.
 * ============================================================
 */

const SITE_CONFIG = {
  // ---------------------------------------------------------
  // 1. IDENTIDAD DE LA CLINICA
  // ---------------------------------------------------------
  clinicName: "RDC Saint Kitts",
  clinicFullName: "Radiology Diagnostic Center",
  tagline: "Advanced Imaging. Compassionate Care.",
  subTagline: "Serving St. Kitts & Nevis with modern diagnostic radiology.",

  // Logo del cliente. Para cambiarlo, reemplaza el archivo en
  // assets/logo.jpg (manteniendo el mismo nombre) o cambia la ruta.
  logo: "assets/logo.jpg",

  // ---------------------------------------------------------
  // 2. CONTACTO
  // Telefono y correo verificados de la pagina publica de Facebook.
  // Confirmar antes de publicar.
  // ---------------------------------------------------------
  contact: {
    phone: "+1 869-665-7171",
    phoneDisplay: "(869) 665-7171",
    email: "rad.dg.center@gmail.com",
    address: "Basseterre, St. Kitts & Nevis", // PLACEHOLDER - falta direccion exacta
    hours: [
      { days: "Monday - Friday", time: "8:00 AM - 5:00 PM" }, // PLACEHOLDER - confirmar horario
      { days: "Saturday", time: "9:00 AM - 1:00 PM" },        // PLACEHOLDER
      { days: "Sunday", time: "Closed" }
    ]
  },

  // ---------------------------------------------------------
  // 3. REDES SOCIALES
  // ---------------------------------------------------------
  social: {
    facebook: "https://www.facebook.com/p/Radiology-Diagnostic-Center-SKN-100078177635682/",
    instagram: "https://instagram.com/rdcsaintkitts", // PLACEHOLDER
    whatsapp: "https://wa.me/18696657171" // usa el telefono de arriba
  },

  // ---------------------------------------------------------
  // 4. CARRUSEL DEL BANNER (hero)
  // ---------------------------------------------------------
  // Estas son las imagenes de fondo que rotan en el banner.
  // Puedes editarlas AQUI, o mejor: desde el panel admin
  // (admin.html), que las guarda sin tocar codigo.
  //
  // Si el admin tiene imagenes guardadas, esas mandan y esta
  // lista solo sirve de respaldo.
  hero: {
    slides: [
      // Ejemplo: { image: "assets/banner1.jpg", caption: "Nuestro equipo" }
      // Vacio por ahora - se llena con las fotos del cliente.
    ],
    slideDurationMs: 5000, // tiempo de cada imagen antes de cambiar
    enableAutoplay: true
  },

  // ---------------------------------------------------------
  // 5. MODALIDADES (servicios)
  // El carrusel de servicios y el desplegable del formulario se
  // generan solos desde esta lista. Editar aqui es suficiente.
  // "icon" debe ser una de las llaves en js/icons.js
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
  ], // PLACEHOLDER - confirmar la lista real de servicios

  // ---------------------------------------------------------
  // 6. BACKEND / CONEXIONES
  // ---------------------------------------------------------
  // Todo el sitio (reservas, correo, WhatsApp y el panel admin)
  // se conecta a UNA sola direccion: un Google Apps Script.
  // Es gratis y no necesita servidor propio.
  //
  // Como obtener esta URL: ver GUIA-RAPIDA.md, seccion 1.
  // Se ve asi: https://script.google.com/macros/s/AKfy..../exec
  api: {
    url: "", // PLACEHOLDER - pegar aqui la URL del Apps Script

    // Mientras esto este vacio, el sitio funciona en "modo prueba":
    // el formulario valida todo normalmente y muestra los datos,
    // pero abre un correo prellenado en vez de enviarlo solo.
    // Asi puedes probar el sitio antes de conectar el backend.
  },

  // ---------------------------------------------------------
  // 7. NOTIFICACIONES DE RESERVAS
  // ---------------------------------------------------------
  // OJO: estos son los datos DE PRUEBA. Antes de entregar el
  // sitio al cliente, cambiar por el correo y WhatsApp reales
  // de la clinica (aqui y tambien en el Apps Script).
  notifications: {
    email: "869thesignstudio@gmail.com",   // PRUEBA - cambiar al entregar
    whatsappNumber: "18697629440",          // PRUEBA - cambiar al entregar
    // Formato del numero: codigo de pais + numero, sin +, sin espacios.
    // Ejemplo St. Kitts: 1869XXXXXXX
  },

  // ---------------------------------------------------------
  // 8. HORARIOS DISPONIBLES PARA RESERVAR
  // ---------------------------------------------------------
  booking: {
    timeSlots: [
      "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
      "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"
    ],
    // No permitir reservar con menos de X horas de anticipacion
    minHoursAhead: 24
  },

  // ---------------------------------------------------------
  // 9. ESTUDIOS / PUBLICACIONES
  // ---------------------------------------------------------
  // Si el backend (api.url) esta conectado, las publicaciones se
  // manejan desde el panel admin y esto se ignora.
  // Si no, el sitio usa data/sample-studies.json como respaldo.
  studies: {
    sheetCsvUrl: "" // Opcional - alternativa via Google Sheets publicado
  }
};
