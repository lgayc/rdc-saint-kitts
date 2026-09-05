# CLAUDE.md — cómo trabajar en este repositorio

Instrucciones operativas para Claude Code. El relato del proyecto —qué
es, por qué Supabase, qué se descartó y por qué— está en `README.md`, y
sigue siendo válido aunque su tabla de estado se quedó en agosto. Este
archivo es lo otro: las reglas, las trampas conocidas y el estado real.

**Léelo entero antes de tocar nada.** Casi todo lo que hay aquí está
escrito porque ya se rompió una vez.

---

## Lo que es

Sitio de una página para el Radiology Diagnostic Center de St. Kitts &
Nevis, bilingüe inglés/español, con reservas de cita y panel de
administración. HTML, CSS y JavaScript planos: **sin framework, sin
compilación, sin `npm install`**. El backend es Supabase (plan
gratuito) con Edge Functions en Deno.

- Repo: `lgayc/rdc-saint-kitts` · rama por defecto **`RDC-SKN-GUY`**
- Dominio: `radiologydiagnosticcenterskn.com` (Cloudflare)
- Supabase: proyecto `tittyvorxepzjoffqado`, región `ca-central-1`
- Correo del centro: `rad.dg.center@gmail.com`

---

## Cómo probar los cambios

**Levanta un servidor. No abras `index.html` con doble clic.** Con
`file://`, `studies.js` hace `fetch("data/sample-studies.json")` y el
navegador lo bloquea por CORS: las publicaciones no cargan y parece un
fallo del código que no existe.

```bash
python3 -m http.server 8000     # y abre http://localhost:8000
```

Un cambio no está terminado hasta que se ha visto funcionando. Para
cualquier cosa visual o de comportamiento, ábrelo en un navegador de
verdad y compruébalo **en los dos idiomas** y a **1280, 1024 y 390 px**
de ancho. Playwright con Chromium sirve para automatizarlo. Para
funciones puras basta Node; para los constructores de correo, `deno run`.

Si arreglas un fallo, reprodúcelo primero contra el commit anterior. Es
la única forma de saber que arreglaste el fallo y no otra cosa.

---

## Reglas que no se negocian

**Secretos.** La `service_role` key, la App Password de Gmail y la
clave privada de la cuenta de servicio de Google **no pueden aparecer
en el repositorio, ni en `js/config.js`, ni en el chat**. Van de donde
se generan directamente a los secretos de las Edge Functions. La clave
`anon`/publishable sí es pública por diseño y va en el navegador; no
las confundas. Si una credencial llega a pasar por un sitio inseguro,
está quemada: hay que rotarla, no ocultarla.

**La tabla `bookings` no lleva ninguna política para `anon`.** Es la
decisión que sostiene toda la privacidad del sistema: desde el
navegador esa tabla no existe. Las reservas entran solo por la Edge
Function `book`. No abras una política pública "para simplificar".

**Texto que viene de fuera nunca se inserta como HTML.** Ni de la base
de datos, ni de `config.js`, ni del formulario. Usa `textContent`, o
`escapeAttr()` y `safeUrl()` de `js/studies.js`. `escapeAttr` impide
escapar del atributo pero **no** impide un `href="javascript:..."`
perfectamente válido — para eso está `safeUrl`. Ya hubo un XSS
almacenado por ahí.

**No inventes datos de la clínica.** Ni años de experiencia, ni
titulaciones, ni número de pacientes, ni plazos de entrega, ni "los
primeros de la isla". Lo que no esté confirmado se marca `PLACEHOLDER`
con un comentario diciendo qué hay que preguntar. Un dato inventado en
la web de un centro médico es una mentira con membrete. Todo el texto
clínico lo revisa el radiólogo antes de publicarse.

**No crees cuentas ni pongas contraseñas.** Aunque te las den hechas.

---

## Convenciones del código

- **Los comentarios se escriben en español**, y explican *por qué*, no
  *qué*. El código ya dice qué hace.
- Los mensajes de commit también van en español, con el motivo del
  cambio, no la lista de archivos.
- Nombres de variables en español donde el dominio es del negocio
  (`reserva`, `avisoEnviado`, `problemas`), en inglés donde es de la
  plataforma (`booking`, `status`).

### Los tres tipos de texto (esto importa para el bilingüe)

`js/i18n.js` lo explica en su cabecera. En resumen:

1. **Texto fijo de la interfaz** → diccionario en `js/i18n.js`, con
   `data-i18n="clave"` en el HTML.
2. **Texto de configuración** → pares `{en, es}` en `js/config.js`,
   leídos con `RDC_I18N.pick()`.
3. **Texto que escribe la clínica** → columnas `_es` en las tablas de
   Supabase (`site_content`, `banners`, `posts`).

El cambio de idioma **no recarga la página**; dispara el evento
`rdc:lang-changed`. Si añades algo que se dibuja con JavaScript, tiene
que reaccionar a ese evento.

**El texto por defecto escrito en el HTML tiene que ser el bueno.** Es
lo que se ve si `i18n.js` tarda o falla. (El enlace del panel decía
"Staff" en el HTML y "Admin" en el diccionario: se veía la palabra
vieja durante un instante en cada carga.)

### Caché

`_headers` guarda el JS y el CSS una hora. Cuando cambies un archivo de
`js/` o `css/`, **sube el `?v=N`** en *todas* las etiquetas de
`index.html` y `admin.html` a la vez. Si no, un visitante que vuelva
puede recibir el HTML nuevo con el JavaScript viejo — y esa mezcla
normalmente no falla, solo se comporta mal en silencio.

---

## Trampas ya pisadas

| Síntoma | Causa real |
|---|---|
| Los 6 iconos de modalidades invisibles | XML prohíbe `--` dentro de `<!-- -->`, y los SVG llevaban rayas decorativas ahí. Archivos inválidos. |
| Tarjetas invisibles al cambiar de idioma | `IntersectionObserver` solo vigila los elementos que existían cuando se creó. Las tarjetas redibujadas se quedan en `opacity: 0`. Para eso está `engancharReveal()`. |
| El correo al paciente sale "bien" pero no llega | denomailer con `content` **y** `html` a la vez genera un multipart que Gmail acepta y descarta. Va `content: "auto"`. |
| `{"en":...}` impreso en la web | `admin.js` nuevo con `supabase-api.js` viejo: mandó un objeto a una columna de texto y Postgres lo serializó. Mezcla de versiones — ver *Caché*. |
| Google Calendar responde **404** | Un calendario no compartido da 404, no 403. "ID mal escrito" y "no compartido" son indistinguibles desde fuera; por eso existe `diagnosticarCalendario()`. **El calendario funciona desde el 17 de agosto: no toques `GOOGLE_CALENDAR_ID`.** |
| `www` da error 522 | Un CNAME proxeado hacia un ápice servido por un Worker no tiene origen al que llegar. Lo que hace funcionar `www` es la Redirect Rule, no el CNAME. |
| `frame-ancestors` ignorado | Solo funciona como cabecera HTTP. En `<meta>` no hace nada. Está en `_headers`. |
| El dominio sirve una versión vieja con GitHub al día | La autorización de GitHub en Cloudflare se había caído. En Settings → Builds el repositorio seguía ahí, con su rama y sus ajustes, así que **parecía** conectado; lo único que lo delataba era un aviso azul: *"This project is disconnected from your Git account"*. Sin esa autorización GitHub no avisa a Cloudflare, no se compila nada, y el sitio se queda congelado en silencio. Se arregla con **Manage** (reautorizar), no con Disconnect. |

---

## Conexión con Supabase desde Claude Code

`.mcp.json` (en la raíz) conecta a Claude Code con el servidor MCP
alojado de Supabase, ya apuntando al proyecto `tittyvorxepzjoffqado`.
Sirve para leer el esquema, consultar la base, mirar los logs y revisar
las Edge Functions sin salir del editor.

**No contiene ningún secreto**: solo la referencia del proyecto, que ya
está escrita en este mismo archivo. La autorización la hace cada
persona con su propia cuenta de Supabase al conectarse; por eso el
archivo puede estar en el repositorio.

Si Claude Code no ve el servidor, es que hay que aprobarlo: los
`.mcp.json` de un repositorio se piden a mano la primera vez.

---

## Despliegue

- **El sitio**: lo sirve el Worker `rdc-saint-kitts` de Cloudflare,
  con los archivos estáticos tomados de la raíz del repositorio y el
  dominio enganchado como Custom Domain. Está conectado a GitHub: rama
  de producción `RDC-SKN-GUY`, sin comando de compilación (este sitio
  no se compila) y `npx wrangler deploy` como comando de despliegue.
  Con la conexión sana, cada push publica solo en un par de minutos.

  Comprueba siempre contra el dominio real, no contra la copia local.
  Un `?v=` que no coincide con el del repositorio es la señal de que lo
  publicado es viejo. Cuando pase, el orden es: **Deployments** (¿hay
  una compilación posterior al último commit?) y **Settings → Builds**
  (¿hay aviso de desconexión?).

  Ojo: no hay `wrangler.toml` ni `wrangler.jsonc` en el repositorio,
  aunque el despliegue use `npx wrangler deploy`. Ha funcionado así,
  pero si una compilación falla, es el primer sitio donde mirar.
- **Las Edge Functions**: `supabase functions deploy book` y
  `supabase functions deploy booking-status`. `verify_jwt` y demás está
  en `supabase/config.toml`.
- **Las migraciones**: `supabase db push`. Las tres de
  `supabase/migrations/` ya están aplicadas.

---

## Estado a 5 de septiembre de 2026

**Hecho y en el repositorio:** sitio bilingüe completo (interfaz,
configuración y contenido de la base), sección "Quiénes somos", enlace
del panel renombrado a Admin, iconos de modalidades redibujados,
tipografía Montserrat, animación del banner restaurada, `safeUrl()`
contra XSS almacenado, dominio y cabeceras configurados, workflow
anti-pausa de GitHub Actions, dirección real y mapa de la clínica,
acciones de reseña, y `.assetsignore` para que el dominio no sirva las
notas internas.

**Hecho fuera del repositorio (5 de septiembre):** App Password de
Gmail generada, secretos de Supabase actualizados, Edge Functions
desplegadas, y la conexión de Cloudflare con GitHub reautorizada — el
sitio vuelve a publicarse solo con cada push.

**Sobre las reseñas de Google.** Se decidió **no mostrarlas dentro de
la web**: Google no deja copiarlas ni incrustarlas, y traerlas obliga
a la API de Places con clave y cuenta de facturación. Lo que sí hay
son las dos acciones —escribir una reseña y verlas en la ficha—, que
es lo que hace que crezcan. Si algún día se muestran, la clave va a
los secretos de una Edge Function, **nunca al navegador**.

**Pendiente, y depende de Luis:**

1. Supabase Auth → URL Configuration: Site URL y redirects al dominio
   real. Desactivar el registro público. Activar la protección de
   contraseñas filtradas.
2. Hacer una reserva de prueba desde el dominio real. El interruptor
   de Production en `workers.dev` ya está apagado; quedó apagado antes
   de la prueba, así que la prueba sigue pendiente.
3. Que la clínica confirme lo que sigue marcado `PLACEHOLDER` y ya
   está publicado: el texto de "Quiénes somos" (desde cuándo existe el
   centro, quién lo dirige y con qué titulación, qué equipos hay, en
   cuánto se entregan los resultados, con qué seguros trabajan, y una
   foto real), **el horario** y **el Instagram** — el enlace que hay
   es inventado; el de Facebook sí es real.
4. El enlace corto de reseñas del perfil de Google Business
   (`g.page/r/.../review`). Va en `contact.google.reviewUrl` de
   `js/config.js` y hace que el botón abra el cuadro de escribir
   reseña de una vez, en vez de dejar al visitante en la ficha.

**Pendiente, técnico:**

- `booking-status` **no existe en el repositorio**, aunque estas notas
  dijeran que estaba escrita. En `supabase/functions/` solo está
  `book`. Y de migraciones hay una sola, `0001_init.sql`, no tres.
  Averiguar si falta código o solo sobraba la nota.
- DNS anti-suplantación: MX nulo, `v=spf1 -all`, DMARC `p=reject`.
- Limitar el tamaño de imagen al subir desde el panel. Hay un PNG de
  1.904 kB en Storage; bórralo si no se usa.
- Subir `MAX_BOOKINGS_PER_IP` de 10 a ~40 antes de cualquier campaña.
- Limpieza: `Codigo.gs` está duplicado en la raíz y en `backend/`, y
  `notify.pb.js` + `backend/POCKETBASE.md` son de la vía PocketBase que
  se descartó. Son historia, no código vivo.

---

## Cómo se trabaja aquí

Luis no es programador y confía en lo que le digas. Eso obliga a dos
cosas:

**Di lo que comprobaste y lo que no.** "Verificado en Chromium a tres
anchos" y "no lo he probado" son frases distintas y él no puede
distinguirlas por su cuenta. Si algo falló por tu culpa, dilo así.

**Explica el porqué, no solo el qué.** Las decisiones de este proyecto
tienen motivos y él tiene que poder defenderlas ante la clínica.
