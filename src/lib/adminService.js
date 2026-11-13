import { db } from '../firebase.js';
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  limit,
  runTransaction,
  serverTimestamp,
  onSnapshot 
} from 'firebase/firestore';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { cancelAppointment, completeAppointment } from './bookingService.js';

const DEFAULT_SCHEDULE = {
  hours: { start: '08:00', end: '20:00' },
  workingDays: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false },
  stylists: [{ id: '1', name: 'Barbero Principal', active: true }],
  slotDuration: 30
};

export const updateSchedule = async (scheduleData) => {
  const ref = doc(db, 'config', 'schedule');
  await setDoc(ref, scheduleData, { merge: true });
};

export const getSchedule = (callback) => {
  const ref = doc(db, 'config', 'schedule');
  return onSnapshot(ref, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      const merged = {
        ...DEFAULT_SCHEDULE,
        ...data,
        hours: {
          start: data.hours?.start || DEFAULT_SCHEDULE.hours.start,
          end: data.hours?.end || DEFAULT_SCHEDULE.hours.end
        },
        workingDays: {
          ...DEFAULT_SCHEDULE.workingDays,
          ...(data.workingDays || {})
        }
      };
      callback(merged);
    } else {
      callback(DEFAULT_SCHEDULE);
    }
  });
};

export const toggleWorkingDay = async (dayKey, currentState) => {
  const ref = doc(db, 'config', 'schedule');
  const nextState = currentState === undefined ? true : !currentState;
  await setDoc(ref, {
    workingDays: {
      [dayKey]: nextState
    }
  }, { merge: true });
  return nextState;
};

export const updateScheduleHours = async (start, end) => {
  const cleanStart = (start && String(start).trim()) || '08:00';
  const cleanEnd = (end && String(end).trim()) || '20:00';
  const ref = doc(db, 'config', 'schedule');
  await setDoc(ref, {
    hours: {
      start: cleanStart,
      end: cleanEnd
    }
  }, { merge: true });
  return { start: cleanStart, end: cleanEnd };
};

export const getBlockedDates = (callback) => {
  const q = collection(db, 'blockedDates');
  return onSnapshot(q, (snapshot) => {
    const dates = [];
    snapshot.forEach((doc) => {
      dates.push({ id: doc.id, ...doc.data() });
    });
    callback(dates);
  });
};

export const updateStylists = async (stylistsList) => {
  const ref = doc(db, 'config', 'schedule');
  await setDoc(ref, { stylists: stylistsList }, { merge: true });
};

export const addBlockedDate = async (date, reason) => {
  const ref = doc(db, 'blockedDates', date);
  await setDoc(ref, { reason, date });
};

export const removeBlockedDate = async (date) => {
  const ref = doc(db, 'blockedDates', date);
  await deleteDoc(ref);
};

export const getAppointmentsByDate = (date, callback) => {
  const q = query(
    collection(db, 'appointments'),
    where('date', '==', date)
  );
  
  return onSnapshot(q, (snapshot) => {
    const appointments = [];
    snapshot.forEach((doc) => {
      appointments.push({ id: doc.id, ...doc.data() });
    });
    callback(appointments);
  });
};

export const cancelAppointmentAdmin = async (appointmentId) => {
  // Pass isAdmin = true to skip ownership validation
  await cancelAppointment(appointmentId, null, null, true);
};

export const completeAppointmentAdmin = async (appointmentId) => {
  return await completeAppointment(appointmentId, true);
};

/**
 * Agendamiento manual directo por parte del administrador.
 * Escribe directamente en Firestore como isSuperAdmin() y actualiza dailySlots/{date}.
 */
export const createAppointmentAdmin = async ({ date, time, clientName, clientPhone = '', notes = '' }) => {
  if (!date || !time || !clientName || !String(clientName).trim()) {
    throw new Error('La fecha, la hora y el nombre del cliente son obligatorios.');
  }

  const cleanName = String(clientName).trim();
  const cleanPhone = clientPhone ? String(clientPhone).trim().replace(/\D/g, '') : '';
  const cleanNotes = notes ? String(notes).trim() : '';

  const appointmentRef = doc(collection(db, 'appointments'));
  const dailySlotRef = doc(db, 'dailySlots', date);

  await runTransaction(db, async (transaction) => {
    const dailySnap = await transaction.get(dailySlotRef);
    const dailyData = dailySnap.exists() ? dailySnap.data() : { date, counts: {} };
    const counts = { ...(dailyData.counts || {}) };
    counts[time] = (counts[time] || 0) + 1;

    transaction.set(dailySlotRef, { date, counts }, { merge: true });

    transaction.set(appointmentRef, {
      userId: null,
      date,
      time,
      clientName: cleanName,
      clientPhone: cleanPhone,
      notes: cleanNotes,
      status: 'confirmed',
      source: 'admin',
      createdAt: serverTimestamp(),
      cancelledAt: null
    });
  });

  return { success: true, id: appointmentRef.id, date, time, clientName: cleanName, clientPhone: cleanPhone };
};

/**
 * Suscripción en tiempo real a todas las citas confirmadas a partir de una fecha base (por defecto hoy).
 * Diseñado para evitar el requerimiento de índices compuestos manuales en Firestore:
 * - Si fromDate === '2000-01-01' (modo 'all'), consulta por status == 'confirmed' con limit(200).
 * - En cualquier otro caso, consulta por date >= minDate y filtra status en memoria.
 */
export const subscribeAllConfirmedAppointments = (callback, { fromDate = null } = {}) => {
  let q;
  const isHistoricAll = fromDate === '2000-01-01';

  if (isHistoricAll) {
    q = query(
      collection(db, 'appointments'),
      where('status', '==', 'confirmed'),
      limit(200)
    );
  } else {
    const minDate = fromDate || format(new Date(), 'yyyy-MM-dd');
    q = query(
      collection(db, 'appointments'),
      where('date', '>=', minDate)
    );
  }

  return onSnapshot(q, (snapshot) => {
    const appointments = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (isHistoricAll || data.status === 'confirmed') {
        appointments.push({ id: docSnap.id, ...data });
      }
    });

    appointments.sort((a, b) => {
      const dateComp = (a.date || '').localeCompare(b.date || '');
      if (dateComp !== 0) return dateComp;
      return (a.time || '').localeCompare(b.time || '');
    });

    callback(appointments);
  });
};

/**
 * Suscripción con filtro de rango de fechas a métricas de citas.
 * Aplica where('date', '>=', startStr) y where('date', '<=', endStr) directamente en Firestore,
 * evitando descargar miles de citas históricas y aplicando limit(200) cuando dateRange === 'all'.
 */
export const subscribeAppointmentsMetrics = (arg1, arg2) => {
  let dateRange = 'month';
  let callback;

  if (typeof arg1 === 'function') {
    callback = arg1;
    dateRange = 'month';
  } else {
    dateRange = arg1 || 'month';
    callback = arg2;
  }

  let q;
  const now = new Date();

  if (dateRange === 'all') {
    q = query(collection(db, 'appointments'), limit(200));
  } else {
    let startStr, endStr;
    if (typeof dateRange === 'object' && dateRange !== null && dateRange.start && dateRange.end) {
      startStr = dateRange.start;
      endStr = dateRange.end;
    } else if (dateRange === 'today') {
      startStr = format(now, 'yyyy-MM-dd');
      endStr = startStr;
    } else if (dateRange === 'week') {
      startStr = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      endStr = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    } else {
      // Default: 'month'
      startStr = format(startOfMonth(now), 'yyyy-MM-dd');
      endStr = format(endOfMonth(now), 'yyyy-MM-dd');
    }

    q = query(
      collection(db, 'appointments'),
      where('date', '>=', startStr),
      where('date', '<=', endStr)
    );
  }

  return onSnapshot(q, (snapshot) => {
    let totalCompleted = 0;
    let totalCancelled = 0;
    let totalConfirmed = 0;
    const history = [];

    snapshot.forEach((docSnap) => {
      const data = { id: docSnap.id, ...docSnap.data() };
      history.push(data);
      if (data.status === 'completed') totalCompleted++;
      else if (data.status === 'cancelled') totalCancelled++;
      else if (data.status === 'confirmed') totalConfirmed++;
    });

    // Ordenar historial cronológicamente descendente
    history.sort((a, b) => {
      const dateComp = (b.date || '').localeCompare(a.date || '');
      if (dateComp !== 0) return dateComp;
      return (b.time || '').localeCompare(a.time || '');
    });

    callback({
      totalCompleted,
      totalCancelled,
      totalConfirmed,
      totalAll: history.length,
      history
    });
  });
};
