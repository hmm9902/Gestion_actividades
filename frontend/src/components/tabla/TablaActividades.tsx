import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, 
  Eye, Edit, AlertTriangle, Plus, Trash2 
} from 'lucide-react';
import { Actividad, Grupo, EstadoActividad, TipoActividad } from '../../types';
import { apiRequest } from '../../lib/api';
import { useNotificacion } from '../../context/NotificacionContext';

interface TablaActividadesProps {
  actividades: Actividad[];
  grupos: Grupo[];
  onAbrirDetalle: (codigo: string) => void;
  onAbrirCambioEstado: (actividad: Actividad) => void;
  onAbrirNuevaActividad: () => void;
  puedeCrear: boolean;
  onActualizar?: () => void;
}

export const TablaActividades: React.FC<TablaActividadesProps> = ({
  actividades,
  grupos,
  onAbrirDetalle,
  onAbrirCambioEstado,
  onAbrirNuevaActividad,
  puedeCrear,
  onActualizar,
}) => {
  const { exito, error: notifyError } = useNotificacion();
  const [busqueda, setBusqueda] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroSprint, setFiltroSprint] = useState('');
  const [filtroQ, setFiltroQ] = useState('');

  // Tooltip dinámico para la columna Título
  const [tooltipTitulo, setTooltipTitulo] = useState<{ texto: string; x: number; y: number } | null>(null);

  const [ordenCampo, setOrdenCampo] = useState<keyof Actividad>('fecha_registro');
  const [ordenAsc, setOrdenAsc] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const elementosPorPagina = 10;

  // Filtrado
  const actividadesFiltradas = useMemo(() => {
    return actividades.filter(a => {
      if (filtroGrupo && a.codigo_grupo !== filtroGrupo) return false;
      // En modo TABLA sólo cuando se escoja el filtro 'Finalizado' se muestran actividades en estado Finalizado
      if (filtroEstado) {
        if (a.estado !== filtroEstado) return false;
      } else {
        if (a.estado === 'Finalizado') return false;
      }
      if (filtroTipo) {
        const tAct = (a.tipo_actividad || '').toLowerCase();
        const fTipo = filtroTipo.toLowerCase();
        const coincide = tAct === fTipo ||
          (filtroTipo === 'Tarea' && tAct === 'tarea') ||
          (filtroTipo === 'HU_Negocio' && (tAct === 'hu_negocio' || tAct === 'hu negocio')) ||
          (filtroTipo === 'Deuda Tecnica' && (tAct === 'deuda tecnica' || tAct === 'deuda técnica'));
        if (!coincide) return false;
      }
      if (filtroSprint && a.sprint !== filtroSprint) return false;
      if (filtroQ && a.q_trabajo !== filtroQ) return false;

      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const coincide =
          a.codigo_actividad.toLowerCase().includes(q) ||
          a.titulo.toLowerCase().includes(q) ||
          (a.nombre_proyecto && a.nombre_proyecto.toLowerCase().includes(q)) ||
          (a.orden_cambio && a.orden_cambio.toLowerCase().includes(q)) ||
          (a.srt_rational && a.srt_rational.toLowerCase().includes(q)) ||
          (a.nombre_asignado && a.nombre_asignado.toLowerCase().includes(q));
        if (!coincide) return false;
      }

      return true;
    });
  }, [actividades, filtroGrupo, filtroEstado, filtroTipo, filtroSprint, filtroQ, busqueda]);

  // Ordenamiento (por defecto fecha_registro descendente)
  const actividadesOrdenadas = useMemo(() => {
    return [...actividadesFiltradas].sort((a, b) => {
      if (ordenCampo === 'fecha_registro') {
        const timeA = a.fecha_registro ? new Date(a.fecha_registro).getTime() : 0;
        const timeB = b.fecha_registro ? new Date(b.fecha_registro).getTime() : 0;
        return ordenAsc ? timeA - timeB : timeB - timeA;
      }
      let valA = a[ordenCampo] || '';
      let valB = b[ordenCampo] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return ordenAsc ? -1 : 1;
      if (valA > valB) return ordenAsc ? 1 : -1;
      return 0;
    });
  }, [actividadesFiltradas, ordenCampo, ordenAsc]);

  // Paginación
  const totalPaginas = Math.ceil(actividadesOrdenadas.length / elementosPorPagina) || 1;
  const elementosPaginados = actividadesOrdenadas.slice(
    (paginaActual - 1) * elementosPorPagina,
    paginaActual * elementosPorPagina
  );

  const cambiarOrden = (campo: keyof Actividad) => {
    if (ordenCampo === campo) {
      setOrdenAsc(!ordenAsc);
    } else {
      setOrdenCampo(campo);
      setOrdenAsc(campo === 'fecha_registro' ? false : true);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Barra de Filtros y Búsqueda */}
      <div style={{
        backgroundColor: 'var(--color-superficie)',
        border: '1px solid var(--color-borde)',
        borderRadius: 'var(--radio-lg)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: 'var(--sombra-sm)',
      }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Buscador */}
          <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-texto-terciario)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '38px' }}
              placeholder="Buscar por código, título, OC o SRT..."
              value={busqueda}
              onChange={e => {
                setBusqueda(e.target.value);
                setPaginaActual(1);
              }}
            />
          </div>

          {/* Botón Nueva Actividad */}
          {puedeCrear && (
            <button
              type="button"
              className="btn btn-primario"
              onClick={onAbrirNuevaActividad}
            >
              <Plus size={16} />
              Nueva Actividad
            </button>
          )}
        </div>

        {/* Fila de Filtros Selectores */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          <select className="form-select" value={filtroGrupo} onChange={e => { setFiltroGrupo(e.target.value); setPaginaActual(1); }}>
            <option value="">Grupo: Todos</option>
            {grupos.map(g => (
              <option key={g.codigo_grupo} value={g.codigo_grupo}>{g.nombre_grupo}</option>
            ))}
          </select>

          <select className="form-select" value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPaginaActual(1); }}>
            <option value="">Estado: Todos</option>
            <option value="registrado">Registrado</option>
            <option value="desarrollo">En Desarrollo</option>
            <option value="certificacion">Certificación</option>
            <option value="Finalizado">Finalizado</option>
            <option value="GESTION_PRD">Gestión PRD</option>
            <option value="EN_PRD">En PRD</option>
            <option value="impedimento">Impedimento</option>
          </select>

          <select className="form-select" value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPaginaActual(1); }}>
            <option value="">Tipo: Todos</option>
            <option value="Tarea">Tarea</option>
            <option value="Deuda Tecnica">Deuda Tecnica</option>
            <option value="HU_Negocio">HU_Negocio</option>
          </select>

          <select className="form-select" value={filtroSprint} onChange={e => { setFiltroSprint(e.target.value); setPaginaActual(1); }}>
            <option value="">Sprint: Todos</option>
            {[1, 2, 3, 4, 5, 6].map(s => (
              <option key={s} value={String(s)}>Sprint {s}</option>
            ))}
          </select>

          <select className="form-select" value={filtroQ} onChange={e => { setFiltroQ(e.target.value); setPaginaActual(1); }}>
            <option value="">Q: Todos</option>
            {[1, 2, 3, 4].map(q => (
              <option key={q} value={String(q)}>Q{q}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Actividades */}
      <div style={{
        backgroundColor: 'var(--color-superficie)',
        border: '1px solid var(--color-borde)',
        borderRadius: 'var(--radio-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--sombra-sm)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead style={{ backgroundColor: 'var(--color-superficie-hover)', borderBottom: '1px solid var(--color-borde)' }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', cursor: 'pointer' }} onClick={() => cambiarOrden('codigo_actividad')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Código <ArrowUpDown size={14} />
                  </div>
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', cursor: 'pointer' }} onClick={() => cambiarOrden('titulo')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Título <ArrowUpDown size={14} />
                  </div>
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', cursor: 'pointer' }} onClick={() => cambiarOrden('nombre_proyecto')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Nombre_Proyecto <ArrowUpDown size={14} />
                  </div>
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Tipo</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Estado</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Asignado</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>SWE</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Sprint/Q</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => cambiarOrden('fecha_registro')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Fecha Registro <ArrowUpDown size={14} />
                  </div>
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {elementosPaginados.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-texto-terciario)' }}>
                    No se encontraron actividades con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                elementosPaginados.map(act => (
                  <tr
                    key={act.actividad_id}
                    className="fila-interactiva"
                    tabIndex={0}
                    title="Doble clic para ver detalle completo"
                    onDoubleClick={() => onAbrirDetalle(act.codigo_actividad)}
                    style={{
                      borderBottom: '1px solid var(--color-borde-suave)',
                      transition: 'background-color 0.15s ease-in-out',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FEF9C3')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    onFocus={e => (e.currentTarget.style.backgroundColor = '#FEF9C3')}
                    onBlur={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-primario)' }}>
                      {act.codigo_actividad}
                    </td>
                    <td
                      style={{ padding: '12px 16px', maxWidth: '280px', cursor: 'default' }}
                      onMouseEnter={e => setTooltipTitulo({ texto: act.titulo, x: e.clientX, y: e.clientY })}
                      onMouseMove={e => setTooltipTitulo({ texto: act.titulo, x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setTooltipTitulo(null)}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--color-texto-principal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {act.titulo}
                      </div>
                      {act.impedimentos && (
                        <div style={{ fontSize: '0.75rem', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <AlertTriangle size={12} />
                          {act.impedimentos}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: '200px' }}>
                      {act.nombre_proyecto ? (
                        <div style={{ fontWeight: 600, color: 'var(--color-primario)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={act.nombre_proyecto}>
                          {act.nombre_proyecto}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-texto-terciario)' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--color-texto-secundario)' }}>
                      {act.tipo_actividad}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge-estado badge-${act.estado}`}>
                        {act.estado}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {act.nombre_asignado || act.asignado_registro || 'Sin asignar'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-texto-secundario)' }}>
                      {act.nombre_swe || act.swe_encargado}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--color-texto-terciario)' }}>
                      S{act.sprint || 1} • Q{act.q_trabajo || 1}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--color-texto-terciario)', whiteSpace: 'nowrap' }}>
                      {act.fecha_registro ? new Date(act.fecha_registro).toLocaleString() : '-'}
                    </td>
                    <td 
                      style={{ padding: '12px 16px', textAlign: 'center' }}
                      onClick={e => e.stopPropagation()}
                      onDoubleClick={e => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        {act.estado === 'Finalizado' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 8px',
                              borderRadius: 'var(--radio-sm)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: 'var(--color-estado-finalizado-fondo, #F1F5F9)',
                              color: 'var(--color-estado-finalizado-texto, #64748B)',
                              border: '1px solid var(--color-estado-finalizado-borde, #CBD5E1)',
                              cursor: 'not-allowed',
                            }}
                            title="Actividad finalizada: no se puede cambiar de estado"
                          >
                            Bloqueado
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secundario btn-sm"
                            onClick={() => onAbrirCambioEstado(act)}
                            title="Cambiar estado con motivo obligatorio"
                          >
                            Estado
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-primario btn-sm"
                          onClick={() => onAbrirDetalle(act.codigo_actividad)}
                          title="Ver detalle completo"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginador */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--color-borde)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.85rem',
          color: 'var(--color-texto-secundario)',
        }}>
          <div>
            Total: <strong>{actividadesOrdenadas.length}</strong> actividades | Página <strong>{paginaActual}</strong> de <strong>{totalPaginas}</strong>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="btn btn-secundario btn-sm"
              disabled={paginaActual <= 1}
              onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <button
              className="btn btn-secundario btn-sm"
              disabled={paginaActual >= totalPaginas}
              onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
            >
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ToolTip flotante reactivo para la columna Título */}
      {tooltipTitulo && (
        <div
          style={{
            position: 'fixed',
            left: `${Math.min(tooltipTitulo.x + 12, window.innerWidth - 380)}px`,
            top: `${tooltipTitulo.y + 24 > window.innerHeight - 80 ? tooltipTitulo.y - 48 : tooltipTitulo.y + 16}px`,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '8px 14px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 500,
            maxWidth: '380px',
            wordBreak: 'break-word',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
            zIndex: 99999,
            pointerEvents: 'none',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            lineHeight: 1.45,
            animation: 'fadeIn 0.12s ease-out',
          }}
        >
          <div style={{ fontSize: '0.68rem', color: '#94A3B8', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
            Título de la Actividad
          </div>
          {tooltipTitulo.texto}
        </div>
      )}

    </div>
  );
};
