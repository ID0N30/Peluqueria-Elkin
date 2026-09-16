import React from 'react';
import { MessageCircle, Calendar } from 'lucide-react';
import bannerImg from '../assets/banner-elkin.png';

export default function HeroBanner() {
  const scrollToBooking = () => {
    document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative w-full overflow-hidden bg-zinc-50 dark:bg-[#09090B] transition-colors duration-300">
      {/* Background elegant accents */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-zinc-200/40 dark:from-zinc-900/40 to-transparent pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Text Content */}
          <div className="flex flex-col items-start space-y-8 animate-fade-in-up z-10">
            <div className="inline-flex items-center px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm text-sm font-medium text-zinc-600 dark:text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white mr-2"></span>
              Peluquería & Barbería Premium
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-bold text-zinc-900 dark:text-white leading-tight tracking-tight">
              [Peluquería & Barbería Elkin]
            </h1>
            
            <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-lg leading-relaxed font-light">
              [Espacio para mensaje de bienvenida: Aquí puedes colocar el lema de la barbería, información sobre el servicio en Victoria, Caldas o indicaciones de llegada para los clientes de las veredas].
            </p>
            
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-4 pt-4">
              <button 
                onClick={scrollToBooking}
                className="flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-8 py-4 rounded-full font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all hover:scale-105 active:scale-95 hover:shadow-xl shadow-zinc-900/20 dark:shadow-white/10"
              >
                <Calendar className="w-5 h-5" />
                Reservar Cita Ahora
              </button>
              
              <a 
                href="https://wa.me/573115711709?text=Hola,%20quisiera%20agendar%20una%20cita%20en%20la%20peluquería"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-white dark:bg-[#121215] text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 px-8 py-4 rounded-full font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all hover:scale-105 active:scale-95"
              >
                <MessageCircle className="w-5 h-5 text-[#25D366]" />
                Consultas por WhatsApp
              </a>
            </div>
          </div>
          
          {/* Image Showcase */}
          <div className="relative animate-fade-in lg:ml-auto w-full max-w-md mx-auto lg:max-w-none z-10">
            {/* Ambient drop shadow effect behind the image */}
            <div className="absolute inset-0 bg-zinc-900/5 dark:bg-white/5 blur-3xl rounded-[3rem] transform scale-105 translate-y-4"></div>
            
            <div className="relative rounded-[2rem] overflow-hidden border border-zinc-200/50 dark:border-zinc-700/50 bg-white dark:bg-[#18181B] shadow-2xl shadow-zinc-200/50 dark:shadow-black/50 p-2 md:p-4 group">
              <div className="rounded-[1.5rem] overflow-hidden bg-zinc-50 dark:bg-[#121215]">
                <img 
                  src={bannerImg} 
                  alt="Cartel Oficial Peluquería Elkin" 
                  className="w-full h-auto object-contain transition-transform duration-700 group-hover:scale-105"
                  style={{ maxHeight: '600px' }}
                />
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
