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
| Formulario de reservas con validación | ✅ Valida y envía a Supabase |
| Publicaciones (Studies & Work) | ✅ Salen de la base, con respaldo local |
| Panel de administración | ✅ Cuentas reales + subida de fotos arrastrando |
| Base de datos, RLS y Storage | ✅ **Aplicado y probado** en el proyecto real |
| Edge Function de reservas | ✅ **Desplegada y probada** (validación, anti-spam, anti-robots) |
| Avisos: correo, WhatsApp, Calendar | ⚠️ Código listo — **faltan los secretos del cliente** |
| Cuentas del personal | ⚠️ Pendiente (paso 4 de la guía) |
| Anti-pausa del plan gratuito | ⚠️ Escrito — faltan los secretos en GitHub |

**En una frase:** una reserva enviada hoy **se guarda de verdad** y responde con su código, pero no avisa a nadie todavía. Lo que falta son credenciales que solo puede generar el dueño de las cuentas: App Password de Gmail, autorización de CallMeBot y la cuenta de servicio de Google. Todo eso está en `backend/SUPABASE.md`, pasos 4, 5 y 7.

**Proyecto:** `rdc-saint-kitts` · `tittyvorxepzjoffqado` · región `ca-central-1`

---

## El backend, en corto

Instalación paso a paso: **`backend/SUPABASE.md`**.

### Qué hace

1. Guarda las reservas en Postgres
2. Avisa de cada una por **correo**, **WhatsApp** y **evento en Google Calendar**
3. Deja al personal subir fotos **arrastrando el archivo**, sin copiar enlaces
4. Panel para gestionar reservas y contenido, con cuentas de verdad

### La decisión que da forma a todo lo demás

**Las reservas no se insertan desde el navegador.** El formulario manda a la Edge Function `book`, que valida del lado del servidor, guarda con la `service_role` key y dispara los tres avisos.

La alternativa —dejar que el formulario escriba directo en la tabla— obliga a abrir una política de escritura pública sobre una tabla llena de nombres, teléfonos y correos de pacientes. Es un error fácil de cometer y difícil de notar hasta que ya pasó.

Así, `bookings` **no tiene ninguna política para `anon`**: desde el navegador no existe. Y como no hay otra puerta, la validación del servidor y el freno anti-spam no se pueden esquivar.

### Por qué Supabase

Se evaluaron tres rutas. Vale la pena conocer el razonamiento para no repetirlo:

- **Google Apps Script** (lo que había): gratis y sin servidor, con correo y Calendar resueltos por vivir dentro de la cuenta de Google. Pero es lento, tiene el engorro de "volver a implementar" en cada cambio y sirve mal las imágenes.
- **PocketBase**: excelente panel y subidas nativas, pero **su motor JavaScript solo firma HS256** y Google Calendar exige **RS256**. Obligaba a un híbrido con Apps Script, o a compilar un binario propio en Go. Se llegó a escribir el híbrido; ver `backend/POCKETBASE.md`.
- **Supabase** ← elegido. Las Edge Functions corren sobre **Deno, que sí tiene WebCrypto**, así que firman RS256 y hablan con Google Calendar directamente. Backend de una sola pieza, sin híbrido. Son 40 líneas en `supabase/functions/_shared/notify.ts`.

### El plan gratuito se pausa — y eso ya está resuelto

Supabase pausa los proyectos gratuitos tras una ventana de **7 días** con poca actividad, y lo que cuenta son *peticiones de usuario contra la base de datos*. Una clínica con reservas esporádicas cae justo ahí. **Con el proyecto pausado, las reservas no entran** — y nadie se entera, porque lo que deja de llegar son avisos.

El ping vive en `.github/workflows/supabase-keepalive.yml` y corre cada dos días desde GitHub Actions. Tiene que ser externo: `pg_cron` no vale, porque es actividad interna y porque **si el proyecto se pausa, se detiene con él** — el despertador quedaría dentro de la casa cerrada.

El workflow también se defiende de un segundo problema: GitHub apaga los cron de los repositorios sin actividad durante 60 días, así que hace un commit al mes en `.github/keepalive-stamp` para mantenerse vivo.

Para vigilarlo: `select last_ping from public.keepalive;` no debería tener más de tres días. Y ojo — un proyecto **ya pausado no se despierta con un ping**: hay que pulsar *Restore* en el panel.

### Esquema

| Tabla | Para qué | Quién puede |
|---|---|---|
| `bookings` | Reservas | **Nadie desde el navegador.** Solo la Edge Function escribe; solo el personal lee. |
| `posts` | Publicaciones | Lectura pública si `published`. Escritura solo personal. |
| `banners` | Fotos del carrusel | Lectura pública si `active`. Escritura solo personal. |
| `site_content` | Textos editables | Lectura pública. Escritura solo personal. |
| `staff` | Quién entra al panel | Solo personal. |
| `keepalive` | Marca del último ping | Nadie. Solo la función `ping()`. |

Todo en `supabase/migrations/0001_init.sql`, comentado.

> ⚠️ **Ser usuario de Supabase Auth no da acceso a nada.** Hay que
> estar además en la tabla `staff`. Son dos comprobaciones a
> propósito: si algún día se habilita el registro público por
> descuido, un desconocido tendría cuenta pero no vería una sola
> reserva.

### Las dos claves, que no son lo mismo

La **anon key** va en `js/config.js` y es pública por diseño: viaja dentro de la página y cualquiera puede leerla. No pasa nada — lo que protege los datos es RLS, no el secreto de la clave.

La **service_role key** salta todas las reglas de RLS. Solo vive en los secretos de las Edge Functions. Si alguna vez aparece en el repositorio, en un mensaje o en una captura: **rotarla de inmediato**, porque borrarla no la quita del historial de git.

### Lo que quedó como referencia histórica

- **`backend/Codigo.gs`** — el Apps Script original. Ya no se usa; su lógica está traducida en `supabase/functions/_shared/notify.ts`.
- **`backend/POCKETBASE.md`** y **`notify.pb.js`** — la ruta descartada. Conviene no borrarlos: explican por qué no volver a intentarlo.

---

## Mapa de archivos

```
index.html            Página pública. Solo estructura.
admin.html            Panel de administración.

css/styles.css        Todos los estilos. Índice numerado dentro.
css/admin.css         Estilos del panel.

js/config.js          ← EDITAR ESTO PRIMERO. Textos, contacto, servicios, claves.
js/supabase-api.js    ÚNICA capa que habla con Supabase. Todo lo demás
                      la usa y no sabe que Supabase existe.
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

supabase/migrations/0001_init.sql       Esquema, RLS y buckets. Comentado.
supabase/functions/book/index.ts        Entrada única de las reservas.
supabase/functions/_shared/notify.ts    Correo, WhatsApp y Calendar.
supabase/functions/_shared/cors.ts      Orígenes permitidos.
supabase/config.toml                    Config de la CLI.

.github/workflows/supabase-keepalive.yml   Ping anti-pausa.
.github/keepalive-stamp                    Sello mensual del propio cron.

backend/SUPABASE.md        ← LA GUÍA DE INSTALACIÓN. Empieza por aquí.
backend/Codigo.gs          Apps Script antiguo. Referencia histórica.
backend/pb_hooks/          Hook de PocketBase (ruta descartada).
backend/POCKETBASE.md      Por qué PocketBase no sirvió.
GUIA-RAPIDA.md             Guía del montaje anterior (Apps Script).
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
- **Un solo `RDC_API` para toda la red.** `js/supabase-api.js` es lo único que sabe que Supabase existe; el resto del sitio llama a funciones con nombres propios. La migración de Apps Script a Supabase no tocó ni una línea de las secciones que dibujan el panel, y la siguiente tampoco tendría por qué.
- **La miniatura es la zona de soltar la foto.** No hay un recuadro de subida aparte: se arrastra encima de donde la imagen va a aparecer. Se puede pulsar también, porque arrastrar no existe en el móvil.
- **Un booleano de aviso por canal, no uno solo.** Si el correo sale y el WhatsApp falla, el panel lo dice con nombre y apellido. Con un único `notified` esa distinción se pierde — y es justo la que importa, porque si falló el WhatsApp nadie en la clínica se enteró por el móvil.
- **Trampa anti-robots fuera de pantalla, no `display:none`.** Algunos robots detectan `display:none` y saltan el campo. Movido a `left: -9999px` lo rellenan igual, que es lo que se busca.

---

## ⚠️ Antes de entregar al cliente

Todo lo pendiente está marcado con la palabra `PLACEHOLDER` en el código. Busca esa palabra y los encuentras todos.

**Del backend** (detalle completo en `backend/SUPABASE.md`, sección 9):

- [ ] **Correo de avisos** — el secreto `NOTIFY_EMAIL_TO`, no `869thesignstudio@gmail.com`
- [ ] **WhatsApp de avisos** — el secreto `CALLMEBOT_PHONE` con el número real, y reautorizar CallMeBot desde él
- [ ] **`ALLOWED_ORIGINS`** con el dominio real. Vacío = cualquier página puede mandar reservas
- [ ] **Registro público desactivado** en Authentication → Providers → Email
- [ ] **Cuentas del personal** creadas y dadas de alta en la tabla `staff`
- [ ] **Keepalive corriendo**, con al menos dos ejecuciones verdes
- [ ] **La `service_role` key** en ningún sitio salvo los secretos de las Edge Functions
- [ ] **Contarle al cliente** que el plan gratuito depende del keepalive, y qué cuesta el de pago

**Del sitio:**

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

**De dónde salieron.** Las tomamos de la **página pública de Facebook de la clínica**: ya estaban publicadas por ellos. Eso importa para calibrar lo de abajo — no hay filtración que hayamos causado nosotros, y la decisión de retirarlas o no es suya. Se anota aquí para que nadie vuelva a tratarlo como una urgencia sin este contexto.

Dicho eso, quedan dos cosas:

1. **Los originales sin recortar siguen en el historial de git**, en el commit **`65d8a93`** — ojo, no en el `5ca9df2` que decía antes este README; ese error hacía que el comando de purga no borrara nada y pareciera que sí. Son tres archivos, con nombre, fecha de nacimiento, número y fecha del estudio visibles.

   **El repositorio es público** (GitHub Pages en plan gratuito lo exige), así que el historial también lo es. Como las imágenes ya estaban en el Facebook del cliente, la exposición añadida es pequeña — pero si algún día la clínica las retira de allí, este repositorio pasa a ser la fuente que queda. Para purgarlas:
   ```bash
   git clone https://github.com/lgayc/rdc-saint-kitts.git
   cd rdc-saint-kitts
   git filter-repo --path "post 1.jpg" --path "post 2.jpg" --path "post 3.jpg" --invert-paths
   git push origin --force --all
   ```
   **Y después escribe a GitHub Support** para que hagan `gc` del repositorio: tras un force-push, los objetos huérfanos siguen siendo accesibles por su SHA directo hasta que pase el recolector. Saltarse este paso es la razón habitual de que una purga no purgue nada.

   Alternativa que evita todo esto para siempre: publicar en **Netlify**, que sirve desde un repositorio privado.

2. **Consentimiento.** Aunque estén anonimizadas, publicar imágenes clínicas suele requerir el consentimiento documentado del paciente. Que estén en el Facebook de la clínica sugiere que ya lo trataron, pero conviene confirmarlo. Lo decide la clínica, no el desarrollador.

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
