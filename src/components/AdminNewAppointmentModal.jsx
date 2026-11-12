import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  FileText, 
  AlertCircle, 
  CalendarOff, 
  Loader2,
  PlusCircle
} from 'lucide-react';
import { getAvailability } from '../lib/bookingService';
import { createAppointmentAdmin } from '../lib/adminService';
import { formatTo12Hour } from '../utils/formatters';

export default function AdminNewAppointmentModal({ isOpen, onClose, defaultDate, onSuccess }) {
  const [date, setDate] = useState(defaultDate || format(new Date(), 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState('');
  const [allSlots, setAllSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [closedInfo, setClosedInfo] = useState(null);
  
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sincronizar fecha y reiniciar campos al abrir
  useEffect(() => {
    if (isOpen) {
      const initialDate = defaultDate || format(new Date(), 'yyyy-MM-dd');
      setDate(initialDate);
      setSelectedTime('');
      setClientName('');
      setClientPhone('');
      setNotes('');
      setError('');
    }
  }, [isOpen, defaultDate]);

  // Cargar disponibilidad al cambiar la fecha
  useEffect(() => {
    if (!isOpen || !date) return;

    let isMounted = true;
    setLoadingSlots(true);
    setSelectedTime('');

    getAvailability(date)
      .then((res) => {
        if (!isMounted) return;
        if (res.isClosed) {
          setClosedInfo({ isClosed: true, reason: res.reason || 'Día no laborable (Cerrado)' });
          setAllSlots([]);
        } else {
          setClosedInfo(null);
          setAllSlots(res.allSlots || []);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error cargando disponibilidad:', err);
        setClosedInfo({ isClosed: true, reason: 'Error al consultar disponibilidad' });
        setAllSlots([]);
      })
      .finally(() => {
        if (isMounted) setLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [date, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!date) {
      setError('Por favor selecciona una fecha válida.');
      return;
    }

    if (!selectedTime) {
      setError('Por favor selecciona una hora de la cuadrícula.');
      return;
    }

    if (!clientName.trim()) {
      setError('Por favor ingresa el nombre del cliente.');
      return;
    }

    setSubmitting(true);
    try {
      await createAppointmentAdmin({
        date,
        time: selectedTime,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        notes: notes.trim()
      });
      
      onSuccess?.(date);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar la cita.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-900/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-[#18181B] rounded-[2rem] shadow-2xl border border-zinc-100 dark:border-zinc-800 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden relative animate-scale-up text-zinc-900 dark:text-zinc-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Cabecera Móvil-Primero */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center shadow-sm">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 id="modal-title" className="text-lg font-bold font-playfair tracking-tight">
                Nueva Cita Manual
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Registra un cliente directo en la agenda
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario scrolleable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5 overflow-x-hidden">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-900/50 flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Campo: Fecha */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Fecha de la cita *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="form-input text-sm font-medium"
            />
          </div>

          {/* Selector de Horarios en Cuadrícula */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Hora *
              </label>
              {selectedTime && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/40">
                  Seleccionada: {formatTo12Hour(selectedTime)}
                </span>
              )}
            </div>

            {loadingSlots ? (
              <div className="flex items-center justify-center py-8 text-zinc-400 dark:text-zinc-500 gap-2 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-xs font-medium">Consultando horarios de la fecha...</span>
              </div>
            ) : closedInfo?.isClosed ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-800 dark:text-amber-300 text-xs sm:text-sm flex items-start gap-2.5">
                <CalendarOff className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="font-semibold">Día no laborable o bloqueado</p>
                  <p className="mt-0.5 text-xs opacity-90">{closedInfo.reason}</p>
                </div>
              </div>
            ) : allSlots.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 dark:text-zinc-500 text-xs font-medium">
                No hay franjas configuradas para este día.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto p-1 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                {allSlots.map((slot) => {
                  const isSelected = selectedTime === slot.time;
                  
                  if (slot.isBooked) {
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled
                        className="py-2.5 px-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/60 text-zinc-400 dark:text-zinc-600 line-through cursor-not-allowed opacity-50 flex flex-col items-center justify-center gap-0.5"
                      >
                        <span>{formatTo12Hour(slot.time)}</span>
                        <span className="text-[10px] font-bold text-red-500 dark:text-red-400 no-underline">
                          Ocupado
                        </span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => setSelectedTime(slot.time)}
                      className={`py-2 px-1.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                        isSelected
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-md ring-2 ring-zinc-900/20 dark:ring-white/20'
                          : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-700/80 text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      <span>{formatTo12Hour(slot.time)}</span>
                      {slot.isPast ? (
                        <span className={`text-[9px] font-medium ${isSelected ? 'text-zinc-300 dark:text-zinc-600' : 'text-amber-600 dark:text-amber-400'}`}>
                          (Pasada)
                        </span>
                      ) : (
                        <span className={`text-[9px] font-medium ${isSelected ? 'text-zinc-300 dark:text-zinc-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          Libre
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Campo: Nombre del Cliente */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Nombre del cliente *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Carlos Pérez"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="form-input text-sm"
            />
          </div>

          {/* Campo: Teléfono / WhatsApp */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              Teléfono / WhatsApp <span className="font-normal text-zinc-400 dark:text-zinc-500">(opcional)</span>
            </label>
            <input
              type="tel"
              placeholder="Opcional, ej. 311 555 1234"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              className="form-input text-sm"
            />
          </div>

          {/* Campo: Notas / Servicio */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Notas / Servicio <span className="font-normal text-zinc-400 dark:text-zinc-500">(opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Opcional, ej. Corte + barba"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-input text-sm"
            />
          </div>

          {/* Acciones del Modal */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full sm:w-1/2 py-3 px-4 rounded-xl font-medium text-sm border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedTime || !clientName.trim()}
              className="w-full sm:w-1/2 py-3 px-4 rounded-xl font-semibold text-sm bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cita'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}