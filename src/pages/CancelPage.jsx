import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Phone, Search, Trash2, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatTo12Hour } from '../utils/formatters';

export default function CancelPage() {
  const { user, userProfile } = useAuth();
  const [phone, setPhone] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [hasAutoSearched, setHasAutoSearched] = useState(false);

  useEffect(() => {
    const savedPhone = localStorage.getItem('elkin_client_phone') || '';
    if (!phone && savedPhone) {
      setPhone(savedPhone);
    }
  }, []);

  useEffect(() => {
    if (userProfile?.phone && !phone) {
      setPhone(userProfile.phone);
    }
  }, [userProfile]);

  useEffect(() => {
    if (hasAutoSearched) return;
    
    const currentPhone = phone.replace(/\D/g, '');
    const canSearchByPhone = currentPhone.length === 10;
    const canSearchByUser = !!user;

    if (canSearchByPhone || canSearchByUser) {
      const fetchInitial = async () => {
        setLoading(true);
        setError('');
        try {
          const res = await api.lookupAppointments(canSearchByPhone ? currentPhone : null, user?.uid || null);
          setAppointments(res.appointments || []);
          setSearched(true);
        } catch (err) {
          console.error("Error auto-fetching appointments:", err);
        } finally {
          setLoading(false);
          setHasAutoSearched(true);
        }
      };
      // Give a tiny delay to allow context user/profile to fully settle
      const timeoutId = setTimeout(fetchInitial, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [phone, user, hasAutoSearched]);

  const handleSearch = async (e) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('El teléfono debe tener 10 dígitos.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.lookupAppointments(cleanPhone, user?.uid || null);
      setAppointments(res.appointments || []);
      setSearched(true);
    } catch (err) {
      setError(err.message || 'Error al buscar citas.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id, appPhone) => {
    if (!window.confirm('¿Estás seguro de cancelar esta cita?')) return;
    
    try {
      await api.cancelAppointment(id, appPhone || phone, user?.uid);
      setAppointments(prev => prev.filter(app => app.id !== id));
    } catch (err) {
      alert(err.message || 'Error al cancelar la cita.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full animate-fade-in bg-zinc-50 dark:bg-[#09090B] transition-colors duration-300">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-playfair font-bold text-zinc-900 dark:text-white mb-3">Mis Citas</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Gestiona tus reservas programadas.</p>
      </div>

      <div className="bg-white dark:bg-[#18181B] border border-zinc-100 dark:border-zinc-800 rounded-[2rem] p-6 sm:p-10 shadow-xl shadow-zinc-200/20 dark:shadow-black/40 max-w-2xl mx-auto transition-colors duration-300">
        
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="w-full">
              <label className="form-label">Busca por tu teléfono</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="tel"
                  className="form-input pl-12 h-14"
                  placeholder="Ej. 3001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  required
                  maxLength={10}
                />
              </div>
            </div>
            <button 
              type="submit" 
              className="btn btn-primary w-full sm:w-auto h-14 px-8" 
              disabled={loading}
            >
              {loading ? 'Buscando...' : <><Search className="w-5 h-5 mr-2" /> Buscar</>}
            </button>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/50 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}
        </form>

        {(searched || user) && (
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
              Citas Programadas
              <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-full text-xs">{appointments.length}</span>
            </h3>
            
            {loading && !appointments.length ? (
               <div className="text-center py-10 text-zinc-400 flex flex-col items-center">
                 <div className="w-6 h-6 border-2 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-white rounded-full animate-spin mb-3"></div>
                 Cargando citas...
               </div>
            ) : appointments.length === 0 ? (
              <div className="bg-zinc-50 dark:bg-[#121215] border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-12 text-center">
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">No encontramos citas activas para este número o cuenta.</p>
                <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-2">Verifica el número de teléfono o intenta de nuevo.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map(app => (
                  <div key={app.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-700 rounded-2xl hover:border-zinc-300 dark:hover:border-zinc-500 hover:shadow-sm transition-all gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Calendar className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                        <span className="font-medium text-zinc-900 dark:text-zinc-100 capitalize">
                          {format(parseISO(app.date), "EEEE, d 'de' MMMM", { locale: es })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 mb-2">
                        <Clock className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                        <span>{formatTo12Hour(app.time)}</span>
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 inline-block px-3 py-1 rounded-lg">
                        A nombre de: <span className="font-medium text-zinc-700 dark:text-zinc-300">{app.clientName}</span>
                        {app.clientPhone && <span className="ml-1">- Tel: {app.clientPhone}</span>}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleCancel(app.id, app.clientPhone)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-[#18181B] text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Cancelar Cita</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
