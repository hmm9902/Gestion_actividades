import React from 'react';
import { Sun, Moon, Sparkles, LogOut, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTema } from '../../hooks/useTema';
import { TemaTipo } from '../../types';

export const Topbar: React.FC = () => {
  const { usuario, logout } = useAuth();
  const { tema, cambiarTema } = useTema();

  const temas: { id: TemaTipo; label: string; icon: React.ReactNode }[] = [
    { id: 'normal', label: 'Normal', icon: <Sun size={15} /> },
    { id: 'dark', label: 'Dark', icon: <Moon size={15} /> },
    { id: 'dracula', label: 'Dracula', icon: <Sparkles size={15} /> },
  ];

  return (
    <header style={{
      height: 'var(--altura-header)',
      backgroundColor: 'var(--color-superficie)',
      borderBottom: '1px solid var(--color-borde)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 90,
      boxShadow: 'var(--sombra-sm)',
    }}>
      {/* Título de la app / indicador de entorno */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-texto-principal)' }}>
          Gestor de Actividades
        </h1>
        <span style={{
          backgroundColor: 'var(--color-primario-suave)',
          color: 'var(--color-primario)',
          padding: '2px 8px',
          borderRadius: 'var(--radio-pildora)',
          fontSize: '0.725rem',
          fontWeight: 600,
        }}>
          {usuario?.empresa || 'FCD'}
        </span>
      </div>

      {/* Controles de la derecha: Temas y Perfil */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        
        {/* Selector rápido de temas */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--color-fondo)',
          padding: '3px',
          borderRadius: 'var(--radio-md)',
          border: '1px solid var(--color-borde)',
          gap: '2px',
        }}>
          {temas.map(t => {
            const activo = tema === t.id;
            return (
              <button
                key={t.id}
                onClick={() => cambiarTema(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  borderRadius: 'var(--radio-sm)',
                  fontSize: '0.75rem',
                  fontWeight: activo ? 600 : 500,
                  backgroundColor: activo ? 'var(--color-superficie)' : 'transparent',
                  color: activo ? 'var(--color-primario)' : 'var(--color-texto-secundario)',
                  boxShadow: activo ? 'var(--sombra-sm)' : 'none',
                  cursor: 'pointer',
                  transition: 'all var(--transicion-rapida)',
                }}
                title={`Cambiar a tema ${t.label}`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Separador vertical */}
        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-borde)' }} />

        {/* Usuario info */}
        {usuario && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primario-suave)',
              color: 'var(--color-primario)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: '1px solid var(--color-primario-borde)',
            }}>
              {usuario.nombres_completos ? usuario.nombres_completos.charAt(0).toUpperCase() : <User size={18} />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-texto-principal)' }}>
                {usuario.nombres_completos}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>
                <span>{usuario.registro}</span>
                <span>•</span>
                <span style={{
                  color: usuario.perfil === 'ADMIN' ? '#EF4444' :
                         usuario.perfil === 'SWE' ? 'var(--color-primario)' :
                         'var(--color-texto-secundario)',
                  fontWeight: 600
                }}>
                  {usuario.perfil}
                </span>
              </div>
            </div>

            {/* Botón Logout */}
            <button
              onClick={logout}
              style={{
                marginLeft: '8px',
                padding: '8px',
                borderRadius: 'var(--radio-md)',
                color: 'var(--color-texto-secundario)',
                backgroundColor: 'var(--color-fondo)',
                border: '1px solid var(--color-borde)',
                cursor: 'pointer',
              }}
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}

      </div>
    </header>
  );
};
