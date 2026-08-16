# Backend con Supabase — guía de instalación

Todo lo que hay que hacer una vez para que el sitio pase de
"presentable" a funcionando de verdad: reservas que se guardan,
avisos que llegan y fotos que el personal sube arrastrando.

Se hace desde el panel web de Supabase, sin instalar nada, salvo
las dos Edge Functions (paso 6), que sí necesitan la CLI.

**Tiempo aproximado:** una hora la primera vez.

---

## ✅ Lo que YA está hecho

Aplicado y verificado contra el proyecto real `rdc-saint-kitts`
(`tittyvorxepzjoffqado`, región `ca-central-1`):

| Paso | Estado |
|---|---|
| 1. Proyecto creado | ✅ |
| 2. Esquema, RLS y buckets | ✅ aplicado y probado con el rol `anon` |
| 3. Sitio conectado (`js/config.js`) | ✅ URL y publishable key puestas |
| 6. Edge Function `book` desplegada | ✅ versión 1, `verify_jwt` activo |
| — Pruebas de la función | ✅ ver abajo |

**Pruebas que se ejecutaron contra la función desplegada** (llamándola
por HTTP desde la propia base de datos, ya que se comprobó de verdad y
no sobre el papel):

- sin clave → `401`
- con la publishable key y datos válidos → `200`, reserva guardada con
  su código `RDC-2026-000NN`
- datos inválidos → `400` con los seis errores nombrados uno a uno
- trampa anti-robots rellena → `200` falso y **cero filas guardadas**
- cuatro reservas seguidas con el mismo correo → `200, 200, 200, 429`
- `anon` no ve ni una reserva, ni la tabla `keepalive`, ni `staff`, y de
  `posts` solo los publicados
- `anon` no puede insertar reservas ni posts, ni editar textos
- `ping()` funciona llamada como `anon`

Los datos de prueba se borraron y la secuencia se reinició, así que la
primera reserva real del cliente será `RDC-2026-00001`.

**Lo que falta es todo tuyo: los pasos 4, 5, 7 y la comprobación final
del 8.** Sin los secretos del paso 5, la función guarda las reservas
correctamente pero los tres avisos salen en `false`.

---

## Índice

1. [Crear el proyecto](#1-crear-el-proyecto)
2. [Aplicar el esquema](#2-aplicar-el-esquema)
3. [Conectar el sitio](#3-conectar-el-sitio)
4. [Crear las cuentas del personal](#4-crear-las-cuentas-del-personal)
5. [Preparar los tres avisos](#5-preparar-los-tres-avisos)
6. [Desplegar la Edge Function](#6-desplegar-la-edge-function)
7. [Encender el anti-pausa](#7-encender-el-anti-pausa) ← **no te lo saltes**
8. [Probar](#8-probar)
9. [Antes de entregar al cliente](#9-antes-de-entregar-al-cliente)

---

## 1. Crear el proyecto

1. Cuenta en [supabase.com](https://supabase.com) → **New project**
2. Nombre: `rdc-saint-kitts`
3. Región: la más cercana al Caribe (normalmente `us-east-1`)
4. **Database password:** genera una larga y guárdala en un gestor
   de contraseñas. No es la del panel de administración del sitio,
   y no se puede recuperar después.

Al terminar, en **Project Settings → API** hay tres cosas:

| Valor | Dónde va | ¿Es secreto? |
|---|---|---|
| **Project URL** | `js/config.js` y secretos de GitHub | No |
| **anon / publishable key** | `js/config.js` y secretos de GitHub | No, es pública por diseño |
| **service_role key** | **En ningún archivo de este repositorio** | **Sí. Absolutamente.** |

> ### La distinción más importante de esta guía
>
> La **anon key** viaja dentro de cualquier página web que use
> Supabase. Se puede leer con clic derecho → ver código fuente. No
> pasa nada: lo que protege los datos es Row Level Security en la
> base, no que la clave sea secreta.
>
> La **service_role key** salta todas las reglas de RLS. Con ella,
> cualquiera se descarga la lista completa de pacientes de la
> clínica: nombres, teléfonos y correos. Vive únicamente en los
> secretos de las Edge Functions, donde solo corre código del
> servidor.
>
> Si alguna vez acaba en el repositorio, en un mensaje o en una
> captura de pantalla: **rotarla de inmediato** en
> Project Settings → API → Reset. No basta con borrar el archivo,
> porque queda en el historial de git.

---

## 2. Aplicar el esquema

Panel → **SQL Editor** → **New query**. Pega entero el contenido de
`supabase/migrations/0001_init.sql` y pulsa **Run**.

Crea las tablas `bookings`, `posts`, `banners`, `site_content`,
`staff` y `keepalive`, las políticas de seguridad y los dos buckets
de fotos.

### Comprobar que quedó bien

Al final del archivo SQL hay dos consultas de verificación. La
segunda es la que importa:

```sql
select polname from pg_policy
 where polrelid = 'public.bookings'::regclass
   and 'anon' = any (select rolname from pg_roles where oid = any (polroles));
```

**Tiene que devolver cero filas.** Si devuelve alguna, hay una
política que deja al público tocar la tabla de reservas. No sigas
hasta arreglarlo.

### Por qué las reservas no entran por aquí

`bookings` no tiene ninguna política para `anon`: desde el
navegador, esa tabla no existe ni para leer ni para escribir. Las
reservas entran solo por la Edge Function del paso 6, que valida
del lado del servidor y escribe con permisos elevados.

Se hizo así porque la alternativa —dejar que el formulario inserte
directo— obliga a abrir una política de escritura pública sobre una
tabla con datos de pacientes. Es un error fácil de cometer y difícil
de notar hasta que ya pasó.

---

## 3. Conectar el sitio

Ya está hecho. En `js/config.js`, sección 6:

```js
supabase: {
  url: "https://tittyvorxepzjoffqado.supabase.co",
  anonKey: "sb_publishable_..."
}
```

Se usa la **publishable key** del formato nuevo y no la anon key
antigua: se puede rotar por separado sin invalidar nada más. Se
comprobó que la Edge Function la acepta con `verify_jwt` activo,
aunque no sea un JWT — eso no era obvio de antemano y por eso se
probó antes de darlo por bueno.

Con esos dos valores puestos, el modo demostración del panel queda
inerte y el formulario deja de abrir un borrador de correo.

---

## 4. Crear las cuentas del personal

Dos pasos por persona, a propósito.

**Primero la cuenta:** Authentication → **Users** → **Add user** →
*Create new user*. Correo y contraseña. Marca *Auto Confirm User*
para no tener que pasar por el correo de confirmación.

**Después el permiso:** copia el `User UID` que aparece en la lista
y, en el SQL Editor:

```sql
insert into public.staff (user_id, email, full_name)
values ('PEGA-AQUI-EL-UID', 'persona@clinica.com', 'Nombre Apellido');
```

Tener cuenta no da acceso a nada. Solo entra al panel quien está en
`staff`. Son dos comprobaciones separadas por si algún día se
habilita el registro público por descuido: un desconocido tendría
cuenta, pero no vería ni una reserva.

**Y ya que estás:** Authentication → Providers → Email → desactiva
**Enable sign ups**. Esta es una clínica, nadie tiene que poder
registrarse solo.

### Dar de baja a alguien

Borrar la fila de `staff` le quita el acceso al instante. Borrar el
usuario en Authentication lo elimina del todo. Lo primero suele
bastar.

---

## 5. Preparar los tres avisos

### 5a. Correo — App Password de Gmail

Una App Password es una contraseña de 16 letras que sirve solo para
que un programa entre por SMTP. No es la contraseña de la cuenta y
se puede revocar por separado.

1. La cuenta de Google necesita la **verificación en dos pasos**
   activada. Sin eso, la opción no aparece.
2. Ve a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Nombre: `RDC Saint Kitts backend` → **Crear**
4. Copia las 16 letras. **Solo se muestran una vez.**

### 5b. WhatsApp — API oficial de Meta

El código elige la vía solo: si están los secretos de Meta usa la API
oficial; si no, cae a CallMeBot. Así el aviso funciona desde hoy y el
cambio a la vía buena es automático, sin tocar código ni redesplegar.

> #### Qué manda y qué no
>
> El aviso lleva **código, estudio, fecha y hora**. No lleva nombre,
> teléfono ni correo del paciente.
>
> No es exceso de celo: es el principio de mínimo necesario. Un
> WhatsApp acaba en el móvil personal de alguien, se reenvía, se ve en
> la pantalla de bloqueo y queda en copias de seguridad que nadie
> controla. "MRI mañana a las 2" no identifica a nadie; ese mismo dato
> con el nombre al lado, sí — y encima revela qué se está estudiando
> de esa persona.
>
> Con la API oficial se *podría* mandar todo, porque hay acuerdo de
> datos y responsabilidad detrás. Que la clínica lo decida a
> conciencia si lo quiere; el valor por defecto es el prudente.

#### Alta en Meta

1. Cuenta en [developers.facebook.com](https://developers.facebook.com)
   y un **Meta Business Account** para la clínica.
2. Crear una app de tipo **Business** y añadirle el producto
   **WhatsApp**.
3. Registrar el número de la clínica que va a *enviar*. Ojo: ese
   número **no puede estar en uso en la app normal de WhatsApp** — hay
   que darlo de baja de ahí primero, o usar uno nuevo.
4. **Verificación del negocio.** Meta pide documentación de la empresa
   (registro mercantil, factura de servicios, web). Es el paso que
   más tarda: cuenta días, no horas. Con el número de prueba que da
   Meta se puede probar todo mientras tanto, aunque solo envía a un
   puñado de destinatarios registrados a mano.
5. **Token permanente.** El que se ve al principio caduca en 24 horas
   y no sirve. El bueno se saca en
   *Business Settings → Users → System Users*: crear un usuario de
   sistema, darle permisos de *Manage app* y *Manage WhatsApp Business
   Accounts*, y generar el token ahí.
6. Anotar el **Phone Number ID** (no el número de teléfono: el ID
   numérico que aparece junto a él en el panel de WhatsApp).

#### La plantilla

Los mensajes que salen sin que el destinatario haya escrito antes
exigen una **plantilla aprobada**. No se puede mandar texto libre.

En *WhatsApp Manager → Message Templates → Create template*:

| Campo | Valor |
|---|---|
| Nombre | `nueva_reserva` |
| Categoría | **Utility** ← no Marketing, o cuesta seis veces más |
| Idioma | Español (`es`) |

Cuerpo, exactamente:

```
Nueva reserva {{1}} en RDC Saint Kitts.
Estudio: {{2}}
Fecha: {{3}} a las {{4}}
Ábrela en el panel de administración.
```

El orden de los `{{n}}` importa y tiene que coincidir con el del
código (`ref`, `modality`, `preferred_date`, `preferred_time`). Si lo
cambias en Meta, cámbialo también en `_shared/notify.ts`.

La aprobación suele tardar de minutos a unas horas. Una plantilla en
"Utility" que parezca promoción se rechaza o se recategoriza.

#### Los secretos

```
WHATSAPP_TOKEN            el token permanente del usuario de sistema
WHATSAPP_PHONE_NUMBER_ID  el ID numerico del numero emisor
WHATSAPP_TO               numero(s) que reciben, con codigo de pais y
                          sin +. Varios separados por coma.
```

Opcionales: `WHATSAPP_TEMPLATE_NAME` (por defecto `nueva_reserva`),
`WHATSAPP_TEMPLATE_LANG` (`es`), `WHATSAPP_API_VERSION` (`v23.0`).

#### Qué cuesta

Desde julio de 2025 Meta cobra **por mensaje**, no por conversación.
Las plantillas de categoría *utility* son de las baratas — del orden
de fracciones de céntimo cada una, con la tarifa variando por país.
Para una clínica con unas pocas reservas al día, el gasto mensual es
simbólico. Conviene confirmar la tarifa de St. Kitts & Nevis en el
panel de Meta antes de dar cifras al cliente.

Las respuestas dentro de una conversación abierta por el cliente son
gratis, pero eso no aplica aquí: estos avisos siempre los inicia la
clínica.

---

### 5b-bis. CallMeBot — solo como puente

Mientras Meta aprueba, esto deja el aviso funcionando hoy mismo.

1. Guarda en tus contactos el número **+34 644 33 66 63**
   *(el número cambió; si ves el 644 51 95 23 en algún sitio, está
   desfasado — confirma siempre el actual en callmebot.com)*
2. Mándale por WhatsApp, desde el número que va a *recibir* los
   avisos: `I allow callmebot to send me messages`
3. Te responde con tu apikey → secretos `CALLMEBOT_PHONE` y
   `CALLMEBOT_APIKEY`

**Por qué es solo un puente:** su documentación dice que la API
gratuita es **solo para uso personal**. Una clínica no lo es. Un
servicio usado fuera de sus términos puede cortarse cualquier día, sin
aviso y sin nadie a quien reclamar.

**Sobre el nombre "Rita":** al guardar el contacto te aparece el nombre
de perfil que tiene puesta esa cuenta de WhatsApp, no el que tú le
pongas. Es cosmético y puede cambiar sin avisar. Pero que el canal de
avisos de una clínica pase por un perfil anónimo cualquiera es, en sí
mismo, la razón de fondo para no quedarse aquí.

En cuanto pongas los tres secretos de Meta, esta vía deja de usarse
sola. Puedes borrar los de CallMeBot entonces.

### 5c. Google Calendar — cuenta de servicio

Aquí es donde se nota por qué el backend es Supabase. Google exige
un token firmado en **RS256**; PocketBase solo firma HS256 y por eso
obligaba a un híbrido con Apps Script. Deno trae WebCrypto completo
y lo firma directamente.

1. [console.cloud.google.com](https://console.cloud.google.com) →
   crear un proyecto (o usar uno existente)
2. **APIs & Services → Library** → buscar *Google Calendar API* →
   **Enable**
3. **APIs & Services → Credentials → Create credentials →
   Service account**
   - Nombre: `rdc-calendar`
   - Los pasos de permisos opcionales se pueden saltar
4. Entra en la cuenta creada → pestaña **Keys** → **Add key → Create
   new key → JSON**. Se descarga un archivo.
5. De ese JSON necesitas dos campos: `client_email` y `private_key`

**El paso que casi todo el mundo olvida:** la cuenta de servicio es
un usuario nuevo que no ve ningún calendario. Hay que invitarla.

En [calendar.google.com](https://calendar.google.com), en el
calendario de la clínica → **Configuración y uso compartido** →
*Compartir con determinadas personas* → añade el `client_email` de
la cuenta de servicio con permiso **"Hacer cambios en los eventos"**.

Sin esto, todo lo demás está bien y Google responde `404 Not Found`.

Guarda también el **ID del calendario** (misma pantalla, más abajo).
Suele ser una dirección de correo.

---

## 6. Desplegar la Edge Function

> **La función ya está desplegada** (versión 1, `verify_jwt` activo) y
> probada. Lo que falta de este paso son **los secretos**: sin ellos
> guarda las reservas pero no avisa por ningún canal.
>
> Los secretos se pueden poner sin CLI, desde el panel:
> **Edge Functions → Secrets → Add new secret**. Es la vía recomendada
> aquí, porque así la App Password y la clave privada de Google no
> pasan por tu terminal ni quedan en el historial de bash.

Si prefieres la CLI:

```bash
npm install -g supabase
supabase login
supabase link --project-ref tittyvorxepzjoffqado
```

### Los secretos

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase
solo; no hay que ponerlos.

```bash
supabase secrets set \
  SMTP_USER="lacuenta@gmail.com" \
  SMTP_PASS="las16letrasdelapppassword" \
  NOTIFY_EMAIL_TO="donde@llegan-los-avisos.com" \
  WHATSAPP_TOKEN="el-token-permanente-del-usuario-de-sistema" \
  WHATSAPP_PHONE_NUMBER_ID="123456789012345" \
  WHATSAPP_TO="18690000000" \
  GOOGLE_SA_EMAIL="rdc-calendar@proyecto.iam.gserviceaccount.com" \
  GOOGLE_CALENDAR_ID="clinica@gmail.com" \
  CLINIC_NAME="RDC Saint Kitts" \
  CLINIC_TIMEZONE="America/St_Kitts" \
  ALLOWED_ORIGINS="https://el-dominio-del-sitio.com"
```

La clave privada va aparte porque tiene saltos de línea:

```bash
supabase secrets set GOOGLE_SA_PRIVATE_KEY="$(cat ruta/al/archivo.json | jq -r .private_key)"
```

Sin `jq`, ábrelo y copia el valor de `private_key` tal cual, con sus
`\n` incluidos: el código los convierte a saltos reales.

> **`ALLOWED_ORIGINS` no es opcional en producción.** Si se deja
> vacío, se acepta cualquier origen y otra página puede mandar
> reservas desde el navegador de un visitante. Pon el dominio real
> en cuanto lo tengas.

### Volver a desplegar (solo si cambias el código de la función)

```bash
supabase functions deploy book
```

Después de poner los secretos **no hace falta redesplegar**: las Edge
Functions leen las variables de entorno en cada invocación.

### Secretos que se pueden ajustar

| Variable | Por defecto | Para qué |
|---|---|---|
| `APPOINTMENT_MINUTES` | `45` | Duración del evento en el calendario |
| `MAX_BOOKINGS_PER_EMAIL` | `3` | Freno anti-spam por correo |
| `MAX_BOOKINGS_PER_IP` | `10` | Freno anti-spam por IP |
| `RATE_LIMIT_WINDOW_MINUTES` | `30` | Ventana de los dos frenos |
| `SMTP_HOST` / `SMTP_PORT` | `smtp.gmail.com` / `465` | Si no se usa Gmail |

---

## 7. Encender el anti-pausa

**Este paso decide si el sitio sigue funcionando dentro de tres
meses.** No es opcional.

### El problema

Supabase pausa los proyectos del plan gratuito cuando ve poca
actividad durante una ventana de **7 días**. Su documentación dice
que lo que cuenta son *peticiones de usuario contra la base de
datos*, y que con unas pocas al día basta.

Una clínica con reservas esporádicas cae justo en ese caso. Y con el
proyecto pausado **las reservas no entran**: el formulario falla y
el paciente se va sin pedir su cita. Peor aún, nadie se entera,
porque lo que deja de llegar son avisos.

### Por qué el ping no vive dentro de Supabase

Lo natural sería `pg_cron`. No sirve, por dos motivos:

1. Es actividad interna de la base, no una petición de usuario. La
   documentación de Supabase nunca dice que cuente.
2. Y sobre todo: si el proyecto llegara a pausarse, `pg_cron` se
   detiene con él. El despertador estaría dentro de la casa cerrada.

Por eso el ping viene de fuera, desde GitHub Actions. El workflow ya
está escrito en `.github/workflows/supabase-keepalive.yml`.

### Ponerlo en marcha

En GitHub, **Settings → Secrets and variables → Actions → New
repository secret**, dos secretos:

| Nombre | Valor |
|---|---|
| `SUPABASE_URL` | `https://xxxxxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | La **anon** key. Nunca la service_role. |

Después: pestaña **Actions** → *Supabase keepalive* → **Run
workflow**. Compruébalo a mano antes de fiarte del cron.

### Cómo saber que sigue vivo

```sql
select last_ping, ping_count from public.keepalive;
```

`last_ping` no debería tener más de tres días. Si tiene tres
semanas, el cron está roto y el proyecto va camino de pausarse.

### El segundo problema, más silencioso

GitHub **desactiva los workflows programados en repositorios sin
actividad durante 60 días**. Avisa por correo, pero ese aviso se
pierde con facilidad — y entonces el ping deja de correr justo
cuando más falta hace.

El workflow se defiende solo: escribe el año y el mes en
`.github/keepalive-stamp` y hace un commit cuando cambia el mes. Un
commit al mes mantiene el repositorio activo y el cron encendido.

### Si aun así se pausa

Un proyecto ya pausado **no se despierta con un ping**. Hay que
entrar al panel de Supabase y pulsar *Restore*. Tarda unos minutos y
no se pierde nada: los datos y la configuración vuelven como
estaban.

### Cuando el sitio esté en producción de verdad

El plan de pago quita el problema de raíz. Mientras tanto, el
keepalive es un apaño que funciona — pero es un apaño, y conviene
que el cliente sepa que existe.

---

## 8. Probar

En este orden, sin saltarse ninguno:

1. **El ping.** Actions → Run workflow. Verde y `last_ping` recién
   actualizado en la base.

2. **Una reserva de mentira** desde el formulario del sitio. Tienen
   que pasar cuatro cosas:
   - el mensaje de éxito muestra un código tipo `RDC-2026-00001`
   - aparece una fila en la tabla `bookings`
   - llegan el correo **y** el WhatsApp
   - aparece el evento en el calendario, **a la hora correcta**

   Si algo falla, mira los tres booleanos `notified_*` y el campo
   `notify_error` de esa fila: dicen exactamente qué canal falló y
   por qué. Los logs completos están en Edge Functions → book →
   Logs.

3. **El panel.** Entra en `admin.html` con una cuenta del paso 4.
   Confirma la reserva de prueba y comprueba que el estado cambia
   al recargar.

4. **Arrastrar una foto** a la pestaña Banner Photos, guardar, y
   verla en la portada del sitio.

5. **Que la tabla de reservas esté cerrada.** Abre la consola del
   navegador en el sitio público y ejecuta:

   ```js
   await RDC_API.getPublicContent(); // debe funcionar
   ```

   Después, en la pestaña Network, intenta leer las reservas con la
   anon key. Tiene que devolver una lista vacía o un error de
   permisos, **nunca datos de pacientes**. Si devuelve filas, vuelve
   al paso 2 antes de publicar nada.

6. **El freno anti-spam.** Manda cuatro reservas seguidas con el
   mismo correo. La cuarta debe rechazarse con un mensaje pidiendo
   esperar.

---

## 9. Antes de entregar al cliente

- [ ] `ALLOWED_ORIGINS` con el dominio real
- [ ] `NOTIFY_EMAIL_TO` y `CALLMEBOT_PHONE` con los datos de la
      clínica, no los de prueba
- [ ] `demoMode: false` en `js/config.js`
- [ ] Registro público desactivado en Authentication → Providers
- [ ] Cuentas de personal creadas y probadas
- [ ] El keepalive corriendo, con al menos dos ejecuciones verdes
- [ ] La service_role key en ningún sitio salvo los secretos
- [ ] Contarle al cliente que el plan gratuito depende del
      keepalive, y qué cuesta pasar al de pago

El resto de pendientes —textos clínicos por revisar, dirección,
horarios, consentimiento de las imágenes— está en el `README.md`.

---

## Preguntas frecuentes

**¿Y el Apps Script antiguo?**
`backend/Codigo.gs` se queda como referencia histórica; ya no se
usa. Toda su lógica está traducida en
`supabase/functions/_shared/notify.ts`.

**¿Y PocketBase?**
Ruta descartada. El razonamiento completo está en
`backend/POCKETBASE.md`, que conviene no borrar: explica por qué no
volver a intentarlo.

**El correo no llega.**
Casi siempre es la App Password. Comprueba que la verificación en
dos pasos sigue activa y que copiaste las 16 letras sin espacios.

**Google Calendar responde 404.**
No compartiste el calendario con el `client_email` de la cuenta de
servicio (paso 5c). Es el olvido más común de toda esta guía.

**El WhatsApp no llega pero el correo sí.**
La apikey de CallMeBot está atada al número que autorizó el bot. Si
cambia el número de destino, hay que volver a autorizarlo.

**Quiero mover el backend a otro sitio.**
Todo lo que sale a la red desde el navegador está en
`js/supabase-api.js`. Se reescribe ese archivo y el resto del sitio
no se entera.
