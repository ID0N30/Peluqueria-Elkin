import { getAvailableSlots } from './_lib/bookingService.js';
import { validateDateWindow } from './_lib/validators.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method Not Allowed' } });
  }

  const { date } = req.query;

  if (!date || !validateDateWindow(date)) {
    return res.status(400).json({ error: { code: 'INVALID_DATE', message: 'Fecha inválida o fuera de rango.' } });
  }

  try {
    const availability = await getAvailableSlots(date);
    return res.status(200).json({
      date: availability.date,
      slots: availability.slots,
      isClosed: Boolean(availability.isClosed),
      reason: availability.reason || null
    });
  } catch (error) {
    console.error('Error in api/availability handler:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor al consultar disponibilidad.' } });
  }
}
