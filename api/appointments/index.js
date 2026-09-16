import { db } from '../_lib/firebaseAdmin.js';
import { validateName, validatePhone, validateDateWindow, validateTimeFormat } from '../_lib/validators.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method Not Allowed' } });
  }

  const { date, time, clientName, clientPhone } = req.body;

  if (!date || !validateDateWindow(date) || !time || !validateTimeFormat(time) || !validateName(clientName) || !validatePhone(clientPhone)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos.' } });
  }

  try {
    const result = await db.runTransaction(async (t) => {
      // 1. Obtener configuración
      const scheduleRef = db.collection('config').doc('schedule');
      const scheduleDoc = await t.get(scheduleRef);
      if (!scheduleDoc.exists) {
        throw new Error('CONFIG_MISSING');
      }
      const schedule = scheduleDoc.data();
      const activeStylistsCount = schedule.stylists.filter(s => s.active).length;

      if (activeStylistsCount === 0) {
        throw new Error('SLOT_TAKEN'); // No hay estilistas
      }

      // 2. Verificar día bloqueado
      const blockedRef = db.collection('blockedDates').doc(date);
      const blockedDoc = await t.get(blockedRef);
      if (blockedDoc.exists) {
        throw new Error('SLOT_TAKEN');
      }

      // 3. Contar citas en ese slot
      const appointmentsRef = db.collection('appointments');
      const snapshot = await t.get(
        appointmentsRef
          .where('date', '==', date)
          .where('time', '==', time)
          .where('status', '==', 'confirmed')
      );

      if (snapshot.size >= activeStylistsCount) {
        throw new Error('SLOT_TAKEN');
      }

      // 4. Crear la cita
      const newAppointmentRef = appointmentsRef.doc();
      const appointmentData = {
        date,
        time,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        stylistId: null, // Reservado para fase 2
        status: 'confirmed',
        createdAt: new Date(),
        cancelledAt: null
      };

      t.set(newAppointmentRef, appointmentData);
      return { id: newAppointmentRef.id, ...appointmentData };
    });

    return res.status(201).json(result);

  } catch (error) {
    if (error.message === 'SLOT_TAKEN') {
      return res.status(409).json({ error: { code: 'SLOT_TAKEN', message: 'El horario seleccionado ya no tiene cupo disponible.' } });
    }
    console.error('Error creating appointment:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' } });
  }
}
