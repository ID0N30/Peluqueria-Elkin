import { cancelAppointmentById } from '../_lib/bookingService.js';
import { verifyAppCheck } from '../_lib/verifyAppCheck.js';
import { validatePhone } from '../_lib/validators.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method Not Allowed' } });
  }

  // 1. Verificación de seguridad Firebase App Check
  const appCheck = await verifyAppCheck(req);
  if (!appCheck.valid) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED_APP_CHECK', message: appCheck.message || 'Verificación de seguridad fallida.' }
    });
  }

  const { id, clientPhone } = req.body || {};

  if (!id || !validatePhone(clientPhone)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'ID de cita y teléfono válidos son obligatorios.' } });
  }

  try {
    const result = await cancelAppointmentById({ id, clientPhone, isAdmin: false });
    return res.status(200).json(result);
  } catch (error) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Cita no encontrada.' } });
    }
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'No tienes autorización para cancelar esta cita.' } });
    }
    console.error('Error in api/appointments/cancel handler:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor al cancelar la cita.' } });
  }
}
