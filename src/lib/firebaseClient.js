import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider, getToken } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

let appCheckInstance = null;
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;

if (typeof window !== 'undefined' && appCheckSiteKey) {
  try {
    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true
    });
  } catch (err) {
    console.warn('Firebase App Check initialization failed:', err.message);
  }
}

/**
 * Obtiene el token de Firebase App Check si está configurado.
 * Retorna null silenciosamente si no está configurado o si ocurre un error,
 * garantizando que la aplicación continúe funcionando sin interrupciones.
 */
export const getAppCheckToken = async () => {
  if (!appCheckInstance) return null;
  try {
    const result = await getToken(appCheckInstance, false);
    return result?.token || null;
  } catch (error) {
    console.warn('Error fetching App Check token:', error.message);
    return null;
  }
};
