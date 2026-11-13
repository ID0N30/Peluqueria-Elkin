import { createAppointment } from '../_lib/bookingService.js';
import { verifyAppCheck } from '../_lib/verifyAppCheck.js';
import { validateName, validatePhone, validateDateWindow, validateTimeFormat } from '../_lib/validators.js';

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

  const { date, time, clientName, clientPhone, notes } = req.body || {};

  // 2. Validación estricta de entradas
  if (!date || !validateDateWindow(date) || !time || !validateTimeFormat(time) || !validateName(clientName) || !validatePhone(clientPhone)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Datos de la cita inválidos o incompletos.' } });
  }

  try {
    const result = await createAppointment({
      date,
      time,
      clientName,
      clientPhone,
      notes: notes || '',
      source: 'web'
    });

    return res.status(201).json(result);
  } catch (error) {
    if (error.message === 'SLOT_TAKEN') {
      return res.status(409).json({
        error: { code: 'SLOT_TAKEN', message: 'El horario seleccionado ya no tiene cupo disponible.' }
      });
    }

    if (error.message === 'MAX_APPOINTMENTS_REACHED') {
      return res.status(429).json({
        error: { code: 'MAX_APPOINTMENTS_REACHED', message: 'Has alcanzado el límite máximo permitido de 2 citas activas por número de teléfono.' }
      });
    }

    console.error('Error in api/appointments/index handler:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor al procesar la cita.' } });
  }
}
