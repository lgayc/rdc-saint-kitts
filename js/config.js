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
  tagline: { en: "Advanced Imaging. Compassionate Care.", es: "Imagenología avanzada. Trato humano." },
  subTagline: { en: "Serving St. Kitts & Nevis with modern diagnostic radiology.", es: "Radiología diagnóstica moderna para San Cristóbal y Nieves." },

  // ---------------------------------------------------------
  // 1b. QUIENES SOMOS
  // ---------------------------------------------------------
  // >>> ESTE TEXTO LO TIENE QUE ESCRIBIR LA CLINICA. <<<
  //
  // Lo que hay debajo es un armazon: dice cosas que son ciertas
  // de cualquier centro de imagenologia, y por eso mismo no dice
  // nada de ESTE. A proposito no invente nada que suene bien y no
  // pueda comprobarse — ni años de experiencia, ni titulos, ni
  // numero de pacientes, ni "los primeros en la isla". Un dato
  // inventado en la seccion "quienes somos" de una clinica es una
  // mentira con membrete, y encima es la que un paciente citaria
  // luego.
  //
  // Lo que hace falta preguntarles, en concreto:
  //   - desde cuando existe el centro
  //   - quien lo dirige y con que titulacion
  //   - que equipos tienen y de que marca/modelo
  //   - en cuanto tiempo entregan resultados de verdad
  //   - con que seguros o medicos derivantes trabajan
  // ---------------------------------------------------------
  about: {
    heading: {
      en: "Imaging you can trust, close to home.",
      es: "Diagnóstico por imagen en el que confiar, cerca de casa."
    },

    // Dos parrafos. El primero dice QUE es el centro; el segundo,
    // COMO trabaja. Ese orden es el que responde a la pregunta que
    // el paciente trae encima: "¿me puedo fiar de este sitio?".
    body: {
      en: [
        "Radiology Diagnostic Center is a diagnostic imaging centre serving St. Kitts & Nevis. We perform the studies your doctor orders — X-ray, ultrasound, CT, MRI, mammography and bone densitometry — and send the report back to them.", // PLACEHOLDER
        "Our team walks you through what each study involves before it starts, so you know what to expect. If your study needs preparation, we tell you when you book, not when you arrive." // PLACEHOLDER
      ],
      es: [
        "Radiology Diagnostic Center es un centro de imagenología diagnóstica en San Cristóbal y Nieves. Hacemos los estudios que le indica su médico —radiografía, ultrasonido, tomografía, resonancia, mamografía y densitometría— y le enviamos el informe a él.", // PLACEHOLDER
        "Nuestro equipo le explica en qué consiste el estudio antes de empezar, para que sepa qué esperar. Y si su estudio necesita preparación, se lo decimos al pedir la cita, no al llegar." // PLACEHOLDER
      ]
    },

    // Tres apoyos cortos. Las etiquetas estan en js/i18n.js; aqui
    // va solo la linea que las explica.
    pillars: {
      en: [
        "The studies we offer, on equipment maintained to manufacturer schedule.", // PLACEHOLDER - confirmar equipos
        "Studies performed and read by qualified staff.",                          // PLACEHOLDER - nombres y titulacion
        "Your report goes to your doctor as soon as it is ready."                  // PLACEHOLDER - plazo real
      ],
      es: [
        "Los estudios que ofrecemos, en equipos con el mantenimiento al día.",     // PLACEHOLDER - confirmar equipos
        "Estudios realizados e interpretados por personal cualificado.",           // PLACEHOLDER - nombres y titulacion
        "Su informe llega a su médico en cuanto está listo."                       // PLACEHOLDER - plazo real
      ]
    },

    // La foto. Sale del repositorio, no de Supabase: asi no gasta
    // el egress del plan gratuito en cada visita.
    image: "assets/banners/control-room.jpg" // PLACEHOLDER - foto real del centro
  },

  logo: "assets/logo.png",

  // ---------------------------------------------------------
  // 2. CONTACTO
  // ---------------------------------------------------------
  contact: {
    phone: "+1 869-665-7171",
    phoneDisplay: "(869) 665-7171",
    email: "rad.dg.center@gmail.com",
    address: {
      en: "Lime Kiln Commercial Development, Antioch Baptist Church Multi-Purpose Facility, Basseterre, St. Kitts & Nevis",
      es: "Lime Kiln Commercial Development, Antioch Baptist Church Multi-Purpose Facility, Basseterre, San Cristóbal y Nieves"
    },

    // Coordenadas de la ficha de Google de la clinica. De aqui salen
    // el mapa incrustado y el boton de "como llegar": si algun dia se
    // mudan, se cambia solo este punto y las dos cosas se mueven.
    map: { lat: 17.2950417, lng: -62.7397749 },

    // Ficha de la clinica en Google.
    google: {
      // Lleva a la ficha, donde estan las resenas publicadas.
      placeUrl: "https://www.google.com/maps?cid=2980805071733559535",

      // Enlace corto del perfil de Google Business: abre el cuadro de
      // escribir resena de una vez. Mientras este vacio se usa
      // placeUrl, que deja el boton de resenar a un toque.
      reviewUrl: "" // PLACEHOLDER - falta el enlace g.page/r/.../review
    },
    hours: [
      { days: { en: "Monday - Friday", es: "Lunes a viernes" }, time: "8:00 AM - 5:00 PM" }, // PLACEHOLDER
      { days: { en: "Saturday", es: "Sábado" }, time: "9:00 AM - 1:00 PM" },        // PLACEHOLDER
      { days: { en: "Sunday", es: "Domingo" }, time: { en: "Closed", es: "Cerrado" } }
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
    // Fotos reales del cliente. La primera es la unidad movil con
    // el logo RDC, que es lo mas propio de la clinica: por eso va
    // de primera, es lo que ve todo el que entra.
    //
    // Para cambiarlas sin tocar codigo: panel admin -> Banner Photos.
    slides: [
      { image: "assets/banners/mobile-unit.jpg",  caption: "Our mobile diagnostic unit" },
      { image: "assets/banners/mri-suite.jpg",    caption: "MRI suite" },
      { image: "assets/banners/control-room.jpg", caption: "Reading room" },
      { image: "assets/banners/unit-sunset.jpg",  caption: "On the road across St. Kitts" }
    ],
    slideDurationMs: 5000, // tiempo de cada imagen antes de cambiar
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
      name: { en: "Digital X-Ray", es: "Radiografía digital" },
      icon: "xray",
      image: "assets/services/xray.svg",
      description: { en: "Fast, low-dose digital radiography for bones, chest, and joint imaging.", es: "Radiografía digital rápida y de baja dosis para huesos, tórax y articulaciones." },
      details: {
        summary: { en: "X-ray uses a small, carefully controlled dose of radiation to create an image of the structures inside your body. Dense tissue like bone absorbs more of the beam and appears lighter, while softer tissue appears darker. It is the fastest imaging study we offer and often the first step in diagnosis.", es: "La radiografía usa una dosis pequeña y controlada de radiación para obtener una imagen de lo que hay dentro del cuerpo. Los tejidos densos como el hueso absorben más y salen más claros; los blandos salen más oscuros. Es el estudio más rápido que hacemos y muchas veces el primer paso del diagnóstico." },
        uses: {
          en: [
            "Suspected fractures and bone injuries",
            "Chest imaging for the lungs and heart outline",
            "Joint problems and arthritis",
            "Follow-up after an injury or surgery"
          ],
          es: [
            "Sospecha de fractura o lesión ósea",
            "Estudio del tórax: pulmones y silueta del corazón",
            "Problemas articulares y artritis",
            "Control después de una lesión o una cirugía"
          ]
        },
        preparation: { en: "No special preparation is usually needed. You may be asked to remove jewellery or clothing with metal near the area being imaged.", es: "Normalmente no hace falta ninguna preparación. Puede que le pidamos quitarse joyas o ropa con metal cerca de la zona que se va a estudiar." }, // REVISAR
        duration: { en: "About 10-15 minutes", es: "Unos 10-15 minutos" }  // REVISAR
      }
    },
    {
      name: { en: "Ultrasound (incl. 3D/4D)", es: "Ultrasonido (incluye 3D/4D)" },
      icon: "ultrasound",
      image: "assets/services/ultrasound.svg",
      description: { en: "General, obstetric, and vascular ultrasound with high-resolution 3D/4D imaging.", es: "Ultrasonido general, obstétrico y vascular, con imagen 3D/4D de alta resolución." },
      details: {
        summary: { en: "Ultrasound builds an image from sound waves that bounce off the structures inside your body. It uses no radiation at all, which is why it is the standard choice during pregnancy. Our 3D/4D capability adds depth and live movement to the image.", es: "El ultrasonido forma la imagen con ondas de sonido que rebotan dentro del cuerpo. No usa radiación en absoluto, y por eso es el estudio habitual durante el embarazo. Nuestro equipo 3D/4D añade volumen y movimiento en vivo a la imagen." },
        uses: {
          en: [
            "Pregnancy and fetal monitoring",
            "Abdominal organs: liver, gallbladder, kidneys",
            "Thyroid, breast, and soft tissue evaluation",
            "Blood flow and vascular studies"
          ],
          es: [
            "Embarazo y control del bebé",
            "Órganos del abdomen: hígado, vesícula, riñones",
            "Tiroides, mama y tejidos blandos",
            "Flujo sanguíneo y estudios vasculares"
          ]
        },
        preparation: { en: "Preparation depends on the type of study. Some abdominal scans require fasting, and some pelvic scans require a full bladder. Our team will tell you what applies when you book.", es: "La preparación depende del tipo de estudio. Algunos de abdomen piden ayuno y algunos de pelvis piden la vejiga llena. Al pedir la cita le decimos qué aplica en su caso." }, // REVISAR
        duration: { en: "About 20-45 minutes", es: "Unos 20-45 minutos" }  // REVISAR
      }
    },
    {
      name: { en: "CT Scan", es: "Tomografía (TAC)" },
      icon: "ct",
      image: "assets/services/ct.svg",
      description: { en: "Detailed cross-sectional imaging for rapid, accurate diagnosis.", es: "Imagen por cortes con gran detalle, para un diagnóstico rápido y preciso." },
      details: {
        summary: { en: "A CT scan takes a series of X-ray images as the scanner rotates around you, then combines them into detailed cross-sections. It shows bone, soft tissue, and blood vessels together, which makes it valuable when a fast and thorough answer is needed.", es: "La tomografía toma muchas radiografías mientras el equipo gira alrededor de usted y luego las combina en cortes detallados. Muestra a la vez hueso, tejido blando y vasos sanguíneos, lo que la hace muy útil cuando hace falta una respuesta rápida y completa." },
        uses: {
          en: [
            "Emergency assessment after trauma",
            "Abdominal and chest evaluation",
            "Detecting and staging tumours",
            "Detailed views of complex fractures"
          ],
          es: [
            "Valoración urgente después de un golpe o accidente",
            "Estudio del abdomen y del tórax",
            "Detección y estadificación de tumores",
            "Vista detallada de fracturas complejas"
          ]
        },
        preparation: { en: "Some CT studies use a contrast agent, which may require fasting beforehand. Tell us if you have any allergies, kidney problems, or if you are or might be pregnant.", es: "Algunos estudios de tomografía usan contraste, y eso puede exigir ayuno previo. Avísenos si tiene alergias, problemas de riñón, o si está o podría estar embarazada." }, // REVISAR
        duration: { en: "About 15-30 minutes", es: "Unos 15-30 minutos" }  // REVISAR
      }
    },
    {
      name: { en: "MRI", es: "Resonancia magnética" },
      icon: "mri",
      image: "assets/services/mri.svg",
      description: { en: "High-field magnetic resonance imaging for soft tissue, brain, and spine studies.", es: "Resonancia magnética de alto campo para tejidos blandos, cerebro y columna." },
      details: {
        summary: { en: "MRI uses a strong magnetic field and radio waves - no radiation - to produce highly detailed images, especially of soft tissue. It is the study of choice for the brain, spinal cord, ligaments, and joints, where fine detail matters most.", es: "La resonancia usa un campo magnético potente y ondas de radio, sin nada de radiación, para obtener imágenes muy detalladas, sobre todo de tejidos blandos. Es el estudio de elección para cerebro, médula, ligamentos y articulaciones, donde el detalle fino es lo que cuenta." },
        uses: {
          en: [
            "Brain and spinal cord studies",
            "Ligament, cartilage, and joint injuries",
            "Soft tissue masses",
            "Detailed neurological evaluation"
          ],
          es: [
            "Estudios del cerebro y la médula espinal",
            "Lesiones de ligamentos, cartílago y articulaciones",
            "Masas en tejidos blandos",
            "Valoración neurológica detallada"
          ]
        },
        preparation: { en: "Because of the strong magnet, you must tell us about any pacemaker, metal implant, surgical clip, or metal fragment before the scan. The scanner is noisy and you will need to stay still; let us know if you experience claustrophobia so we can help.", es: "Por el imán potente, tiene que avisarnos antes del estudio si lleva marcapasos, algún implante metálico, clips de cirugía o fragmentos de metal. El equipo hace ruido y hay que quedarse quieto; si sufre claustrofobia, dígalo y le ayudamos." }, // REVISAR
        duration: { en: "About 30-60 minutes", es: "Unos 30-60 minutos" }  // REVISAR
      }
    },
    {
      name: { en: "Mammography", es: "Mamografía" },
      icon: "mammography",
      image: "assets/services/mammography.svg",
      description: { en: "Digital breast imaging for screening and diagnostic evaluation.", es: "Estudio digital de mama, para chequeo periódico y para diagnóstico." },
      details: {
        summary: { en: "Mammography is a low-dose X-ray study of the breast. Brief, gentle compression spreads the tissue so that small changes show up clearly. It can detect changes years before they can be felt, which is why regular screening matters.", es: "La mamografía es un estudio de rayos X de baja dosis de la mama. Una compresión breve y suave extiende el tejido para que los cambios pequeños se vean con claridad. Puede detectar cambios años antes de que se noten al tacto, y por eso el chequeo periódico importa tanto." },
        uses: {
          en: [
            "Routine screening",
            "Evaluating a lump or other change",
            "Follow-up of a previous finding",
            "Assessment after breast surgery"
          ],
          es: [
            "Chequeo periódico",
            "Estudio de un bulto u otro cambio",
            "Control de un hallazgo anterior",
            "Valoración después de una cirugía de mama"
          ]
        },
        preparation: { en: "Avoid deodorant, powder, or lotion on the chest and underarms on the day of your appointment, since these can show up on the image. If you have previous mammograms from elsewhere, bring them for comparison.", es: "El día de la cita, no use desodorante, talco ni crema en el pecho ni en las axilas: pueden salir en la imagen. Si tiene mamografías anteriores de otro centro, tráigalas para comparar." }, // REVISAR
        duration: { en: "About 20 minutes", es: "Unos 20 minutos" }  // REVISAR
      }
    },
    {
      name: { en: "Bone Densitometry (DEXA)", es: "Densitometría ósea (DEXA)" },
      icon: "bone",
      image: "assets/services/bone.svg",
      description: { en: "Precise bone density scanning for osteoporosis screening.", es: "Medición precisa de la densidad de los huesos, para detectar osteoporosis." },
      details: {
        summary: { en: "A DEXA scan measures how much mineral your bones contain, usually at the spine and hip. The result is compared against reference values to assess bone strength. It is quick, painless, and uses a very low dose of radiation.", es: "La densitometría mide cuánto mineral tienen sus huesos, normalmente en la columna y la cadera. El resultado se compara con valores de referencia para saber qué tan fuertes están. Es rápida, no duele y usa una dosis de radiación muy baja." },
        uses: {
          en: [
            "Screening for osteoporosis",
            "Assessing fracture risk",
            "Monitoring response to treatment",
            "Follow-up after menopause or long-term steroid use"
          ],
          es: [
            "Detección de osteoporosis",
            "Valoración del riesgo de fractura",
            "Control de la respuesta al tratamiento",
            "Seguimiento tras la menopausia o el uso prolongado de corticoides"
          ]
        },
        preparation: { en: "Avoid calcium supplements for about 24 hours before the scan. Wear comfortable clothing without metal zippers or buttons. Tell us if you have had a recent study using contrast.", es: "No tome suplementos de calcio en las 24 horas previas. Venga con ropa cómoda, sin cremalleras ni botones de metal. Avísenos si le hicieron hace poco un estudio con contraste." }, // REVISAR
        duration: { en: "About 15 minutes", es: "Unos 15 minutos" }  // REVISAR
      }
    }
  ], // PLACEHOLDER - confirmar la lista real de servicios

  // ---------------------------------------------------------
  // 6. BACKEND (Supabase)
  // De donde salen estos dos valores: panel de Supabase ->
  // Project Settings -> API. Paso a paso en backend/SUPABASE.md.
  // ---------------------------------------------------------
  supabase: {
    url: "https://tittyvorxepzjoffqado.supabase.co",

    // Publishable key (el formato nuevo, sb_publishable_...). Se eligio
    // sobre la anon key antigua porque se puede rotar por separado sin
    // invalidar el resto. Probada contra la Edge Function: verify_jwt
    // la acepta aunque no sea un JWT.
    anonKey: "sb_publishable_V2Sw6gEFai2E8_BUrXEaYQ_AV2wfg8y"

    // >>> AQUI VA LA anon KEY. LA service_role NUNCA. <<<
    //
    // La anon key es publica por diseno: viaja dentro de esta
    // pagina y cualquiera puede leerla. Lo que protege los datos
    // no es que la clave sea secreta, sino Row Level Security en
    // la base.
    //
    // La service_role key salta TODAS las reglas de RLS. Si acaba
    // en este archivo, cualquiera puede descargar la lista
    // completa de pacientes. Esa clave vive unicamente en los
    // secretos de las Edge Functions.
    //
    // Mientras esto este vacio, el sitio funciona en "modo
    // prueba": el formulario valida todo normalmente pero abre un
    // correo prellenado en vez de enviarlo.
  },

  // ---------------------------------------------------------
  // 7. PANEL DE ADMINISTRACION (admin.html)
  // ---------------------------------------------------------
  admin: {
    // MODO DEMOSTRACION
    // Sirve para entrar al panel y probarlo ANTES de conectar el
    // backend. Usa reservas de ejemplo y NO guarda nada.
    //
    // Ya no aplica: con url y anonKey puestas (arriba), el panel usa
    // siempre cuentas reales de Supabase Auth, que ademas tienen que
    // estar dadas de alta en la tabla `staff`. Este valor solo se
    // consulta si el backend no esta configurado.
    demoMode: false,

    // Contrasena SOLO del modo demostracion.
    // Ojo: esta a la vista en el codigo, por eso solo funciona
    // cuando no hay backend y no hay datos reales que proteger.
    demoPassword: "demo1234"
  },

  // ---------------------------------------------------------
  // 8. NOTIFICACIONES DE RESERVAS
  // ---------------------------------------------------------
  // Solo se usan en el modo de respaldo, cuando Supabase no esta
  // configurado y el formulario abre un borrador de correo. Con el
  // backend conectado —que es el caso— quien manda los avisos es la
  // Edge Function, y las direcciones viven en los secretos de
  // Supabase, no aqui.
  notifications: {
    email: "rad.dg.center@gmail.com",
    whatsappNumber: "18696657171"
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

    // Portada por defecto cuando una publicacion no trae imagen.
    defaultImage: "assets/posts/ct-chest.jpg"
  }
};
