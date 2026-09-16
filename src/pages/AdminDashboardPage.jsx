import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppointmentsList from '../components/AppointmentsList';
import ScheduleEditor from '../components/ScheduleEditor';
import StylistsManager from '../components/StylistsManager';
import BlockedDatesManager from '../components/BlockedDatesManager';
import ChangePasswordForm from '../components/ChangePasswordForm';
import MetricsHistory from '../components/MetricsHistory';
import { ShieldAlert, LogOut, LayoutDashboard, CalendarDays, Settings } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, isAdmin, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('appointments');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Verificando credenciales...</p>
      </div>
    );
  }

  if (!user || !isAdmin) return null; // Avoid flicker before redirect

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full animate-fade-in">
      
      {/* Admin Header */}
      <div className="bg-black text-white rounded-3xl p-6 sm:p-8 mb-6 flex flex-col sm:flex-row justify-between items-center gap-6 shadow-xl shadow-black/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-playfair font-bold flex items-center gap-2">
              Panel de Administración
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </h1>
            <p className="text-gray-400 text-sm mt-1">Conectado como: {user.email}</p>
          </div>
        </div>
        <button 
          onClick={() => {
            logout();
            navigate('/');
          }} 
          className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors font-medium text-sm whitespace-nowrap"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 hide-scrollbar">
        <button
          onClick={() => setActiveTab('appointments')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap border ${
            activeTab === 'appointments'
              ? 'bg-zinc-900 text-white dark:bg-zinc-700 dark:text-zinc-100 dark:border-zinc-700 shadow-md'
              : 'bg-white text-zinc-600 hover:bg-zinc-100 border-zinc-200 dark:bg-[#18181B] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:border-zinc-800'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Gestión de Citas
        </button>
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap border ${
            activeTab === 'metrics'
              ? 'bg-zinc-900 text-white dark:bg-zinc-700 dark:text-zinc-100 dark:border-zinc-700 shadow-md'
              : 'bg-white text-zinc-600 hover:bg-zinc-100 border-zinc-200 dark:bg-[#18181B] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:border-zinc-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Métricas & Historial
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap border ${
            activeTab === 'settings'
              ? 'bg-zinc-900 text-white dark:bg-zinc-700 dark:text-zinc-100 dark:border-zinc-700 shadow-md'
              : 'bg-white text-zinc-600 hover:bg-zinc-100 border-zinc-200 dark:bg-[#18181B] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:border-zinc-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          Configuración del Negocio
        </button>
      </div>

      {/* Content */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        {activeTab === 'appointments' && (
          <div className="bg-white dark:bg-[#18181B] border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-bold font-playfair mb-6 flex items-center gap-2 text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-4">
              Citas Programadas
            </h2>
            <AppointmentsList />
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="bg-white dark:bg-[#18181B] border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-bold font-playfair mb-6 flex items-center gap-2 text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-4">
              Métricas & Historial
            </h2>
            <MetricsHistory />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <ScheduleEditor />
              <BlockedDatesManager />
            </div>
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#18181B] border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm">
                <h3 className="text-xl font-bold font-playfair mb-6 text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-4">Personal</h3>
                <StylistsManager />
              </div>
              <div className="bg-white dark:bg-[#18181B] border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm">
                <h3 className="text-xl font-bold font-playfair mb-6 text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-4">Seguridad</h3>
                <ChangePasswordForm />
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
