import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebaseClient';
import { Trash2, Phone, MessageCircle, CheckCircle, Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';

import { cancelAppointmentAdmin, completeAppointmentAdmin } from '../lib/adminService';
import { formatTo12Hour } from '../utils/formatters';
import AdminNewAppointmentModal from './AdminNewAppointmentModal';

export default function AppointmentsList() {
  const [appointments, setAppointments] = useState([]);
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  useEffect(() => {
    if (!filterDate) return;

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
      // Sort by time
      data.sort((a, b) => a.time.localeCompare(b.time));
      setAppointments(data);
    });

    return () => unsubscribe();
  }, [filterDate]);

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

  return (
    <div className="mb-4">
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-4">
        <div>
          <label className="form-label block mb-1">Fecha de agenda</label>
          <input 
            type="date" 
            className="form-input w-full sm:w-[200px]" 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-sm transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Nueva Cita</span>
        </button>
      </div>

      <AdminNewAppointmentModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        defaultDate={filterDate}
        onSuccess={(bookedDate) => {
          setFilterDate(bookedDate);
        }}
      />

      <div className="space-y-4">
        {appointments.length === 0 ? (
          <div className="bg-white dark:bg-[#18181B] border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-12 text-center">
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">No hay citas programadas para esta fecha.</p>
          </div>
        ) : (
          appointments.map(app => (
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
          ))
        )}
      </div>
    </div>
  );
}
