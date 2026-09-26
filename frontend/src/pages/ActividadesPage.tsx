import React, { useState, useEffect } from 'react';
import { Kanban, Table, Plus, RefreshCw, Layers, Minimize2, Maximize2, UserCheck, Users } from 'lucide-react';
import { Actividad, Grupo } from '../types';
import { apiRequest } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { TableroKanban } from '../components/kanban/TableroKanban';
import { COLUMNAS_KANBAN } from '../components/kanban/kanbanConstantes';
import { TablaActividades } from '../components/tabla/TablaActividades';
import { ModalDetalleActividad } from '../components/kanban/ModalDetalleActividad';
import { ModalCambioEstado } from '../components/kanban/ModalCambioEstado';
import { ModalNuevaActividad } from '../components/kanban/ModalNuevaActividad';
import { ModalExportarExcel } from '../components/kanban/ModalExportarExcel';
import { OfficeExcelIcon } from '../components/common/OfficeExcelIcon';

export const ActividadesPage: React.FC = () => {
  const { usuario } = useAuth();

  const [vista, setVista] = useState<'kanban' | 'tabla'>('kanban');
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>('');
  const [personaSeleccionada, setPersonaSeleccionada] = useState<string | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [columnasColapsadas, setColumnasColapsadas] = useState<Record<string, boolean>>({});

  const todasColapsadas = COLUMNAS_KANBAN.every(col => Boolean(columnasColapsadas[col.id]));

  const toggleColapsarTodos = () => {
    if (todasColapsadas) {
      setColumnasColapsadas({});
    } else {
      const colapsadas: Record<string, boolean> = {};
      COLUMNAS_KANBAN.forEach(col => {
        colapsadas[col.id] = true;
      });
      setColumnasColapsadas(colapsadas);
    }
  };

  const toggleColapsarColumna = (colId: string) => {
    setColumnasColapsadas(prev => ({
      ...prev,
      [colId]: !prev[colId],
    }));
  };

  // Estados de Modales
  const [codigoDetalle, setCodigoDetalle] = useState<string | null>(null);
  const [actividadParaCambioEstado, setActividadParaCambioEstado] = useState<Actividad | null>(null);
  const [mostrarModalNueva, setMostrarModalNueva] = useState<boolean>(false);
  const [mostrarModalExportar, setMostrarModalExportar] = useState<boolean>(false);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [actsData, gruposData] = await Promise.all([
        apiRequest<Actividad[]>('/actividades', {
          // Si hay grupo seleccionado se puede filtrar o listar todo y filtrar en memoria
        }),
        apiRequest<Grupo[]>('/grupos'),
      ]);
      setActividades(actsData);
      setGrupos(gruposData);

      if (!grupoSeleccionado && gruposData.length > 0) {
        setGrupoSeleccionado(gruposData[0].codigo_grupo);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const puedeCrear = usuario?.perfil === 'ADMIN' || usuario?.perfil === 'SWE';

  // Obtener nombre del colaborador o miembro seleccionado para la cabecera
  const grupoActual = grupos.find(g => g.codigo_grupo === grupoSeleccionado);
  const miembroSeleccionadoObj = personaSeleccionada
    ? (grupoActual?.miembros?.find(m => m.registro === personaSeleccionada) ||
      grupos.flatMap(g => g.miembros || []).find(m => m.registro === personaSeleccionada))
    : null;

  const nombrePersonaSeleccionada = personaSeleccionada
    ? (miembroSeleccionadoObj?.nombres ||
      actividades.find(a => a.asignado_registro === personaSeleccionada)?.nombre_asignado ||
      personaSeleccionada)
    : 'Todos los miembros';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: 0, height: '100%' }}>

      {/* Barra superior de la vista: selector de vista (Kanban / Tabla) y acciones */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-texto-principal)', margin: 0 }}>
              Actividades del Equipo
            </h2>
            {vista === 'kanban' && (
              <button
                type="button"
                onClick={toggleColapsarTodos}
                title={todasColapsadas
                  ? "Redimensionar todos los paneles (expandir a tamaño original)"
                  : "Achicar todos los paneles (encoger al tamaño de su frase)"
                }
                aria-label={todasColapsadas ? "Redimensionar todos los paneles" : "Achicar todos los paneles"}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radio-md)',
                  backgroundColor: todasColapsadas ? 'var(--color-primario-suave)' : 'var(--color-superficie)',
                  border: `1px solid ${todasColapsadas ? 'var(--color-primario-borde)' : 'var(--color-borde)'}`,
                  color: todasColapsadas ? 'var(--color-primario)' : 'var(--color-texto-secundario)',
                  cursor: 'pointer',
                  transition: 'all var(--transicion-rapida)',
                  boxShadow: 'var(--sombra-sm)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--color-primario)';
                  e.currentTarget.style.color = 'var(--color-primario)';
                  e.currentTarget.style.transform = 'scale(1.06)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = todasColapsadas ? 'var(--color-primario-borde)' : 'var(--color-borde)';
                  e.currentTarget.style.color = todasColapsadas ? 'var(--color-primario)' : 'var(--color-texto-secundario)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {todasColapsadas ? <Maximize2 size={17} /> : <Minimize2 size={17} />}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>
              Supervisa, asigna y da seguimiento ágil a tareas e historias de usuario
            </span>
            <span style={{ color: 'var(--color-texto-terciario)', fontSize: '0.85rem', userSelect: 'none' }}>•</span>
            <span
              style={{
                fontSize: '1rem',
                fontWeight: 800,
                color: 'var(--color-primario)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                letterSpacing: '0.01em',
              }}
            >
              {personaSeleccionada ? <UserCheck size={16} /> : <Users size={16} />}
              {nombrePersonaSeleccionada}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

          {/* Conmutador de Vista (Kanban / Tabla) */}
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--color-superficie)',
            padding: '4px',
            borderRadius: 'var(--radio-md)',
            border: '1px solid var(--color-borde)',
          }}>
            <button
              onClick={() => setVista('kanban')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radio-sm)',
                fontSize: '0.825rem',
                fontWeight: vista === 'kanban' ? 600 : 500,
                backgroundColor: vista === 'kanban' ? 'var(--color-primario-suave)' : 'transparent',
                color: vista === 'kanban' ? 'var(--color-primario)' : 'var(--color-texto-secundario)',
                cursor: 'pointer',
              }}
            >
              <Kanban size={16} />
              Kanban
            </button>
            <button
              onClick={() => setVista('tabla')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radio-sm)',
                fontSize: '0.825rem',
                fontWeight: vista === 'tabla' ? 600 : 500,
                backgroundColor: vista === 'tabla' ? 'var(--color-primario-suave)' : 'transparent',
                color: vista === 'tabla' ? 'var(--color-primario)' : 'var(--color-texto-secundario)',
                cursor: 'pointer',
              }}
            >
              <Table size={16} />
              Tabla
            </button>
          </div>

          {/* Botón Refrescar */}
          <button
            type="button"
            className="btn btn-secundario"
            onClick={cargarDatos}
            disabled={cargando}
            title="Recargar actividades"
          >
            <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </button>

          {/* Botón Exportar a Excel */}
          <button
            type="button"
            className="btn btn-secundario"
            onClick={() => setMostrarModalExportar(true)}
            title="Exportar actividades a archivo Excel (.xlsx)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
            }}
          >
            <OfficeExcelIcon size={18} />
            <span>Exportar</span>
          </button>

          {/* Botón Nueva Actividad */}
          {puedeCrear && (
            <button
              type="button"
              className="btn btn-primario"
              onClick={() => setMostrarModalNueva(true)}
            >
              <Plus size={16} />
              Nueva Actividad
            </button>
          )}

        </div>
      </div>

      {/* Vista Activa */}
      {cargando && actividades.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-texto-terciario)' }}>
          Cargando actividades y grupos...
        </div>
      ) : vista === 'kanban' ? (
        <TableroKanban
          actividades={actividades}
          grupos={grupos}
          grupoSeleccionado={grupoSeleccionado}
          onSeleccionarGrupo={setGrupoSeleccionado}
          personaSeleccionada={personaSeleccionada}
          onSeleccionarPersona={setPersonaSeleccionada}
          onAbrirDetalle={cod => setCodigoDetalle(cod)}
          onAbrirCambioEstado={act => setActividadParaCambioEstado(act)}
          onAbrirNuevaActividad={() => setMostrarModalNueva(true)}
          puedeCrear={puedeCrear}
          onActualizarActividades={cargarDatos}
          columnasColapsadas={columnasColapsadas}
          onToggleColapsarColumna={toggleColapsarColumna}
        />
      ) : (
        <TablaActividades
          actividades={actividades}
          grupos={grupos}
          onAbrirDetalle={cod => setCodigoDetalle(cod)}
          onAbrirCambioEstado={act => setActividadParaCambioEstado(act)}
          onAbrirNuevaActividad={() => setMostrarModalNueva(true)}
          puedeCrear={puedeCrear}
          onActualizar={cargarDatos}
        />
      )}

      {/* Modal de Detalle */}
      {codigoDetalle && (
        <ModalDetalleActividad
          codigoActividad={codigoDetalle}
          onCerrar={() => setCodigoDetalle(null)}
          onAbrirCambioEstado={() => {
            const act = actividades.find(a => a.codigo_actividad === codigoDetalle);
            if (act) {
              setCodigoDetalle(null);
              setActividadParaCambioEstado(act);
            }
          }}
          onActualizado={cargarDatos}
        />
      )}

      {/* Modal de Cambio de Estado */}
      {actividadParaCambioEstado && (
        <ModalCambioEstado
          actividad={actividadParaCambioEstado}
          onCerrar={() => setActividadParaCambioEstado(null)}
          onEstadoCambiado={cargarDatos}
        />
      )}

      {/* Modal de Nueva Actividad */}
      {mostrarModalNueva && (
        <ModalNuevaActividad
          grupoPreseleccionado={grupoSeleccionado}
          onCerrar={() => setMostrarModalNueva(false)}
          onCreado={cargarDatos}
        />
      )}

      {/* Modal de Exportación a Excel */}
      {mostrarModalExportar && (
        <ModalExportarExcel
          actividades={actividades}
          grupos={grupos}
          onCerrar={() => setMostrarModalExportar(false)}
        />
      )}

    </div>
  );
};
