import React, { useState, useEffect } from 'react';
import { FolderKanban, Plus, Search, AlertCircle, Edit2, X, Trash2, ChevronLeft, ChevronRight, RefreshCw, Calendar, Users, FileText, AlertTriangle } from 'lucide-react';
import { Proyecto, EstadoProyecto } from '../types';
import { apiRequest } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useNotificacion } from '../context/NotificacionContext';
import { ModalConfirmacionEliminar } from '../components/common/ModalConfirmacionEliminar';
import { ModalExportarProyectos } from '../components/common/ModalExportarProyectos';
import { OfficeExcelIcon } from '../components/common/OfficeExcelIcon';

export const ProyectosPage: React.FC = () => {
  const { usuario } = useAuth();
  const { exito, error: notifyError } = useNotificacion();

  const tienePermiso = usuario?.perfil === 'ADMIN' || usuario?.perfil === 'SWE';

  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Filtro exclusivo en cabecera de la grilla
  const [filtroCabeceraNombre, setFiltroCabeceraNombre] = useState('');
  const [filtroCabeceraEquipo, setFiltroCabeceraEquipo] = useState('');
  const [filtroCabeceraEstado, setFiltroCabeceraEstado] = useState('');

  // Paginación 10 en 10
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 10;

  // Modal Crear Proyecto
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [nombreProyecto, setNombreProyecto] = useState('');
  const [descripcionProyecto, setDescripcionProyecto] = useState('');
  const [equipoSolicitante, setEquipoSolicitante] = useState('');
  const [fechaRegistro, setFechaRegistro] = useState(new Date().toISOString().split('T')[0]);
  const [posiblesImpedimentos, setPosiblesImpedimentos] = useState('');
  const [fechaDeadLine, setFechaDeadLine] = useState('');
  const [estadoCrear, setEstadoCrear] = useState<EstadoProyecto>('Activo');
  const [errorCrear, setErrorCrear] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Modal Editar Proyecto
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<Proyecto | null>(null);
  const [editNombreProyecto, setEditNombreProyecto] = useState('');
  const [editDescripcionProyecto, setEditDescripcionProyecto] = useState('');
  const [editEquipoSolicitante, setEditEquipoSolicitante] = useState('');
  const [editFechaRegistro, setEditFechaRegistro] = useState('');
  const [editPosiblesImpedimentos, setEditPosiblesImpedimentos] = useState('');
  const [editFechaDeadLine, setEditFechaDeadLine] = useState('');
  const [editEstado, setEditEstado] = useState<EstadoProyecto>('Activo');
  const [errorEditar, setErrorEditar] = useState<string | null>(null);
  const [guardandoEditar, setGuardandoEditar] = useState(false);

  // Modal Eliminación
  const [proyectoParaEliminar, setProyectoParaEliminar] = useState<Proyecto | null>(null);
  const [eliminandoProyecto, setEliminandoProyecto] = useState(false);

  // Modal Exportar Excel
  const [mostrarModalExportar, setMostrarModalExportar] = useState(false);

  const cargarProyectos = async () => {
    try {
      setCargando(true);
      let query = '';
      const params = new URLSearchParams();
      if (filtroEstado) params.append('estado', filtroEstado);
      if (busqueda.trim()) params.append('search', busqueda.trim());
      if (params.toString()) query = `?${params.toString()}`;

      const data = await apiRequest<Proyecto[]>(`/proyectos${query}`);
      setProyectos(data);
    } catch (e: any) {
      console.error(e);
      notifyError(e.message || 'Error al cargar el catálogo de proyectos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (tienePermiso) {
      cargarProyectos();
    }
  }, [filtroEstado]);

  const handleAbrirEditar = (p: Proyecto) => {
    if (!tienePermiso) {
      notifyError('Solo perfiles ADMIN y SWE tienen acceso a este mantenimiento.');
      return;
    }
    setProyectoSeleccionado(p);
    setEditNombreProyecto(p.nombre_proyecto || '');
    setEditDescripcionProyecto(p.descripcion_proyecto || '');
    setEditEquipoSolicitante(p.equipo_solicitante || '');
    setEditFechaRegistro(p.fecha_registro ? p.fecha_registro.split('T')[0] : '');
    setEditPosiblesImpedimentos(p.posibles_impedimentos || '');
    setEditFechaDeadLine(p.fecha_dead_line ? p.fecha_dead_line.split('T')[0] : '');
    setEditEstado(p.estado || 'Activo');
    setErrorEditar(null);
    setMostrarModalEditar(true);
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreProyecto.trim() || !equipoSolicitante.trim()) {
      setErrorCrear('Por favor complete los campos obligatorios (*).');
      return;
    }

    try {
      setGuardando(true);
      setErrorCrear(null);
      await apiRequest('/proyectos', {
        method: 'POST',
        body: JSON.stringify({
          nombre_proyecto: nombreProyecto.trim(),
          descripcion_proyecto: descripcionProyecto.trim() || null,
          equipo_solicitante: equipoSolicitante.trim(),
          fecha_registro: fechaRegistro.trim() || null,
          posibles_impedimentos: posiblesImpedimentos.trim() || null,
          fecha_dead_line: fechaDeadLine.trim() || null,
          estado: estadoCrear,
        }),
      });

      exito(`Proyecto "${nombreProyecto.trim()}" registrado correctamente.`);
      setMostrarModalCrear(false);
      setNombreProyecto('');
      setDescripcionProyecto('');
      setEquipoSolicitante('');
      setFechaRegistro(new Date().toISOString().split('T')[0]);
      setPosiblesImpedimentos('');
      setFechaDeadLine('');
      setEstadoCrear('Activo');
      cargarProyectos();
    } catch (err: any) {
      const msg = err.message || 'Error al grabar el proyecto';
      setErrorCrear(msg);
      notifyError(msg);
    } finally {
      setGuardando(false);
    }
  };

  const handleEditarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proyectoSeleccionado) return;

    if (!editNombreProyecto.trim() || !editEquipoSolicitante.trim()) {
      setErrorEditar('Por favor complete los campos obligatorios (*).');
      return;
    }

    try {
      setGuardandoEditar(true);
      setErrorEditar(null);

      const bodyData: any = {
        nombre_proyecto: editNombreProyecto.trim(),
        descripcion_proyecto: editDescripcionProyecto.trim() || null,
        equipo_solicitante: editEquipoSolicitante.trim(),
        fecha_registro: editFechaRegistro.trim() || null,
        posibles_impedimentos: editPosiblesImpedimentos.trim() || null,
        fecha_dead_line: editFechaDeadLine.trim() || null,
        estado: editEstado,
      };

      await apiRequest(`/proyectos/${proyectoSeleccionado.proyecto_id}`, {
        method: 'PUT',
        body: JSON.stringify(bodyData),
      });

      exito(`Proyecto "${editNombreProyecto.trim()}" actualizado satisfactoriamente.`);
      setMostrarModalEditar(false);
      setProyectoSeleccionado(null);
      cargarProyectos();
    } catch (err: any) {
      const msg = err.message || 'Error al actualizar el proyecto';
      setErrorEditar(msg);
      notifyError(msg);
    } finally {
      setGuardandoEditar(false);
    }
  };

  const handleEliminar = (p: Proyecto) => {
    if (!tienePermiso) return;
    setProyectoParaEliminar(p);
  };

  const confirmarEliminar = async () => {
    if (!proyectoParaEliminar) return;

    try {
      setEliminandoProyecto(true);
      await apiRequest(`/proyectos/${proyectoParaEliminar.proyecto_id}`, { method: 'DELETE' });
      exito(`Proyecto "${proyectoParaEliminar.nombre_proyecto}" eliminado definitivamente.`);
      setProyectoParaEliminar(null);
      cargarProyectos();
    } catch (err: any) {
      notifyError(err.message || 'Error al eliminar el proyecto');
    } finally {
      setEliminandoProyecto(false);
    }
  };

  // Filtrado de proyectos
  const proyectosFiltrados = proyectos.filter(p => {
    if (filtroCabeceraNombre.trim() && !p.nombre_proyecto.toLowerCase().includes(filtroCabeceraNombre.trim().toLowerCase())) {
      return false;
    }
    if (filtroCabeceraEquipo.trim() && !p.equipo_solicitante.toLowerCase().includes(filtroCabeceraEquipo.trim().toLowerCase())) {
      return false;
    }
    if (filtroCabeceraEstado && p.estado !== filtroCabeceraEstado) {
      return false;
    }
    return true;
  });

  const totalPaginas = Math.max(1, Math.ceil(proyectosFiltrados.length / ITEMS_POR_PAGINA));
  const indiceInicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const proyectosPaginados = proyectosFiltrados.slice(indiceInicio, indiceInicio + ITEMS_POR_PAGINA);

  // Acceso restringido para perfiles que no son ADMIN o SWE
  if (!tienePermiso) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
        gap: '16px'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#FEE2E2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#DC2626'
        }}>
          <AlertTriangle size={32} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-texto-principal)' }}>
          Acceso Restringido
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-texto-secundario)', maxWidth: '480px' }}>
          El catálogo de mantenimiento de <strong>Proyectos</strong> está reservado exclusivamente para los roles de <strong>ADMIN</strong> y <strong>SWE</strong> (Líder Técnico).
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-texto-principal)' }}>
            Catálogo de Proyectos
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>
            Mantenimiento y administración de iniciativas, requerimientos y proyectos del equipo
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secundario"
            onClick={cargarProyectos}
            disabled={cargando}
            title="Recargar catálogo de proyectos"
          >
            <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </button>

          {/* Botón Exportar a Excel */}
          <button
            type="button"
            className="btn btn-secundario"
            onClick={() => setMostrarModalExportar(true)}
            title="Exportar proyectos a archivo Excel (.xlsx)"
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

          <button
            type="button"
            className="btn btn-primario"
            onClick={() => {
              setErrorCrear(null);
              setMostrarModalCrear(true);
            }}
          >
            <Plus size={16} />
            Nuevo Proyecto
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{
        backgroundColor: 'var(--color-superficie)',
        border: '1px solid var(--color-borde)',
        borderRadius: 'var(--radio-lg)',
        padding: '16px',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-texto-terciario)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '38px' }}
            placeholder="Buscar por nombre, descripción, equipo o impedimentos..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && cargarProyectos()}
          />
        </div>

        <select className="form-select" style={{ width: '160px' }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Estado: Todos</option>
          <option value="Activo">Activo</option>
          <option value="standBy">standBy</option>
          <option value="Entregado">Entregado</option>
        </select>

        <button type="button" className="btn btn-secundario" onClick={cargarProyectos}>
          Buscar
        </button>
      </div>

      {/* Tabla de Proyectos */}
      <div style={{
        backgroundColor: 'var(--color-superficie)',
        border: '1px solid var(--color-borde)',
        borderRadius: 'var(--radio-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--sombra-sm)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead style={{ backgroundColor: 'var(--color-superficie-hover)', borderBottom: '1px solid var(--color-borde)' }}>
              <tr>
                <th style={{ padding: '10px 16px', textAlign: 'left', minWidth: '200px' }}>
                  <div style={{ marginBottom: '6px' }}>Nombre Proyecto</div>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', height: '28px', width: '100%', fontWeight: 'normal' }}
                    placeholder="Filtrar por nombre..."
                    value={filtroCabeceraNombre}
                    onChange={e => {
                      setFiltroCabeceraNombre(e.target.value);
                      setPaginaActual(1);
                    }}
                  />
                </th>
                <th style={{ padding: '10px 16px', textAlign: 'left', minWidth: '160px' }}>
                  <div style={{ marginBottom: '6px' }}>Equipo Solicitante</div>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', height: '28px', width: '100%', fontWeight: 'normal' }}
                    placeholder="Filtrar equipo..."
                    value={filtroCabeceraEquipo}
                    onChange={e => {
                      setFiltroCabeceraEquipo(e.target.value);
                      setPaginaActual(1);
                    }}
                  />
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', minWidth: '220px', verticalAlign: 'bottom' }}>
                  Descripción
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', width: '120px', verticalAlign: 'bottom' }}>
                  F. Registro
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', width: '120px', verticalAlign: 'bottom' }}>
                  Fecha Deadline
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', minWidth: '180px', verticalAlign: 'bottom' }}>
                  Posibles Impedimentos
                </th>
                <th style={{ padding: '10px 16px', textAlign: 'left', minWidth: '130px' }}>
                  <div style={{ marginBottom: '6px' }}>Estado</div>
                  <select
                    className="form-select"
                    style={{ fontSize: '0.75rem', padding: '2px 6px', height: '28px', width: '100%', fontWeight: 'normal' }}
                    value={filtroCabeceraEstado}
                    onChange={e => {
                      setFiltroCabeceraEstado(e.target.value);
                      setPaginaActual(1);
                    }}
                  >
                    <option value="">Estado: Todos</option>
                    <option value="Activo">Activo</option>
                    <option value="standBy">standBy</option>
                    <option value="Entregado">Entregado</option>
                  </select>
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: '110px', verticalAlign: 'bottom' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'var(--color-texto-terciario)' }}>
                    Cargando proyectos...
                  </td>
                </tr>
              ) : proyectosPaginados.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'var(--color-texto-terciario)' }}>
                    No se encontraron proyectos registrados.
                  </td>
                </tr>
              ) : (
                proyectosPaginados.map(p => (
                  <tr
                    key={p.proyecto_id}
                    className="fila-interactiva"
                    tabIndex={0}
                    title="Doble clic para editar proyecto"
                    onDoubleClick={() => handleAbrirEditar(p)}
                    style={{ borderBottom: '1px solid var(--color-borde-suave)' }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-primario)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FolderKanban size={16} style={{ flexShrink: 0, opacity: 0.8 }} />
                        <span>{p.nombre_proyecto}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      {p.equipo_solicitante || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-texto-secundario)', maxWidth: '240px' }}>
                      <span title={p.descripcion_proyecto || ''} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {p.descripcion_proyecto || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-texto-terciario)', whiteSpace: 'nowrap' }}>
                      {p.fecha_registro ? new Date(p.fecha_registro).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: p.fecha_dead_line ? 'var(--color-texto-principal)' : 'var(--color-texto-terciario)', whiteSpace: 'nowrap' }}>
                      {p.fecha_dead_line ? new Date(p.fecha_dead_line + 'T00:00:00').toLocaleDateString() : 'Sin fecha'}
                    </td>
                    <td style={{ padding: '12px 16px', color: p.posibles_impedimentos ? '#B45309' : 'var(--color-texto-terciario)', maxWidth: '200px' }}>
                      <span title={p.posibles_impedimentos || ''} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {p.posibles_impedimentos || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radio-pildora)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor:
                          p.estado === 'Activo' ? 'var(--color-primario-suave)' :
                          p.estado === 'standBy' ? '#FEF3C7' :
                          p.estado === 'Entregado' ? '#DCFCE7' : '#F1F5F9',
                        color:
                          p.estado === 'Activo' ? 'var(--color-primario)' :
                          p.estado === 'standBy' ? '#B45309' :
                          p.estado === 'Entregado' ? '#15803D' : '#64748B',
                      }}>
                        {p.estado}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-secundario btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAbrirEditar(p);
                          }}
                          title="Editar proyecto (o doble clic)"
                          style={{ padding: '4px 8px' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-peligro btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEliminar(p);
                          }}
                          title="Eliminar proyecto definitivamente"
                          style={{ padding: '4px 8px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
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
            Mostrando {proyectosFiltrados.length === 0 ? 0 : indiceInicio + 1} a {Math.min(indiceInicio + ITEMS_POR_PAGINA, proyectosFiltrados.length)} de {proyectosFiltrados.length} proyectos
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
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              type="button"
              className="btn btn-secundario btn-sm"
              onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual >= totalPaginas}
              style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Crear Proyecto */}
      {mostrarModalCrear && (
        <div className="modal-overlay" onClick={() => setMostrarModalCrear(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-borde)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderKanban size={20} color="var(--color-primario)" />
                <h3 style={{ fontWeight: 700 }}>Nuevo Proyecto</h3>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalCrear(false)}
                className="btn-cerrar-modal"
                title="Cerrar ventana"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCrear} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
              {errorCrear && (
                <div style={{
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  padding: '12px 14px',
                  borderRadius: 'var(--radio-md)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{errorCrear}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label">Nombre del Proyecto *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: PORTAL PAGOS V2"
                    value={nombreProyecto}
                    onChange={e => setNombreProyecto(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Equipo Solicitante *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: TRIBUS DIGITALES / FCD"
                    value={equipoSolicitante}
                    onChange={e => setEquipoSolicitante(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label">Fecha de Registro</label>
                  <input
                    type="date"
                    className="form-input"
                    value={fechaRegistro}
                    onChange={e => setFechaRegistro(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Fecha Dead Line</label>
                  <input
                    type="date"
                    className="form-input"
                    value={fechaDeadLine}
                    onChange={e => setFechaDeadLine(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Estado *</label>
                  <select
                    className="form-select"
                    value={estadoCrear}
                    onChange={e => setEstadoCrear(e.target.value as EstadoProyecto)}
                    required
                  >
                    <option value="Activo">Activo</option>
                    <option value="standBy">standBy</option>
                    <option value="Entregado">Entregado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Descripción del Proyecto</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Detalle de objetivos y alcance del proyecto..."
                  value={descripcionProyecto}
                  onChange={e => setDescripcionProyecto(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div>
                <label className="form-label">Posibles Impedimentos</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Riesgos preliminares, dependencias externas o impedimentos..."
                  value={posiblesImpedimentos}
                  onChange={e => setPosiblesImpedimentos(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-borde)' }}>
                <button
                  type="button"
                  className="btn btn-secundario"
                  onClick={() => {
                    setMostrarModalCrear(false);
                    setErrorCrear(null);
                  }}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primario"
                  disabled={guardando}
                  style={{ minWidth: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {guardando ? (
                    <>
                      <span style={{
                        display: 'inline-block',
                        width: '14px',
                        height: '14px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderRadius: '50%',
                        borderTopColor: '#fff',
                        animation: 'spin 0.8s linear infinite'
                      }}></span>
                      Grabando...
                    </>
                  ) : (
                    'Grabar Proyecto'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Proyecto */}
      {mostrarModalEditar && proyectoSeleccionado && (
        <div className="modal-overlay" onClick={() => setMostrarModalEditar(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-borde)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} color="var(--color-primario)" />
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  Editar Proyecto: {proyectoSeleccionado.nombre_proyecto}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalEditar(false)}
                className="btn-cerrar-modal"
                title="Cerrar ventana"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditarSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
              {errorEditar && (
                <div style={{
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  padding: '12px 14px',
                  borderRadius: 'var(--radio-md)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{errorEditar}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label">Nombre del Proyecto *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: PORTAL PAGOS V2"
                    value={editNombreProyecto}
                    onChange={e => setEditNombreProyecto(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Equipo Solicitante *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: TRIBUS DIGITALES / FCD"
                    value={editEquipoSolicitante}
                    onChange={e => setEditEquipoSolicitante(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label">Fecha de Registro</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editFechaRegistro}
                    onChange={e => setEditFechaRegistro(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Fecha Dead Line</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editFechaDeadLine}
                    onChange={e => setEditFechaDeadLine(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Estado *</label>
                  <select
                    className="form-select"
                    value={editEstado}
                    onChange={e => setEditEstado(e.target.value as EstadoProyecto)}
                    required
                  >
                    <option value="Activo">Activo</option>
                    <option value="standBy">standBy</option>
                    <option value="Entregado">Entregado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Descripción del Proyecto</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Detalle de objetivos y alcance del proyecto..."
                  value={editDescripcionProyecto}
                  onChange={e => setEditDescripcionProyecto(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div>
                <label className="form-label">Posibles Impedimentos</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Riesgos preliminares, dependencias externas o impedimentos..."
                  value={editPosiblesImpedimentos}
                  onChange={e => setEditPosiblesImpedimentos(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-borde)' }}>
                <button
                  type="button"
                  className="btn btn-secundario"
                  onClick={() => {
                    setMostrarModalEditar(false);
                    setErrorEditar(null);
                  }}
                  disabled={guardandoEditar}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primario"
                  disabled={guardandoEditar}
                  style={{ minWidth: '150px' }}
                >
                  {guardandoEditar ? 'Actualizando...' : 'Actualizar Proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación */}
      <ModalConfirmacionEliminar
        abierto={Boolean(proyectoParaEliminar)}
        titulo="Eliminar Proyecto"
        mensaje={`¿Está seguro de eliminar definitivamente el proyecto "${proyectoParaEliminar?.nombre_proyecto}"?`}
        detalle={
          proyectoParaEliminar && (
            <div>
              <strong>Proyecto:</strong> {proyectoParaEliminar.nombre_proyecto}
              <br />
              <strong>Equipo Solicitante:</strong> {proyectoParaEliminar.equipo_solicitante || 'No especificado'}
              <br />
              <strong>Estado:</strong> {proyectoParaEliminar.estado}
            </div>
          )
        }
        cargando={eliminandoProyecto}
        onConfirmar={confirmarEliminar}
        onCerrar={() => setProyectoParaEliminar(null)}
      />

      {/* Modal Exportación a Excel */}
      {mostrarModalExportar && (
        <ModalExportarProyectos
          proyectos={proyectos}
          onCerrar={() => setMostrarModalExportar(false)}
        />
      )}

    </div>
  );
};
