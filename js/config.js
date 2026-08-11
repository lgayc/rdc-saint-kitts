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
  // ---------------------------------------------------------
  contact: {
    phone: "+1 869-665-7171",
    phoneDisplay: "(869) 665-7171",
    email: "rad.dg.center@gmail.com",
    address: "Basseterre, St. Kitts & Nevis", // PLACEHOLDER - falta direccion exacta
    hours: [
      { days: "Monday - Friday", time: "8:00 AM - 5:00 PM" }, // PLACEHOLDER
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
    whatsapp: "https://wa.me/18696657171"
  },

  // ---------------------------------------------------------
  // 4. CARRUSEL DEL BANNER (hero)
  // ---------------------------------------------------------
  hero: {
    slides: [
      // IMAGENES DE RELLENO - reemplazar con fotos reales.
      // La forma facil: panel admin -> Banner Photos.
      { image: "assets/placeholders/banner-1.svg", caption: "Reception" },
      { image: "assets/placeholders/banner-2.svg", caption: "Imaging suite" },
      { image: "assets/placeholders/banner-3.svg", caption: "Our team" }
    ],
    slideDurationMs: 5000,
    enableAutoplay: true
  },

  // ---------------------------------------------------------
  // 5. MODALIDADES (servicios)
  // El carrusel de servicios y el desplegable del formulario se
  // generan solos desde esta lista. Editar aqui es suficiente.
  //
  //   name        -> nombre que ve el paciente
  //   icon        -> llave de js/icons.js (el iconito pequeno)
  //   image       -> ilustracion grande de la tarjeta
  //   description -> texto corto debajo del titulo
  //   details     -> lo que sale en la ventana al hacer clic
  //
  // Las ilustraciones estan en assets/services/ y son SVG, o sea
  // que se ven nitidas en cualquier pantalla y pesan casi nada.
  // Si prefieres fotos o iconos comprados, cambia la ruta por tu
  // archivo y listo (recomendado horizontal, ~800x680).
  //
  // >>> IMPORTANTE SOBRE EL CONTENIDO CLINICO <<<
  // Los textos de "details" son descripciones generales, correctas
  // pero GENERICAS. La preparacion y la duracion cambian segun el
  // equipo, el protocolo y el caso de cada paciente, y son cosas
  // que afectan la salud (ayuno, contraste, implantes metalicos).
  // EL RADIOLOGO DE LA CLINICA TIENE QUE REVISARLOS Y AJUSTARLOS
  // antes de publicar el sitio.
  // ---------------------------------------------------------
  modalities: [
    {
      name: "Digital X-Ray",
      icon: "xray",
      image: "assets/services/xray.svg",
      description: "Fast, low-dose digital radiography for bones, chest, and joint imaging.",
      details: {
        summary: "X-ray uses a small, carefully controlled dose of radiation to create an image of the structures inside your body. Dense tissue like bone absorbs more of the beam and appears lighter, while softer tissue appears darker. It is the fastest imaging study we offer and often the first step in diagnosis.",
        uses: [
          "Suspected fractures and bone injuries",
          "Chest imaging for the lungs and heart outline",
          "Joint problems and arthritis",
          "Follow-up after an injury or surgery"
        ],
        preparation: "No special preparation is usually needed. You may be asked to remove jewellery or clothing with metal near the area being imaged.", // REVISAR
        duration: "About 10-15 minutes"  // REVISAR
      }
    },
    {
      name: "Ultrasound (incl. 3D/4D)",
      icon: "ultrasound",
      image: "assets/services/ultrasound.svg",
      description: "General, obstetric, and vascular ultrasound with high-resolution 3D/4D imaging.",
      details: {
        summary: "Ultrasound builds an image from sound waves that bounce off the structures inside your body. It uses no radiation at all, which is why it is the standard choice during pregnancy. Our 3D/4D capability adds depth and live movement to the image.",
        uses: [
          "Pregnancy and fetal monitoring",
          "Abdominal organs: liver, gallbladder, kidneys",
          "Thyroid, breast, and soft tissue evaluation",
          "Blood flow and vascular studies"
        ],
        preparation: "Preparation depends on the type of study. Some abdominal scans require fasting, and some pelvic scans require a full bladder. Our team will tell you what applies when you book.", // REVISAR
        duration: "About 20-45 minutes"  // REVISAR
      }
    },
    {
      name: "CT Scan",
      icon: "ct",
      image: "assets/services/ct.svg",
      description: "Detailed cross-sectional imaging for rapid, accurate diagnosis.",
      details: {
        summary: "A CT scan takes a series of X-ray images as the scanner rotates around you, then combines them into detailed cross-sections. It shows bone, soft tissue, and blood vessels together, which makes it valuable when a fast and thorough answer is needed.",
        uses: [
          "Emergency assessment after trauma",
          "Abdominal and chest evaluation",
          "Detecting and staging tumours",
          "Detailed views of complex fractures"
        ],
        preparation: "Some CT studies use a contrast agent, which may require fasting beforehand. Tell us if you have any allergies, kidney problems, or if you are or might be pregnant.", // REVISAR
        duration: "About 15-30 minutes"  // REVISAR
      }
    },
    {
      name: "MRI",
      icon: "mri",
      image: "assets/services/mri.svg",
      description: "High-field magnetic resonance imaging for soft tissue, brain, and spine studies.",
      details: {
        summary: "MRI uses a strong magnetic field and radio waves - no radiation - to produce highly detailed images, especially of soft tissue. It is the study of choice for the brain, spinal cord, ligaments, and joints, where fine detail matters most.",
        uses: [
          "Brain and spinal cord studies",
          "Ligament, cartilage, and joint injuries",
          "Soft tissue masses",
          "Detailed neurological evaluation"
        ],
        preparation: "Because of the strong magnet, you must tell us about any pacemaker, metal implant, surgical clip, or metal fragment before the scan. The scanner is noisy and you will need to stay still; let us know if you experience claustrophobia so we can help.", // REVISAR
        duration: "About 30-60 minutes"  // REVISAR
      }
    },
    {
      name: "Mammography",
      icon: "mammography",
      image: "assets/services/mammography.svg",
      description: "Digital breast imaging for screening and diagnostic evaluation.",
      details: {
        summary: "Mammography is a low-dose X-ray study of the breast. Brief, gentle compression spreads the tissue so that small changes show up clearly. It can detect changes years before they can be felt, which is why regular screening matters.",
        uses: [
          "Routine screening",
          "Evaluating a lump or other change",
          "Follow-up of a previous finding",
          "Assessment after breast surgery"
        ],
        preparation: "Avoid deodorant, powder, or lotion on the chest and underarms on the day of your appointment, since these can show up on the image. If you have previous mammograms from elsewhere, bring them for comparison.", // REVISAR
        duration: "About 20 minutes"  // REVISAR
      }
    },
    {
      name: "Bone Densitometry (DEXA)",
      icon: "bone",
      image: "assets/services/bone.svg",
      description: "Precise bone density scanning for osteoporosis screening.",
      details: {
        summary: "A DEXA scan measures how much mineral your bones contain, usually at the spine and hip. The result is compared against reference values to assess bone strength. It is quick, painless, and uses a very low dose of radiation.",
        uses: [
          "Screening for osteoporosis",
          "Assessing fracture risk",
          "Monitoring response to treatment",
          "Follow-up after menopause or long-term steroid use"
        ],
        preparation: "Avoid calcium supplements for about 24 hours before the scan. Wear comfortable clothing without metal zippers or buttons. Tell us if you have had a recent study using contrast.", // REVISAR
        duration: "About 15 minutes"  // REVISAR
      }
    }
  ], // PLACEHOLDER - confirmar la lista real de servicios

  // ---------------------------------------------------------
  // 6. BACKEND / CONEXIONES
  // Como obtener esta URL: ver GUIA-RAPIDA.md, seccion 1.
  // ---------------------------------------------------------
  api: {
    url: "", // PLACEHOLDER - pegar aqui la URL del Apps Script

    // Mientras esto este vacio, el sitio funciona en "modo prueba":
    // el formulario valida todo normalmente pero abre un correo
    // prellenado en vez de enviarlo solo.
  },

  // ---------------------------------------------------------
  // 7. PANEL DE ADMINISTRACION (admin.html)
  // ---------------------------------------------------------
  admin: {
    // MODO DEMOSTRACION
    // Sirve para entrar al panel y probarlo ANTES de conectar el
    // backend. Usa reservas de ejemplo y NO guarda nada.
    //
    // En cuanto pongas la URL en api.url (arriba), este modo se
    // apaga solo y el panel pasa a usar la contrasena de verdad,
    // la que esta en backend/Codigo.gs -> ADMIN_PASSWORD.
    demoMode: true,

    // Contrasena SOLO del modo demostracion.
    // Ojo: esta a la vista en el codigo, por eso solo funciona
    // cuando no hay backend y no hay datos reales que proteger.
    demoPassword: "demo1234"
  },

  // ---------------------------------------------------------
  // 8. NOTIFICACIONES DE RESERVAS
  // OJO: datos DE PRUEBA. Cambiar antes de entregar.
  // ---------------------------------------------------------
  notifications: {
    email: "869thesignstudio@gmail.com",   // PRUEBA
    whatsappNumber: "18697629440"           // PRUEBA
  },

  // ---------------------------------------------------------
  // 9. HORARIOS DISPONIBLES PARA RESERVAR
  // ---------------------------------------------------------
  booking: {
    timeSlots: [
      "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
      "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"
    ],
    minHoursAhead: 24
  },

  // ---------------------------------------------------------
  // 10. ESTUDIOS / PUBLICACIONES
  // ---------------------------------------------------------
  studies: {
    sheetCsvUrl: "",
    defaultImage: "assets/placeholders/post.svg"
  }
};
