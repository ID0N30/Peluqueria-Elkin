import { lookupAppointmentsByPhone } from '../_lib/bookingService.js';
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

  const { clientPhone, userId } = req.body || {};

  // 2. Validación de parámetros de búsqueda
  if (!clientPhone && !userId) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Se requiere un número de teléfono o ID de usuario.' }
    });
  }

  if (clientPhone && !validatePhone(clientPhone)) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Formato de teléfono colombiano inválido.' }
    });
  }

  try {
    const appointments = await lookupAppointmentsByPhone(clientPhone, userId);
    return res.status(200).json({ appointments });
  } catch (error) {
    console.error('Error in api/appointments/lookup handler:', error);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor al consultar citas.' }
    });
  }
}
