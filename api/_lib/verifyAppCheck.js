import './firebaseAdmin.js';

/**
 * Validador de Firebase App Check en endpoints serverless.
 * Si ENFORCE_APPCHECK no está configurada en 'true', permite el tráfico sin bloquear
 * para facilitar transiciones suaves y pruebas sin credenciales de reCAPTCHA Enterprise.
 */
export async function verifyAppCheck(req) {
  const token = req?.headers?.['x-firebase-appcheck'] || req?.headers?.['X-Firebase-AppCheck'];

  if (process.env.ENFORCE_APPCHECK !== 'true') {
    return { valid: true, enforced: false };
  }

  if (!token || typeof token !== 'string') {
    return { valid: false, message: 'Token de App Check requerido.' };
  }

  try {
    const { getAppCheck } = await import('firebase-admin/app-check');
    const appCheckClaims = await getAppCheck().verifyToken(token);
    return { valid: true, enforced: true, claims: appCheckClaims };
  } catch (error) {
    console.warn('App Check token verification failed:', error.message);
    return { valid: false, message: 'Token de App Check inválido.' };
  }
}
