import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let app = getApps()[0];

// Evitar inicializar más de una vez en entornos serverless
if (!app) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      app = initializeApp({
        credential: cert(serviceAccount)
      });
      console.log('Firebase Admin inicializado correctamente con Service Account.');
    } else {
      app = initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'pagina-peluqueria-elkin'
      });
      console.log('Firebase Admin inicializado en modo fallback.');
    }
  } catch (error) {
    console.error('Error inicializando Firebase Admin:', error.message);
  }
}

export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;
export default app;
