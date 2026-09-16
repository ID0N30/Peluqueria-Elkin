import { useState, useEffect, useMemo } from 'react';
import { subscribeAppointmentsMetrics } from '../lib/adminService';
import { Users, Clock, XCircle, CheckCircle, Search, Calendar, Phone, Trash2, CalendarDays } from 'lucide-react';
import { formatTo12Hour } from '../utils/formatters';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export default function MetricsHistory() {
  const [metrics, setMetrics] = useState({
    totalCompleted: 0,
    totalCancelled: 0,
    totalConfirmed: 0,
    totalAll: 0,
    history: []
  });
  const [filter, setFilter] = useState('all'); // all, completed, cancelled
  const [dateRange, setDateRange] = useState('all'); // today, week, month, all, custom
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeAppointmentsMetrics(setMetrics);
    return () => unsubscribe();
  }, []);

  const dateFilteredHistory = useMemo(() => {
    let filtered = metrics.history;
    if (dateRange !== 'all') {
      const now = new Date();
      let start, end;
      switch (dateRange) {
        case 'today':
          start = startOfDay(now);
          end = endOfDay(now);
          break;
        case 'week':
          start = startOfWeek(now, { weekStartsOn: 1 });
          end = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case 'month':
          start = startOfMonth(now);
          end = endOfMonth(now);
          break;
        case 'custom':
          if (customStart && customEnd) {
            start = startOfDay(parseISO(customStart));
            end = endOfDay(parseISO(customEnd));
          } else {
            start = new Date(0);
            end = new Date(3000, 0, 1);
          }
          break;
      }
      filtered = filtered.filter(app => {
        const appDate = parseISO(app.date);
        return appDate >= start && appDate <= end;
      });
    }
    return filtered;
  }, [metrics.history, dateRange, customStart, customEnd]);

  const displayMetrics = useMemo(() => {
    return {
      totalCompleted: dateFilteredHistory.filter(a => a.status === 'completed').length,
      totalConfirmed: dateFilteredHistory.filter(a => a.status === 'confirmed').length,
      totalCancelled: dateFilteredHistory.filter(a => a.status === 'cancelled').length,
      totalAll: dateFilteredHistory.length
    };
  }, [dateFilteredHistory]);

  const filteredHistory = useMemo(() => {
    if (filter === 'completed') return dateFilteredHistory.filter(app => app.status === 'completed');
    if (filter === 'cancelled') return dateFilteredHistory.filter(app => app.status === 'cancelled');
    return dateFilteredHistory;
  }, [dateFilteredHistory, filter]);

  return (
    <div className="space-y-8">
      {/* Date Filters */}
      <div className="bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
          <h3 className="font-semibold text-zinc-900 dark:text-white">Filtro de Fecha</h3>
        </div>
        <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl flex-wrap">
          <button onClick={() => setDateRange('today')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${dateRange === 'today' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>Hoy</button>
          <button onClick={() => setDateRange('week')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${dateRange === 'week' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>Esta Semana</button>
          <button onClick={() => setDateRange('month')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${dateRange === 'month' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>Este Mes</button>
          <button onClick={() => setDateRange('all')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${dateRange === 'all' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>Todo</button>
          <button onClick={() => setDateRange('custom')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${dateRange === 'custom' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>Personalizado</button>
        </div>
      </div>

      {dateRange === 'custom' && (
        <div className="bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Desde</label>
            <input type="date" className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Hasta</label>
            <input type="date" className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-800/50 rounded-xl">
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">Atendidos</h4>
          </div>
          <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{displayMetrics.totalCompleted}</p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-800/50 rounded-xl">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h4 className="font-semibold text-amber-900 dark:text-amber-100">Pendientes</h4>
          </div>
          <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">{displayMetrics.totalConfirmed}</p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-800/50 rounded-xl">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h4 className="font-semibold text-red-900 dark:text-red-100">Canceladas</h4>
          </div>
          <p className="text-3xl font-bold text-red-700 dark:text-red-300">{displayMetrics.totalCancelled}</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-xl">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">Total</h4>
          </div>
          <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{displayMetrics.totalAll}</p>
        </div>
      </div>

      {/* History List */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <h3 className="text-lg font-bold font-playfair text-zinc-900 dark:text-white">Historial de Citas</h3>
          <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl">
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
            >Todas</button>
            <button 
              onClick={() => setFilter('completed')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'completed' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
            >Atendidas</button>
            <button 
              onClick={() => setFilter('cancelled')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'cancelled' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
            >Canceladas</button>
          </div>
        </div>
        
        <div className="space-y-3">
          {filteredHistory.length === 0 ? (
             <div className="bg-zinc-50 dark:bg-[#121215] border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-8 text-center text-zinc-500 dark:text-zinc-400">
               No hay registros para este filtro.
             </div>
          ) : (
            filteredHistory.map(app => (
              <div key={app.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-2xl gap-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-zinc-900 dark:text-white capitalize">{app.clientName}</span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {app.clientPhone}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{app.date}</span>
                    <span className="mx-1">•</span>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTo12Hour(app.time)}</span>
                  </div>
                </div>
                
                <div>
                  {app.status === 'completed' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-medium border border-emerald-200 dark:border-emerald-800/50">
                      <CheckCircle className="w-3.5 h-3.5" /> Atendida
                    </span>
                  )}
                  {app.status === 'cancelled' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs font-medium border border-red-200 dark:border-red-800/50">
                      <XCircle className="w-3.5 h-3.5" /> Cancelada
                    </span>
                  )}
                  {app.status === 'confirmed' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full text-xs font-medium border border-amber-200 dark:border-amber-800/50">
                      <Clock className="w-3.5 h-3.5" /> Pendiente
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
