import { db } from './firebaseAdmin.js';

const DEFAULT_SCHEDULE = {
  hours: { start: '08:00', end: '20:00' },
  workingDays: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false },
  stylists: [{ id: '1', name: 'Barbero Principal', active: true }],
  slotDurationMinutes: 30
};

const MAX_ACTIVE_APPOINTMENTS_PER_PHONE = 2;

/**
 * Normaliza un número telefónico colombiano.
 * Limpia caracteres no numéricos y si contiene el prefijo 57 seguido de 10 dígitos,
 * extrae los 10 dígitos locales (3XXXXXXXXX).
 */
export function normalizeColombianPhone(rawPhone) {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (/^57\d{10}$/.test(digits)) {
    return digits.slice(2);
  }
  return digits;
}

/**
 * Obtiene la fecha y hora actual en la zona horaria de Colombia (America/Bogota).
 */
export function getColombiaNow() {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(new Date());
  const map = {};
  parts.forEach(p => { map[p.type] = p.value; });

  const hour = parseInt(map.hour, 10) % 24;
  const minute = parseInt(map.minute, 10);
  const dateStr = `${map.year}-${map.month}-${map.day}`;

  return { dateStr, hour, minute };
}

/**
 * Convierte una hora en formato 24h ('14:30') a formato 12h ('2:30 PM').
 */
export function formatTo12Hour(time24) {
  if (!time24 || typeof time24 !== 'string') return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${period}`;
}

/**
 * Consulta la disponibilidad de franjas horarias para una fecha dada.
 * Utiliza 1 sola lectura a dailySlots/{date} eliminando las 24 lecturas individuales a slots/{date}_{time}.
 * Permite recibir cachedSchedule para evitar consultas repetidas al config.
 */
export async function getAvailableSlots(date, cachedSchedule = null) {
  let schedule = cachedSchedule || DEFAULT_SCHEDULE;

  if (!cachedSchedule) {
    try {
      const scheduleDoc = await db.collection('config').doc('schedule').get();
      if (scheduleDoc.exists) {
        schedule = { ...DEFAULT_SCHEDULE, ...scheduleDoc.data() };
      }
    } catch (error) {
      console.warn('Error reading config/schedule in getAvailableSlots:', error.message);
    }
  }

  // 1. Verificar día laborable
  const jsDate = new Date(`${date}T12:00:00`);
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayStr = dayNames[jsDate.getDay()];

  if (schedule.workingDays && schedule.workingDays[dayStr] === false) {
    return { date, slots: [], isClosed: true, reason: 'Día no laborable (Cerrado)' };
  }

  // 2. Verificar fechas bloqueadas
  try {
    const blockedDoc = await db.collection('blockedDates').doc(date).get();
    if (blockedDoc.exists) {
      const reason = blockedDoc.data().reason || 'Fecha bloqueada';
      return { date, slots: [], isClosed: true, reason };
    }
  } catch (error) {
    console.warn('Error reading blockedDates in getAvailableSlots:', error.message);
  }

  // 3. Capacidad de estilistas
  const activeStylists = (schedule.stylists || []).filter(s => s.active !== false).length || 1;

  // 4. Lecturas optimizadas: 1 sola lectura a dailySlots/{date} y consulta de citas confirmadas
  const [dailySlotSnap, appointmentsSnap] = await Promise.all([
    db.collection('dailySlots').doc(date).get().catch(err => {
      console.warn('Error reading dailySlots in getAvailableSlots:', err.message);
      return { exists: false, data: () => ({}) };
    }),
    db.collection('appointments')
      .where('date', '==', date)
      .where('status', 'in', ['confirmed', 'completed'])
      .get()
      .catch(err => {
        console.warn('Error querying appointments in getAvailableSlots:', err.message);
        return { forEach: () => {} };
      })
  ]);

  const dailyCounts = (dailySlotSnap.exists && dailySlotSnap.data()?.counts) || {};

  const bookedSlots = {};
  appointmentsSnap.forEach(d => {
    const time = d.data().time;
    if (time) {
      bookedSlots[time] = (bookedSlots[time] || 0) + 1;
    }
  });

  // 5. Generar franjas horarias
  const openTime = schedule.hours?.start || '08:00';
  const closeTime = schedule.hours?.end || '20:00';
  const slotDuration = schedule.slotDurationMinutes || schedule.slotDuration || 30;

  let [currH, currM] = openTime.split(':').map(Number);
  const [endH, endM] = closeTime.split(':').map(Number);

  const allTimes = [];
  while (currH < endH || (currH === endH && currM < endM)) {
    const timeStr = `${String(currH).padStart(2, '0')}:${String(currM).padStart(2, '0')}`;
    allTimes.push(timeStr);
    currM += slotDuration;
    if (currM >= 60) {
      currH += Math.floor(currM / 60);
      currM = currM % 60;
    }
  }

  // 6. Filtrar franjas pasadas si la fecha es hoy en Colombia
  const colNow = getColombiaNow();
  let candidateTimes = allTimes;
  if (date === colNow.dateStr) {
    candidateTimes = allTimes.filter(t => {
      const [sH, sM] = t.split(':').map(Number);
      return sH > colNow.hour || (sH === colNow.hour && sM > colNow.minute);
    });
  }

  // 7. Filtrar por cupo disponible contrastando dailySlots con citas activas
  const availableSlots = candidateTimes.filter(timeStr => {
    const baseCount = bookedSlots[timeStr] || 0;
    const counterCount = dailyCounts[timeStr] || 0;
    const bookedCount = Math.max(baseCount, counterCount);
    return bookedCount < activeStylists;
  });

  return { date, slots: availableSlots, isClosed: false, reason: null };
}

/**
 * Evalúa los próximos 7 días a partir de hoy (hora Colombia) y retorna
 * hasta 7 opciones con cupo disponible en formato { date: 'YYYY-MM-DD', label: 'Vie 13 Nov' }.
 * Optimizado para leer config/schedule 1 sola vez y consultar los 7 días en paralelo.
 */
export async function getAvailableDates() {
  const colNow = getColombiaNow();
  const [year, month, day] = colNow.dateStr.split('-').map(Number);
  const baseDate = new Date(year, month - 1, day, 12, 0, 0);

  const daysNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthsNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  // Leer configuración de horario una sola vez fuera del bucle
  let schedule = DEFAULT_SCHEDULE;
  try {
    const scheduleDoc = await db.collection('config').doc('schedule').get();
    if (scheduleDoc.exists) {
      schedule = { ...DEFAULT_SCHEDULE, ...scheduleDoc.data() };
    }
  } catch (error) {
    console.warn('Error reading config/schedule in getAvailableDates:', error.message);
  }

  const dateChecks = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    const dStr = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yStr}-${mStr}-${dStr}`;

    const dayName = daysNames[d.getDay()];
    const dayNum = d.getDate();
    const monthName = monthsNames[d.getMonth()];
    const label = i === 0 ? `${dayName} ${dayNum} ${monthName} (Hoy)` : `${dayName} ${dayNum} ${monthName}`;

    dateChecks.push({
      dateStr,
      label,
      promise: getAvailableSlots(dateStr, schedule)
    });
  }

  const results = await Promise.all(dateChecks.map(item => item.promise));
  const availableDates = [];

  for (let i = 0; i < dateChecks.length; i++) {
    const availability = results[i];
    if (availability && availability.slots && availability.slots.length > 0) {
      availableDates.push({
        date: dateChecks[i].dateStr,
        label: dateChecks[i].label
      });
    }
  }

  return availableDates;
}

/**
 * Crea una cita de forma atómica previniendo condiciones de carrera con transacciones en Firestore.
 * Si source !== 'admin', limita a un máximo de 2 citas futuras confirmadas por teléfono.
 * Utiliza dailySlots/{YYYY-MM-DD} para el conteo seguro y consolidado por fecha.
 */
export async function createAppointment({ date, time, clientName, clientPhone, notes = '', source = 'whatsapp' }) {
  if (!date || !time || !clientName || !clientPhone) {
    throw new Error('Todos los campos son obligatorios (date, time, clientName, clientPhone).');
  }

  const cleanPhone = normalizeColombianPhone(clientPhone);
  const cleanName = String(clientName).trim();
  const cleanNotes = notes ? String(notes).trim() : '';
  const appointmentRef = db.collection('appointments').doc();
  const scheduleRef = db.collection('config').doc('schedule');
  const blockedRef = db.collection('blockedDates').doc(date);
  const dailySlotRef = db.collection('dailySlots').doc(date);

  const colNow = getColombiaNow();

  return await db.runTransaction(async (transaction) => {
    // 1. Si no es admin, validar límite de citas activas por teléfono (máx 2)
    if (source !== 'admin') {
      const activeSnap = await transaction.get(
        db.collection('appointments')
          .where('clientPhone', 'in', [cleanPhone, `57${cleanPhone}`])
          .where('status', '==', 'confirmed')
      );
      let activeFutureCount = 0;
      activeSnap.forEach(docSnap => {
        const d = docSnap.data();
        if (d.date >= colNow.dateStr) {
          activeFutureCount++;
        }
      });

      if (activeFutureCount >= MAX_ACTIVE_APPOINTMENTS_PER_PHONE) {
        throw new Error('MAX_APPOINTMENTS_REACHED');
      }
    }

    // 2. Obtener cupo de estilistas activos
    const scheduleSnap = await transaction.get(scheduleRef);
    let activeStylists = 1;
    if (scheduleSnap.exists) {
      const sched = scheduleSnap.data();
      activeStylists = (sched.stylists || []).filter(s => s.active !== false).length || 1;
    }

    // 3. Verificar día bloqueado
    const blockedSnap = await transaction.get(blockedRef);
    if (blockedSnap.exists) {
      throw new Error('SLOT_TAKEN');
    }

    // 4. Consultar citas confirmadas / completadas en ese slot
    const appointmentsSnap = await transaction.get(
      db.collection('appointments')
        .where('date', '==', date)
        .where('time', '==', time)
        .where('status', 'in', ['confirmed', 'completed'])
    );
    const queryCount = appointmentsSnap.size;

    // 5. Verificar contador en dailySlots/{date}
    const dailySlotSnap = await transaction.get(dailySlotRef);
    const dailyData = dailySlotSnap.exists ? dailySlotSnap.data() : { date, counts: {} };
    const currentCounts = { ...(dailyData.counts || {}) };
    const slotCount = currentCounts[time] || 0;

    const bookedCount = Math.max(slotCount, queryCount);
    if (bookedCount >= activeStylists) {
      throw new Error('SLOT_TAKEN');
    }

    // Incrementar contador de slot en dailySlots/{date}
    currentCounts[time] = bookedCount + 1;
    transaction.set(dailySlotRef, { date, counts: currentCounts }, { merge: true });

    // Guardar cita
    const appointmentData = {
      userId: null,
      date,
      time,
      clientName: cleanName,
      clientPhone: cleanPhone,
      notes: cleanNotes,
      status: 'confirmed',
      source,
      createdAt: new Date(),
      cancelledAt: null
    };

    transaction.set(appointmentRef, appointmentData);

    return {
      id: appointmentRef.id,
      ...appointmentData
    };
  });
}

/**
 * Busca citas futuras confirmadas pertenecientes al teléfono o userId dado.
 */
export async function lookupAppointmentsByPhone(clientPhone, userId = null) {
  const cleanPhone = normalizeColombianPhone(clientPhone);
  const nowCol = getColombiaNow();

  const results = [];
  const seenIds = new Set();

  if (cleanPhone) {
    const phoneVariants = Array.from(new Set([cleanPhone, `57${cleanPhone}`])).filter(Boolean);
    for (const phone of phoneVariants) {
      const snap = await db.collection('appointments')
        .where('clientPhone', '==', phone)
        .where('status', '==', 'confirmed')
        .get();

      snap.forEach(docSnap => {
        if (!seenIds.has(docSnap.id)) {
          seenIds.add(docSnap.id);
          const data = docSnap.data();
          if (data.date >= nowCol.dateStr) {
            results.push({ id: docSnap.id, ...data });
          }
        }
      });
    }
  }

  if (userId) {
    const snapUser = await db.collection('appointments')
      .where('userId', '==', userId)
      .where('status', '==', 'confirmed')
      .get();

    snapUser.forEach(docSnap => {
      if (!seenIds.has(docSnap.id)) {
        seenIds.add(docSnap.id);
        const data = docSnap.data();
        if (data.date >= nowCol.dateStr) {
          results.push({ id: docSnap.id, ...data });
        }
      }
    });
  }

  results.sort((a, b) => {
    if (a.date === b.date) return (a.time || '').localeCompare(b.time || '');
    return (a.date || '').localeCompare(b.date || '');
  });

  return results;
}

/**
 * Cancela una cita de forma atómica validando pertenencia del teléfono y liberando cupo del slot en dailySlots/{date}.
 */
export async function cancelAppointmentById({ id, clientPhone, isAdmin = false }) {
  if (!id) throw new Error('ID de cita requerido');
  const cleanPhone = normalizeColombianPhone(clientPhone);
  const appointmentRef = db.collection('appointments').doc(id);

  return await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(appointmentRef);
    if (!snap.exists) {
      throw new Error('NOT_FOUND');
    }

    const data = snap.data();
    if (!isAdmin) {
      const docPhone = normalizeColombianPhone(data.clientPhone);
      if (docPhone !== cleanPhone) {
        throw new Error('FORBIDDEN');
      }
    }

    if (data.status === 'cancelled') {
      return { success: true, alreadyCancelled: true, id };
    }

    // Decrementar contador en dailySlots/{date}
    if (data.date && data.time) {
      const dailySlotRef = db.collection('dailySlots').doc(data.date);
      const dailySnap = await transaction.get(dailySlotRef);
      if (dailySnap.exists) {
        const counts = { ...(dailySnap.data().counts || {}) };
        const currentCount = counts[data.time] || 0;
        counts[data.time] = Math.max(0, currentCount - 1);
        transaction.set(dailySlotRef, { date: data.date, counts }, { merge: true });
      }
    }

    transaction.update(appointmentRef, {
      status: 'cancelled',
      cancelledAt: new Date()
    });

    return { success: true, id, status: 'cancelled' };
  });
}
