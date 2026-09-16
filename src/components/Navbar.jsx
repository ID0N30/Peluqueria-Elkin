import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AuthModal from './AuthModal';
import { Scissors, Menu, X, User, LogOut, ShieldAlert, Sun, Moon } from 'lucide-react';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const navLinks = [
    { name: 'Reservar Cita', path: '/' },
    { name: 'Mis Citas', path: '/cancel' }
  ];

  return (
    <>
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-[#09090B]/80 border-b border-zinc-200/80 dark:border-zinc-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 p-2 rounded-xl group-hover:scale-105 transition-transform">
                <Scissors className="w-6 h-6" />
              </div>
              <span className="font-playfair font-bold text-xl tracking-tight text-zinc-900 dark:text-zinc-100">Elkin</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-medium transition-colors hover:text-zinc-900 dark:hover:text-white ${
                    location.pathname === link.path ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              
              {isAdmin && (
                <Link 
                  to="/admin"
                  className="flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-full transition-colors"
                >
                  <ShieldAlert className="w-4 h-4" />
                  Panel Admin
                </Link>
              )}

              <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800"></div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Cambiar tema"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {user ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
                        {user.displayName || 'Usuario'}
                      </span>
                      {user.isAnonymous && (
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 rounded uppercase font-semibold w-max mt-0.5">Invitado</span>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-colors"
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all hover:shadow-md active:scale-95"
                >
                  Iniciar Sesión
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-[#09090B] absolute w-full animate-fade-in-down shadow-xl">
            <div className="px-4 pt-2 pb-6 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-3 rounded-xl text-base font-medium ${
                    location.pathname === link.path 
                      ? 'bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' 
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              
              {isAdmin && (
                <Link 
                  to="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-3 rounded-xl text-base font-medium text-amber-700 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30"
                >
                  <ShieldAlert className="w-5 h-5" />
                  Panel Admin
                </Link>
              )}

              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                {user ? (
                  <div className="flex items-center justify-between px-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <User className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-base font-medium text-zinc-900 dark:text-zinc-100">{user.displayName || 'Usuario'}</div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400">{user.email || 'Invitado'}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsAuthModalOpen(true);
                    }}
                    className="w-full mt-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-5 py-3 rounded-xl text-base font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                  >
                    Iniciar Sesión
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
