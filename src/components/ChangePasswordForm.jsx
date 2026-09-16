import { useState } from 'react';
import { api } from '../lib/api';

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });

    try {
      await api.changePassword(currentPassword, newPassword);
      setMsg({ text: 'Contraseña actualizada exitosamente.', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setMsg({ text: err.message || 'Error al cambiar contraseña.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
        Cambia tu contraseña de administrador.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {msg.text && (
          <div className={`p-4 mb-4 rounded-xl text-sm border flex items-center ${
            msg.type === 'success' 
              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/50' 
              : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50'
          }`}>
            {msg.text}
          </div>
        )}

        <div>
          <label className="form-label">Contraseña Actual</label>
          <input 
            type="password" 
            className="form-input bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100" 
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="form-label">Nueva Contraseña (min. 6 caracteres)</label>
          <input 
            type="password" 
            className="form-input bg-white dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100" 
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        
        <button type="submit" className="btn btn-outline w-full sm:w-auto mt-2 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800" disabled={loading}>
          {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
        </button>
      </form>
    </div>
  );
}
