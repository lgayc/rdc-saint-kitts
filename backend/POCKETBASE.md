# Backend híbrido — PocketBase + Apps Script

Documento de instalación y de **estado del trabajo**. Si retomas esto
después de un tiempo (o en otra sesión), empieza por la sección
[Estado actual](#estado-actual).

---

## Por qué híbrido y no PocketBase solo

Se evaluó hacerlo todo en PocketBase. No se puede sin complicarlo mucho, por una razón concreta:

**Google Calendar exige firmar un token RS256.** PocketBase solo firma HS256 en su motor JavaScript ([referencia oficial](https://pocketbase.io/jsvm/functions/_security.createJWT.html)). Para hacer Calendar desde PocketBase habría que compilar un binario propio en Go — y entonces hay que recompilarlo en cada actualización.

El reparto queda así:

| Pieza | Quién la hace | Por qué |
|---|---|---|
| Base de datos de reservas | PocketBase | Base real, consultas, filtros |
| Fotos de posts y banners | PocketBase | Subida por arrastre, miniaturas automáticas |
| Panel de administración | PocketBase | Trae uno completo de fábrica |
| Correo de aviso | Apps Script | Ya funciona, gratis, sin configurar SMTP |
| Evento en Google Calendar | Apps Script | Vive dentro de la cuenta de Google: **cero OAuth** |
| WhatsApp | Apps Script | CallMeBot, ya funciona |

El Apps Script queda reducido a un **puente de notificaciones**. PocketBase le avisa cuando entra una reserva, y él dispara correo + WhatsApp + Calendar. Nada de OAuth, nada de claves de Google en el servidor.

---

## Paso 1 — Dónde va a vivir PocketBase

PocketBase es un único ejecutable con su base de datos dentro. Necesita un sitio encendido.

| Opción | Costo | Recomendado si |
|---|---|---|
| **PocketHost** | Gratis | Quieres empezar ya sin tarjeta. Ideal para probar. |
| **VPS** (Hetzner, DigitalOcean) | ~5 USD/mes | Es el sitio definitivo del cliente. Control total. |
| **Fly.io / Railway** | Variable | Ya usas alguno. |

> **Decisión pendiente.** Hasta que no exista la instancia no se puede
> probar nada de lo que sigue.

### Si eliges PocketHost
1. Cuenta en [pockethost.io](https://pockethost.io)
2. "New instance", nombre `rdc-saint-kitts`
3. Te da una URL tipo `https://rdc-saint-kitts.pockethost.io`
4. Entra a `<esa-url>/_/` y crea la cuenta de administrador

### Si eliges VPS
```bash
wget https://github.com/pocketbase/pocketbase/releases/download/vX.XX.X/pocketbase_X.XX.X_linux_amd64.zip
unzip pocketbase_*.zip
./pocketbase serve --http=0.0.0.0:8090
```
Ponlo detrás de Nginx con HTTPS (Certbot) y como servicio de systemd para que arranque solo. **Sin HTTPS el panel viaja en claro — no lo dejes así.**

---

## Paso 2 — Crear las colecciones

En `<tu-url>/_/` → **Collections** → **New collection**.

> Se dan como pasos de interfaz a propósito, y no como un JSON para
> importar: el formato del esquema cambió entre versiones de
> PocketBase, y un JSON escrito a ciegas falla al importar. Por la
> interfaz funciona en cualquier versión. Son unos 10 minutos.

### `bookings` — tipo Base

| Campo | Tipo | Ajustes |
|---|---|---|
| `fullName` | Text | Requerido, mín. 3 |
| `phone` | Text | Requerido |
| `email` | Email | Requerido |
| `modality` | Text | Requerido |
| `preferredDate` | Text | Requerido (formato `YYYY-MM-DD`) |
| `preferredTime` | Text | Requerido |
| `notes` | Text | Opcional |
| `status` | Select | Valores: `Pendiente`, `Confirmada`, `Cancelada` — por defecto `Pendiente` |
| `notified` | Bool | Por defecto falso. Marca si ya salió el aviso. |

**Reglas de API** (pestaña *API Rules*):

| Regla | Valor | Motivo |
|---|---|---|
| List / Search | *(candado — solo admin)* | Las reservas llevan datos personales. **Nunca públicas.** |
| View | *(candado)* | Igual. |
| Create | *(vacío = público)* | Cualquier paciente debe poder reservar. |
| Update | *(candado)* | Solo el personal cambia el estado. |
| Delete | *(candado)* | |

> El campo Create vacío significa "cualquiera puede crear". Es lo
> correcto aquí, pero implica que alguien podría enviar reservas
> falsas en masa. Se mitiga en la entrega 2 con un límite por IP.

### `posts` — tipo Base

| Campo | Tipo | Ajustes |
|---|---|---|
| `title` | Text | Requerido |
| `date` | Date | Requerido |
| `excerpt` | Text | Opcional |
| `image` | **File** | 1 archivo, solo imágenes, máx. 5 MB |
| `link` | URL | Opcional |
| `published` | Bool | Por defecto verdadero |

**Reglas:** List y View → `published = true` (público solo ve lo publicado). Create, Update y Delete → candado.

### `banners` — tipo Base

| Campo | Tipo | Ajustes |
|---|---|---|
| `image` | **File** | Requerido, solo imágenes, máx. 5 MB |
| `caption` | Text | Opcional |
| `sort` | Number | Orden de aparición |
| `active` | Bool | Por defecto verdadero |

**Reglas:** List y View → `active = true`. El resto, candado.

### `site_content` — tipo Base

Una sola fila, para los textos editables.

| Campo | Tipo |
|---|---|
| `heroTitle` | Text |
| `heroSubtitle` | Text |
| `promoText` | Text |

**Reglas:** List y View públicas. Update con candado. Create y Delete con candado — se crea **una** fila a mano y no se toca más.

---

## Paso 3 — El puente de notificaciones

Pendiente (entrega 2). Será un hook en `pb_hooks/notify.pb.js` que, al crearse una reserva, llama al Apps Script ya existente. El `backend/Codigo.gs` actual se recorta para quedarse solo con el envío.

---

## Estado actual

| Entrega | Qué incluye | Estado |
|---|---|---|
| **1** | Este documento: esquema, reglas y hosting | Hecho |
| **2** | Reservas: formulario -> PocketBase -> avisos | Pendiente |
| **3** | Panel admin: subida de fotos por arrastre | Pendiente |
| **4** | Sitio público leyendo de PocketBase | Pendiente |

### Bloqueado esperando por ti

1. **Dónde vive PocketBase** — PocketHost o VPS. Sin esto no hay URL y no se puede probar nada.
2. **La URL de la instancia**, una vez creada.
3. **Las colecciones creadas** según el paso 2.

### Aviso sobre las pruebas

Nada de esto se puede verificar de punta a punta desde aquí: hace falta tu instancia, tu cuenta de Google y tu número de WhatsApp. Se entrega el código y la guía; **la comprobación real es tuya**. Cuando tengas la URL, la primera prueba debe ser una reserva de mentira que llegue a los tres sitios (correo, WhatsApp, Calendar) antes de dar nada por bueno.

### Lo que NO cambia

El sitio público sigue funcionando exactamente igual mientras dure la migración. `js/config.js` mantiene `api.url` vacío y el formulario en modo prueba hasta que la entrega 2 esté lista. **No se rompe nada por dejarlo a medias.**
