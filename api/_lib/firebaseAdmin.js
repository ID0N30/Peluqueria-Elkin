import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let app = getApps()[0];

// Evitar inicializar más de una vez en entornos serverless
if (!app) {
  try {
    let rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
    if (rawKey) {
      if ((rawKey.startsWith("'") && rawKey.endsWith("'")) || (rawKey.startsWith('"') && rawKey.endsWith('"'))) {
        rawKey = rawKey.slice(1, -1).trim();
      }
      const serviceAccount = JSON.parse(rawKey);
      if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      app = initializeApp({
        credential: cert(serviceAccount)
      });
      console.log('Firebase Admin inicializado correctamente con Service Account.');
    } else {
      app = initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'peluqueria-elkin'
      });
      console.log('Firebase Admin inicializado en modo fallback.');
    }
  } catch (error) {
    console.error('Error inicializando Firebase Admin:', error.message);
    try {
      if (!getApps().length) {
        app = initializeApp({
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'peluqueria-elkin'
        });
      }
    } catch (fallbackErr) {
      console.error('Fallback init error:', fallbackErr.message);
    }
  }
}

export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;
export default app;
