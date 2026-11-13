# Tareas (TODO & DONE) — Peluquería Elkin

## ✅ Completado (DONE) — 2026-11-12
- **Web de Reservas en Producción**: Desplegada exitosamente en Vercel ([https://peluqueria-elkin.vercel.app](https://peluqueria-elkin.vercel.app)), conectada a Firebase Firestore y Authentication.
- **Panel Administrativo & Elkin**: Permisos de superadministrador asignados a Elkin (`elkintabarez04@gmail.com`) y administradores autorizados. Agendamiento manual de citas para clientes presenciales, métricas en vivo, gestión de horarios, estilistas y fechas bloqueadas.
- **Bot de WhatsApp Guiado en Vivo (`+57 302 2012409`)**:
  - Cuenta de WhatsApp Business (WABA ID: `1121157634042724`) suscrita oficialmente a la aplicación Meta Cloud API (`2366489874114699`).
  - Webhook activo y verificado en `https://peluqueria-elkin.vercel.app/api/whatsapp/webhook`.
  - Máquina de estados determinista con menús interactivos (botones y listas desplegables): Agendamiento guiado, consulta de turnos, jornadas (mañana/tarde/noche), captura de nombre y cancelación con liberación de cupo en tiempo real.
  - Core de negocio atómico con transacciones en Firestore para prevención de condiciones de carrera (*Race Conditions*).

---

## Fase 1 — Despliegue y Puesta en Marcha de la Web
- [x] Crear proyecto en Firebase (Firestore + Authentication) siguiendo `SETUP_INSTRUCTIONS.md`.
- [x] Configurar variables de entorno en `.env` local y en el panel de Vercel (`FIREBASE_SERVICE_ACCOUNT_KEY`, `ADMIN_UID`, `VITE_FIREBASE_*`).
- [x] Ejecutar `node scripts/seed.js` para inicializar `config/schedule` y `config/adminAuth`.
- [x] Desplegar reglas de seguridad (`firestore.rules`) en la consola de Firebase.
- [x] Cambiar la contraseña inicial (`admin`) desde el panel `/admin` tras el primer despliegue.

---

## Fase 2 — Bot de WhatsApp Guiado (Sin IA — Menús Interactivos / Máquina de Estados)

### 1. Configuración en Meta for Developers (WhatsApp Cloud API)
- [x] Crear App de tipo **Business** en [Meta for Developers](https://developers.facebook.com/).
- [x] Agregar el producto **WhatsApp** y vincular el número telefónico comprado y la cuenta de Meta Business.
- [x] Generar un **Token de Usuario del Sistema Permanente** (System User Token) en Meta Business Suite con permisos `whatsapp_business_messaging` y `whatsapp_business_management`.
- [x] Obtener `WHATSAPP_PHONE_NUMBER_ID` (`1415062101693906`) y definir un `WHATSAPP_VERIFY_TOKEN` secreto.
- [x] Configurar las variables en Vercel:
  - `WHATSAPP_ACCESS_TOKEN`
  - `WHATSAPP_PHONE_NUMBER_ID`
  - `WHATSAPP_VERIFY_TOKEN`

### 2. Refactorización de Lógica de Negocio (Core Compartido Web + WhatsApp)
- [x] Extraer la lógica pura de negocio de los endpoints actuales a `api/_lib/bookingService.js`:
  - `getAvailableDates()` (próximos 7 días hábiles no bloqueados)
  - `getAvailableSlots(date)` (aplicando regla de hora en curso y cupo de estilistas)
  - `createAppointment({ date, time, clientName, clientPhone })` (con transacción Firestore)
  - `lookupAppointmentsByPhone(clientPhone)`
  - `cancelAppointmentById({ id, clientPhone })`

### 3. Implementación del Flujo Guiado de WhatsApp (Máquina de Estados + Botones/Listas)
- [x] Crear cliente de mensajería interactiva de Meta en `api/_lib/whatsappClient.js`:
  - `sendInteractiveButtons(to, bodyText, buttons)` (hasta 3 botones: *Agendar Cita*, *Mis Citas / Cancelar*)
  - `sendInteractiveList(to, bodyText, buttonLabel, sections)` (lista desplegable de hasta 10 opciones para elegir Día, Turno y Hora)
  - `sendTextMessage(to, text)`
- [x] Crear máquina de estados determinista en `api/_lib/whatsappFlow.js` respaldada por la colección `whatsappSessions/{phone}` en Firestore:
  - `IDLE` → Muestra menú principal con botones: **[📅 Agendar Cita]** y **[📋 Mis Citas / Cancelar]**.
  - `SELECT_DATE` → Muestra Lista Interactiva con los días disponibles de la ventana de 7 días.
  - `SELECT_PERIOD` → Si hay más de 10 horas libres en el día, permite elegir **[🌅 Mañana]** o **[🌇 Tarde]** (o muestra directamente las horas si son ≤ 10).
  - `SELECT_TIME` → Muestra Lista Interactiva con las franjas de 30 min disponibles.
  - `AWAITING_NAME` → Si es cliente nuevo, pide escribir su nombre (si ya existe su nombre en sesión/historial, pasa directo a confirmar).
  - `CONFIRM_BOOKING` → Muestra resumen y botones **[✅ Confirmar]** / **[🔄 Cambiar Hora]** / **[❌ Cancelar]**.
  - `SELECT_CANCEL` → Lista las citas futuras confirmadas del número de WhatsApp con botón para cancelarlas.

### 4. Webhook de WhatsApp en Vercel
- [x] Actualizar `firestore.rules` para bloquear acceso público a `whatsappSessions` (`allow read, write: if false;`).
- [x] Crear endpoint `api/whatsapp/webhook.js`:
  - [x] `GET`: verificación del webhook con Meta (`hub.challenge`).
  - [x] `POST`: lectura de respuesta interactiva (`interactive.button_reply.id`, `interactive.list_reply.id`) o texto (`text.body`), ejecución de `whatsappFlow.js` y respuesta inmediata.
- [x] Conectar el webhook en el panel de Meta apuntando a `https://peluqueria-elkin.vercel.app/api/whatsapp/webhook` y suscribir WABA ID `1121157634042724`.

### 5. Pruebas End-to-End
- [x] Probar el flujo de botones y listas desde WhatsApp verificando que las citas se reflejen en tiempo real en la web (`/admin`) y descuenten cupo en la página de reservas (`/`).


---

## Fase 3 — Optimización SEO Local (Victoria, Caldas) y Vista Cronológica Global en Panel Admin

### 1. Textos por Defecto y Metadatos Base (Completado en base)
- [x] Reemplazar todos los textos con corchetes `[...]` en `HeroBanner.jsx`, `ServicesSection.jsx` y el pie de página de `App.jsx` con copywriting real enfocado en **Victoria, Caldas** y sus veredas.
- [x] Actualizar `index.html` con `lang="es-CO"`, `<title>`, `<meta name="description">`, etiquetas geográficas (`CO-CAL`, `Victoria, Caldas`), OpenGraph y bloque de datos estructurados `JSON-LD` (`HairSalon`).

### 2. Archivos Técnicos de Indexación SEO (Para ejecutar por los agentes)
- [x] Crear `public/robots.txt` permitiendo la indexación de `/` y bloqueando `/admin`, `/admin/login` y `/api/`, apuntando al `sitemap.xml`.
- [x] Crear `public/sitemap.xml` con las rutas públicas (`https://peluqueria-elkin.vercel.app/` y `https://peluqueria-elkin.vercel.app/cancel`) con prioridad `1.0` y `0.8`.
- [x] Crear imagen `public/og-banner.jpg` (1200x630px) a partir del cartel oficial y enlazarla en `<meta property="og:image">` y `<meta name="twitter:image">` en `index.html` para previsualizaciones enriquecidas al compartir por WhatsApp y Facebook.
- [x] Agregar sección semántica de Preguntas Frecuentes (`<section aria-label="Preguntas frecuentes">` + `FAQPage` en JSON-LD) al final de `BookingPage.jsx` respondiendo dudas locales (cómo agendar desde veredas, cómo cancelar, puntualidad y turnos en Victoria, Caldas).

### 3. Panel Admin: Vista Global de Todas las Citas en Orden de Tiempo (Sin Filtrar por Fecha)
- [x] En `src/components/AppointmentsList.jsx`:
  - [x] Añadir un selector de modo de vista en la cabecera:
    - **[📅 Por Fecha]** (comportamiento actual con el selector `input type="date"`).
    - **[📋 Todas las Citas (Orden Cronológico)]** (sin filtro de fecha obligatorio, con sub-opción *"Próximas desde hoy"* vs. *"Todas"*).
  - [x] Cuando esté activo el modo **"Todas las Citas"**:
    - [x] Suscribirse en tiempo real (`onSnapshot`) a las citas `status == 'confirmed'` sin cláusula `where('date', '==', filterDate)`.
    - [x] Ordenar todas las reservas cronológicamente por `date` ascendente y luego por `time` ascendente (`a.date.localeCompare(b.date) || a.time.localeCompare(b.time)`).
    - [x] Mostrar un contador resumen en la parte superior: **"Total reservado: X citas en Y días distintos"** más insignias (pills) con el conteo de citas por cada día (ej. *Vie 13 Nov: 8 citas*, *Sáb 14 Nov: 12 citas*).
    - [x] Agrupar visualmente las tarjetas por día con un encabezado de fecha claro (ej. `Viernes, 13 de noviembre — 8 reservas`) o mostrar la etiqueta de fecha destacada en cada tarjeta junto a la hora.


---

## Fase 4 — Auditoría de Seguridad, Remediación de Vulnerabilidades y Protección Anti-Bots (CAPTCHA)

### 1. Remediación de Vulnerabilidades Críticas en Reglas de Firestore (`firestore.rules`)
- [x] **CRÍTICO-01 — Escalada de Privilegios a SuperAdmin (`users/{userId}`)**:
  - **Problema actual**: `allow write: if isAuthenticated() && (request.auth.uid == userId || isSuperAdmin());` permite que cualquier usuario autenticado (incluso anónimo) edite su propio documento en `users/{uid}` y se escriba `role: 'admin'`, convirtiéndose en `isSuperAdmin()` para toda la base de datos.
  - **Solución**: Prohibir que un usuario normal cree o modifique el campo `role` en su propio documento:
    - En `create`: `!( 'role' in request.resource.data ) || request.resource.data.role == 'user' || isHardcodedAdmin()`
    - En `update`: `!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role']) || isSuperAdmin()`
- [x] **CRÍTICO-02 — Exposición Pública de Datos Personales PII (`appointments` y `users`)**:
  - **Problema actual**: `match /appointments/{appointmentId} { allow read, create: if true; }` y `BookingPage.jsx` se suscribe con `onSnapshot` a toda la colección `appointments` de la fecha seleccionada desde el navegador público, exponiendo nombres completos (`clientName`), teléfonos (`clientPhone`) y notas de todos los clientes a cualquier persona que abra las DevTools del navegador. Además, `match /users/{userId} { allow read: if isAuthenticated(); }` permite a cualquier usuario leer perfiles de otros usuarios.
  - **Solución**:
    - En `users/{userId}`: Restringir `allow read: if isAuthenticated() && (request.auth.uid == userId || isSuperAdmin());`.
    - En `appointments/{appointmentId}`: Restringir `allow read: if isSuperAdmin();`.
    - En el cliente público (`BookingPage.jsx` y `src/lib/bookingService.js`): Para saber qué horas están ocupadas en tiempo real sin leer `appointments` públicos, escuchar únicamente `dailySlots/{date}` (que solo contiene `{ counts: { "08:00": 1 } }` sin datos personales) o consultar `/api/availability`.
    - En `CancelPage.jsx`: Hacer que la búsqueda y cancelación por teléfono pasen exclusivamente por los endpoints Serverless `/api/appointments/lookup` y `/api/appointments/cancel` (Admin SDK), nunca mediante queries directas del cliente sobre `appointments`.
- [x] **ALTO-03 — Manipulación Directa de Contadores y Citas (`slots` y `appointments`)**:
  - **Problema actual**: `match /slots/{slotId} { allow read, write: if true; }` y `allow update` abierto en `appointments` permiten que un atacante con un script vacíe o llene toda la peluquería poniendo `count: 999` en `slots` o cancelando citas ajenas sin validar su teléfono.
  - **Solución**:
    - Mover toda creación y cancelación pública de citas para que pase **únicamente por los endpoints `/api/appointments` y `/api/appointments/cancel`** (usando `api/_lib/bookingService.js` con `firebase-admin`), tal como exigía el diseño de arquitectura original.
    - Cambiar `firestore.rules` en `slots/{slotId}` y `dailySlots/{date}` a `allow read: if true; allow write: if isSuperAdmin();` y en `appointments/{appointmentId}` a `allow read, write: if isSuperAdmin();`.

### 2. Seguridad en Endpoints Serverless (`/api`) y Webhook de WhatsApp
- [x] **ALTO-04 — Verificación de Firma Criptográfica en Webhook de Meta (`X-Hub-Signature-256`) y `phone_number_id`**:
  - **Solución**: Validar la cabecera `x-hub-signature-256` usando HMAC-SHA256 contra `WHATSAPP_APP_SECRET` (si está definida) y verificar que `phone_number_id` coincida con `WHATSAPP_PHONE_NUMBER_ID`.
- [x] **MEDIO-05 — Eliminación de Endpoints Legacy Inconsistentes (`/api/admin/login.js`, `/api/admin/change-password.js`)**:
  - **Solución**: Unificar `/api/availability.js` y `/api/appointments/*.js` para que importen directamente las funciones transaccionales de `api/_lib/bookingService.js` y eliminar endpoints obsoletos.
- [x] **MEDIO-06 — Cabeceras de Seguridad HTTP en `vercel.json`**:
  - Agregar headers globales en `vercel.json`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

### 3. Plan de Implementación de CAPTCHA Anti-Bots (Cloudflare Turnstile + Firebase App Check)
Para evitar que bots o scripts maliciosos llenen la agenda de Elkin con reservas falsas o hagan ataques de fuerza bruta buscando teléfonos en `/cancel`:

- [x] **Opción Elegida: Cloudflare Turnstile (Invisible / Managed Widget)**
- [x] **Paso 1 — Configuración de Llaves**:
  - Documentar `VITE_TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY` en `.env.example`.
- [x] **Paso 2 — Helper de Verificación en Backend (`api/_lib/verifyCaptcha.js`)**:
  - Crear función `verifyTurnstileToken(token, remoteIp)` que envíe un `POST` a `https://challenges.cloudflare.com/turnstile/v0/siteverify` con `TURNSTILE_SECRET_KEY` y devuelva `true/false` (sin bloquear si no está configurada).
- [x] **Paso 3 — Integración en Frontend (`BookingPage.jsx` y `CancelPage.jsx`)**:
  - Integrar widget de Turnstile en formularios de cliente.
- [x] **Paso 4 — Límite de Reservas Activas por Teléfono (Regla Anti-Acaparamiento)**:
  - En `api/_lib/bookingService.js` (`createAppointment`), validar dentro de la transacción que un mismo `clientPhone` no tenga más de **2 citas futuras confirmadas** al mismo tiempo (`MAX_ACTIVE_APPOINTMENTS_PER_PHONE = 2`).

---

## Fase 5 — Auditoría de Rendimiento y Optimización de Cuota Gratuita de Firebase (Spark Plan: 50k lecturas / 20k escrituras día)

### 1. Eliminación de Explosión N+1 de Lecturas en `slots` (Reducción del 92% de lecturas por consulta)
- [x] **CRÍTICO-PERF-01 — 24 `getDoc` individuales por cada día consultado**:
  - Migrado a `dailySlots/{YYYY-MM-DD}` (1 solo documento por fecha con mapa de conteos) y lectura única de `config/schedule` en WhatsApp con `Promise.all` para los 7 días.

### 2. Eliminación del Doble Disparo (`Double Fetch`) en `BookingPage.jsx`
- [x] **ALTO-PERF-02 — `fetchSlotsForDate` duplicado al cambiar de fecha**:
  - Reducir a escucha de `dailySlots/{date}` y caché de 60s en `src/lib/bookingService.js`.

### 3. Optimización de `MetricsHistory.jsx` (Evitar descarga completa de toda la historia de la peluquería)
- [x] **ALTO-PERF-03 — `collection(db, 'appointments')` sin `limit` ni filtro de fecha en servidor**:
  - Implementado en `src/lib/adminService.js`: `subscribeAppointmentsMetrics(dateRange, callback)` aplica `where('date', '>=', startStr)` y `where('date', '<=', endStr)`, y `limit(200)` para `'all'`.
  - Añadido `subscribeAllConfirmedAppointments` para vistas cronológicas globales.

### 4. Eliminación de Lecturas y Escrituras Redundantes en cada Recarga (`authService.js` + `AuthContext.jsx`)
- [x] **MEDIO-PERF-04 — 4 lecturas y 1 escritura en cada F5 de un usuario autenticado**:
  - `subscribeToAuthState` lee `users/{uid}` una sola vez por sesión y solo ejecuta `setDoc` en el primer registro.
- [x] **MEDIO-PERF-05 — No bloquear el primer pintado (LCP / SEO) con `!loading && children`**:
  - `AuthContext.jsx` renderiza `{children}` inmediatamente sin demorar el LCP inicial.

### 5. Optimización de Peso de la Web (Bundle Splitting e Imágenes)
- [x] **MEDIO-PERF-06 — Bundle único de +809 KB (`vite.config.js` y `App.jsx`)**:
  - **Problema resuelto**: Al compilar (`npm run build`), se dividió el bundle con `manualChunks` (separando `firebase`, `vendor` y `ui`) y lazy loading con `<Suspense>` en `src/App.jsx` para `AdminDashboardPage`, `AdminLoginPage` y `CancelPage`. `HeroBanner.jsx` cuenta con `loading="eager" fetchPriority="high"`.


---

## Fase 6 — Unificación 100% Nativa con Firebase (Reemplazar Cloudflare Turnstile por Firebase App Check)

Para mantener todo el ecosistema dentro de **Firebase / Google Cloud** sin cuentas ni servicios externos como Cloudflare:

- [x] **1. Eliminar dependencia de Cloudflare Turnstile**:
  - Eliminar `src/components/TurnstileWidget.jsx` y las referencias a `VITE_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` en `BookingPage.jsx`, `CancelPage.jsx`, `api/_lib/verifyCaptcha.js` y `.env.example`.
- [x] **2. Integrar `Firebase App Check` nativo en `src/lib/firebaseClient.js`**:
  - Importar `initializeAppCheck, ReCaptchaV3Provider` desde `firebase/app-check`.
  - Si existe `import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY`, inicializar App Check de forma invisible (`isTokenAutoRefreshEnabled: true`).
  - Exportar helper `getAppCheckToken()` que obtenga el token con `getToken(appCheck, false)` y lo envíe automáticamente en la cabecera `X-Firebase-AppCheck` desde `src/lib/api.js`.
- [x] **3. Verificar Token de Firebase App Check en Backend (`api/_lib/verifyAppCheck.js`)**:
  - Usar `admin.appCheck().verifyToken(appCheckToken)` nativo de `firebase-admin` en `/api/appointments/index.js`, `/api/appointments/lookup.js` y `/api/appointments/cancel.js`.
  - Si `ENFORCE_APPCHECK=true` está activo en el entorno, rechazar peticiones sin token válido de Firebase App Check; mientras no esté activo, permitir el paso para no bloquear pruebas.


---

## Fase 7 — Pulido Final de Consultas Firestore y Enlaces al Bot de WhatsApp (`+57 302 2012409`)

### 1. Enlaces de Reserva por WhatsApp hacia el Bot (`+57 302 2012409`) Conservando el Número Personal de Elkin en el Footer
- [x] **Botón de WhatsApp en `src/components/HeroBanner.jsx` (líneas 43-50)**:
  - Cambiar el enlace `href` para que apunte al número del **Bot de Reservas** (`https://wa.me/573022012409?text=Hola`) con un texto claro como *"Agendar por WhatsApp"* (o *"Reservar por WhatsApp"*), de modo que al tocarlo se active inmediatamente el menú interactivo del bot.
- [x] **Botón post-reserva en `src/pages/BookingPage.jsx` (líneas 250-256)**:
  - Apuntar el botón de gestión rápida por WhatsApp al bot (`https://wa.me/573022012409?text=Hola`) o ofrecer acceso claro al bot para consultar/cancelar citas, manteniendo el número personal de Elkin para dudas directas si se desea.
- [x] **Footer en `src/App.jsx` (líneas 58-63) — NO eliminar el número actual de Elkin**:
  - **Conservar intacto** el número personal de Elkin (`+57 311 571 1709` / `https://wa.me/573115711709`) como **"Contacto Directo Elkin: +57 311 571 1709"** en el pie de página, y agregar justo al lado/debajo el enlace al **"Bot de Reservas 24/7: +57 302 201 2409"** (`https://wa.me/573022012409?text=Hola`).

### 2. Evitar Requerimiento de Índice Compuesto (`Composite Index`) en "Todas las Citas" (`src/lib/adminService.js`)
- [x] En `subscribeAllConfirmedAppointments` (`src/lib/adminService.js`):
  - **Problema resuelto**:
    - Cuando se consulta desde una fecha (`fromDate`), usa únicamente `where('date', '>=', minDate)` en la query de Firestore y filtra `data.status === 'confirmed'` en memoria dentro del callback `onSnapshot`.
    - Cuando se consultan todas las confirmadas históricas (`fromDate === '2000-01-01'`), usa `where('status', '==', 'confirmed')` con `limit(200)`. Así jamás requerirá un índice compuesto manual en Firebase Console.

### 3. Eliminar Lectura Duplicada de `dailySlots` al Escuchar en Tiempo Real (`BookingPage.jsx` + `src/lib/bookingService.js`)
- [x] En `src/lib/bookingService.js` y `src/lib/api.js`:
  - Recibe parámetro opcional `preloadedCounts = null` (`export const getAvailability = async (date, preloadedCounts = null)`).
  - Si `preloadedCounts !== null`, usa ese objeto directamente sin ejecutar `getDoc(doc(db, 'dailySlots', date))`.
- [x] En `src/pages/BookingPage.jsx` (líneas 89 y 131-133):
  - En el callback de `onSnapshot(dailySlotRef, (snap) => ...)`, extraer `const counts = snap.exists() ? (snap.data().counts || {}) : {};` y pasarlo directamente a `fetchSlotsForDate(selectedDate, !isInitial, counts)` → `api.getAvailability(date, counts)`. Esto ahorra 1 lectura de Firestore adicional en cada clic o actualización en vivo.
