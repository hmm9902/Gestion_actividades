import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, RefreshCw, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { AuditoriaEvento } from '../types';
import { apiRequest } from '../lib/api';

export const AuditoriaPage: React.FC = () => {
  const [eventos, setEventos] = useState<AuditoriaEvento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEntidad, setFiltroEntidad] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');

  // Paginación 10 en 10
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 10;

  const cargarAuditoria = async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (filtroEntidad) params.append('entidad', filtroEntidad);
      if (filtroUsuario.trim()) params.append('registro_usuario', filtroUsuario.trim().toUpperCase());
      const query = params.toString() ? `?${params.toString()}` : '';

      const data = await apiRequest<AuditoriaEvento[]>(`/auditoria${query}`);
      setEventos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarAuditoria();
  }, [filtroEntidad]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-texto-principal)' }}>
            Bitácora de Auditoría y Trazabilidad
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>
            Registro inmutable de acciones críticas, cambios de estado y accesos al sistema
          </p>
        </div>

        <button type="button" className="btn btn-secundario" onClick={cargarAuditoria} disabled={cargando}>
          <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div style={{
        backgroundColor: 'var(--color-superficie)',
        border: '1px solid var(--color-borde)',
        borderRadius: 'var(--radio-lg)',
        padding: '16px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <input
          type="text"
          className="form-input"
          style={{ width: '220px' }}
          placeholder="Filtrar por Registro/Usuario..."
          value={filtroUsuario}
          onChange={e => setFiltroUsuario(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && cargarAuditoria()}
        />

        <select
          className="form-select"
          style={{ width: '200px' }}
          value={filtroEntidad}
          onChange={e => setFiltroEntidad(e.target.value)}
        >
          <option value="">Entidad: Todas</option>
          <option value="ACTIVIDADES">ACTIVIDADES</option>
          <option value="ASIGNACION_GRUPOS">ASIGNACION_GRUPOS</option>
          <option value="ASIGNACION_DET_GRUPOS">ASIGNACION_DET_GRUPOS</option>
          <option value="SEGUIMIENTO">SEGUIMIENTO</option>
          <option value="USUARIOS">USUARIOS</option>
          <option value="REGISTRO">REGISTRO</option>
        </select>

        <button type="button" className="btn btn-primario btn-sm" onClick={cargarAuditoria}>
          Filtrar
        </button>
      </div>

      {/* Tabla de Eventos */}
      <div style={{
        backgroundColor: 'var(--color-superficie)',
        border: '1px solid var(--color-borde)',
        borderRadius: 'var(--radio-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--sombra-sm)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
            <thead style={{ backgroundColor: 'var(--color-superficie-hover)', borderBottom: '1px solid var(--color-borde)' }}>
              <tr>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Fecha y Hora</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Usuario</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Acción</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Entidad / ID</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Detalle de Cambio</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>IP Origen</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={6} style={{ padding: '30px', textAlign: 'center' }}>Cargando bitácora de auditoría...</td></tr>
              ) : eventos.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '30px', textAlign: 'center' }}>No se registraron eventos.</td></tr>
              ) : (
                eventos
                  .slice((paginaActual - 1) * ITEMS_POR_PAGINA, (paginaActual - 1) * ITEMS_POR_PAGINA + ITEMS_POR_PAGINA)
                  .map(ev => (
                  <tr key={ev.auditoria_id} style={{ borderBottom: '1px solid var(--color-borde-suave)' }}>
                    <td style={{ padding: '12px 14px', color: 'var(--color-texto-terciario)', whiteSpace: 'nowrap' }}>
                      {new Date(ev.fecha).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-primario)' }}>
                      {ev.registro_usuario}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radio-pildora)',
                        backgroundColor: 'var(--color-fondo)',
                        border: '1px solid var(--color-borde)',
                      }}>
                        {ev.accion}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--color-texto-secundario)' }}>
                      {ev.entidad} {ev.entidad_id ? `(${ev.entidad_id})` : ''}
                    </td>
                    <td style={{ padding: '12px 14px', maxWidth: '300px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                      {ev.datos_nuevos || ev.datos_anteriores || '-'}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--color-texto-terciario)' }}>
                      {ev.ip || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación de 10 en 10 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderTop: '1px solid var(--color-borde)',
          backgroundColor: 'var(--color-superficie)',
          fontSize: '0.85rem',
          color: 'var(--color-texto-secundario)',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <div>
            Mostrando {eventos.length === 0 ? 0 : (paginaActual - 1) * ITEMS_POR_PAGINA + 1} a {Math.min(paginaActual * ITEMS_POR_PAGINA, eventos.length)} de {eventos.length} eventos
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secundario btn-sm"
              onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
              disabled={paginaActual <= 1}
              style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <span style={{ fontWeight: 600, padding: '0 6px' }}>
              Página {paginaActual} de {Math.max(1, Math.ceil(eventos.length / ITEMS_POR_PAGINA))}
            </span>
            <button
              type="button"
              className="btn btn-secundario btn-sm"
              onClick={() => setPaginaActual(p => Math.min(Math.max(1, Math.ceil(eventos.length / ITEMS_POR_PAGINA)), p + 1))}
              disabled={paginaActual >= Math.ceil(eventos.length / ITEMS_POR_PAGINA)}
              style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
