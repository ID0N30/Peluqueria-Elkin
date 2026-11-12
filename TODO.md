# Tareas Pendientes (TODO) — Peluquería Elkin

## Fase 1 — Despliegue y Puesta en Marcha de la Web
- [ ] Crear proyecto en Firebase (Firestore + Authentication) siguiendo `SETUP_INSTRUCTIONS.md`.
- [ ] Configurar variables de entorno en `.env` local y en el panel de Vercel (`FIREBASE_SERVICE_ACCOUNT_KEY`, `ADMIN_UID`, `VITE_FIREBASE_*`).
- [ ] Ejecutar `node scripts/seed.js` para inicializar `config/schedule` y `config/adminAuth`.
- [ ] Desplegar reglas de seguridad (`firestore.rules`) en la consola de Firebase.
- [ ] Cambiar la contraseña inicial (`admin`) desde el panel `/admin` tras el primer despliegue.

---

## Fase 2 — Bot de WhatsApp Guiado (Sin IA — Menús Interactivos / Máquina de Estados + MCP para Desarrollo)

### 1. Configuración en Meta for Developers (WhatsApp Cloud API)
- [ ] Crear App de tipo **Business** en [Meta for Developers](https://developers.facebook.com/).
- [ ] Agregar el producto **WhatsApp** y vincular el número telefónico comprado y la cuenta de Meta Business.
- [ ] Generar un **Token de Usuario del Sistema Permanente** (System User Token) en Meta Business Suite con permisos `whatsapp_business_messaging` y `whatsapp_business_management`.
- [ ] Obtener `WHATSAPP_PHONE_NUMBER_ID` y definir un `WHATSAPP_VERIFY_TOKEN` secreto.
- [ ] Configurar las variables en Vercel:
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
- [ ] Conectar el webhook en el panel de Meta apuntando a `https://<tu-dominio>.vercel.app/api/whatsapp/webhook`.

### 5. Pruebas End-to-End
- [ ] Probar el flujo de botones y listas desde WhatsApp verificando que las citas se reflejen en tiempo real en la web (`/admin`) y descuenten cupo en la página de reservas (`/`).
