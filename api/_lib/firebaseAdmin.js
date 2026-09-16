import admin from 'firebase-admin';

// Evitar inicializar más de una vez en entornos serverless
if (!admin.apps.length) {
  try {
    let credential;
    
    // En Vercel / local env, tenemos el string JSON de la service account
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      credential = admin.credential.cert(serviceAccount);
    } else {
      // Fallback a default application credentials si estuviera en GCP (no es el caso aquí, pero buena práctica)
      credential = admin.credential.applicationDefault();
    }

    admin.initializeApp({
      credential,
    });
    console.log('Firebase Admin inicializado correctamente.');
  } catch (error) {
    console.error('Error inicializando Firebase Admin:', error);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
export default admin;
