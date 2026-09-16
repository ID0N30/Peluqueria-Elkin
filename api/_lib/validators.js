import { parseISO, isBefore, startOfDay, addDays, isValid, format } from 'date-fns';

export function validateName(name) {
  return typeof name === 'string' && name.trim().length >= 2;
}

export function validatePhone(phone) {
  return typeof phone === 'string' && /^\d{10}$/.test(phone);
}

export function validateDateWindow(dateStr) {
  const date = parseISO(dateStr);
  if (!isValid(date)) return false;

  const today = startOfDay(new Date());
  // Ventana de 7 días (0 a 7 días en el futuro)
  const maxDate = addDays(today, 7);
  
  return !isBefore(date, today) && isBefore(date, maxDate);
}

export function validateTimeFormat(timeStr) {
  return typeof timeStr === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr);
}
