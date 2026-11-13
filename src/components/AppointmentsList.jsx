import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebaseClient';
import { Trash2, Phone, MessageCircle, CheckCircle, Plus, FileText, Calendar, ListFilter } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import { 
  cancelAppointmentAdmin, 
  completeAppointmentAdmin, 
  subscribeAllConfirmedAppointments 
} from '../lib/adminService';
import { formatTo12Hour } from '../utils/formatters';
import AdminNewAppointmentModal from './AdminNewAppointmentModal';

export default function AppointmentsList() {
  const [viewMode, setViewMode] = useState('date'); // 'date' | 'all'
  const [allFilterRange, setAllFilterRange] = useState('upcoming'); // 'upcoming' | 'all'
  
  const [appointments, setAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // 1. Suscripción por Fecha Específica
  useEffect(() => {
    if (viewMode !== 'date' || !filterDate) return;

    const q = query(
      collection(db, 'appointments'),
      where('date', '==', filterDate),
      where('status', '==', 'confirmed')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      data.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      setAppointments(data);
    });

    return () => unsubscribe();
  }, [filterDate, viewMode]);

  // 2. Suscripción Global Cronológica (Todas las Citas)
  useEffect(() => {
    if (viewMode !== 'all') return;

    const fromDate = allFilterRange === 'upcoming' ? format(new Date(), 'yyyy-MM-dd') : '2000-01-01';
    const unsubscribe = subscribeAllConfirmedAppointments((data) => {
      setAllAppointments(data);
    }, { fromDate });

    return () => unsubscribe();
  }, [viewMode, allFilterRange]);

  const handleCancel = async (id) => {
    if (!window.confirm('¿Cancelar esta cita desde el panel de admin?')) return;
    try {
      await cancelAppointmentAdmin(id);
    } catch (err) {
      alert('Error al cancelar: ' + err.message);
    }
  };

  const handleComplete = async (id) => {
    if (!window.confirm('¿Marcar esta cita como completada?')) return;
    try {
      await completeAppointmentAdmin(id);
    } catch (err) {
      alert('Error al marcar como completada: ' + err.message);
    }
  };

  // Agrupamiento por fecha en modo global
  const groupedByDate = useMemo(() => {
    const groups = {};
    allAppointments.forEach(app => {
      const d = app.date || 'Sin fecha';
      if (!groups[d]) groups[d] = [];
      groups[d].push(app);
    });
    return groups;
  }, [allAppointments]);

  const uniqueDaysCount = Object.keys(groupedByDate).length;
  const totalAllCount = allAppointments.length;

  const formatDateHeader = (dateStr) => {
    try {
      return format(parseISO(dateStr), "EEEE, d 'de' MMMM", { locale: es });
    } catch (_) {
      return dateStr;
    }
  };

  // Renderizador de Tarjeta de Cita (DRY)
  const renderAppointmentCard = (app) => (
    <div key={app.id} className="bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold px-4 py-2 rounded-xl text-lg tracking-wide border border-zinc-200 dark:border-zinc-700 shrink-0">
            {formatTo12Hour(app.time)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-bold text-lg text-zinc-900 dark:text-white capitalize">{app.clientName}</h4>
              {app.source === 'admin' && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                  Manual
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-1">
              {app.clientPhone && app.clientPhone.trim() !== '' ? (
                <>
                  <a href={`tel:${app.clientPhone}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                    <Phone className="w-3.5 h-3.5" /> Llamar
                  </a>
                  <a href={`https://wa.me/57${app.clientPhone}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400 hover:underline bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-md">
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                </>
              ) : (
                <span className="inline-flex items-center text-xs font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md">
                  Sin teléfono
                </span>
              )}
            </div>

            {app.notes && app.notes.trim() !== '' && (
              <div className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-1 rounded-lg border border-zinc-100 dark:border-zinc-800 flex items-start gap-1.5">
                <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                <span className="italic">{app.notes}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
        <button 
          onClick={() => handleCancel(app.id)}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-950/30 dark:hover:bg-red-900/50 transition-colors"
        >
          <Trash2 className="w-4 h-4" /> ✕ Cancelar
        </button>
        <button 
          onClick={() => handleComplete(app.id)}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 transition-colors"
        >
          <CheckCircle className="w-4 h-4" /> ✓ Realizado
        </button>
      </div>
    </div>
  );

  return (
    <div className="mb-4 space-y-6">
      {/* Barra Superior con Selector de Modo de Vista y Botón Nueva Cita */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Selector de Modo */}
        <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl w-full sm:w-auto shadow-inner">
          <button
            type="button"
            onClick={() => setViewMode('date')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              viewMode === 'date'
                ? 'bg-white dark:bg-[#18181B] text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Por Fecha</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              viewMode === 'all'
                ? 'bg-white dark:bg-[#18181B] text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>Todas las Citas</span>
          </button>
        </div>

        {/* Botón Nueva Cita */}
        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-sm transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Nueva Cita</span>
        </button>
      </div>

      {/* Controles Específicos del Modo */}
      {viewMode === 'date' ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white dark:bg-[#18181B] border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-sm">
          <div>
            <label className="form-label block mb-1 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold">
              Fecha de agenda
            </label>
            <input 
              type="date" 
              className="form-input w-full sm:w-[220px]" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {appointments.length} {appointments.length === 1 ? 'cita programada' : 'citas programadas'}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Panel Resumen y Sub-filtro */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 sm:p-5 bg-white dark:bg-[#18181B] border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-sm">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                Filtro de Citas
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAllFilterRange('upcoming')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    allFilterRange === 'upcoming'
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                  }`}
                >
                  Próximas desde hoy
                </button>
                <button
                  type="button"
                  onClick={() => setAllFilterRange('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    allFilterRange === 'all'
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                  }`}
                >
                  Todas (Histórico completo)
                </button>
              </div>
            </div>

            <div className="text-left md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-zinc-100 dark:border-zinc-800 w-full md:w-auto">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Resumen general</span>
              <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                Total reservado: <strong className="text-emerald-600 dark:text-emerald-400">{totalAllCount}</strong> citas en <strong className="text-zinc-900 dark:text-white">{uniqueDaysCount}</strong> {uniqueDaysCount === 1 ? 'día distinto' : 'días distintos'}
              </span>
            </div>
          </div>

          {/* Pills con conteo por día */}
          {uniqueDaysCount > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 pb-1">
              {Object.keys(groupedByDate).map((dayKey) => {
                let pillLabel = dayKey;
                try {
                  pillLabel = format(parseISO(dayKey), "EEE d MMM", { locale: es });
                } catch (_) {}
                const count = groupedByDate[dayKey].length;
                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => {
                      setFilterDate(dayKey);
                      setViewMode('date');
                    }}
                    title={`Ver agenda detallada de ${pillLabel}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-all shadow-xs active:scale-95"
                  >
                    <span className="capitalize">{pillLabel}:</span>
                    <span className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold px-2 py-0.5 rounded-full text-[11px]">
                      {count} {count === 1 ? 'cita' : 'citas'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal para Nueva Cita Manual */}
      <AdminNewAppointmentModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        defaultDate={filterDate}
        onSuccess={(bookedDate) => {
          setFilterDate(bookedDate);
        }}
      />

      {/* Lista de Citas */}
      {viewMode === 'date' ? (
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <div className="bg-white dark:bg-[#18181B] border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-12 text-center">
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">No hay citas programadas para esta fecha.</p>
            </div>
          ) : (
            appointments.map(renderAppointmentCard)
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {totalAllCount === 0 ? (
            <div className="bg-white dark:bg-[#18181B] border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-12 text-center">
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">No se encontraron citas confirmadas para el rango seleccionado.</p>
            </div>
          ) : (
            Object.keys(groupedByDate).map((dayKey) => {
              const dayAppointments = groupedByDate[dayKey];
              return (
                <div key={dayKey} className="space-y-3">
                  {/* Encabezado del Día */}
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5 pt-2">
                    <h3 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-white capitalize flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                      <span>{formatDateHeader(dayKey)}</span>
                    </h3>
                    <span className="text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-3 py-1 rounded-full shadow-xs">
                      {dayAppointments.length} {dayAppointments.length === 1 ? 'reserva' : 'reservas'}
                    </span>
                  </div>

                  {/* Tarjetas del Día */}
                  <div className="space-y-3">
                    {dayAppointments.map(renderAppointmentCard)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
