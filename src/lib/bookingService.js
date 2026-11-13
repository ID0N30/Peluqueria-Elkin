import { db, getAppCheckToken } from '../firebase.js';
import { 
  doc, 
  getDoc,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { format, parse, isAfter } from 'date-fns';

const DEFAULT_SCHEDULE = {
  hours: { start: '08:00', end: '20:00' },
  workingDays: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false },
  stylists: [{ id: '1', name: 'Barbero Principal', active: true }],
  slotDuration: 30
};

// Caché en memoria de 60 segundos para config/schedule para reducir drásticamente lecturas Firestore
let cachedSchedule = null;
let scheduleCacheExpiry = 0;

export const getCachedSchedule = async () => {
  const now = Date.now();
  if (cachedSchedule && now < scheduleCacheExpiry) {
    return cachedSchedule;
  }

  try {
    const scheduleRef = doc(db, 'config', 'schedule');
    const scheduleSnap = await getDoc(scheduleRef);
    if (scheduleSnap.exists()) {
      cachedSchedule = { ...DEFAULT_SCHEDULE, ...scheduleSnap.data() };
    } else {
      cachedSchedule = DEFAULT_SCHEDULE;
    }
  } catch (error) {
    console.warn("No se pudo cargar config/schedule, usando por defecto.", error);
    cachedSchedule = cachedSchedule || DEFAULT_SCHEDULE;
  }

  scheduleCacheExpiry = now + 60000; // 60 segundos
  return cachedSchedule;
};

/**
 * Genera los headers HTTP para peticiones hacia /api/appointments/*
 * adjuntando el token de Firebase App Check si está disponible.
 */
const buildApiHeaders = async () => {
  const headers = {
    'Content-Type': 'application/json'
  };
  try {
    const token = await getAppCheckToken();
    if (token) {
      headers['X-Firebase-AppCheck'] = token;
    }
  } catch (err) {
    console.warn('Error adjuntando App Check token:', err.message);
  }
  return headers;
};

/**
 * Consulta la disponibilidad para una fecha específica.
 * Permite recibir preloadedCounts para evitar lecturas duplicadas cuando el componente
 * ya tiene una suscripción o lectura previa sobre dailySlots/{date}.
 */
export const getAvailability = async (date, preloadedCounts = null) => {
  const schedule = await getCachedSchedule();

  // 1. Validar día laborable
  const dayOfWeekIndex = new Date(date + 'T12:00:00').getDay();
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayStr = dayNames[dayOfWeekIndex];

  if (schedule.workingDays && schedule.workingDays[dayStr] === false) {
    return { date, slots: [], allSlots: [], isClosed: true, reason: 'Día no laborable (Cerrado)' };
  }

  // 2. Validar fecha bloqueada
  try {
    const blockedDateRef = doc(db, 'blockedDates', date);
    const blockedDateSnap = await getDoc(blockedDateRef);
    if (blockedDateSnap.exists()) {
      const reason = blockedDateSnap.data().reason || 'Fecha bloqueada';
      return { date, slots: [], allSlots: [], isClosed: true, reason };
    }
  } catch (error) {
    console.warn("No se pudo verificar blockedDates.", error);
  }

  const activeStylists = (schedule.stylists || []).filter(s => s.active !== false).length || 1;
  const slotDuration = schedule.slotDuration || 30;

  // 3. Obtención del contador diario consolidado (utiliza preloadedCounts si se provee, evitando lectura a Firestore)
  let dailyCounts = {};
  if (preloadedCounts !== null) {
    dailyCounts = preloadedCounts;
  } else {
    try {
      const dailySlotRef = doc(db, 'dailySlots', date);
      const dailySnap = await getDoc(dailySlotRef);
      if (dailySnap.exists()) {
        dailyCounts = dailySnap.data().counts || {};
      }
    } catch (error) {
      console.warn("No se pudo cargar dailySlots, asumiendo cupos limpios.", error);
    }
  }

  // 4. Generar franjas horarias
  const slots = [];
  const allSlots = [];
  const openTime = schedule.hours && schedule.hours.start ? schedule.hours.start : '08:00';
  const closeTime = schedule.hours && schedule.hours.end ? schedule.hours.end : '20:00';
  let currentTime = parse(openTime, 'HH:mm', new Date());
  const endTime = parse(closeTime, 'HH:mm', new Date());
  const now = new Date();
  const isToday = date === format(now, 'yyyy-MM-dd');

  const timesToGenerate = [];
  while (currentTime < endTime) {
    timesToGenerate.push(format(currentTime, 'HH:mm'));
    currentTime = new Date(currentTime.getTime() + slotDuration * 60000);
  }

  for (const timeString of timesToGenerate) {
    const bookedCount = dailyCounts[timeString] || 0;
    const isBooked = bookedCount >= activeStylists;

    let isPast = false;
    if (isToday) {
      const slotTime = parse(timeString, 'HH:mm', new Date());
      if (!isAfter(slotTime, now)) {
        isPast = true;
      }
    }

    const isAvailable = !isBooked && !isPast;

    allSlots.push({
      time: timeString,
      isAvailable,
      isBooked,
      isPast,
      bookedCount,
      capacity: activeStylists
    });

    if (isAvailable) {
      slots.push(timeString);
    }
  }

  return { date, slots, allSlots, isClosed: false };
};

/**
 * Agendamiento público de citas.
 * Redirige la petición a través del endpoint seguro /api/appointments,
 * validando Firebase App Check y ejecutando la transacción atómica con Firebase Admin SDK.
 */
export const createAppointment = async ({ date, time, clientName, clientPhone, notes = '' }) => {
  const cleanPhone = clientPhone ? String(clientPhone).trim().replace(/\D/g, '') : '';
  const cleanName = clientName ? String(clientName).trim() : '';
  const headers = await buildApiHeaders();

  const response = await fetch('/api/appointments', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      date,
      time,
      clientName: cleanName,
      clientPhone: cleanPhone,
      notes
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data.error?.message || 'Error al agendar la cita. Por favor intenta de nuevo.';
    throw new Error(message);
  }

  return { success: true, ...data };
};

/**
 * Consulta pública de citas.
 * Consume /api/appointments/lookup con validación opcional de App Check y seguridad en servidor.
 */
export const lookupAppointments = async (phone, uid = null) => {
  const cleanPhone = phone ? String(phone).trim().replace(/\D/g, '') : '';
  const headers = await buildApiHeaders();

  try {
    const response = await fetch('/api/appointments/lookup', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        clientPhone: cleanPhone,
        userId: uid || null
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const message = data.error?.message || 'Error al consultar las citas.';
      throw new Error(message);
    }

    return data.appointments || [];
  } catch (error) {
    console.error('Error in lookupAppointments:', error);
    throw error;
  }
};

/**
 * Cancelación de citas.
 * Si es admin, actualiza directamente con privilegios de superadmin;
 * si es usuario público, canaliza a través de /api/appointments/cancel.
 */
export const cancelAppointment = async (appointmentId, clientPhone, userId = null, isAdmin = false) => {
  if (isAdmin) {
    const ref = doc(db, 'appointments', appointmentId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('Cita no encontrada');
    }

    const data = snap.data();
    if (data.date && data.time) {
      const dailySlotRef = doc(db, 'dailySlots', data.date);
      try {
        const slotSnap = await getDoc(dailySlotRef);
        if (slotSnap.exists()) {
          const counts = slotSnap.data().counts || {};
          const updated = Math.max(0, (counts[data.time] || 0) - 1);
          await updateDoc(dailySlotRef, { [`counts.${data.time}`]: updated });
        }
      } catch (err) {
        console.warn('Error decrementing dailySlots on admin cancel:', err.message);
      }
    }

    await updateDoc(ref, {
      status: 'cancelled',
      cancelledAt: serverTimestamp()
    });

    return true;
  }

  // Cancelación pública vía backend API
  const cleanPhone = clientPhone ? String(clientPhone).trim().replace(/\D/g, '') : '';
  const headers = await buildApiHeaders();

  const response = await fetch('/api/appointments/cancel', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: appointmentId,
      clientPhone: cleanPhone
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data.error?.message || 'Error al cancelar la cita.';
    throw new Error(message);
  }

  return true;
};

/**
 * Marca una cita como completada (usado desde panel de administración).
 */
export const completeAppointment = async (appointmentId, isAdmin = false) => {
  const ref = doc(db, 'appointments', appointmentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Cita no encontrada');
  }

  await updateDoc(ref, {
    status: 'completed',
    completedAt: serverTimestamp()
  });

  return { success: true, id: appointmentId, status: 'completed' };
};
