import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type TipoNotificacion = 'exito' | 'error' | 'info';

interface Notificacion {
  id: string;
  mensaje: string;
  tipo: TipoNotificacion;
}

interface NotificacionContextType {
  notificar: (mensaje: string, tipo?: TipoNotificacion) => void;
  exito: (mensaje: string) => void;
  error: (mensaje: string) => void;
  info: (mensaje: string) => void;
}

const NotificacionContext = createContext<NotificacionContextType | undefined>(undefined);

export const NotificacionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

  const removerNotificacion = useCallback((id: string) => {
    setNotificaciones(prev => prev.filter(n => n.id !== id));
  }, []);

  const notificar = useCallback((mensaje: string, tipo: TipoNotificacion = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotificaciones(prev => [...prev, { id, mensaje, tipo }]);
    setTimeout(() => {
      removerNotificacion(id);
    }, 4500);
  }, [removerNotificacion]);

  const exito = useCallback((msg: string) => notificar(msg, 'exito'), [notificar]);
  const error = useCallback((msg: string) => notificar(msg, 'error'), [notificar]);
  const info = useCallback((msg: string) => notificar(msg, 'info'), [notificar]);

  return (
    <NotificacionContext.Provider value={{ notificar, exito, error, info }}>
      {children}
      {/* Contenedor de Toasts */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '400px'
      }}>
        {notificaciones.map(n => (
          <div
            key={n.id}
            className="toast"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: 'var(--radio-md)',
              backgroundColor: 'var(--color-superficie)',
              color: 'var(--color-texto-principal)',
              border: `1px solid ${
                n.tipo === 'exito' ? 'var(--color-primario)' :
                n.tipo === 'error' ? '#EF4444' : 'var(--color-borde)'
              }`,
              borderLeftWidth: '5px',
              boxShadow: 'var(--sombra-lg)',
            }}
          >
            {n.tipo === 'exito' && <CheckCircle2 size={18} color="var(--color-primario)" />}
            {n.tipo === 'error' && <AlertCircle size={18} color="#EF4444" />}
            {n.tipo === 'info' && <Info size={18} color="#3B82F6" />}
            <span style={{ fontSize: '0.875rem', flex: 1 }}>{n.mensaje}</span>
            <button
              onClick={() => removerNotificacion(n.id)}
              style={{ color: 'var(--color-texto-terciario)', cursor: 'pointer', padding: '2px' }}
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </NotificacionContext.Provider>
  );
};

export const useNotificacion = () => {
  const ctx = useContext(NotificacionContext);
  if (!ctx) throw new Error('useNotificacion debe usarse dentro de NotificacionProvider');
  return ctx;
};
