import admin from 'firebase-admin';
import bcrypt from 'bcrypt';
import fs from 'fs';

// Lee de un archivo .env si existiera (usaremos process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
// Para correr esto local: node scripts/seed.js (necesita exportar la variable antes)

const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountStr) {
  console.error("Falta FIREBASE_SERVICE_ACCOUNT_KEY en las variables de entorno.");
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountStr);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seed() {
  console.log("Iniciando seed de base de datos...");

  // 1. Configurar auth de admin
  const defaultPassword = 'admin'; // Cambiar inmediatamente en producción
  const hash = await bcrypt.hash(defaultPassword, 10);
  
  await db.collection('config').doc('adminAuth').set({
    passwordHash: hash,
    updatedAt: new Date()
  });
  console.log("✅ Admin Auth configurado (contraseña por defecto: 'admin')");

  // 2. Configurar horario por defecto
  const defaultSchedule = {
    workingDays: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false },
    hours: { start: "09:00", end: "18:00" },
    slotDurationMinutes: 30,
    stylists: [
      { id: "default", name: "Elkin", active: true }
    ]
  };

  await db.collection('config').doc('schedule').set(defaultSchedule);
  console.log("✅ Horario y estilistas por defecto configurados.");

  console.log("Seed completado exitosamente.");
  process.exit(0);
}

seed().catch(console.error);
