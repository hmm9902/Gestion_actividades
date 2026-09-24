import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '../../hooks/useAuth';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { useNotificacion } from '../../context/NotificacionContext';

export const AppLayout: React.FC = () => {
  const { usuario, loading, retirarAlerta } = useAuth();
  const [colapsado, setColapsado] = useState(false);
  const { exito } = useNotificacion();

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-fondo)',
        color: 'var(--color-texto-secundario)',
        fontSize: '1rem',
        fontWeight: 500,
      }}>
        Cargando Gestor de Actividades...
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  const handleRetirarAlerta = async () => {
    try {
      await retirarAlerta();
      exito('Alerta de expiración retirada satisfactoriamente.');
    } catch (e: any) {
      console.error(e);
    }
  };

  // Mostrar alerta si es SWE, tiene alerta configurada y no la ha retirado
  const mostrarAlerta = Boolean(usuario.alerta_expiracion && !usuario.alerta_retirada);
  const esVencida = (usuario.alerta_expiracion_dias !== null && usuario.alerta_expiracion_dias !== undefined) && usuario.alerta_expiracion_dias < 0;

  return (
    <div style={{ display: 'flex', height: '100vh', maxHeight: '100vh', overflow: 'hidden', backgroundColor: 'var(--color-fondo)' }}>
      {/* Barra lateral */}
      <Sidebar colapsado={colapsado} setColapsado={setColapsado} />

      {/* Área principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, height: '100%' }}>
        <Topbar />

        {/* Banner de alerta de expiración */}
        {mostrarAlerta && (
          <div style={{
            backgroundColor: esVencida ? '#FEE2E2' : '#FEF3C7',
            borderBottom: `1px solid ${esVencida ? '#FCA5A5' : '#FCD34D'}`,
            color: esVencida ? '#991B1B' : '#92400E',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
            fontWeight: 500,
            animation: 'fadeIn 0.3s ease-in',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {esVencida ? <AlertTriangle size={18} /> : <Clock size={18} />}
              <span>{usuario.alerta_expiracion}</span>
            </div>

            <button
              onClick={handleRetirarAlerta}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radio-sm)',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                color: 'inherit',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <X size={14} />
              Retirar mensaje
            </button>
          </div>
        )}

        {/* Contenido de la vista */}
        <main style={{ flex: 1, minHeight: 0, padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
