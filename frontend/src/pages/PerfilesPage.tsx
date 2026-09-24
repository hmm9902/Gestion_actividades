import React, { useState, useEffect } from 'react';
import { ShieldCheck, Shield, CheckCircle, RefreshCw } from 'lucide-react';
import { apiRequest } from '../lib/api';

interface PerfilItem {
  perfil_id: number;
  descripcion: string;
  fecha_registro: string;
}

export const PerfilesPage: React.FC = () => {
  const [perfiles, setPerfiles] = useState<PerfilItem[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    try {
      setCargando(true);
      const data = await apiRequest<PerfilItem[]>('/perfiles');
      setPerfiles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const descripcionesPermisos: Record<string, string> = {
    ADMIN: 'Acceso total y configuración de todo el sistema, gestión de auditoría y usuarios.',
    SWE: 'Gestión funcional completa de actividades: crear, asignar, mover, cambiar estado y seguimiento.',
    DESARROLLADOR: 'Consulta de actividades, movimiento de tarjetas, registro de seguimiento y cambio de estado.',
    QA: 'Consulta y certificación de actividades, seguimiento y cambio de estados funcionales.',
    INTEGRADOR: 'Consulta, gestión de pases y despliegue a producción, seguimiento y cambios de estado.',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '850px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-texto-principal)' }}>
            Catálogo de Perfiles y Roles
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>
            Matriz de control de acceso y autorizaciones basada en roles (RBAC)
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secundario"
          onClick={cargar}
          disabled={cargando}
          title="Recargar perfiles"
        >
          <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {perfiles.map(p => (
          <div
            key={p.perfil_id}
            style={{
              backgroundColor: 'var(--color-superficie)',
              border: '1px solid var(--color-borde)',
              borderRadius: 'var(--radio-md)',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--sombra-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radio-md)',
                backgroundColor: 'var(--color-primario-suave)',
                color: 'var(--color-primario)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Shield size={20} />
              </div>

              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-texto-principal)' }}>
                  {p.descripcion}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)', marginTop: '2px' }}>
                  {descripcionesPermisos[p.descripcion] || 'Permisos funcionales configurados.'}
                </div>
              </div>
            </div>

            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-primario)',
              backgroundColor: 'var(--color-primario-suave)',
              padding: '4px 10px',
              borderRadius: 'var(--radio-pildora)',
            }}>
              <CheckCircle size={14} /> Activo
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
