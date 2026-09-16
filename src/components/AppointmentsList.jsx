import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebaseClient';
import { Trash2, Phone, MessageCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { cancelAppointmentAdmin, completeAppointmentAdmin } from '../lib/adminService';
import { formatTo12Hour } from '../utils/formatters';

export default function AppointmentsList() {
  const [appointments, setAppointments] = useState([]);
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));

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
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <label className="form-label block mb-1">Fecha de agenda</label>
          <input 
            type="date" 
            className="form-input w-full sm:w-[200px]" 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {appointments.length === 0 ? (
          <div className="bg-white dark:bg-[#18181B] border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-12 text-center">
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">No hay citas programadas para esta fecha.</p>
          </div>
        ) : (
          appointments.map(app => (
            <div key={app.id} className="bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <div className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold px-4 py-2 rounded-xl text-lg tracking-wide border border-zinc-200 dark:border-zinc-700">
                    {formatTo12Hour(app.time)}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-zinc-900 dark:text-white capitalize">{app.clientName}</h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <a href={`tel:${app.clientPhone}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                        <Phone className="w-3.5 h-3.5" /> Llamar
                      </a>
                      <a href={`https://wa.me/57${app.clientPhone}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400 hover:underline bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-md">
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </a>
                    </div>
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
