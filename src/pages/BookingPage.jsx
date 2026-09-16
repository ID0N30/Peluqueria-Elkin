import { useState, useEffect } from 'react';
import { format, addDays, startOfDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '../lib/api';
import { Calendar, Clock, User, Phone, CheckCircle, ChevronRight, Sparkles, CalendarOff, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { saveClientContactData } from '../lib/authService';
import HeroBanner from '../components/HeroBanner';
import ServicesSection from '../components/ServicesSection';
import { formatTo12Hour } from '../utils/formatters';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebaseClient';

const getEarliestAvailableRange = (slotsList) => {
  if (!slotsList || !slotsList.length) return 'all';
  // slotsList son los turnos disponibles (s.isAvailable o strings 'HH:mm')
  const hasMorning = slotsList.some(s => {
    const t = s.time || s;
    return parseInt(t.split(':')[0], 10) < 12;
  });
  if (hasMorning) return 'morning';

  const hasMidday = slotsList.some(s => {
    const t = s.time || s;
    const h = parseInt(t.split(':')[0], 10);
    return h >= 12 && h < 14;
  });
  if (hasMidday) return 'midday';

  const hasAfternoon = slotsList.some(s => {
    const t = s.time || s;
    const h = parseInt(t.split(':')[0], 10);
    return h >= 14 && h < 18;
  });
  if (hasAfternoon) return 'afternoon';

  const hasNight = slotsList.some(s => {
    const t = s.time || s;
    return parseInt(t.split(':')[0], 10) >= 18;
  });
  if (hasNight) return 'night';

  return 'all';
};

export default function BookingPage() {
  const { user, userProfile } = useAuth();
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [allSlots, setAllSlots] = useState([]);
  const [closedInfo, setClosedInfo] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  // Auto-fill user data
  useEffect(() => {
    let initialName = localStorage.getItem('elkin_client_name') || '';
    let initialPhone = localStorage.getItem('elkin_client_phone') || '';

    if (user) {
      if (user.displayName) initialName = user.displayName;
      else if (userProfile?.displayName) initialName = userProfile.displayName;
      
      if (userProfile?.phone) initialPhone = userProfile.phone;
    }
    
    if (initialName) setClientName(initialName);
    if (initialPhone) setClientPhone(initialPhone);
  }, [user, userProfile]);

  useEffect(() => {
    const today = startOfDay(new Date());
    const windowDates = Array.from({ length: 7 }).map((_, i) => {
      const d = addDays(today, i);
      return format(d, 'yyyy-MM-dd');
    });
    setDates(windowDates);
    setSelectedDate(windowDates[0]);
  }, []);

  const fetchSlotsForDate = async (date, isBackground = false) => {
    if (!isBackground) {
      setLoadingSlots(true);
      setError('');
      setSelectedTime('');
    }
    try {
      const res = await api.getAvailability(date);
      setSlots(res.slots || []);
      setAllSlots(res.allSlots || []);
      
      if (!isBackground) {
        const availableSlots = (res.allSlots || []).filter(s => s.isAvailable);
        setTimeFilter(getEarliestAvailableRange(availableSlots));
      }

      if (res.isClosed) {
        setClosedInfo({ isClosed: true, reason: res.reason });
      } else {
        setClosedInfo(null);
      }
      
      if (isBackground) {
        setSelectedTime(prev => {
          if (!prev) return prev;
          const currentSlot = res.allSlots?.find(s => s.time === prev);
          if (currentSlot && !currentSlot.isAvailable) return '';
          return prev;
        });
      }
    } catch (err) {
      if (!isBackground) setError('Error cargando horarios disponibles.');
    } finally {
      if (!isBackground) setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (!selectedDate) return;
    
    // Carga inicial
    fetchSlotsForDate(selectedDate, false);
    
    // Suscripción en tiempo real
    const q = query(collection(db, 'appointments'), where('date', '==', selectedDate));
    const unsubscribe = onSnapshot(q, () => {
      fetchSlotsForDate(selectedDate, true);
    });
    
    return () => unsubscribe();
  }, [selectedDate]);

  useEffect(() => {
    if (!slots.length) return;
    const hasMorning = slots.some(t => parseInt(t.split(':')[0], 10) < 12);
    const hasMidday = slots.some(t => { const h = parseInt(t.split(':')[0], 10); return h >= 12 && h < 14; });
    const hasAfternoon = slots.some(t => { const h = parseInt(t.split(':')[0], 10); return h >= 14 && h < 18; });
    const hasNight = slots.some(t => parseInt(t.split(':')[0], 10) >= 18);
    
    setTimeFilter(prev => {
      if (prev === 'morning' && !hasMorning) return getEarliestAvailableRange(slots);
      if (prev === 'midday' && !hasMidday) return getEarliestAvailableRange(slots);
      if (prev === 'afternoon' && !hasAfternoon) return getEarliestAvailableRange(slots);
      if (prev === 'night' && !hasNight) return getEarliestAvailableRange(slots);
      return prev;
    });
  }, [slots]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !clientName || !clientPhone) {
      setError('Por favor completa todos los campos.');
      return;
    }

    if (clientPhone.length !== 10) {
      setError('El teléfono debe tener 10 dígitos.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await api.createAppointment({
        date: selectedDate,
        time: selectedTime,
        clientName,
        clientPhone,
        userId: user?.uid || null
      });
      
      localStorage.setItem('elkin_client_phone', clientPhone);
      localStorage.setItem('elkin_client_name', clientName.trim());
      if (user) {
        saveClientContactData(clientPhone, clientName.trim());
      }
      
      setSuccess({ ...res, date: selectedDate, time: selectedTime, clientName, clientPhone });
    } catch (err) {
      setError(err.message || 'Error al crear la reserva.');
      if (err.message.includes('cupo')) {
        fetchSlotsForDate(selectedDate, true);
        setSelectedTime('');
      } else {
        fetchSlotsForDate(selectedDate, true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 animate-fade-in bg-zinc-50 dark:bg-[#09090B]">
        <div className="bg-white dark:bg-[#18181B] border border-zinc-100 dark:border-zinc-800 rounded-[2rem] p-8 max-w-md w-full shadow-2xl shadow-black/5 dark:shadow-black/50 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-zinc-900 dark:bg-zinc-100"></div>
          
          <div className="w-20 h-20 bg-green-50 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500 dark:text-green-400" />
          </div>
          
          <h2 className="text-3xl font-playfair font-bold text-zinc-900 dark:text-white mb-2">¡Reserva Confirmada!</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8">Te esperamos, {success.clientName}.</p>
          
          <div className="bg-zinc-50 dark:bg-[#121215] rounded-2xl p-6 mb-8 text-left space-y-4 border border-zinc-100 dark:border-zinc-800/50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white dark:bg-[#18181B] rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">Fecha</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {format(parseISO(success.date), "EEEE, d 'de' MMMM", { locale: es })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white dark:bg-[#18181B] rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">Hora</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{formatTo12Hour(success.time)}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <button 
              className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-3.5 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-md flex items-center justify-center gap-2"
              onClick={() => {
                setSuccess(null);
                setSelectedTime('');
                fetchSlotsForDate(success.date, true);
              }}
            >
              Hacer nueva reserva <ChevronRight className="w-4 h-4" />
            </button>
            <a 
              href="https://wa.me/573115711709?text=Hola,%20acabo%20de%20agendar%20una%20cita%20y%20tengo%20una%20consulta"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-white dark:bg-[#18181B] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 py-3.5 rounded-xl font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5 text-[#25D366]" /> Contáctanos por WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <HeroBanner />
      
      <div id="booking-section" className="bg-white dark:bg-[#121215] py-20 md:py-32 transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-playfair font-bold text-zinc-900 dark:text-white mb-4 flex items-center justify-center gap-3">
              <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-amber-500" />
              Reserva tu Cita
              <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-amber-500" />
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-lg">Selecciona el momento ideal para tu corte.</p>
          </div>

          <div className="bg-zinc-50 dark:bg-[#18181B] border border-zinc-200/50 dark:border-zinc-800/80 rounded-[2rem] p-6 sm:p-10 shadow-xl shadow-zinc-200/20 dark:shadow-black/40">
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-8 p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/50 flex items-start gap-3">
                  <div className="shrink-0 w-5 h-5 mt-0.5 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center font-bold">!</div>
                  <p>{error}</p>
                </div>
              )}

              {/* Step 1: Date */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shadow-md">1</div>
                  <h3 className="text-2xl font-playfair font-bold text-zinc-900 dark:text-white">Elige el día</h3>
                </div>
                
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {dates.map(date => {
                    const isSelected = date === selectedDate;
                    const d = parseISO(date);
                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => setSelectedDate(date)}
                        className={`w-full h-24 sm:h-28 rounded-[1rem] flex flex-col items-center justify-center gap-1 sm:gap-2 transition-all border-2 ${
                          isSelected 
                            ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900 shadow-md scale-[1.02]' 
                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                        }`}
                      >
                        <span className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider ${isSelected ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-400 dark:text-zinc-500'}`}>
                          {format(d, 'EEE', { locale: es })}
                        </span>
                        <span className="text-xl sm:text-3xl font-bold font-playfair">{format(d, 'd')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Time */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shadow-md">2</div>
                  <h3 className="text-2xl font-playfair font-bold text-zinc-900 dark:text-white">Selecciona la hora</h3>
                </div>

                {loadingSlots ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-400 dark:text-zinc-500 gap-3">
                    <div className="w-6 h-6 border-2 border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-white rounded-full animate-spin"></div>
                    <p className="text-sm font-medium">Buscando espacios...</p>
                  </div>
                ) : closedInfo?.isClosed ? (
                  <div className="bg-white dark:bg-[#121215] border border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl py-12 text-center flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-full flex items-center justify-center mb-3">
                      <CalendarOff className="w-6 h-6" />
                    </div>
                    <p className="text-zinc-900 dark:text-zinc-100 font-medium mb-1">Día no disponible: {closedInfo.reason}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Por favor selecciona otra fecha para tu reserva.</p>
                  </div>
                ) : allSlots.length === 0 ? (
                  <div className="bg-white dark:bg-[#121215] border border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl py-12 text-center">
                    <p className="text-zinc-900 dark:text-zinc-100 font-medium mb-1">No hay horarios configurados para este día.</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Por favor elige otra fecha.</p>
                  </div>
                ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(() => {
                      const availableSlots = allSlots.filter(s => s.isAvailable);
                      const hasMorning = allSlots.some(s => parseInt(s.time.split(':')[0], 10) < 12);
                      const hasMidday = allSlots.some(s => { const h = parseInt(s.time.split(':')[0], 10); return h >= 12 && h < 14; });
                      const hasAfternoon = allSlots.some(s => { const h = parseInt(s.time.split(':')[0], 10); return h >= 14 && h < 18; });
                      const hasNight = allSlots.some(s => parseInt(s.time.split(':')[0], 10) >= 18);
                      
                      return (
                        <>
                          {hasMorning && <button type="button" onClick={() => setTimeFilter('morning')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${timeFilter === 'morning' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'}`}>🌅 Mañana ({availableSlots.filter(s => parseInt(s.time.split(':')[0], 10) < 12).length})</button>}
                          {hasMidday && <button type="button" onClick={() => setTimeFilter('midday')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${timeFilter === 'midday' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'}`}>☀️ Mediodía ({availableSlots.filter(s => { const h = parseInt(s.time.split(':')[0], 10); return h >= 12 && h < 14; }).length})</button>}
                          {hasAfternoon && <button type="button" onClick={() => setTimeFilter('afternoon')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${timeFilter === 'afternoon' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'}`}>🌇 Tarde ({availableSlots.filter(s => { const h = parseInt(s.time.split(':')[0], 10); return h >= 14 && h < 18; }).length})</button>}
                          {hasNight && <button type="button" onClick={() => setTimeFilter('night')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${timeFilter === 'night' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'}`}>🌙 Noche ({availableSlots.filter(s => parseInt(s.time.split(':')[0], 10) >= 18).length})</button>}
                          <button type="button" onClick={() => setTimeFilter('all')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${timeFilter === 'all' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'}`}>Todas ({availableSlots.length})</button>
                        </>
                      );
                    })()}
                  </div>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">
                    {allSlots.filter(slot => {
                      const hour = parseInt(slot.time.split(':')[0], 10);
                      if (timeFilter === 'morning') return hour < 12;
                      if (timeFilter === 'midday') return hour >= 12 && hour < 14;
                      if (timeFilter === 'afternoon') return hour >= 14 && hour < 18;
                      if (timeFilter === 'night') return hour >= 18;
                      return true;
                    }).map(slot => {
                      const isSelected = selectedTime === slot.time;
                      
                      if (slot.isPast) {
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={true}
                            className="py-3 px-2 rounded-xl text-sm font-semibold transition-all border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121215] text-zinc-400 dark:text-zinc-600 opacity-40 cursor-not-allowed flex flex-col items-center justify-center gap-0.5"
                          >
                            <span>{formatTo12Hour(slot.time)}</span>
                            <span className="text-[10px] block opacity-60">Pasado</span>
                          </button>
                        );
                      }
                      
                      if (slot.isBooked) {
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={true}
                            className="py-3 px-2 rounded-xl text-sm font-semibold transition-all border-2 cursor-not-allowed opacity-60 bg-zinc-100 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 flex flex-col items-center justify-center gap-0.5"
                          >
                            <span className="line-through">{formatTo12Hour(slot.time)}</span>
                            <span className="text-[10px] font-bold block uppercase tracking-wider text-red-500 dark:text-red-400 mt-0.5">Ocupado</span>
                          </button>
                        );
                      }

                      return (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => setSelectedTime(slot.time)}
                          className={`py-3 px-2 rounded-xl text-sm font-semibold transition-all border-2 flex flex-col items-center justify-center gap-0.5 ${
                            isSelected 
                              ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900 shadow-md shadow-black/10 dark:shadow-white/10 scale-[1.02]' 
                              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-[#1a1a1f]'
                          }`}
                        >
                          <span>{formatTo12Hour(slot.time)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                )}
              </div>

              {/* Step 3: Details */}
              {selectedTime && (
                <div className="animate-fade-in-up bg-white dark:bg-[#121215] rounded-[2rem] p-6 sm:p-8 border border-zinc-200/50 dark:border-zinc-800 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shadow-md">3</div>
                    <h3 className="text-2xl font-playfair font-bold text-zinc-900 dark:text-white">Tus datos</h3>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6 mb-8">
                    <div>
                      <label className="form-label">Nombre completo</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                        <input
                          type="text"
                          className="form-input pl-12 h-14"
                          placeholder="Ej. Juan Pérez"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          required
                          minLength={2}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Teléfono móvil</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                        <input
                          type="tel"
                          className="form-input pl-12 h-14"
                          placeholder="300 123 4567"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value.replace(/\D/g, ''))}
                          required
                          pattern="\d{10}"
                          maxLength={10}
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-4 md:py-5 rounded-xl font-semibold text-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-white/10 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <><div className="w-5 h-5 border-2 border-white/30 dark:border-zinc-900/30 border-t-white dark:border-t-zinc-900 rounded-full animate-spin"></div> Confirmando...</>
                    ) : (
                      'Confirmar Reserva'
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
      
      <ServicesSection />
      
      {/* Hide scrollbar styles for date picker */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
