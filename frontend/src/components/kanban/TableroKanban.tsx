import React, { useState } from 'react';
import {
  Users, UserCheck, Plus, AlertTriangle,
  Calendar, Layers, Filter, Check, Eye,
  ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { Actividad, EstadoActividad, Grupo, MiembroGrupo } from '../../types';
import { apiRequest } from '../../lib/api';
import { useNotificacion } from '../../context/NotificacionContext';
import { COLUMNAS_KANBAN, ColumnaInfo } from './kanbanConstantes';

const COLUMNAS = COLUMNAS_KANBAN;

interface TableroKanbanProps {
  actividades: Actividad[];
  grupos: Grupo[];
  grupoSeleccionado: string;
  onSeleccionarGrupo: (codigo: string) => void;
  personaSeleccionada: string | null;
  onSeleccionarPersona: (registro: string | null) => void;
  onAbrirDetalle: (codigo: string) => void;
  onAbrirCambioEstado: (actividad: Actividad) => void;
  onAbrirNuevaActividad: () => void;
  puedeCrear: boolean;
  onActualizarActividades: () => void;
  columnasColapsadas?: Record<string, boolean>;
  onToggleColapsarColumna?: (id: string) => void;
}

export const TableroKanban: React.FC<TableroKanbanProps> = ({
  actividades,
  grupos,
  grupoSeleccionado,
  onSeleccionarGrupo,
  personaSeleccionada,
  onSeleccionarPersona,
  onAbrirDetalle,
  onAbrirCambioEstado,
  onAbrirNuevaActividad,
  puedeCrear,
  onActualizarActividades,
  columnasColapsadas: columnasColapsadasProp,
  onToggleColapsarColumna: onToggleColapsarColumnaProp,
}) => {
  const { exito } = useNotificacion();
  const [arrastrandoCodigo, setArrastrandoCodigo] = useState<string | null>(null);
  const [columnaHover, setColumnaHover] = useState<string | null>(null);
  const [columnasColapsadasLocal, setColumnasColapsadasLocal] = useState<Record<string, boolean>>({});
  const [panelGrupoColapsado, setPanelGrupoColapsado] = useState<boolean>(false);

  const columnasColapsadas = columnasColapsadasProp !== undefined ? columnasColapsadasProp : columnasColapsadasLocal;

  const toggleColapsarColumna = (colId: string) => {
    if (onToggleColapsarColumnaProp) {
      onToggleColapsarColumnaProp(colId);
    } else {
      setColumnasColapsadasLocal(prev => ({
        ...prev,
        [colId]: !prev[colId],
      }));
    }
  };

  // Obtener grupo actual y sus miembros para el panel izquierdo
  const grupoActual = grupos.find(g => g.codigo_grupo === grupoSeleccionado);
  const miembrosGrupo = grupoActual?.miembros || [];

  // Filtrado de actividades: por persona seleccionada si aplica
  const actividadesFiltradas = personaSeleccionada
    ? actividades.filter(a => a.asignado_registro === personaSeleccionada)
    : actividades;

  // Handlers para Drag & Drop nativo de alta fluidez
  const handleDragStart = (e: React.DragEvent, codigo: string) => {
    e.dataTransfer.setData('text/plain', codigo);
    e.dataTransfer.effectAllowed = 'move';
    setArrastrandoCodigo(codigo);
  };

  const handleDragOver = (e: React.DragEvent, columnaId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setColumnaHover(columnaId);
  };

  const handleDragLeave = () => {
    setColumnaHover(null);
  };

  const handleDrop = async (e: React.DragEvent, columnaDestino: EstadoActividad) => {
    e.preventDefault();
    setColumnaHover(null);
    const codigo = e.dataTransfer.getData('text/plain') || arrastrandoCodigo;
    setArrastrandoCodigo(null);

    if (!codigo) return;
    const act = actividades.find(a => a.codigo_actividad === codigo);
    if (!act) return;

    // Si se arrastra dentro de la misma columna o a otra columna:
    // REGLA CRÍTICA DE README: "ESTADO vs POSICIÓN: No modificar el estado funcional solo por arrastrar una tarjeta, excepto que una regla de negocio explícita lo defina. Cada cambio de estado exige modal y motivo."
    // Si se suelta en otra columna, abrimos el modal de cambio de estado para solicitar motivo obligatorio!
    if (act.estado !== columnaDestino) {
      onAbrirCambioEstado(act);
    } else {
      // Si se reordena dentro de la misma columna, actualizamos la posición persistente
      try {
        const nuevaPos = act.posicion + 1;
        await apiRequest(`/actividades/${codigo}/posicion`, {
          method: 'PUT',
          body: JSON.stringify({ nueva_posicion: nuevaPos }),
        });
        onActualizarActividades();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0, height: '100%', minWidth: 0 }}>

      {/* PANEL IZQUIERDO: Selector de Grupo y Filtro por Persona (estilo Trello) */}
      {panelGrupoColapsado ? (
        <div
          onClick={() => setPanelGrupoColapsado(false)}
          style={{
            width: '46px',
            minWidth: '46px',
            maxWidth: '46px',
            height: '100%',
            maxHeight: '100%',
            backgroundColor: 'var(--color-superficie)',
            border: '1px solid var(--color-borde)',
            borderTop: '4px solid var(--color-primario)',
            borderRadius: 'var(--radio-lg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: 'var(--sombra-sm)',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'all var(--transicion-normal)',
            flexShrink: 0,
          }}
          title={`Panel "Grupo" encogido (${grupoActual ? grupoActual.nombre_grupo : 'Todos los grupos'}). Clic para expandir.`}
        >
          {/* Cabecera superior compacta: botón para expandir e ícono */}
          <div
            style={{
              padding: '10px 4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              borderBottom: '1px solid var(--color-borde)',
              backgroundColor: 'var(--color-fondo)',
              borderTopLeftRadius: 'var(--radio-md)',
              borderTopRightRadius: 'var(--radio-md)',
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPanelGrupoColapsado(false);
              }}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: 'var(--radio-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--color-superficie)',
                border: '1px solid var(--color-borde)',
                color: 'var(--color-primario)',
                cursor: 'pointer',
              }}
              title="Expandir panel Grupo"
              aria-label="Expandir panel Grupo"
            >
              <ChevronsRight size={15} />
            </button>
            <Layers size={14} color="var(--color-primario)" />
          </div>

          {/* Frase vertical del panel */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 0',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--color-texto-principal)',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
              }}
            >
              Grupo{grupoActual ? `(${grupoActual.codigo_grupo})` : ''}
            </span>
          </div>

          {/* Contador de miembros al pie si hay grupo */}
          {miembrosGrupo.length > 0 && (
            <div style={{ padding: '8px 0', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <span
                style={{
                  padding: '2px 6px',
                  borderRadius: 'var(--radio-pildora)',
                  backgroundColor: 'var(--color-fondo)',
                  border: '1px solid var(--color-borde)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'var(--color-texto-secundario)',
                }}
                title={`${miembrosGrupo.length} colaboradores`}
              >
                {miembrosGrupo.length}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          width: '260px',
          flexShrink: 0,
          backgroundColor: 'var(--color-superficie)',
          border: '1px solid var(--color-borde)',
          borderRadius: 'var(--radio-lg)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: 'var(--sombra-sm)',
          overflowY: 'auto',
          height: '100%',
          minHeight: 0,
          transition: 'all var(--transicion-normal)',
        }}>
          {/* Selector de Grupo */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <Layers size={15} color="var(--color-primario)" />
                Grupo
              </label>
              <button
                type="button"
                onClick={() => setPanelGrupoColapsado(true)}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: 'var(--radio-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--color-fondo)',
                  border: '1px solid var(--color-borde)',
                  color: 'var(--color-texto-secundario)',
                  cursor: 'pointer',
                  transition: 'all var(--transicion-rapida)',
                }}
                title="Achicar panel Grupo"
                aria-label="Achicar panel Grupo"
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'var(--color-superficie-hover)';
                  e.currentTarget.style.color = 'var(--color-primario)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'var(--color-fondo)';
                  e.currentTarget.style.color = 'var(--color-texto-secundario)';
                }}
              >
                <ChevronsLeft size={15} />
              </button>
            </div>
            <select
              className="form-select"
              value={grupoSeleccionado}
              onChange={e => {
                onSeleccionarGrupo(e.target.value);
                onSeleccionarPersona(null);
              }}
            >
              <option value="">-- Todos los Grupos --</option>
              {grupos.map(g => (
                <option key={g.codigo_grupo} value={g.codigo_grupo}>
                  {g.nombre_grupo} ({g.codigo_grupo})
                </option>
              ))}
            </select>
          </div>

          {/* Botón para crear nueva actividad si tiene permisos */}
          {puedeCrear && (
            <button
              type="button"
              className="btn btn-primario"
              onClick={onAbrirNuevaActividad}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <Plus size={16} />
              Nueva Actividad
            </button>
          )}

          {/* Lista de Miembros del Grupo para Filtrar */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-texto-terciario)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Colaboradores del Grupo
              </span>
              {personaSeleccionada && (
                <button
                  onClick={() => onSeleccionarPersona(null)}
                  style={{ fontSize: '0.7rem', color: 'var(--color-primario)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Limpiar filtro
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {/* Opción todos */}
              <button
                onClick={() => onSeleccionarPersona(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 'var(--radio-md)',
                  backgroundColor: personaSeleccionada === null ? 'var(--color-primario-suave)' : 'transparent',
                  color: personaSeleccionada === null ? 'var(--color-primario)' : 'var(--color-texto-principal)',
                  fontWeight: personaSeleccionada === null ? 600 : 400,
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  border: '1px solid transparent',
                }}
              >
                <span>Todos los miembros</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                  ({actividades.length})
                </span>
              </button>

              {miembrosGrupo.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-texto-terciario)', padding: '10px 0' }}>
                  {grupoSeleccionado ? 'No hay colaboradores en este grupo.' : 'Selecciona un grupo para ver personas.'}
                </div>
              ) : (
                miembrosGrupo.map(m => {
                  const activo = personaSeleccionada === m.registro;
                  const totalActs = actividades.filter(a => a.asignado_registro === m.registro).length;
                  return (
                    <button
                      key={m.registro}
                      onClick={() => onSeleccionarPersona(activo ? null : m.registro)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: 'var(--radio-md)',
                        backgroundColor: activo ? 'var(--color-primario-suave)' : 'var(--color-superficie-hover)',
                        color: activo ? 'var(--color-primario)' : 'var(--color-texto-principal)',
                        border: activo ? '1px solid var(--color-primario-borde)' : '1px solid transparent',
                        fontWeight: activo ? 600 : 500,
                        fontSize: '0.825rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all var(--transicion-rapida)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {m.nombres || m.registro}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-texto-terciario)' }}>
                          {m.registro} • {m.perfil}
                        </span>
                      </div>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: 'var(--radio-pildora)',
                        backgroundColor: activo ? 'var(--color-primario)' : 'var(--color-borde)',
                        color: activo ? '#FFF' : 'var(--color-texto-secundario)',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                      }}>
                        {totalActs}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* ÁREA KANBAN: 7 Columnas con Scroll Horizontal */}
      <div
        className="kanban-columnas-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          height: '100%',
          display: 'flex',
          gap: '16px',
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: '8px',
        }}
      >
        {COLUMNAS.map(col => {
          const actsEnColumna = actividadesFiltradas.filter(a => a.estado === col.id);
          const esDropTarget = columnaHover === col.id;
          const estaColapsada = Boolean(columnasColapsadas[col.id]);

          // Si el agrupador de tarjetas está encogido
          if (estaColapsada) {
            return (
              <div
                key={col.id}
                onClick={() => toggleColapsarColumna(col.id)}
                style={{
                  width: '46px',
                  minWidth: '46px',
                  maxWidth: '46px',
                  height: '100%',
                  maxHeight: '100%',
                  backgroundColor: 'var(--color-superficie)',
                  border: '1px solid var(--color-borde)',
                  borderTop: `4px solid ${col.colorBorde}`,
                  borderRadius: 'var(--radio-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  boxShadow: 'var(--sombra-sm)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all var(--transicion-normal)',
                  flexShrink: 0,
                }}
                title={`Agrupador "${col.titulo}" encogido (${actsEnColumna.length} tarjetas). Clic para expandir.`}
              >
                {/* Cabecera superior compacta: botón toggle e indicador numérico */}
                <div
                  style={{
                    padding: '10px 4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    borderBottom: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--color-fondo)',
                    borderTopLeftRadius: 'var(--radio-md)',
                    borderTopRightRadius: 'var(--radio-md)',
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleColapsarColumna(col.id);
                    }}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: 'var(--radio-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'var(--color-superficie)',
                      border: '1px solid var(--color-borde)',
                      color: 'var(--color-primario)',
                      cursor: 'pointer',
                    }}
                    title="Expandir agrupador de tarjetas"
                  >
                    <ChevronsRight size={15} />
                  </button>

                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: 'var(--radio-pildora)',
                      backgroundColor: 'var(--color-superficie)',
                      border: '1px solid var(--color-borde)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: 'var(--color-texto-secundario)',
                    }}
                  >
                    {actsEnColumna.length}
                  </span>
                </div>

                {/* Frase / Estado en orientación vertical ajustada al tamaño de la frase */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px 0',
                    width: '100%',
                  }}
                >
                  <span
                    style={{
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      color: 'var(--color-texto-principal)',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col.titulo}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={col.id}
              onDragOver={e => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, col.id)}
              style={{
                width: '310px',
                minWidth: '310px',
                height: '100%',
                maxHeight: '100%',
                backgroundColor: esDropTarget ? 'var(--color-superficie-hover)' : 'var(--color-fondo)',
                border: `1px solid ${esDropTarget ? 'var(--color-primario)' : 'var(--color-borde)'}`,
                borderTop: `4px solid ${col.colorBorde}`,
                borderRadius: 'var(--radio-lg)',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--sombra-sm)',
                transition: 'background-color var(--transicion-rapida)',
                flexShrink: 0,
              }}
            >
              {/* Cabecera de Columna */}
              <div style={{
                padding: '12px 14px',
                borderBottom: '1px solid var(--color-borde)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--color-superficie)',
                borderTopLeftRadius: 'var(--radio-md)',
                borderTopRightRadius: 'var(--radio-md)',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-texto-principal)' }}>
                    {col.titulo}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radio-pildora)',
                    backgroundColor: 'var(--color-fondo)',
                    border: '1px solid var(--color-borde)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--color-texto-secundario)',
                  }}>
                    {actsEnColumna.length}
                  </span>

                  {/* Icono para encoger el agrupador alado del número total de tarjetas */}
                  <button
                    type="button"
                    onClick={() => toggleColapsarColumna(col.id)}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: 'var(--radio-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'var(--color-fondo)',
                      border: '1px solid var(--color-borde)',
                      color: 'var(--color-texto-secundario)',
                      cursor: 'pointer',
                      transition: 'all var(--transicion-rapida)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-superficie-hover)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--color-primario)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-fondo)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--color-texto-secundario)';
                    }}
                    title="Encoger agrupador de tarjetas"
                  >
                    <ChevronsLeft size={15} />
                  </button>
                </div>
              </div>

              {/* Lista de Tarjetas */}
              <div
                className="kanban-tarjetas-scroll"
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {actsEnColumna.length === 0 ? (
                  <div style={{
                    padding: '24px 10px',
                    textAlign: 'center',
                    color: 'var(--color-texto-terciario)',
                    fontSize: '0.8rem',
                    border: '1px dashed var(--color-borde)',
                    borderRadius: 'var(--radio-md)',
                  }}>
                    Sin actividades
                  </div>
                ) : (
                  actsEnColumna.map(act => (
                    <div
                      key={act.actividad_id}
                      draggable
                      onDragStart={e => handleDragStart(e, act.codigo_actividad)}
                      title="Doble clic para abrir detalle de la actividad"
                      onDoubleClick={() => onAbrirDetalle(act.codigo_actividad)}
                      style={{
                        backgroundColor: 'var(--color-superficie)',
                        border: '1px solid var(--color-borde)',
                        borderRadius: 'var(--radio-md)',
                        padding: '12px',
                        boxShadow: 'var(--sombra-sm)',
                        cursor: 'grab',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        transition: 'transform var(--transicion-rapida), box-shadow var(--transicion-rapida)',
                        opacity: arrastrandoCodigo === act.codigo_actividad ? 0.5 : 1,
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--sombra-md)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--sombra-sm)';
                      }}
                    >
                      {/* Código, Tipo y Estado */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            color: 'var(--color-primario)',
                            backgroundColor: 'var(--color-primario-suave)',
                            padding: '2px 6px',
                            borderRadius: 'var(--radio-sm)',
                          }}>
                            {act.codigo_actividad}
                          </span>

                          <span style={{ fontSize: '0.7rem', color: 'var(--color-texto-terciario)', fontWeight: 600 }}>
                            {act.tipo_actividad}
                          </span>
                        </div>

                        {/* Estado de la tarjeta */}
                        <span
                          className={`badge-estado ${col.badgeClase}`}
                          style={{
                            fontSize: '0.675rem',
                            padding: '2px 7px',
                            fontWeight: 700,
                            lineHeight: 1.2,
                          }}
                        >
                          {col.titulo}
                        </span>
                      </div>

                      {/* Título de la tarjeta */}
                      <div style={{
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        color: 'var(--color-texto-principal)',
                        lineHeight: '1.35',
                      }}>
                        {act.titulo}
                      </div>

                      {/* Alerta de Impedimento si aplica */}
                      {(act.impedimentos || act.estado === 'impedimento') && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: '#FEE2E2',
                          color: '#991B1B',
                          padding: '3px 8px',
                          borderRadius: 'var(--radio-sm)',
                          fontSize: '0.725rem',
                          fontWeight: 600,
                        }}>
                          <AlertTriangle size={12} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {act.impedimentos || 'Impedimento reportado'}
                          </span>
                        </div>
                      )}

                      {/* Asignado y SWE */}
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-secundario)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div>
                          Resp: <strong>{act.nombre_asignado || act.asignado_registro || 'Sin asignar'}</strong>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-texto-terciario)' }}>
                          SWE: {act.nombre_swe || act.swe_encargado} • Sprint {actividadSprint(act)}
                        </div>
                      </div>

                      {/* Pie de la tarjeta con Botón '+' para abrir el detalle */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '6px',
                        borderTop: '1px solid var(--color-borde-suave)',
                        marginTop: '2px',
                      }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAbrirCambioEstado(act);
                          }}
                          onDoubleClick={(e) => e.stopPropagation()}
                          style={{
                            fontSize: '0.725rem',
                            color: 'var(--color-texto-secundario)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Cambiar estado"
                        >
                          Estado...
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAbrirDetalle(act.codigo_actividad);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            onAbrirDetalle(act.codigo_actividad);
                          }}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-primario-suave)',
                            color: 'var(--color-primario)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--color-primario-borde)',
                            cursor: 'pointer',
                            transition: 'all var(--transicion-rapida)',
                          }}
                          title="Abrir detalle de la actividad (+)"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

function actividadSprint(act: Actividad) {
  return `${act.sprint || '1'} (Q${act.q_trabajo || '1'})`;
}
