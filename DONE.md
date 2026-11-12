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
