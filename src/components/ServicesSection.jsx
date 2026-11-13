import React from 'react';
import { Scissors, Sparkles, CheckCircle2 } from 'lucide-react';

export default function ServicesSection() {
  const services = [
    {
      id: 1,
      title: "Corte Clásico y Moderno",
      description: "Corte a tijera o máquina, degradados (fade), desvanecidos y estilo personalizado con acabado limpio y detallado.",
      price: "30 min",
      icon: <Scissors className="w-6 h-6" />
    },
    {
      id: 2,
      title: "Arreglo y Perfilado de Barba",
      description: "Diseño, rebaje y delineado de barba y bigote con cuchilla profesional para un rostro impecable y definido.",
      price: "30 min",
      icon: <CheckCircle2 className="w-6 h-6" />
    },
    {
      id: 3,
      title: "Servicio Completo (Corte + Barba)",
      description: "La experiencia completa de barbería: renovación total de corte de cabello más perfilado y arreglo detallado de barba.",
      price: "Atención Integral",
      icon: <Sparkles className="w-6 h-6" />
    },
    {
      id: 4,
      title: "Corte para Niños y Jóvenes",
      description: "Atención paciente, amable y cuidadosa para los más pequeños y estudiantes de Victoria, con cortes escolares o modernos.",
      price: "30 min",
      icon: <Scissors className="w-6 h-6" />
    }
  ];

  return (
    <section className="py-20 md:py-32 bg-zinc-50 dark:bg-[#09090B] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl md:text-5xl font-playfair font-bold text-zinc-900 dark:text-white">
            Servicios de Peluquería y Barbería
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-lg">
            Calidad, puntualidad y dedicación en cada corte para los habitantes de Victoria, Caldas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {services.map((service) => (
            <div 
              key={service.id} 
              className="group bg-white dark:bg-[#18181B] p-8 rounded-[2rem] border border-zinc-200/60 dark:border-zinc-800/60 hover:border-zinc-900/20 dark:hover:border-zinc-600 transition-all duration-300 hover:shadow-2xl hover:shadow-zinc-900/5 dark:hover:shadow-black/50"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-2xl text-zinc-900 dark:text-white group-hover:scale-110 transition-transform duration-300">
                  {service.icon}
                </div>
                <span className="font-playfair font-semibold text-lg text-zinc-900 dark:text-zinc-100">
                  {service.price}
                </span>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">
                {service.title}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
