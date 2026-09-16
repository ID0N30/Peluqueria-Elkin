import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebaseClient';

export default function StylistsManager() {
  const [stylists, setStylists] = useState([]);
  const [newStylistName, setNewStylistName] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'config', 'schedule'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStylists(data.stylists || []);
      }
    });
    return () => unsubscribe();
  }, []);

  const activeCount = stylists.filter(s => s.active).length;

  const handleToggle = async (index) => {
    const newStylists = [...stylists];
    newStylists[index].active = !newStylists[index].active;
    await updateDoc(doc(db, 'config', 'schedule'), { stylists: newStylists });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newStylistName.trim()) return;
    
    const newStylists = [...stylists, {
      id: Date.now().toString(),
      name: newStylistName.trim(),
      active: true
    }];
    
    await updateDoc(doc(db, 'config', 'schedule'), { stylists: newStylists });
    setNewStylistName('');
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold m-0 text-zinc-900 dark:text-white">Gestión de Estilistas</h3>
        <span className="badge badge-success">
          Cupo por franja: {activeCount} citas
        </span>
      </div>
      
      <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">
        El número de estilistas activos determina cuántas personas pueden agendar a la misma hora.
      </p>

      <ul className="list-none p-0 mb-6 space-y-2">
        {stylists.map((stylist, index) => (
          <li key={stylist.id} className="flex justify-between items-center p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/50">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{stylist.name}</span>
            <button 
              className={`px-3 py-1 rounded-lg text-sm transition-colors border ${
                stylist.active 
                  ? 'bg-zinc-900 text-white dark:bg-zinc-700 dark:text-zinc-100 border-zinc-900 dark:border-zinc-600' 
                  : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 dark:hover:bg-zinc-700'
              }`}
              onClick={() => handleToggle(index)}
            >
              {stylist.active ? 'Activo' : 'Inactivo'}
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input 
          type="text" 
          className="form-input w-full"
          placeholder="Nombre del nuevo estilista"
          value={newStylistName}
          onChange={e => setNewStylistName(e.target.value)}
        />
        <button type="submit" className="btn btn-primary whitespace-nowrap">
          Agregar
        </button>
      </form>
    </div>
  );
}
