# Tareas Completadas (DONE) — Peluquería Elkin

## Fase 1: Sistema Web de Reservas y Panel Admin (v2.0)

- [x] **1. Setup del Proyecto**
  - [x] Inicializar proyecto con React + Vite (`package.json`, `vite.config.js`).
  - [x] Instalar dependencias frontend (`react-router-dom`, `firebase`, `lucide-react`, `date-fns`) y backend (`firebase-admin`, `bcrypt`, `date-fns-tz`).
  - [x] Crear guía paso a paso de Firebase y Vercel en `SETUP_INSTRUCTIONS.md` (excluida en `.gitignore`).
  - [x] Configurar enrutamiento para Vercel en `vercel.json`.

- [x] **2. Estilos Globales e Identidad Clásica**
  - [x] Definir paleta clásica de barbería (blanco, negro, grises suaves) y tipografías (`Playfair Display` + `Inter`) en `src/index.css`.
  - [x] Diseño responsive Mobile-First sin scroll horizontal.

- [x] **3. Backend Serverless (`/api`)**
  - [x] Configurar SDK de administración Firebase en `api/_lib/firebaseAdmin.js`.
  - [x] Crear validadores de negocio (ventana de 7 días, nombre, teléfono de 10 dígitos, hora) en `api/_lib/validators.js`.
  - [x] Implementar utilidades de hash/verificación `bcrypt` en `api/_lib/passwordUtils.js`.
  - [x] Endpoint `GET /api/availability.js` con bloqueo de hora en curso (zona horaria `America/Bogota`) y cálculo de cupo según estilistas activos.
  - [x] Endpoint `POST /api/appointments/index.js` con transacción de Firestore para evitar sobrecupo por condición de carrera (`409 SLOT_TAKEN`).
  - [x] Endpoint `POST /api/appointments/lookup.js` para consultar citas futuras por teléfono.
  - [x] Endpoint `POST /api/appointments/cancel.js` para cancelar citas verificando propiedad del teléfono.
  - [x] Endpoint `POST /api/admin/login.js` que valida el hash de `config/adminAuth` y emite un Firebase Custom Token (`admin: true`).
  - [x] Endpoint `POST /api/admin/change-password.js` protegido con verificación de ID Token.

- [x] **4. Frontend Público y de Administración (`/src`)**
  - [x] Cliente Firebase (`src/lib/firebaseClient.js`) y cliente HTTP (`src/lib/api.js`).
  - [x] Página pública de reserva (`src/pages/BookingPage.jsx`).
  - [x] Página pública de consulta/cancelación (`src/pages/CancelPage.jsx`).
  - [x] Login de administrador (`src/pages/AdminLoginPage.jsx`).
  - [x] Panel de administrador (`src/pages/AdminDashboardPage.jsx`) con:
    - [x] `AppointmentsList.jsx` (lectura en tiempo real con `onSnapshot`).
    - [x] `StylistsManager.jsx` (gestión de estilistas activos / cupo por franja).
    - [x] `ScheduleEditor.jsx` (días laborables y horario de apertura/cierre).
    - [x] `BlockedDatesManager.jsx` (bloqueo de fechas festivas/vacaciones).
    - [x] `ChangePasswordForm.jsx` (cambio de contraseña desde el panel).

- [x] **5. Reglas de Seguridad y Seed**
  - [x] Reglas de seguridad de Firestore en `firestore.rules`.
  - [x] Script de inicialización `scripts/seed.js` para `config/adminAuth` y `config/schedule`.
  - [x] Verificación de build de producción (`npm run build`).


---

## Fase 2: Bot de WhatsApp Guiado (Cloud API + Máquina de Estados) — Completado: 2026-11-12

- [x] **1. Configuración de Meta WhatsApp Cloud API**
  - [x] App Business creada en Meta for Developers (`2366489874114699`).
  - [x] Número `+57 302 2012409` (Phone ID: `1415062101693906`) conectado en modo `LIVE`.
  - [x] WABA ID `1121157634042724` suscrito formalmente a la app (`POST /subscribed_apps`).
  - [x] Token de usuario del sistema permanente generado con permisos `whatsapp_business_messaging` y `whatsapp_business_management`.

- [x] **2. Core de Negocio Unificado (`api/_lib/bookingService.js`)**
  - [x] Normalización de números colombianos a 10 dígitos locales (`normalizeColombianPhone`).
  - [x] Control horario en zona `America/Bogota` (`getColombiaNow`, `formatTo12Hour`).
  - [x] Cálculo de disponibilidad (`getAvailableDates`, `getAvailableSlots`) con reglas de días laborales, fechas bloqueadas y horas pasadas.
  - [x] Transacciones atómicas en Firestore para agendamiento (`createAppointment`) y cancelación (`cancelAppointmentById`) previniendo sobrecupo.

- [x] **3. Cliente Meta y Máquina de Estados (`api/_lib/`)**
  - [x] Cliente ligero `whatsappClient.js` con soporte para mensajes de texto, botones interactivos (máx 3) y listas desplegables (máx 10 filas).
  - [x] Máquina de estados determinista `whatsappFlow.js` respaldada en `whatsappSessions/{phone}` con comandos globales (`hola`, `menu`).
  - [x] Flujo guiado: `IDLE` -> `SELECT_DATE` -> `SELECT_PERIOD` -> `SELECT_TIME` -> `AWAITING_NAME` -> `CONFIRM_BOOKING` / `SELECT_CANCEL`.

- [x] **4. Webhook Serverless en Vercel (`api/whatsapp/webhook.js`)**
  - [x] Verificación `GET` instantánea con desafío en texto plano (`hub.challenge`).
  - [x] Procesamiento `POST` asíncrono con import dinámico y respuesta `200 OK`.
  - [x] Configuración de Node 22 (`engines`) y rewrites limpios en `vercel.json`.
  - [x] Blindaje de la colección `whatsappSessions` en `firestore.rules`.
