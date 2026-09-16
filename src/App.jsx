import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BookingPage from './pages/BookingPage';
import CancelPage from './pages/CancelPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import Navbar from './components/Navbar';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Scissors } from 'lucide-react';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
            <Navbar />

            <main className="flex-1 flex flex-col">
              <Routes>
                <Route path="/" element={<BookingPage />} />
                <Route path="/cancel" element={<CancelPage />} />
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/admin" element={<AdminDashboardPage />} />
              </Routes>
            </main>

            <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#121215] py-16 transition-colors duration-300">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
                  <div className="flex flex-col items-center md:items-start gap-4">
                    <div className="flex items-center gap-2">
                      <Scissors className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
                      <span className="font-playfair font-bold text-xl tracking-wide">ELKIN</span>
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-xs">
                      El arte del corte clásico y la precisión del estilo contemporáneo.
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-center md:items-start gap-2">
                    <h3 className="font-semibold mb-2">Ubicación & Horario</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">[Victoria, Caldas - Dirección o referencia del local]</p>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">[Horario de atención: ej. Lunes a Sábado]</p>
                  </div>

                  <div className="flex flex-col items-center md:items-start gap-2">
                    <h3 className="font-semibold mb-2">Contacto</h3>
                    <a href="https://wa.me/573115711709" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 text-sm transition-colors">
                      WhatsApp: +57 311 571 1709
                    </a>
                  </div>
                </div>
                
                <div className="mt-12 pt-8 border-t border-zinc-100 dark:border-zinc-800/50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-400 dark:text-zinc-500">
                  <p>&copy; {new Date().getFullYear()} Peluquería & Barbería Elkin. Todos los derechos reservados.</p>
                  <p>Diseñado con pasión</p>
                </div>
              </div>
            </footer>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
