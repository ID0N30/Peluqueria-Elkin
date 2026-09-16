import React from 'react';
import { Scissors, Sparkles, CheckCircle2 } from 'lucide-react';

export default function ServicesSection() {
  const services = [
    {
      id: 1,
      title: "[Servicio 1: ej. Corte Clásico Caballero]",
      description: "[Descripción y precio sugerido]",
      price: "[-]",
      icon: <Scissors className="w-6 h-6" />
    },
    {
      id: 2,
      title: "[Servicio 2: ej. Afeitado y Perfilado de Barba]",
      description: "[Descripción y precio sugerido]",
      price: "[-]",
      icon: <CheckCircle2 className="w-6 h-6" />
    },
    {
      id: 3,
      title: "[Servicio 3: ej. Corte y Barba Completo]",
      description: "[Descripción y precio sugerido]",
      price: "[-]",
      icon: <Sparkles className="w-6 h-6" />
    },
    {
      id: 4,
      title: "[Servicio 4: ej. Corte para Niños / Jóvenes]",
      description: "[Descripción y precio sugerido]",
      price: "[-]",
      icon: <Scissors className="w-6 h-6" />
    }
  ];

  return (
    <section className="py-20 md:py-32 bg-zinc-50 dark:bg-[#09090B] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl md:text-5xl font-playfair font-bold text-zinc-900 dark:text-white">
            [Servicios de Peluquería & Barbería]
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-lg">
            [Espacio para listar los cortes y servicios con sus descripciones y precios acordados con Elkin].
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
