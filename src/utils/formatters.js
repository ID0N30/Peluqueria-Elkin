export function formatTo12Hour(timeStr) {
  if (!timeStr) return '';
  const [hourStr, minuteStr] = timeStr.split(':');
  if (!hourStr || !minuteStr) return timeStr;
  
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  
  hour = hour % 12;
  hour = hour ? hour : 12; // the hour '0' should be '12'
  
  return `${hour}:${minuteStr} ${ampm}`;
}
