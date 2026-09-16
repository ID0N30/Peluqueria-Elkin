import { db } from './_lib/firebaseAdmin.js';
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
    // 1. Obtener configuración
    const scheduleDoc = await db.collection('config').doc('schedule').get();
    if (!scheduleDoc.exists) {
      return res.status(500).json({ error: { code: 'CONFIG_MISSING', message: 'Configuración no encontrada.' } });
    }
    const schedule = scheduleDoc.data();

    // 2. Verificar si el día de la semana está habilitado
    const jsDate = new Date(`${date}T00:00:00`); // Local time parsing
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayOfWeek = days[jsDate.getDay()];
    
    if (!schedule.workingDays[dayOfWeek]) {
      return res.status(200).json({ date, slots: [] }); // Cerrado ese día
    }

    // 3. Verificar fechas bloqueadas
    const blockedDoc = await db.collection('blockedDates').doc(date).get();
    if (blockedDoc.exists) {
      return res.status(200).json({ date, slots: [] }); // Día bloqueado
    }

    // 4. Calcular cupo máximo por franja
    const activeStylistsCount = schedule.stylists.filter(s => s.active).length;
    if (activeStylistsCount === 0) {
      return res.status(200).json({ date, slots: [] }); // No hay estilistas activos
    }

    // 5. Obtener citas confirmadas para ese día
    const appointmentsSnapshot = await db.collection('appointments')
      .where('date', '==', date)
      .where('status', '==', 'confirmed')
      .get();
    
    // Contar citas por franja
    const slotCounts = {};
    appointmentsSnapshot.forEach(doc => {
      const time = doc.data().time;
      slotCounts[time] = (slotCounts[time] || 0) + 1;
    });

    // 6. Generar todas las franjas posibles
    const allSlots = [];
    let [startHour, startMin] = schedule.hours.start.split(':').map(Number);
    let [endHour, endMin] = schedule.hours.end.split(':').map(Number);
    const slotDuration = schedule.slotDurationMinutes || 30;

    let currentHour = startHour;
    let currentMin = startMin;

    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
      allSlots.push(timeStr);
      
      currentMin += slotDuration;
      if (currentMin >= 60) {
        currentHour += Math.floor(currentMin / 60);
        currentMin = currentMin % 60;
      }
    }

    // 7. Filtrar franjas pasadas si la fecha solicitada es hoy (Hora Colombia)
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Bogota',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
    
    // El formato en-US retorna MM/DD/YYYY, HH:MM
    const nowParts = formatter.formatToParts(new Date());
    const tzMap = {};
    nowParts.forEach(p => tzMap[p.type] = p.value);
    
    const tzDateStr = `${tzMap.year}-${tzMap.month}-${tzMap.day}`;
    const tzHour = parseInt(tzMap.hour, 10); // Hora actual en Bogotá

    let filteredSlots = allSlots;

    if (date === tzDateStr) {
      // Regla 4: No se puede reservar dentro de la hora en curso.
      // Si la franja está dentro de la misma hora actual o antes, se bloquea.
      // La primera franja disponible debe ser a la siguiente hora (o sea, slotHour > tzHour)
      filteredSlots = allSlots.filter(time => {
        const [slotH] = time.split(':').map(Number);
        return slotH > tzHour;
      });
    }

    // 8. Filtrar por disponibilidad (cupo)
    const availableSlots = filteredSlots.filter(time => {
      const currentBooked = slotCounts[time] || 0;
      return currentBooked < activeStylistsCount;
    });

    return res.status(200).json({ date, slots: availableSlots });

  } catch (error) {
    console.error('Error fetching availability:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' } });
  }
}
