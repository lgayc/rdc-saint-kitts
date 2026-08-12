# RDC Saint Kitts — Sitio web

Sitio de una página para **RDC Saint Kitts (Radiology Diagnostic Center)**, con panel de administración para el personal de la clínica.

Incluye: presentación de los servicios de imagenología, reserva de citas en línea, publicaciones editables ("Studies & Work"), y un panel donde el staff gestiona todo eso sin tocar código.

**HTML, CSS y JavaScript puros.** Sin framework, sin build, sin `npm install`, sin dependencias. Se publica copiando la carpeta.

> **Instalación paso a paso:** [GUIA-RAPIDA.md](GUIA-RAPIDA.md). Este README explica *cómo está hecho*; la guía explica *qué hay que hacer para ponerlo en marcha*.

---

## 1. Mapa de archivos

```
rdc-saint-kitts/
│
├── index.html              Sitio público. Solo estructura: el contenido lo llena el JS.
├── admin.html              Panel de administración (reservas y contenido).
│
├── css/
│   ├── styles.css          Estilos y animaciones del sitio. Los colores y medidas
│   │                       están todos arriba, en el bloque :root.
│   └── admin.css           Estilos del panel.
│
├── js/
│   ├── config.js           ← EDITAR ESTO PRIMERO. Todo el contenido del sitio.
│   ├── icons.js            Iconos SVG en línea (no hay librería de iconos).
│   ├── main.js             Navegación, carrusel del banner, parallax, carrusel
│   │                       horizontal de servicios, ventana de detalle, contadores.
│   ├── booking.js          Formulario de reservas: validación y envío.
│   ├── studies.js          Sección de publicaciones.
│   └── admin.js            Panel: login, reservas, editor de contenido.
│
├── backend/
│   └── Codigo.gs           Backend. NO se sube con el sitio: se pega dentro de
│                           Google Apps Script. Ver GUIA-RAPIDA.md sección 1.
│
├── data/
│   └── sample-studies.json Publicaciones de respaldo, por si no hay backend.
│
├── assets/                 Logo, fotos del banner, imágenes de publicaciones,
│                           ilustraciones de los servicios.
│
├── GUIA-RAPIDA.md          Instalación, configuración y checklist de entrega.
└── README.md               Este archivo.
```

**Regla práctica:** si vas a cambiar *textos, contacto, servicios o enlaces*, casi siempre alcanza con `js/config.js`. Si vas a cambiar *colores o medidas*, `css/styles.css`. `index.html` y el resto del JS solo se tocan para agregar una sección o una función nueva.

---

## 2. Cómo funciona

El sitio es estático: no tiene servidor propio. Todo lo dinámico lo hace un **Google Apps Script** publicado como aplicación web, conectado a una Google Sheet que hace de base de datos. Es gratis y no hay nada que administrar.

```
  Sitio estático                    Google Apps Script                Google
  (Netlify / Vercel)                (backend/Codigo.gs)
  ─────────────────                 ──────────────────                ──────
  index.html                              │
    └─ reserva ────── POST {action} ──────┤──── guarda fila ────────► Google Sheet
                                          ├──── manda correo ───────► Gmail
                                          ├──── manda mensaje ──────► WhatsApp (CallMeBot)
                                          └──── crea evento ────────► Google Calendar
  admin.html
    └─ login / editar ─ POST {action,token} ─┤─ lee y escribe ───────► Google Sheet
```

Todo va por **una sola URL** con un campo `action` que dice qué se quiere hacer (`book`, `login`, `listBookings`, `setBookingStatus`, `getContent`, `saveContent`). Es a propósito: mantiene la configuración en un solo lugar y evita problemas de CORS.

> **Detalle técnico:** las peticiones usan `Content-Type: text/plain` a propósito. Con `application/json` el navegador dispara un preflight de CORS que Apps Script no responde bien. El backend lo lee como JSON igual.

### Qué pasa cuando alguien reserva

1. `js/booking.js` valida el formulario en el navegador. Nombre, teléfono, correo, estudio, fecha y hora son obligatorios; cada campo muestra su propio error debajo.
2. Se manda al Apps Script con `action: "book"`.
3. El backend **vuelve a validar** ([Codigo.gs → `validateBooking`](backend/Codigo.gs)). Esto no es redundancia: la validación del navegador es comodidad para el usuario, la del servidor es la que realmente protege, porque cualquiera puede mandar datos sin pasar por el formulario.
4. Guarda la fila en la hoja "Reservas" con un ID (`RDC-<timestamp>`) y estado `Pendiente`.
5. Manda el aviso por correo, por WhatsApp y crea el evento en Calendar. **Cada aviso va en su propio `try`**: si WhatsApp falla, el correo igual sale y la reserva no se pierde.

### Qué edita el personal desde el panel

El contenido editable se guarda como un único JSON en la hoja "Contenido": fotos del banner, texto de promoción, título y subtítulo del banner, y las publicaciones. El sitio público lo pide al cargar (`action: "getContent"`) y, si hay algo, pisa lo que está en `config.js`.

Las publicaciones se buscan en este orden, y la primera que responda gana:

1. **El panel admin** (recomendado).
2. **Un Google Sheet publicado como CSV**, si se llenó `studies.sheetCsvUrl` en `config.js`. Alternativa por si prefieren trabajar en una hoja de cálculo.
3. **`data/sample-studies.json`**, para que la sección nunca se vea vacía.

### Seguridad del panel

La contraseña real vive en `backend/Codigo.gs` (`CONFIG.ADMIN_PASSWORD`), del lado del servidor: **nunca está en los archivos del sitio web**. Al entrar, el backend verifica la contraseña y devuelve un token con vencimiento; solo ese token se guarda en el navegador y se manda en cada acción del panel.

Aparte existe un **modo demostración** (`admin.demoMode` en `config.js`) que permite entrar al panel con datos de ejemplo antes de conectar el backend. Su contraseña sí está a la vista en el código — por eso solo funciona mientras no haya backend ni datos reales que proteger. Se apaga solo en cuanto `api.url` tiene una URL.

---

## 3. Estado actual

El sitio está **en modo prueba**: se ve completo y funciona, pero las reservas todavía no se guardan en ningún lado hasta que se conecte el backend.

| | Estado |
|---|---|
| `api.url` (backend) | ⚠️ vacío — sin conectar |
| Modo demostración del panel | ⚠️ encendido |
| Correo y WhatsApp de avisos | ⚠️ datos de prueba, no los de la clínica |
| Contraseña del admin | ⚠️ valor inicial (`rdc2026`) |
| API key de CallMeBot (WhatsApp) | ⚠️ vacía |
| Teléfono, correo y Facebook de la clínica | ✅ reales, verificados |
| Logo y fotos del banner | ✅ fotos reales del cliente |
| Dirección exacta, horarios, Instagram | ⚠️ inventados, falta confirmarlos |
| Textos clínicos de cada estudio | ⚠️ correctos pero genéricos |

**Lo único bloqueante de verdad:** los textos de preparación y duración de cada estudio (ayuno, contraste, implantes metálicos) son descripciones generales. Cambian según el equipo, el protocolo y el paciente, y afectan la salud de quien los lee. **El radiólogo de la clínica tiene que revisarlos y ajustarlos antes de publicar.** Están marcados con `// REVISAR` en `js/config.js`.

Todo lo demás que hay que cambiar está marcado con la palabra `PLACEHOLDER`. La checklist completa de entrega está en [GUIA-RAPIDA.md, sección 5](GUIA-RAPIDA.md).

---

## 4. Trabajar en local

Hace falta servirlo por HTTP, no abrir el archivo directamente: `js/studies.js` lee `data/sample-studies.json` con `fetch()`, y eso el navegador lo bloquea si la página se abrió con `file://`.

Con Python:

```bash
python -m http.server 8000
```

Y abrir `http://localhost:8000`. Cualquier servidor estático sirve igual (`npx serve`, la extensión Live Server de VS Code, etc.).

No hay nada que compilar ni instalar. Se edita un archivo, se recarga el navegador.

---

## 5. Publicar

Como no hay código de servidor, sirve cualquier hosting estático:

- **Netlify** (recomendado, gratis): arrastrar la carpeta a [app.netlify.com/drop](https://app.netlify.com/drop), o conectar el repo de GitHub para que se actualice solo con cada push.
- **Vercel:** igual de simple.
- **GitHub Pages:** se activa en la configuración del repositorio. Requiere que el repositorio sea público.

`backend/Codigo.gs` se sube igual con el resto de los archivos, pero no se ejecuta ni se sirve: es solo la copia de referencia del código que va pegado en Apps Script.

---

## 6. Límites conocidos

Vale saberlos antes de que aparezcan, aunque para una clínica de este tamaño ninguno es un problema hoy:

- **Cuotas de Apps Script:** una cuenta de Gmail normal manda hasta 100 correos por día desde un script, y cada ejecución tiene un tope de 6 minutos. Muy por encima del volumen de reservas de una clínica.
- **Google Sheets como base de datos:** funciona bien hasta unos pocos miles de filas. Si dos reservas entraran exactamente en el mismo instante, en teoría podrían pisarse — improbable con este volumen.
- **Un solo usuario en el panel:** hay una contraseña compartida, no cuentas por persona. No se puede saber quién confirmó qué reserva.
- **Sin subida de archivos:** las imágenes se cargan por enlace (URL), no subiendo el archivo desde el panel.
- **Datos de pacientes:** los nombres, teléfonos y estudios solicitados quedan guardados en una Google Sheet de la clínica. Conviene que esa cuenta tenga verificación en dos pasos y que la hoja no se comparta con nadie más.

Si en algún momento hacen falta cuentas por persona, subir archivos (informes, estudios), o un portal donde el paciente vea sus resultados, ahí sí conviene mover el backend a algo como Supabase o PocketBase. Mientras no haga falta eso, esta arquitectura hace todo lo que el sitio necesita y no cuesta nada mantenerla.

---

## 7. Navegadores

Construido con CSS y JS estándar y muy soportado (`position: sticky`, `IntersectionObserver`, `fetch`). Funciona en las versiones actuales de Chrome, Safari, Firefox y Edge, en escritorio y en móvil.
