import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app = getApps()[0];

// Evitar inicializar más de una vez en entornos serverless
if (!app) {
  try {
    let rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (rawKey && typeof rawKey === 'string') {
      const firstBrace = rawKey.indexOf('{');
      const lastBrace = rawKey.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        rawKey = rawKey.substring(firstBrace, lastBrace + 1);
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

// Proxy para carga diferida de auth (evita ERR_REQUIRE_ESM de jwks-rsa/jose en serverless)
export const auth = new Proxy({}, {
  get(_target, prop) {
    return async (...args) => {
      const { getAuth } = await import('firebase-admin/auth');
      const authInstance = getAuth(app);
      if (typeof authInstance[prop] === 'function') {
        return authInstance[prop](...args);
      }
      return authInstance[prop];
    };
  }
});

export default app;
