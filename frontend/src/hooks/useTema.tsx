import React, { createContext, useContext, useEffect, useState } from 'react';
import { TemaTipo } from '../types';

interface TemaContextType {
  tema: TemaTipo;
  cambiarTema: (nuevoTema: TemaTipo) => void;
}

const TemaContext = createContext<TemaContextType | undefined>(undefined);

export const TemaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tema, setTema] = useState<TemaTipo>(() => {
    const guardado = localStorage.getItem('tema_actividades');
    return (guardado === 'dark' || guardado === 'dracula' || guardado === 'normal') 
      ? guardado 
      : 'normal';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('tema_actividades', tema);
  }, [tema]);

  const cambiarTema = (nuevoTema: TemaTipo) => {
    setTema(nuevoTema);
  };

  return (
    <TemaContext.Provider value={{ tema, cambiarTema }}>
      {children}
    </TemaContext.Provider>
  );
};

export const useTema = () => {
  const ctx = useContext(TemaContext);
  if (!ctx) {
    throw new Error('useTema debe usarse dentro de un TemaProvider');
  }
  return ctx;
};
