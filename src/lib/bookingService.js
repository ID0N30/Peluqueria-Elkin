import { db, auth } from '../firebase.js';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  runTransaction, 
  doc, 
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

export const getAvailability = async (date) => {
  let schedule = DEFAULT_SCHEDULE;
  
  // 1. Query schedule safely
  try {
    const scheduleRef = doc(db, 'config', 'schedule');
    const scheduleSnap = await getDoc(scheduleRef);
    if (scheduleSnap.exists()) {
      schedule = { ...DEFAULT_SCHEDULE, ...scheduleSnap.data() };
    }
  } catch (error) {
    console.warn("No se pudo cargar config/schedule, usando por defecto.", error);
  }

  const dayOfWeekIndex = new Date(date + 'T12:00:00').getDay();
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayStr = dayNames[dayOfWeekIndex];

  if (schedule.workingDays && schedule.workingDays[dayStr] === false) {
    return { date, slots: [], isClosed: true, reason: 'Día no laborable (Cerrado)' };
  }

  // 2. Check blocked dates safely
  try {
    const blockedDateRef = doc(db, 'blockedDates', date);
    const blockedDateSnap = await getDoc(blockedDateRef);
    if (blockedDateSnap.exists()) {
      return { date, slots: [], isClosed: true, reason: blockedDateSnap.data().reason || 'Fecha bloqueada' };
    }
  } catch (error) {
    console.warn("No se pudo verificar blockedDates.", error);
  }

  const activeStylists = (schedule.stylists || []).filter(s => s.active !== false).length || 1;
  const slotDuration = schedule.slotDuration || 30;

  // 3. Get appointments safely
  const bookedSlots = {};
  try {
    const q = query(
      collection(db, 'appointments'),
      where('date', '==', date),
      where('status', 'in', ['confirmed', 'completed'])
    );
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(doc => {
      const time = doc.data().time;
      bookedSlots[time] = (bookedSlots[time] || 0) + 1;
    });
  } catch (error) {
    console.warn("No se pudieron cargar citas confirmadas/completadas, asumiendo disponibilidad total.", error);
  }

  // 4. Generate slots
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

  // Fetch slot counters to contrast safely
  const slotCounters = {};
  try {
    const promises = timesToGenerate.map(async (timeString) => {
      const slotRef = doc(db, 'slots', `${date}_${timeString}`);
      const slotSnap = await getDoc(slotRef);
      if (slotSnap.exists()) {
        slotCounters[timeString] = slotSnap.data().count || 0;
      }
    });
    await Promise.all(promises);
  } catch (error) {
    console.warn("No se pudieron cargar contadores de slots.", error);
  }

  for (const timeString of timesToGenerate) {
    const baseCount = bookedSlots[timeString] || 0;
    const counterCount = slotCounters[timeString] || 0;
    const bookedCount = Math.max(baseCount, counterCount);
    
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

export const createAppointment = async ({ date, time, clientName, clientPhone, notes, userId }) => {
  const appointmentRef = doc(collection(db, 'appointments'));
  const scheduleRef = doc(db, 'config', 'schedule');

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Get schedule config to know active stylists
      const scheduleDoc = await transaction.get(scheduleRef);
      let activeStylists = 1;
      if (scheduleDoc.exists()) {
        const schedule = scheduleDoc.data();
        activeStylists = (schedule.stylists || []).filter(s => s.active !== false).length || 1;
      }

      // 2. Count existing appointments for this slot
      const slotDocRef = doc(db, 'slots', `${date}_${time}`);
      const slotDoc = await transaction.get(slotDocRef);
      
      let bookedCount = 0;
      if (slotDoc.exists()) {
         bookedCount = slotDoc.data().count || 0;
      }

      if (bookedCount >= activeStylists) {
        throw new Error('SLOT_TAKEN');
      }

      // Update slot count
      transaction.set(slotDocRef, { count: bookedCount + 1 }, { merge: true });

      // Save the appointment
      const finalUserId = userId || auth.currentUser?.uid || null;
      const cleanPhone = clientPhone ? String(clientPhone).trim().replace(/\D/g, '') : '';
      transaction.set(appointmentRef, {
        userId: finalUserId,
        date,
        time,
        clientName,
        clientPhone: cleanPhone,
        notes: notes || '',
        status: 'confirmed',
        createdAt: serverTimestamp()
      });
    });
    
    return { success: true, id: appointmentRef.id, date, time, clientName, clientPhone };
  } catch (error) {
    if (error.message === 'SLOT_TAKEN') {
      throw new Error('El horario seleccionado ya no está disponible (Race Condition evitada).');
    }
    throw error;
  }
};

export const lookupAppointments = async (phone, uid) => {
  const results = [];
  
  const cleanPhone = phone ? String(phone).trim().replace(/\D/g, '') : null;
  
  if (cleanPhone && cleanPhone.length > 0) {
    const qPhone = query(
      collection(db, 'appointments'),
      where('clientPhone', '==', cleanPhone),
      where('status', '==', 'confirmed')
    );
    const snapPhone = await getDocs(qPhone);
    snapPhone.forEach(d => results.push({ id: d.id, ...d.data() }));
  }

  if (uid) {
    const qUid = query(
      collection(db, 'appointments'),
      where('userId', '==', uid),
      where('status', '==', 'confirmed')
    );
    const snapUid = await getDocs(qUid);
    snapUid.forEach(d => {
      // avoid duplicates
      if (!results.find(r => r.id === d.id)) {
        results.push({ id: d.id, ...d.data() });
      }
    });
  }

  results.sort((a, b) => {
    if (a.date === b.date) return a.time.localeCompare(b.time);
    return a.date.localeCompare(b.date);
  });

  return results;
};

export const cancelAppointment = async (appointmentId, clientPhone, userId, isAdmin = false) => {
  const ref = doc(db, 'appointments', appointmentId);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    throw new Error('Cita no encontrada');
  }

  const data = snap.data();
  if (!isAdmin && data.clientPhone !== clientPhone && data.userId !== userId) {
    throw new Error('No tienes permiso para cancelar esta cita');
  }

  // Also need to decrement the slot count
  const slotDocRef = doc(db, 'slots', `${data.date}_${data.time}`);
  
  await runTransaction(db, async (transaction) => {
    const slotDoc = await transaction.get(slotDocRef);
    if (slotDoc.exists() && slotDoc.data().count > 0) {
      transaction.set(slotDocRef, { count: slotDoc.data().count - 1 }, { merge: true });
    }
    
    transaction.update(ref, {
      status: 'cancelled',
      cancelledAt: serverTimestamp()
    });
  });

  return true;
};

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
