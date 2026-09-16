import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock } from 'lucide-react';
import { HARDCODED_ADMIN_EMAILS } from '../lib/adminConfigService';

export default function AdminLoginPage() {
  const { user, isAdmin, loading, loginWithGoogle, loginWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const userIsHardcodedAdmin = user?.email && HARDCODED_ADMIN_EMAILS.includes(user.email.toLowerCase());
    if (user && (isAdmin || userIsHardcodedAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, navigate]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setError('');
    try {
      await loginWithEmail(email, password);
    } catch (err) {
      setError(err.message || 'Error de autenticación.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setError('');
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err.message || 'Error con Google.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin"></div>
      </div>
    );
  }

  const userIsHardcodedAdmin = user?.email && HARDCODED_ADMIN_EMAILS.includes(user.email.toLowerCase());
  if (user && !isAdmin && !userIsHardcodedAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white dark:bg-[#18181B] border border-red-100 dark:border-red-900/40 rounded-3xl text-center shadow-xl shadow-red-900/5 text-zinc-900 dark:text-zinc-100">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-playfair font-bold mb-2">Acceso Denegado</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mb-6">Tu cuenta actual ({user.email || 'Anónimo'}) no tiene privilegios de administrador.</p>
        <button 
          onClick={() => navigate('/')}
          className="btn btn-outline w-full py-3"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 min-h-[70vh] animate-fade-in-up">
      <div className="bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-black/5 dark:shadow-black/50">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-playfair font-bold">Panel Barbero</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Ingresa con tus credenciales de Super Admin</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/50 text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={authLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border rounded-xl font-medium mb-6 disabled:opacity-50 transition-colors bg-white dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </button>

        <div className="relative flex items-center py-2 mb-6 text-zinc-400 dark:text-zinc-500">
          <div className="flex-grow border-t border-zinc-100 dark:border-zinc-800"></div>
          <span className="flex-shrink-0 mx-4 text-sm">o con correo</span>
          <div className="flex-grow border-t border-zinc-100 dark:border-zinc-800"></div>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
            <input
              type="email"
              className="form-input pl-11 bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
            <input
              type="password"
              className="form-input pl-11 bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 py-3.5 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-70 mt-2" 
            disabled={authLoading}
          >
            {authLoading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
