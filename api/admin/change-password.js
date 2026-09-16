import { db, auth } from '../_lib/firebaseAdmin.js';
import { hashPassword, verifyPassword } from '../_lib/passwordUtils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method Not Allowed' } });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No se proporcionó token.' } });
  }

  const idToken = authHeader.split('Bearer ')[1];
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos o contraseña muy corta.' } });
  }

  try {
    // 1. Verificar el ID Token y que tenga el claim admin
    const decodedToken = await auth.verifyIdToken(idToken);
    if (!decodedToken.admin) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'No tienes permisos de administrador.' } });
    }

    // 2. Verificar contraseña actual
    const authDocRef = db.collection('config').doc('adminAuth');
    const authDoc = await authDocRef.get();
    
    if (!authDoc.exists) {
      return res.status(500).json({ error: { code: 'CONFIG_MISSING', message: 'Configuración no encontrada.' } });
    }

    const { passwordHash } = authDoc.data();
    const isMatch = await verifyPassword(currentPassword, passwordHash);

    if (!isMatch) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'La contraseña actual es incorrecta.' } });
    }

    // 3. Hashear y guardar nueva contraseña
    const newHash = await hashPassword(newPassword);
    await authDocRef.update({
      passwordHash: newHash,
      updatedAt: new Date()
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token inválido o expirado.' } });
  }
}
