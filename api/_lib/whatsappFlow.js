import { db } from './firebaseAdmin.js';
import {
  normalizeColombianPhone,
  getAvailableDates,
  getAvailableSlots,
  createAppointment,
  lookupAppointmentsByPhone,
  cancelAppointmentById,
  formatTo12Hour
} from './bookingService.js';
import {
  sendTextMessage,
  sendInteractiveButtons,
  sendInteractiveList
} from './whatsappClient.js';

const GLOBAL_COMMANDS = ['hola', 'menu', 'menú', 'inicio', 'salir', 'reiniciar'];

/**
 * Obtiene la sesión actual del usuario desde Firestore.
 */
async function getSession(cleanPhone) {
  try {
    const snap = await db.collection('whatsappSessions').doc(cleanPhone).get();
    if (snap.exists) {
      return snap.data();
    }
  } catch (error) {
    console.warn(`Error al obtener sesión para ${cleanPhone}:`, error.message);
  }

  return {
    phone: cleanPhone,
    state: 'IDLE',
    selectedDate: null,
    selectedPeriod: null,
    selectedTime: null,
    clientName: null
  };
}

/**
 * Guarda o actualiza la sesión en Firestore.
 */
async function saveSession(cleanPhone, data) {
  try {
    await db.collection('whatsappSessions').doc(cleanPhone).set({
      ...data,
      phone: cleanPhone,
      updatedAt: new Date()
    }, { merge: true });
  } catch (error) {
    console.error(`Error al guardar sesión para ${cleanPhone}:`, error);
  }
}

/**
 * Muestra el menú principal con botones interactivos.
 */
async function showMainMenu(from, clientName) {
  const greeting = clientName
    ? `¡Hola, *${clientName}*! Bienvenido a *Peluquería Elkin* 💈✂️\n\n¿En qué te podemos colaborar hoy?`
    : `¡Hola! Bienvenido a *Peluquería Elkin* 💈✂️\n\n¿En qué te podemos colaborar hoy?`;

  await sendInteractiveButtons(from, greeting, [
    { id: 'ACTION_BOOK', title: '📅 Agendar Cita' },
    { id: 'ACTION_MY_APPOINTMENTS', title: '📋 Mis Citas' }
  ]);
}

/**
 * Presenta la lista interactiva con los próximos días con disponibilidad.
 */
async function showAvailableDates(from, cleanPhone) {
  const availableDates = await getAvailableDates();

  if (!availableDates || availableDates.length === 0) {
    await sendTextMessage(from, 'Lo sentimos, en este momento no hay turnos disponibles para los próximos 7 días. Por favor intenta más tarde.');
    await saveSession(cleanPhone, { state: 'IDLE' });
    return;
  }

  const rows = availableDates.map(d => ({
    id: `DATE_${d.date}`,
    title: d.label,
    description: 'Ver horarios libres'
  }));

  await sendInteractiveList(
    from,
    'Selecciona el día en el que deseas tu cita:',
    'Elegir Día',
    [{ title: 'Días Disponibles', rows }]
  );

  await saveSession(cleanPhone, { state: 'SELECT_DATE' });
}

/**
 * Presenta las franjas horarias o los períodos si hay más de 10 franjas.
 */
async function showSlotsOrPeriods(from, cleanPhone, selectedDate, slots) {
  if (!slots || slots.length === 0) {
    await sendTextMessage(from, `Para el día *${selectedDate}* no hay horarios disponibles. Por favor selecciona otra fecha.`);
    await showAvailableDates(from, cleanPhone);
    return;
  }

  // Si son 10 o menos, mostramos directamente la lista de horarios
  if (slots.length <= 10) {
    const rows = slots.map(t => ({
      id: `TIME_${t}`,
      title: formatTo12Hour(t),
      description: 'Turno disponible'
    }));

    await sendInteractiveList(
      from,
      `Horarios disponibles para el día *${selectedDate}*:`,
      'Elegir Hora',
      [{ title: 'Horarios', rows }]
    );

    await saveSession(cleanPhone, {
      state: 'SELECT_TIME',
      selectedDate,
      selectedPeriod: null
    });
    return;
  }

  // Si son más de 10, dividimos en períodos (Mañana, Tarde, Noche)
  const morningSlots = slots.filter(t => parseInt(t.split(':')[0], 10) < 12);
  const afternoonSlots = slots.filter(t => {
    const h = parseInt(t.split(':')[0], 10);
    return h >= 12 && h < 17;
  });
  const nightSlots = slots.filter(t => parseInt(t.split(':')[0], 10) >= 17);

  const buttons = [];
  if (morningSlots.length > 0) {
    buttons.push({ id: 'PERIOD_MORNING', title: `🌅 Mañana (${morningSlots.length})` });
  }
  if (afternoonSlots.length > 0) {
    buttons.push({ id: 'PERIOD_AFTERNOON', title: `☀️ Tarde (${afternoonSlots.length})` });
  }
  if (nightSlots.length > 0) {
    buttons.push({ id: 'PERIOD_NIGHT', title: `🌙 Noche (${nightSlots.length})` });
  }

  await sendInteractiveButtons(
    from,
    `Hay *${slots.length} turnos disponibles* para el *${selectedDate}*.\n\nSelecciona la jornada de tu preferencia:`,
    buttons
  );

  await saveSession(cleanPhone, {
    state: 'SELECT_PERIOD',
    selectedDate
  });
}

/**
 * Presenta el resumen para confirmar la reserva.
 */
async function showBookingConfirmation(from, cleanPhone, session) {
  const summary =
    `💈 *Resumen de tu Cita:*\n\n` +
    `📅 *Fecha:* ${session.selectedDate}\n` +
    `⏰ *Hora:* ${formatTo12Hour(session.selectedTime)}\n` +
    `👤 *Cliente:* ${session.clientName}\n` +
    `📱 *Teléfono:* ${cleanPhone}\n\n` +
    `¿Deseas confirmar tu cita?`;

  await sendInteractiveButtons(from, summary, [
    { id: 'CONFIRM_YES', title: '✅ Confirmar' },
    { id: 'CONFIRM_CHANGE_TIME', title: '🔄 Cambiar Hora' },
    { id: 'CONFIRM_CANCEL', title: '❌ Cancelar' }
  ]);

  await saveSession(cleanPhone, { state: 'CONFIRM_BOOKING' });
}

/**
 * Controlador principal de la máquina de estados de WhatsApp.
 */
export async function handleIncomingMessage(from, message) {
  const cleanPhone = normalizeColombianPhone(from);
  if (!cleanPhone) {
    console.error('Número de remitente inválido:', from);
    return;
  }

  const rawText = message.text?.body?.trim() || '';
  const buttonId = message.interactive?.button_reply?.id?.trim() || '';
  const listId = message.interactive?.list_reply?.id?.trim() || '';
  const input = buttonId || listId || rawText;

  let session = await getSession(cleanPhone);

  // 1. Detección de comandos globales de reinicio
  const normalizedText = rawText.toLowerCase().trim();
  if (GLOBAL_COMMANDS.includes(normalizedText)) {
    session = {
      ...session,
      state: 'IDLE',
      selectedDate: null,
      selectedPeriod: null,
      selectedTime: null
    };
    await saveSession(cleanPhone, session);
    await showMainMenu(from, session.clientName);
    return;
  }

  // 2. Máquina de estados
  switch (session.state) {
    case 'IDLE': {
      if (input === 'ACTION_BOOK') {
        await showAvailableDates(from, cleanPhone);
      } else if (input === 'ACTION_MY_APPOINTMENTS') {
        const appointments = await lookupAppointmentsByPhone(cleanPhone);
        if (!appointments || appointments.length === 0) {
          await sendTextMessage(from, '📋 No tienes citas activas agendadas en este momento.');
          await sendInteractiveButtons(from, '¿Deseas agendar una cita ahora?', [
            { id: 'ACTION_BOOK', title: '📅 Agendar Cita' }
          ]);
        } else {
          const rows = appointments.slice(0, 10).map(app => ({
            id: `CANCEL_${app.id}`,
            title: `${app.date} - ${formatTo12Hour(app.time)}`,
            description: `Cancelar cita de ${app.clientName}`
          }));

          await sendInteractiveList(
            from,
            'Estas son tus citas programadas. Si deseas cancelar alguna, selecciónala a continuación:',
            'Ver Citas',
            [{ title: 'Tus Citas', rows }]
          );

          await saveSession(cleanPhone, { state: 'SELECT_CANCEL' });
        }
      } else {
        await showMainMenu(from, session.clientName);
      }
      break;
    }

    case 'SELECT_DATE': {
      let selectedDate = null;
      if (input.startsWith('DATE_')) {
        selectedDate = input.replace('DATE_', '').trim();
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        selectedDate = input.trim();
      }

      if (!selectedDate) {
        await sendTextMessage(from, 'Por favor selecciona un día de la lista interactiva.');
        await showAvailableDates(from, cleanPhone);
        return;
      }

      const { slots, isClosed, reason } = await getAvailableSlots(selectedDate);
      if (isClosed || !slots || slots.length === 0) {
        await sendTextMessage(from, `Para el día *${selectedDate}* no hay turnos disponibles (${reason || 'Cerrado/Agotado'}). Por favor selecciona otra fecha.`);
        await showAvailableDates(from, cleanPhone);
        return;
      }

      await showSlotsOrPeriods(from, cleanPhone, selectedDate, slots);
      break;
    }

    case 'SELECT_PERIOD': {
      if (!['PERIOD_MORNING', 'PERIOD_AFTERNOON', 'PERIOD_NIGHT'].includes(input)) {
        // Si seleccionó fecha u otra cosa, revalidar
        if (input.startsWith('DATE_')) {
          const newDate = input.replace('DATE_', '').trim();
          const { slots } = await getAvailableSlots(newDate);
          await showSlotsOrPeriods(from, cleanPhone, newDate, slots);
          return;
        }
        await sendTextMessage(from, 'Por favor elige una jornada presionando uno de los botones.');
        return;
      }

      const date = session.selectedDate;
      const { slots } = await getAvailableSlots(date);

      let filteredSlots = [];
      if (input === 'PERIOD_MORNING') {
        filteredSlots = slots.filter(t => parseInt(t.split(':')[0], 10) < 12);
      } else if (input === 'PERIOD_AFTERNOON') {
        filteredSlots = slots.filter(t => {
          const h = parseInt(t.split(':')[0], 10);
          return h >= 12 && h < 17;
        });
      } else if (input === 'PERIOD_NIGHT') {
        filteredSlots = slots.filter(t => parseInt(t.split(':')[0], 10) >= 17);
      }

      // Máximo 10 filas según restricciones de Meta
      const finalSlots = filteredSlots.slice(0, 10);

      if (finalSlots.length === 0) {
        await sendTextMessage(from, 'Ya no quedan turnos disponibles en esa jornada. Por favor elige otra:');
        await showSlotsOrPeriods(from, cleanPhone, date, slots);
        return;
      }

      const rows = finalSlots.map(t => ({
        id: `TIME_${t}`,
        title: formatTo12Hour(t),
        description: 'Turno libre'
      }));

      await sendInteractiveList(
        from,
        `Selecciona una hora para el *${date}*:`,
        'Elegir Hora',
        [{ title: 'Horas Disponibles', rows }]
      );

      await saveSession(cleanPhone, {
        state: 'SELECT_TIME',
        selectedPeriod: input
      });
      break;
    }

    case 'SELECT_TIME': {
      let selectedTime = null;
      if (input.startsWith('TIME_')) {
        selectedTime = input.replace('TIME_', '').trim();
      } else if (/^([01]\d|2[0-3]):[0-5]\d$/.test(input)) {
        selectedTime = input.trim();
      }

      if (!selectedTime) {
        await sendTextMessage(from, 'Por favor selecciona un horario válido de la lista.');
        const { slots } = await getAvailableSlots(session.selectedDate);
        await showSlotsOrPeriods(from, cleanPhone, session.selectedDate, slots);
        return;
      }

      session.selectedTime = selectedTime;

      // Buscar si ya tenemos el nombre del cliente en sesión o en citas previas
      let clientName = session.clientName;
      if (!clientName) {
        try {
          const pastSnap = await db.collection('appointments')
            .where('clientPhone', '==', cleanPhone)
            .limit(1)
            .get();
          if (!pastSnap.empty) {
            clientName = pastSnap.docs[0].data().clientName || null;
          }
        } catch (err) {
          console.warn('Error buscando nombre previo del cliente:', err.message);
        }
      }

      if (clientName && clientName.trim().length >= 2) {
        session.clientName = clientName.trim();
        await saveSession(cleanPhone, session);
        await showBookingConfirmation(from, cleanPhone, session);
      } else {
        await saveSession(cleanPhone, {
          state: 'AWAITING_NAME',
          selectedDate: session.selectedDate,
          selectedTime
        });
        await sendTextMessage(from, 'Por favor escribe tu *Nombre y Apellido* para registrar tu cita:');
      }
      break;
    }

    case 'AWAITING_NAME': {
      const name = rawText.trim();
      if (name.length < 2) {
        await sendTextMessage(from, 'El nombre debe tener al menos 2 caracteres. Por favor escribe tu *Nombre y Apellido*:');
        return;
      }

      session.clientName = name;
      await saveSession(cleanPhone, { clientName: name });
      await showBookingConfirmation(from, cleanPhone, session);
      break;
    }

    case 'CONFIRM_BOOKING': {
      if (input === 'CONFIRM_YES') {
        try {
          await createAppointment({
            date: session.selectedDate,
            time: session.selectedTime,
            clientName: session.clientName,
            clientPhone: cleanPhone,
            source: 'whatsapp'
          });

          const successMsg =
            `🎉 *¡Cita Confirmada con Éxito!*\n\n` +
            `💈 *Peluquería Elkin*\n` +
            `📅 *Fecha:* ${session.selectedDate}\n` +
            `⏰ *Hora:* ${formatTo12Hour(session.selectedTime)}\n` +
            `👤 *Cliente:* ${session.clientName}\n\n` +
            `¡Te esperamos puntual! Si deseas consultar o cancelar tu cita en el futuro, solo escribe *menú*.`;

          await sendTextMessage(from, successMsg);

          await saveSession(cleanPhone, {
            state: 'IDLE',
            selectedDate: null,
            selectedPeriod: null,
            selectedTime: null
          });
        } catch (error) {
          if (error.message === 'SLOT_TAKEN') {
            await sendTextMessage(from, '⚠️ Lo sentimos, el horario que seleccionaste acaba de ser reservado por otro cliente. Por favor elige otro turno:');
            const { slots } = await getAvailableSlots(session.selectedDate);
            await showSlotsOrPeriods(from, cleanPhone, session.selectedDate, slots);
          } else {
            console.error('Error al agendar cita por WhatsApp:', error);
            await sendTextMessage(from, 'Ocurrió un error al confirmar tu cita. Por favor intenta nuevamente escribiendo *menú*.');
            await saveSession(cleanPhone, { state: 'IDLE' });
          }
        }
      } else if (input === 'CONFIRM_CHANGE_TIME') {
        const { slots } = await getAvailableSlots(session.selectedDate);
        await showSlotsOrPeriods(from, cleanPhone, session.selectedDate, slots);
      } else if (input === 'CONFIRM_CANCEL') {
        await sendTextMessage(from, 'Operación cancelada. Cuando gustes volver a agendar, solo escribe *menú*.');
        await saveSession(cleanPhone, {
          state: 'IDLE',
          selectedDate: null,
          selectedPeriod: null,
          selectedTime: null
        });
      } else {
        await showBookingConfirmation(from, cleanPhone, session);
      }
      break;
    }

    case 'SELECT_CANCEL': {
      if (input.startsWith('CANCEL_')) {
        const appointmentId = input.replace('CANCEL_', '').trim();
        try {
          await cancelAppointmentById({ id: appointmentId, clientPhone: cleanPhone });
          await sendTextMessage(from, '✅ Tu cita ha sido cancelada exitosamente y el horario ha quedado liberado.');
        } catch (err) {
          console.warn('Error cancelando cita desde WhatsApp:', err.message);
          await sendTextMessage(from, 'No fue posible cancelar la cita. Es posible que ya estuviera cancelada o no coincida con este número.');
        }
      }

      await saveSession(cleanPhone, {
        state: 'IDLE',
        selectedDate: null,
        selectedPeriod: null,
        selectedTime: null
      });

      await showMainMenu(from, session.clientName);
      break;
    }

    default: {
      await saveSession(cleanPhone, { state: 'IDLE' });
      await showMainMenu(from, session.clientName);
      break;
    }
  }
}
