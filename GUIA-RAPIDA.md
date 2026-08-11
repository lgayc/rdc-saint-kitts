# Guía rápida — RDC Saint Kitts

Todo lo que hay que configurar, en orden. Son unos 15 minutos en total.

> **Estado actual:** el sitio está en **modo prueba**. Funciona y se ve completo, pero el formulario todavía no envía nada real hasta que hagas el paso 1.

---

## Índice

1. [Conectar el backend (reservas, correo, Calendar)](#1-conectar-el-backend) — obligatorio
2. [Activar WhatsApp](#2-activar-whatsapp) — 2 minutos
3. [Usar el panel de administración](#3-panel-de-administración)
4. [Poner las fotos del banner](#4-fotos-del-banner)
5. [Antes de entregar al cliente](#5-antes-de-entregar-al-cliente) — importante
6. [Publicar el sitio](#6-publicar-el-sitio)

---

## 1. Conectar el backend

El sitio no tiene servidor propio. Todo (guardar reservas, mandar correo, WhatsApp y Calendar) lo hace un **Google Apps Script**, que es gratis.

**Usa la cuenta de Google de la clínica**, porque de ahí van a salir los correos y ahí se van a crear los eventos del calendario.

1. Entra a [sheets.google.com](https://sheets.google.com) y crea una hoja nueva. Ponle **"RDC Reservas"**.
   - Esta hoja va a ser la base de datos. No hay que crear columnas ni nada: se arman solas.

2. En esa misma hoja: menú **Extensiones → Apps Script**.

3. Se abre un editor con un archivo `Código.gs` que trae algo como `function myFunction() {}`. **Borra todo eso.**

4. Abre el archivo `backend/Codigo.gs` de este proyecto, copia **todo** su contenido y pégalo ahí.

5. Arriba de ese código está la sección `CONFIG`. Revisa que el correo y el WhatsApp sean los correctos (por ahora están los de prueba). Guarda con **Ctrl+S**.

6. Botón azul **Implementar → Nueva implementación**:
   - Donde dice **Tipo**, haz clic en el engranaje y elige **Aplicación web**
   - **Ejecutar como:** Yo
   - **Quién tiene acceso:** **Cualquier usuario** ← importante, si no, el formulario del sitio no puede escribir
   - Clic en **Implementar**

7. Google va a pedir permisos la primera vez. Acepta. Si sale una pantalla amarilla de "Google no ha verificado esta aplicación", es normal (el script lo hiciste tú): clic en **Configuración avanzada → Ir a (nombre) (no seguro)**.

8. Al final te da una **URL de la aplicación web**. Cópiala. Se ve así:
   ```
   https://script.google.com/macros/s/AKfycbx.../exec
   ```

9. Abre `js/config.js` y pégala:
   ```js
   api: {
     url: "https://script.google.com/macros/s/AKfycbx.../exec",
   ```

**Para comprobar que quedó bien:** pega esa URL en el navegador. Debe decir *"RDC backend activo"* con la fecha. Si dice eso, ya funciona.

> ⚠️ Cada vez que edites el código del Apps Script, tienes que ir a **Implementar → Administrar implementaciones → editar (lápiz) → Versión: Nueva versión → Implementar**. Si no, sigue corriendo la versión vieja. Este es el error más común.

---

## 2. Activar WhatsApp

Usamos **CallMeBot**, que es gratis. El número que va a *recibir* los avisos tiene que autorizarlo una sola vez.

Desde el teléfono con el número **+1 869 762 9440** (el de prueba):

1. Guarda este contacto: **+34 644 51 95 23**
2. Mándale por WhatsApp este mensaje exacto:
   ```
   I allow callmebot to send me messages
   ```
3. En unos segundos te responde con tu **API key** (un número).
4. Pega esa key en el Apps Script, dentro de `CONFIG`:
   ```js
   CALLMEBOT_APIKEY: "123456",
   ```
5. Guarda y **vuelve a implementar** (ver la nota del paso 1).

**Para probarlo sin llenar el formulario:** en el editor de Apps Script, arriba hay un desplegable de funciones. Elige **`probarSistema`** y dale ▶ Ejecutar. Debería llegarte el correo y el WhatsApp con una reserva de prueba.

> Si dejas la API key vacía, todo lo demás sigue funcionando igual (correo, Calendar, panel) — solo no se manda el WhatsApp.

**Para producción:** si el volumen crece o quieren algo más formal, se puede cambiar a Twilio o a la API oficial de WhatsApp Business. Solo hay que reemplazar el contenido de la función `sendWhatsApp()` en el Apps Script; el resto del sistema no cambia.

---

## 3. Panel de administración

**Cómo entrar:** al final del sitio hay un enlace discreto que dice *"Staff Login"*, o directo a `tusitio.com/admin.html`.

### Hay dos contraseñas, según el estado del sitio

| Situación | Contraseña | Dónde se cambia |
|---|---|---|
| **Sin backend conectado** (ahora mismo) | `demo1234` | `js/config.js` → `admin.demoPassword` |
| **Con backend conectado** (después del paso 1) | `rdc2026` | `backend/Codigo.gs` → `CONFIG.ADMIN_PASSWORD` |

**Modo demostración:** mientras `api.url` esté vacío, el panel entra con `demo1234` y muestra reservas de ejemplo, para que puedas ver cómo funciona todo. La pantalla te recuerda la contraseña y sale una franja naranja arriba avisando que son datos de prueba. Nada se guarda: al recargar vuelve al inicio.

En cuanto pegues la URL del Apps Script en `api.url`, el modo demo **se apaga solo** y el panel pasa a pedir la contraseña real y a manejar reservas de verdad.

> ⚠️ La contraseña de demo está a la vista en `js/config.js` — por eso solo sirve cuando no hay backend ni datos reales que proteger. La contraseña real nunca se escribe en archivos del sitio web: vive en el Apps Script, del lado del servidor. Si quieres apagar el modo demo por completo, pon `demoMode: false` en `js/config.js`.

**Cámbiala antes de entregar:** `rdc2026` es solo un valor inicial.

Qué se puede hacer desde ahí, sin tocar código:

| Pestaña | Para qué sirve |
|---|---|
| **Appointments** | Ver todas las reservas, confirmarlas o cancelarlas. El número en la pestaña son las que están pendientes. Cada una trae el teléfono, correo y un botón de WhatsApp para contactar al paciente de una. |
| **Banner Photos** | Las fotos que rotan en el banner de la página principal. |
| **Promo & Text** | La barra de anuncio de arriba (para promociones) y los textos del banner. |
| **Posts** | Las publicaciones de la sección "Studies & Work". |

Después de guardar, hay que recargar el sitio público para ver los cambios.

> **Sobre el título del banner:** cada oración se convierte en una línea, y las líneas entran deslizando desde lados opuestos (la 1ª por la izquierda, la 2ª por la derecha). Si quieres forzar un corte en otro lado, dale Enter donde quieras la línea nueva.

---

## 4. Fotos del banner

El carrusel del banner ya está construido y funcionando — solo le faltan las fotos reales.

Las imágenes se cargan **por enlace (URL)**, no subiendo el archivo. La forma más fácil:

1. Sube las fotos a Google Drive (o a Imgur, Cloudinary, donde sea).
2. En Drive: clic derecho en la foto → **Compartir** → cambia a **"Cualquier persona con el enlace"** → **Copiar enlace**.
3. En el panel admin → pestaña **Banner Photos** → **+ Add Photo** → pega el enlace.
4. **Save Banner Photos**.

**Recomendaciones para que se vean bien:**
- Horizontales (más anchas que altas), idealmente 1600×900 píxeles
- Que el centro de la foto no tenga elementos importantes — ahí va el texto encima
- 3 a 5 fotos es un buen número; más se vuelve lento de cargar

Ahora mismo hay tres imágenes de relleno cargadas (dicen "PLACEHOLDER" encima) para que el banner no se vea vacío. Si borras todas, el banner se ve con el fondo degradado, que también queda bien.

---

## 5. Antes de entregar al cliente

Lista de verificación. Ahora mismo hay **datos de prueba** que hay que cambiar:

- [ ] **Correo de avisos:** cambiar `869thesignstudio@gmail.com` por el real
  - En `js/config.js` → `notifications.email`
  - En `backend/Codigo.gs` → `CONFIG.NOTIFICATION_EMAIL`
- [ ] **WhatsApp de avisos:** cambiar `18697629440` por el real
  - En `js/config.js` → `notifications.whatsappNumber`
  - En `backend/Codigo.gs` → `CONFIG.WHATSAPP_NUMBER`
  - ⚠️ El número nuevo tiene que hacer el paso 2 (autorizar CallMeBot) con su propia API key
- [ ] **Contraseña del admin:** cambiar `rdc2026` en `backend/Codigo.gs`
- [ ] **Apagar el modo demo:** `demoMode: false` en `js/config.js` (o simplemente conectar el backend, que lo apaga solo)
- [ ] **Logo:** poner el archivo real en `assets/logo.jpg`
- [ ] **Fotos del banner:** reemplazar las tres de relleno
- [ ] **Dirección exacta** de la clínica en `js/config.js` → `contact.address`
- [ ] **Horarios reales** en `js/config.js` → `contact.hours`
- [ ] **Lista de servicios:** confirmar cuáles ofrecen de verdad, en `js/config.js` → `modalities`
- [ ] **Instagram:** el enlace actual es inventado. Poner el real o borrarlo de `social`
- [ ] Volver a implementar el Apps Script después de los cambios

Todo lo que hay que cambiar está marcado con la palabra `PLACEHOLDER` en los archivos — busca esa palabra y los encuentras todos.

---

## 6. Publicar el sitio

Como no hay código de servidor, sirve cualquier hosting estático:

- **Netlify** (recomendado, gratis): arrastra la carpeta del proyecto a [app.netlify.com/drop](https://app.netlify.com/drop) y ya está en línea. O conecta el repo de GitHub para que se actualice solo con cada cambio.
- **Vercel:** igual de simple.
- **GitHub Pages:** activarlo en Configuración del repositorio. Ojo: requiere que el repositorio sea público.

No hay que compilar nada ni instalar dependencias. Son archivos sueltos.

---

## Problemas comunes

**El formulario dice "Test mode"**
→ Falta pegar la URL en `js/config.js` → `api.url` (paso 1).

**Cambié el Apps Script y no pasa nada**
→ Falta volver a implementar con **Nueva versión**. Es el error más frecuente.

**El panel admin dice "Setup Required" y no me deja entrar**
→ Significa que no hay backend Y el modo demo está apagado. Pon `demoMode: true` en `js/config.js` para entrar con `demo1234`, o conecta el backend (paso 1).

**El panel admin no carga las reservas**
→ Revisa que en la implementación hayas puesto **"Quién tiene acceso: Cualquier usuario"**.

**No llega el WhatsApp pero sí el correo**
→ Falta la API key de CallMeBot, o el número no autorizó el bot (paso 2). El sistema está hecho para que si WhatsApp falla, la reserva igual se guarde y el correo igual salga.

**El logo no se ve**
→ El archivo debe estar en `assets/logo.jpg`. Si falta, el sitio muestra el nombre en texto para no romperse.
