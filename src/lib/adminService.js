import { db } from '../firebase.js';
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { cancelAppointment, completeAppointment, createAppointment } from './bookingService.js';

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

export const createAppointmentAdmin = async ({ date, time, clientName, clientPhone = '', notes = '' }) => {
  if (!date || !time || !clientName || !String(clientName).trim()) {
    throw new Error('La fecha, la hora y el nombre del cliente son obligatorios.');
  }
  return await createAppointment({
    date,
    time,
    clientName: String(clientName).trim(),
    clientPhone: clientPhone ? String(clientPhone).trim() : '',
    notes: notes ? String(notes).trim() : '',
    userId: null,
    isAdminManual: true
  });
};

export const subscribeAppointmentsMetrics = (callback) => {
  const q = collection(db, 'appointments');
  return onSnapshot(q, (snapshot) => {
    let totalCompleted = 0;
    let totalCancelled = 0;
    let totalConfirmed = 0;
    const history = [];

    snapshot.forEach(docSnap => {
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
