import { db, auth } from '../_lib/firebaseAdmin.js';
import { verifyPassword } from '../_lib/passwordUtils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method Not Allowed' } });
  }

  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Contraseña requerida.' } });
  }

  try {
    const authDoc = await db.collection('config').doc('adminAuth').get();
    
    if (!authDoc.exists) {
      return res.status(500).json({ error: { code: 'CONFIG_MISSING', message: 'Configuración de admin no encontrada.' } });
    }

    const { passwordHash } = authDoc.data();
    const isMatch = await verifyPassword(password, passwordHash);

    if (!isMatch) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Contraseña incorrecta.' } });
    }

    // Usar el UID de la variable de entorno o uno por defecto
    const adminUid = process.env.ADMIN_UID || 'admin-elkin';
    
    // Crear el custom token con el claim 'admin: true'
    const customToken = await auth.createCustomToken(adminUid, { admin: true });

    return res.status(200).json({ token: customToken });

  } catch (error) {
    console.error('Error in admin login:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' } });
  }
}
