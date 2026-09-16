import { useState, useEffect } from 'react';
import { getSchedule, toggleWorkingDay, updateScheduleHours } from '../lib/adminService';
import { formatTo12Hour } from '../utils/formatters';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';

const DAYS_MAP = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
  sun: 'Domingo'
};

export default function ScheduleEditor() {
  const [schedule, setSchedule] = useState(null);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('20:00');
  const [savingHours, setSavingHours] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => {
    const unsubscribe = getSchedule((data) => {
      setSchedule(data);
      if (data?.hours) {
        setStartTime(data.hours.start || '08:00');
        setEndTime(data.hours.end || '20:00');
      }
    });
    return () => unsubscribe();
  }, []);

  if (!schedule) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-[#18181B] border border-zinc-100 dark:border-zinc-800 rounded-3xl shadow-sm">
        <div className="w-8 h-8 border-4 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-white rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">Cargando horario...</p>
      </div>
    );
  }

  const handleDayToggle = async (dayKey) => {
    try {
      await toggleWorkingDay(dayKey, schedule?.workingDays?.[dayKey]);
    } catch (err) {
      console.error('Error toggling day:', err);
    }
  };

  const handleSaveHours = async () => {
    if (startTime >= endTime) {
      setSaveMessage({ type: 'error', text: 'La hora de apertura debe ser anterior a la de cierre' });
      return;
    }
    
    setSavingHours(true);
    setSaveMessage(null);
    try {
      await updateScheduleHours(startTime, endTime);
      setSaveMessage({ 
        type: 'success', 
        text: `✓ Horario guardado: ${formatTo12Hour(startTime)} a ${formatTo12Hour(endTime)}` 
      });
      setTimeout(() => setSaveMessage(null), 3500);
    } catch (error) {
      console.error('Error updating hours:', error);
      setSaveMessage({ type: 'error', text: 'Error al guardar el horario' });
    } finally {
      setSavingHours(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#18181B] border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Horario de Atención</h3>
      </div>

      <div className="mb-8">
        <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-4">
          Días Laborables
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(DAYS_MAP).map(([key, label]) => {
            const isWorking = schedule?.workingDays?.[key] || false;
            return (
              <button
                key={key}
                onClick={() => handleDayToggle(key)}
                className={`relative p-3 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border-2 ${
                  isWorking
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:bg-zinc-700 dark:text-zinc-100 dark:border-zinc-600 shadow-md shadow-black/10'
                    : 'border-zinc-100 bg-white text-zinc-500 hover:border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-500 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:hover:border-zinc-700'
                }`}
              >
                {isWorking ? (
                  <CheckCircle2 className="w-5 h-5 text-white" />
                ) : (
                  <XCircle className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                )}
                <span className={`text-xs font-bold uppercase tracking-wide ${isWorking ? 'text-white' : 'text-zinc-600 dark:text-zinc-500'}`}>
                  {label.substring(0, 3)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-zinc-50 dark:bg-[#121215] p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800/80">
        <div className="grid sm:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-3">
              Hora de Apertura
            </label>
            <input
              type="time"
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 focus:border-zinc-900 dark:focus:border-zinc-500 outline-none transition-all font-medium text-zinc-900 dark:text-zinc-100"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-3">
              Hora de Cierre
            </label>
            <input
              type="time"
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 focus:border-zinc-900 dark:focus:border-zinc-500 outline-none transition-all font-medium text-zinc-900 dark:text-zinc-100"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Jornada configurada: [ <span className="text-zinc-900 dark:text-zinc-200">{formatTo12Hour(startTime)}</span> — <span className="text-zinc-900 dark:text-zinc-200">{formatTo12Hour(endTime)}</span> ]
          </div>
          <button
            onClick={handleSaveHours}
            disabled={savingHours}
            className="w-full sm:w-auto px-6 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingHours ? 'Guardando...' : 'Guardar Horario de Atención'}
          </button>
        </div>

        {saveMessage && (
          <div className={`mt-4 p-3 rounded-xl text-sm font-medium ${
            saveMessage.type === 'error' 
              ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/30' 
              : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-100 dark:border-green-900/30'
          }`}>
            {saveMessage.text}
          </div>
        )}
      </div>
    </div>
  );
}
