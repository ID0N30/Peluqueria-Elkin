import { useState, useEffect } from 'react';
import { getBlockedDates, addBlockedDate, removeBlockedDate } from '../lib/adminService';
import { CalendarOff, Trash2, CalendarPlus, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function BlockedDatesManager() {
  const [blockedDates, setBlockedDates] = useState([]);
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = getBlockedDates((dates) => {
      dates.sort((a, b) => b.id.localeCompare(a.id));
      setBlockedDates(dates);
    });
    return () => unsubscribe();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newDate) return;
    setLoading(true);
    setError('');
    
    try {
      await addBlockedDate(newDate, reason.trim() || 'No disponible');
      setNewDate('');
      setReason('');
    } catch (err) {
      console.error('Error adding blocked date:', err);
      setError('No se pudo bloquear la fecha.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id) => {
    try {
      await removeBlockedDate(id);
    } catch (err) {
      console.error('Error removing blocked date:', err);
    }
  };

  return (
    <div className="bg-white dark:bg-[#18181B] border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-red-50 dark:bg-red-950/30 rounded-xl flex items-center justify-center shrink-0">
          <CalendarOff className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Bloquear Fechas Específicas</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Festivos, Vacaciones o cierres excepcionales</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="flex-1">
          <input
            type="date"
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 focus:border-zinc-900 dark:focus:border-zinc-500 outline-none transition-all text-zinc-900 dark:text-zinc-100"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            required
          />
        </div>
        <div className="flex-[2]">
          <input
            type="text"
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 focus:border-zinc-900 dark:focus:border-zinc-500 outline-none transition-all text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
            placeholder="Motivo (ej. Día de la Madre, Mantenimiento)"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !newDate}
          className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-6 py-3 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 dark:border-zinc-900/30 border-t-white dark:border-t-zinc-900 rounded-full animate-spin"></div>
          ) : (
            <><CalendarPlus className="w-4 h-4" /> Bloquear Fecha</>
          )}
        </button>
      </form>

      <div>
        <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-4">Fechas actualmente bloqueadas</h4>
        
        {blockedDates.length === 0 ? (
          <div className="bg-zinc-50 dark:bg-[#121215] border border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-2xl py-8 text-center">
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">No hay fechas específicas bloqueadas actualmente.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {blockedDates.map((item) => {
              let displayDate = item.id;
              try {
                displayDate = format(parseISO(item.id), "d 'de' MMMM, yyyy", { locale: es });
              } catch (e) {
                // fallback
              }
              return (
                <div key={item.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl group hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-bold text-zinc-900 dark:text-white">{displayDate}</span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 dark:bg-red-500"></div>
                      {item.reason}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="w-10 h-10 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center justify-center text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all shrink-0"
                    title="Desbloquear"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
