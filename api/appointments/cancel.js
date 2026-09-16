import { db } from '../_lib/firebaseAdmin.js';
import { validatePhone } from '../_lib/validators.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method Not Allowed' } });
  }

  const { id, clientPhone } = req.body;

  if (!id || !validatePhone(clientPhone)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos.' } });
  }

  try {
    const docRef = db.collection('appointments').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Cita no encontrada.' } });
    }

    const data = doc.data();
    if (data.clientPhone !== clientPhone) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'No tienes permiso para cancelar esta cita.' } });
    }

    if (data.status === 'cancelled') {
      return res.status(200).json({ id, status: 'cancelled' });
    }

    await docRef.update({
      status: 'cancelled',
      cancelledAt: new Date()
    });

    return res.status(200).json({ id, status: 'cancelled' });

  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' } });
  }
}
