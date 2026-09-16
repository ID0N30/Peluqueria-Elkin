import { db } from '../_lib/firebaseAdmin.js';
import { validatePhone } from '../_lib/validators.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method Not Allowed' } });
  }

  const { clientPhone } = req.body;

  if (!validatePhone(clientPhone)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Teléfono inválido.' } });
  }

  try {
    const snapshot = await db.collection('appointments')
      .where('clientPhone', '==', clientPhone)
      .where('status', '==', 'confirmed')
      .get();

    const appointments = [];
    
    // Solo devolvemos citas futuras (o de hoy)
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const nowParts = formatter.formatToParts(new Date());
    const tzMap = {};
    nowParts.forEach(p => tzMap[p.type] = p.value);
    const todayStr = `${tzMap.year}-${tzMap.month}-${tzMap.day}`;

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.date >= todayStr) {
        appointments.push({
          id: doc.id,
          date: data.date,
          time: data.time,
          clientName: data.clientName
        });
      }
    });

    // Sort by date then time
    appointments.sort((a, b) => {
      if (a.date === b.date) return a.time.localeCompare(b.time);
      return a.date.localeCompare(b.date);
    });

    return res.status(200).json({ appointments });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' } });
  }
}
