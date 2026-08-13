# RDC Saint Kitts — sitio web

Sitio de una sola página para el Radiology Diagnostic Center de St. Kitts & Nevis: catálogo de servicios, reserva de citas, publicaciones de estudios y panel de administración.

HTML, CSS y JavaScript planos. **Sin framework, sin compilación, sin `npm install`.** Se abre `index.html` en el navegador y funciona.

> **Este documento es el traspaso.** Si retomas el proyecto en otra
> conversación o después de un tiempo, léelo entero antes de tocar
> nada. Recoge el estado real, las decisiones tomadas y por qué, y
> todo lo que queda pendiente.

---

## Estado actual

| Parte | Estado |
|---|---|
| Diseño y maquetación | ✅ Terminado |
| Carrusel del banner con fotos reales | ✅ Funciona |
| Catálogo de 6 servicios + ventana de detalle | ✅ Funciona |
| Formulario de reservas con validación | ✅ Valida — **no envía a ningún sitio todavía** |
| Publicaciones (Studies & Work) | ✅ Muestra 3 estudios reales |
| Panel de administración | ⚠️ Funciona en **modo demostración** con datos falsos |
| Backend (base de datos, avisos) | ❌ **Sin hacer — es el próximo trabajo** |

**En una frase:** el sitio está presentable para enseñárselo al cliente, pero una reserva enviada no llega a ninguna parte. Falta todo el backend.

---

## Lo próximo: el backend con Supabase

Ahí es donde arranca la siguiente conversación.

### Qué tiene que hacer

1. Guardar las reservas en base de datos
2. Avisar de cada reserva por **correo**, **WhatsApp** y **evento en Google Calendar**
3. Permitir que el personal suba fotos **arrastrando el archivo**, sin copiar enlaces
4. Panel para gestionar reservas y contenido

### Por qué Supabase

Se evaluaron tres rutas. Vale la pena conocer el razonamiento para no repetirlo:

- **Google Apps Script** (lo que había): gratis y sin servidor, con correo y Calendar resueltos por vivir dentro de la cuenta de Google. Pero es lento, tiene el engorro de "volver a implementar" en cada cambio y sirve mal las imágenes.
- **PocketBase**: excelente panel y subidas nativas, pero **su motor JavaScript solo firma HS256** y Google Calendar exige **RS256**. Obligaba a un híbrido con Apps Script, o a compilar un binario propio en Go. Se llegó a escribir el híbrido; ver `backend/POCKETBASE.md`.
- **Supabase** ← elegido. Las Edge Functions corren sobre **Deno, que sí tiene WebCrypto**, así que pueden firmar RS256 y hablar con Google Calendar directamente. Backend de una sola pieza, sin híbrido.

### Aviso sobre el plan gratuito

Los proyectos de Supabase **se pausan tras un tiempo sin actividad** en el plan gratuito. Una clínica con reservas esporádicas puede caer justo en ese caso. Hay que preverlo: un ping programado que lo mantenga despierto, o pasar al plan de pago al entrar en producción. **Si el proyecto está pausado, las reservas no entran.**

### Esquema de datos propuesto

Está pensado para PocketBase pero se traduce casi tal cual a tablas de Postgres. Los campos y las reglas de acceso están detallados en **`backend/POCKETBASE.md`** (sección "Crear las colecciones"). Resumen:

| Tabla | Para qué | Acceso |
|---|---|---|
| `bookings` | Reservas | **Lectura solo autenticado.** Escritura pública. |
| `posts` | Publicaciones | Lectura pública si `published`. Escritura autenticada. |
| `banners` | Fotos del carrusel | Lectura pública si `active`. Escritura autenticada. |
| `site_content` | Textos editables | Lectura pública. Escritura autenticada. |

> ⚠️ **`bookings` nunca puede tener lectura pública.** Guarda nombre,
> teléfono y correo de pacientes. Con RLS mal puesta, cualquiera
> listaría los pacientes de la clínica desde el navegador. En
> Supabase esto se hace con Row Level Security, activada por defecto.

### Lo que se puede reaprovechar

- **`backend/Codigo.gs`** — la lógica de correo, WhatsApp (CallMeBot) y Calendar ya está escrita y comentada. Se traduce a una Edge Function.
- **`backend/pb_hooks/notify.pb.js`** — el patrón del disparador y el freno anti-spam.
- **`js/admin.js`** — todo el panel: pestañas, filtros, tarjetas de reserva. Solo hay que cambiar la capa que habla con el servidor (la función `api()`); el resto sirve igual.

---

## Mapa de archivos

```
index.html            Página pública. Solo estructura.
admin.html            Panel de administración.

css/styles.css        Todos los estilos. Índice numerado dentro.
css/admin.css         Estilos del panel.

js/config.js          ← EDITAR ESTO PRIMERO. Textos, contacto, servicios.
js/icons.js           Iconos SVG en línea.
js/main.js            Navegación, carrusel, animaciones, modal.
js/booking.js         Formulario y validación.
js/studies.js         Sección de publicaciones.
js/admin.js           Lógica del panel.

data/sample-studies.json   Publicaciones de respaldo.

assets/logo.jpg            Logo del cliente.
assets/banners/            Fotos del carrusel (5).
assets/posts/              Estudios publicados (3).
assets/services/           Ilustraciones de los 6 servicios (SVG).
assets/placeholders/       Respaldo, ya sin uso.

backend/Codigo.gs          Apps Script: correo, WhatsApp, Calendar.
backend/pb_hooks/          Hook de PocketBase (ruta descartada).
backend/POCKETBASE.md      Esquema y reglas. Sirve de base para Supabase.
GUIA-RAPIDA.md             Guía de instalación en español.
```

**Regla práctica:** para cambiar textos, contacto, servicios o enlaces, casi siempre basta con `js/config.js`. Para colores y espaciados, el bloque `:root` al principio de `css/styles.css`. Rara vez hace falta tocar el HTML.

---

## Decisiones de diseño (y por qué)

Anotadas para que no se deshagan sin querer:

- **Tema claro.** Se empezó oscuro y se cambió a petición. Todo el tema sale del bloque `:root`; cambiar esos ~15 valores rehace el sitio entero.
- **Ilustraciones abstractas, no dibujos de máquinas.** El primer intento dibujaba los equipos y quedaba a clip-art. Las marcas geométricas actuales comparten vocabulario visual y se leen mejor.
- **Imágenes de estudios con `contain` sobre fondo oscuro.** Con `cover` se recortaba la anatomía. El panel oscuro continúa el fondo negro del DICOM, como un negatoscopio.
- **Las tarjetas de servicio son `<button>`, no `<div>`.** Para poder activarlas con teclado y que los lectores de pantalla las anuncien como pulsables.
- **El título del banner entra por líneas alternas.** `js/main.js` lo parte; la animación está en `css/styles.css` (`.hero-line`).
- **Se quitó la franja de estadísticas.** Decía "7 Days a Week Support" y "100% Locally Focused Care" — afirmaciones inventadas de relleno. Los estilos quedan por si algún día hay cifras reales.

---

## ⚠️ Antes de entregar al cliente

Todo lo pendiente está marcado con la palabra `PLACEHOLDER` en el código. Busca esa palabra y los encuentras todos.

- [ ] **Correo de avisos** — cambiar `869thesignstudio@gmail.com` por el real
- [ ] **WhatsApp de avisos** — cambiar `18697629440` por el real (y reautorizar CallMeBot con ese número)
- [ ] **Contraseña del admin** — `rdc2026` es un valor inicial
- [ ] **Apagar el modo demostración** — `demoMode: false` en `js/config.js`
- [ ] **Dirección exacta** de la clínica
- [ ] **Horarios reales** — los actuales son inventados
- [ ] **Lista de servicios** — confirmar cuáles ofrecen de verdad
- [ ] **Instagram** — el enlace actual no existe
- [ ] **Textos clínicos** — que los revise el radiólogo (ver abajo)

### Datos verificados vs. inventados

**Reales** (de la página pública de Facebook del cliente): teléfono `+1 869-665-7171`, correo `rad.dg.center@gmail.com`, enlace de Facebook.

**Inventados por mí, hay que confirmarlos:** dirección exacta, horarios, lista de servicios, Instagram, y todos los textos de `details` en `config.js`.

---

## Puntos delicados

### Contenido clínico

Los textos de cada servicio (`modalities[].details` en `config.js`) describen qué es el estudio, para qué se usa, cómo prepararse y cuánto dura. Son correctos pero **genéricos**. La preparación y la duración cambian según el equipo y el protocolo, y afectan a la salud: ayuno, contraste, implantes metálicos en resonancia. **El radiólogo tiene que revisarlos y ajustarlos antes de publicar.** Están marcados con `// REVISAR`.

### Privacidad de las imágenes de estudios

Las tres imágenes de `assets/posts/` son estudios reales de la clínica. A dos se les recortó la franja de datos DICOM: nombre, fecha de nacimiento, sexo, edad, número de estudio y fecha del examen. **No queda ningún dato identificable.**

Dos cosas pendientes:

1. **Los originales sin recortar siguen en el historial de git**, en el commit `5ca9df2`. El repositorio es privado, así que no hay exposición hoy. **Pero si algún día se hace público, el historial se hace público con él.** Para purgarlos:
   ```bash
   git clone https://github.com/lgayc/rdc-saint-kitts.git
   cd rdc-saint-kitts
   git filter-repo --path "post 2.jpg" --path "post 3.jpg" --invert-paths
   git remote add origin https://github.com/lgayc/rdc-saint-kitts.git
   git push origin --force --all
   ```
2. **Consentimiento.** Aunque estén anonimizadas, publicar imágenes clínicas suele requerir el consentimiento documentado del paciente. Lo confirma la clínica, no el desarrollador.

### Las fotos de interiores

`mobile-unit.jpg` parece foto real de la unidad de RDC. Las de interiores (`mri-suite.jpg`, `control-room.jpg`) tienen aspecto de imagen generada o de banco: **puede que no sean las instalaciones reales**. Conviene confirmarlo para no crear una expectativa falsa en el paciente.

---

## Publicar el sitio

Al no haber código de servidor, sirve cualquier hosting estático:

- **Netlify** — arrastrar la carpeta a [app.netlify.com/drop](https://app.netlify.com/drop), o conectar el repo para que se actualice solo
- **Vercel** — igual de simple
- **GitHub Pages** — requiere repositorio público; ojo con lo del historial de arriba

Sin compilación ni dependencias.

---

## Rama

Todo el trabajo vive en **`RDC-SKN-GUY`**. La rama `main` solo tiene el README inicial de GitHub.
