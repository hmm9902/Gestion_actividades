import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Users, UserCheck, ShieldCheck,
  Kanban, Users2, Settings, ShieldAlert,
  ChevronLeft, ChevronRight, Layers, FolderKanban, Database, Rocket,
  Ticket as TicketIcon, AlertOctagon
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  colapsado: boolean;
  setColapsado: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ colapsado, setColapsado }) => {
  const { usuario } = useAuth();

  const linkEstilo = ({ isActive }: { isActive: boolean }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: colapsado ? '0' : '12px',
    justifyContent: colapsado ? 'center' : 'flex-start',
    padding: '10px 14px',
    borderRadius: 'var(--radio-md)',
    color: isActive ? 'var(--sidebar-item-activo-texto)' : 'var(--color-texto-secundario)',
    backgroundColor: isActive ? 'var(--sidebar-item-activo)' : 'transparent',
    fontWeight: isActive ? 600 : 500,
    fontSize: '0.875rem',
    textDecoration: 'none',
    transition: 'all var(--transicion-rapida)',
  });

  return (
    <aside style={{
      width: colapsado ? 'var(--ancho-sidebar-colapsado)' : 'var(--ancho-sidebar)',
      backgroundColor: 'var(--sidebar-fondo)',
      borderRight: '1px solid var(--color-borde)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      transition: 'width var(--transicion-normal)',
      zIndex: 100,
    }}>
      {/* Cabecera / Logo */}
      <div style={{
        height: 'var(--altura-header)',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: colapsado ? 'center' : 'space-between',
        borderBottom: '1px solid var(--color-borde)',
      }}>
        {!colapsado && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radio-md)',
              background: 'var(--color-primario-gradiente)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              boxShadow: 'var(--sombra-sm)',
            }}>
              <Layers size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-texto-principal)' }}>
                Gestor FCD
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-texto-terciario)', letterSpacing: '0.5px' }}>
                ACTIVIDADES
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setColapsado(!colapsado)}
          style={{
            padding: '6px',
            borderRadius: 'var(--radio-sm)',
            color: 'var(--color-texto-secundario)',
            backgroundColor: 'var(--color-superficie-hover)',
          }}
          title={colapsado ? "Expandir menú" : "Colapsar menú"}
        >
          {colapsado ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navegación */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: '22px' }}>

        {/* Sección: GESTIÓN DE ACTIVIDADES */}
        <div>
          {!colapsado && (
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-texto-terciario)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 8px 8px' }}>
              Gestión de Actividades
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <NavLink to="/actividades" style={linkEstilo} title="Actividades / Tablero">
              <Kanban size={18} />
              {!colapsado && <span>Actividades & Kanban</span>}
            </NavLink>
            <NavLink to="/grupos" style={linkEstilo} title="Asignación de Grupos">
              <Users2 size={18} />
              {!colapsado && <span>Asignación de Grupos</span>}
            </NavLink>
            {(usuario?.perfil === 'ADMIN' || usuario?.perfil === 'SWE') && (
              <NavLink to="/pases" style={linkEstilo} title="Gestión de Pases">
                <Rocket size={18} />
                {!colapsado && <span>Gestión de Pases</span>}
              </NavLink>
            )}
            {(usuario?.perfil === 'ADMIN' || usuario?.perfil === 'SWE') && (
              <NavLink to="/tickets" style={linkEstilo} title="Gestión de Tickets">
                <TicketIcon size={18} />
                {!colapsado && <span>Gestión de Tickets</span>}
              </NavLink>
            )}
            {(usuario?.perfil === 'ADMIN' || usuario?.perfil === 'SWE') && (
              <NavLink to="/incidentes" style={linkEstilo} title="Registro de Incidentes">
                <AlertOctagon size={18} />
                {!colapsado && <span>Registro de Incidentes</span>}
              </NavLink>
            )}
          </div>
        </div>

        {/* Sección: REGISTROS */}
        <div>
          {!colapsado && (
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-texto-terciario)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 8px 8px' }}>
              Registros
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <NavLink to="/registros" style={linkEstilo} title="Registros">
              <UserCheck size={18} />
              {!colapsado && <span>Registros</span>}
            </NavLink>
            {(usuario?.perfil === 'ADMIN' || usuario?.perfil === 'SWE') && (
              <NavLink to="/proyectos" style={linkEstilo} title="Proyectos">
                <FolderKanban size={18} />
                {!colapsado && <span>Proyectos</span>}
              </NavLink>
            )}
            {(usuario?.perfil === 'ADMIN' || usuario?.perfil === 'SWE') && (
              <NavLink to="/aplicaciones" style={linkEstilo} title="Aplicaciones">
                <Layers size={18} />
                {!colapsado && <span>Aplicaciones</span>}
              </NavLink>
            )}
            {usuario?.perfil === 'ADMIN' && (
              <NavLink to="/usuarios" style={linkEstilo} title="Usuarios">
                <Users size={18} />
                {!colapsado && <span>Usuarios</span>}
              </NavLink>
            )}
            <NavLink to="/perfiles" style={linkEstilo} title="Perfiles">
              <ShieldCheck size={18} />
              {!colapsado && <span>Perfiles</span>}
            </NavLink>
          </div>
        </div>

        {/* Sección: CONFIGURACIÓN & AUDITORÍA */}
        <div>
          {!colapsado && (
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-texto-terciario)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 8px 8px' }}>
              Sistema
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <NavLink to="/configuracion" style={linkEstilo} title="Configuración">
              <Settings size={18} />
              {!colapsado && <span>Configuración & Temas</span>}
            </NavLink>
            {usuario?.perfil === 'ADMIN' && (
              <NavLink to="/auditoria" style={linkEstilo} title="Auditoría">
                <ShieldAlert size={18} />
                {!colapsado && <span>Auditoría</span>}
              </NavLink>
            )}
            {(usuario?.perfil === 'ADMIN' || usuario?.perfil === 'SWE') && (
              <NavLink to="/sistema/bd" style={linkEstilo} title="Elegir Bd_Sistema">
                <Database size={18} />
                {!colapsado && <span>Elegir Bd_Sistema</span>}
              </NavLink>
            )}
          </div>
        </div>

      </div>

      {/* Pie de Sidebar con información de versión */}
      {!colapsado && (
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--color-borde)',
          fontSize: '0.75rem',
          color: 'var(--color-texto-terciario)',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span>v1.0.0 (Turso / SQLite)</span>
          <span style={{ color: 'var(--color-primario)', fontWeight: 600 }}>En línea</span>
        </div>
      )}
    </aside>
  );
};
