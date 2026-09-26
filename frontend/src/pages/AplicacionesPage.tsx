import React, { useState, useEffect } from 'react';
import { 
  Layers, Plus, Search, AlertCircle, Edit2, X, Trash2, 
  ChevronLeft, ChevronRight, RefreshCw, Calendar, Users, 
  FileText, AlertTriangle, Tag, UserCheck, Shield 
} from 'lucide-react';
import { Aplicacion, EstadoAplicacion } from '../types';
import { apiRequest } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useNotificacion } from '../context/NotificacionContext';
import { ModalConfirmacionEliminar } from '../components/common/ModalConfirmacionEliminar';
import { ModalExportarAplicaciones } from '../components/common/ModalExportarAplicaciones';
import { OfficeExcelIcon } from '../components/common/OfficeExcelIcon';

export const AplicacionesPage: React.FC = () => {
  const { usuario } = useAuth();
  const { exito, error: notifyError } = useNotificacion();

  // Mismos permisos que Proyectos: ADMIN y SWE
  const tienePermiso = usuario?.perfil === 'ADMIN' || usuario?.perfil === 'SWE';

  const [aplicaciones, setAplicaciones] = useState<Aplicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Filtros en cabecera de la grilla
  const [filtroCabeceraNombre, setFiltroCabeceraNombre] = useState('');
  const [filtroCabeceraSiglas, setFiltroCabeceraSiglas] = useState('');
  const [filtroCabeceraLider, setFiltroCabeceraLider] = useState('');
  const [filtroCabeceraPO, setFiltroCabeceraPO] = useState('');
  const [filtroCabeceraScrum, setFiltroCabeceraScrum] = useState('');
  const [filtroCabeceraDescripcion, setFiltroCabeceraDescripcion] = useState('');
  const [filtroCabeceraEstado, setFiltroCabeceraEstado] = useState('');

  // Paginación 10 en 10
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 10;

  // Modal Crear Aplicación
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [nombreAplicacion, setNombreAplicacion] = useState('');
  const [siglas, setSiglas] = useState('');
  const [liderTecno, setLiderTecno] = useState('');
  const [poContacto, setPoContacto] = useState('');
  const [scrumDatos, setScrumDatos] = useState('');
  const [descripcionActividad, setDescripcionActividad] = useState('');
  const [fechaRegistro, setFechaRegistro] = useState(new Date().toISOString().split('T')[0]);
  const [estadoCrear, setEstadoCrear] = useState<EstadoAplicacion>('Activo');
  const [errorCrear, setErrorCrear] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Modal Editar Aplicación
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [aplicacionSeleccionada, setAplicacionSeleccionada] = useState<Aplicacion | null>(null);
  const [editNombreAplicacion, setEditNombreAplicacion] = useState('');
  const [editSiglas, setEditSiglas] = useState('');
  const [editLiderTecno, setEditLiderTecno] = useState('');
  const [editPoContacto, setEditPoContacto] = useState('');
  const [editScrumDatos, setEditScrumDatos] = useState('');
  const [editDescripcionActividad, setEditDescripcionActividad] = useState('');
  const [editFechaRegistro, setEditFechaRegistro] = useState('');
  const [editEstado, setEditEstado] = useState<EstadoAplicacion>('Activo');
  const [errorEditar, setErrorEditar] = useState<string | null>(null);
  const [guardandoEditar, setGuardandoEditar] = useState(false);

  // Modal Eliminación
  const [aplicacionParaEliminar, setAplicacionParaEliminar] = useState<Aplicacion | null>(null);
  const [eliminandoAplicacion, setEliminandoAplicacion] = useState(false);

  // Modal Exportar Excel
  const [mostrarModalExportar, setMostrarModalExportar] = useState(false);

  const cargarAplicaciones = async () => {
    try {
      setCargando(true);
      let query = '';
      const params = new URLSearchParams();
      if (filtroEstado) params.append('estado', filtroEstado);
      if (busqueda.trim()) params.append('search', busqueda.trim());
      if (params.toString()) query = `?${params.toString()}`;

      const data = await apiRequest<Aplicacion[]>(`/aplicaciones${query}`);
      setAplicaciones(data);
    } catch (e: any) {
      console.error(e);
      notifyError(e.message || 'Error al cargar el catálogo de aplicaciones');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (tienePermiso) {
      cargarAplicaciones();
    }
  }, [filtroEstado]);

  const handleAbrirEditar = (a: Aplicacion) => {
    if (!tienePermiso) {
      notifyError('Solo perfiles ADMIN y SWE tienen acceso a este mantenimiento.');
      return;
    }
    setAplicacionSeleccionada(a);
    setEditNombreAplicacion(a.nombre_aplicacion || '');
    setEditSiglas(a.siglas || '');
    setEditLiderTecno(a.lider_tecno || '');
    setEditPoContacto(a.po_contacto || '');
    setEditScrumDatos(a.scrum_datos || '');
    setEditDescripcionActividad(a.descripcion_actividad || '');
    setEditFechaRegistro(a.fecha_registro ? a.fecha_registro.split('T')[0] : '');
    setEditEstado(a.estado || 'Activo');
    setErrorEditar(null);
    setMostrarModalEditar(true);
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreAplicacion.trim()) {
      setErrorCrear('El Nombre de la Aplicación es obligatorio (*).');
      return;
    }

    try {
      setGuardando(true);
      setErrorCrear(null);
      await apiRequest('/aplicaciones', {
        method: 'POST',
        body: JSON.stringify({
          nombre_aplicacion: nombreAplicacion.trim(),
          siglas: siglas.trim() || null,
          lider_tecno: liderTecno.trim() || null,
          po_contacto: poContacto.trim() || null,
          scrum_datos: scrumDatos.trim() || null,
          descripcion_actividad: descripcionActividad.trim() || null,
          fecha_registro: fechaRegistro.trim() || null,
          estado: estadoCrear,
        }),
      });

      exito(`Aplicación "${nombreAplicacion.trim()}" registrada exitosamente.`);
      setMostrarModalCrear(false);
      setNombreAplicacion('');
      setSiglas('');
      setLiderTecno('');
      setPoContacto('');
      setScrumDatos('');
      setDescripcionActividad('');
      setFechaRegistro(new Date().toISOString().split('T')[0]);
      setEstadoCrear('Activo');
      cargarAplicaciones();
    } catch (err: any) {
      const msg = err.message || 'Error al registrar la aplicación';
      setErrorCrear(msg);
      notifyError(msg);
    } finally {
      setGuardando(false);
    }
  };

  const handleEditarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aplicacionSeleccionada) return;

    if (!editNombreAplicacion.trim()) {
      setErrorEditar('El Nombre de la Aplicación es obligatorio (*).');
      return;
    }

    try {
      setGuardandoEditar(true);
      setErrorEditar(null);

      const bodyData: any = {
        nombre_aplicacion: editNombreAplicacion.trim(),
        siglas: editSiglas.trim() || null,
        lider_tecno: editLiderTecno.trim() || null,
        po_contacto: editPoContacto.trim() || null,
        scrum_datos: editScrumDatos.trim() || null,
        descripcion_actividad: editDescripcionActividad.trim() || null,
        fecha_registro: editFechaRegistro.trim() || null,
        estado: editEstado,
      };

      await apiRequest(`/aplicaciones/${aplicacionSeleccionada.aplicacion_id}`, {
        method: 'PUT',
        body: JSON.stringify(bodyData),
      });

      exito(`Aplicación "${editNombreAplicacion.trim()}" actualizada exitosamente.`);
      setMostrarModalEditar(false);
      setAplicacionSeleccionada(null);
      cargarAplicaciones();
    } catch (err: any) {
      const msg = err.message || 'Error al actualizar la aplicación';
      setErrorEditar(msg);
      notifyError(msg);
    } finally {
      setGuardandoEditar(false);
    }
  };

  const handleEliminar = (a: Aplicacion) => {
    if (!tienePermiso) return;
    setAplicacionParaEliminar(a);
  };

  const confirmarEliminar = async () => {
    if (!aplicacionParaEliminar) return;

    try {
      setEliminandoAplicacion(true);
      await apiRequest(`/aplicaciones/${aplicacionParaEliminar.aplicacion_id}`, { method: 'DELETE' });
      exito(`Aplicación "${aplicacionParaEliminar.nombre_aplicacion}" eliminada definitivamente.`);
      setAplicacionParaEliminar(null);
      cargarAplicaciones();
    } catch (err: any) {
      notifyError(err.message || 'Error al eliminar la aplicación');
    } finally {
      setEliminandoAplicacion(false);
    }
  };

  // Filtrado reactivo en la grilla
  const aplicacionesFiltradas = aplicaciones.filter(a => {
    if (filtroCabeceraNombre.trim() && !a.nombre_aplicacion.toLowerCase().includes(filtroCabeceraNombre.trim().toLowerCase())) {
      return false;
    }
    if (filtroCabeceraSiglas.trim() && !(a.siglas || '').toLowerCase().includes(filtroCabeceraSiglas.trim().toLowerCase())) {
      return false;
    }
    if (filtroCabeceraLider.trim() && !(a.lider_tecno || '').toLowerCase().includes(filtroCabeceraLider.trim().toLowerCase())) {
      return false;
    }
    if (filtroCabeceraPO.trim() && !(a.po_contacto || '').toLowerCase().includes(filtroCabeceraPO.trim().toLowerCase())) {
      return false;
    }
    if (filtroCabeceraScrum.trim() && !(a.scrum_datos || '').toLowerCase().includes(filtroCabeceraScrum.trim().toLowerCase())) {
      return false;
    }
    if (filtroCabeceraDescripcion.trim() && !(a.descripcion_actividad || '').toLowerCase().includes(filtroCabeceraDescripcion.trim().toLowerCase())) {
      return false;
    }
    if (filtroCabeceraEstado && a.estado !== filtroCabeceraEstado) {
      return false;
    }
    return true;
  });

  const totalPaginas = Math.max(1, Math.ceil(aplicacionesFiltradas.length / ITEMS_POR_PAGINA));
  const indiceInicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const aplicacionesPaginadas = aplicacionesFiltradas.slice(indiceInicio, indiceInicio + ITEMS_POR_PAGINA);

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
          El catálogo de mantenimiento de <strong>Aplicaciones</strong> está reservado exclusivamente para los roles de <strong>ADMIN</strong> y <strong>SWE</strong> (Líder Técnico).
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-texto-principal)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={24} style={{ color: 'var(--color-primario)' }} />
            Catálogo de Aplicaciones
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>
            Mantenimiento y administración de aplicaciones, siglas y líderes técnicos
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secundario"
            onClick={cargarAplicaciones}
            disabled={cargando}
            title="Recargar catálogo de aplicaciones"
          >
            <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </button>

          {/* Botón Exportar a Excel */}
          <button
            type="button"
            className="btn btn-secundario"
            onClick={() => setMostrarModalExportar(true)}
            title="Exportar aplicaciones a archivo Excel (.xlsx)"
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
            Nueva Aplicación
          </button>
        </div>
      </div>

      {/* Filtros generales */}
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
            placeholder="Buscar por nombre, siglas, líder técnico, PO contacto, scrum o descripción..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && cargarAplicaciones()}
          />
        </div>

        <select className="form-select" style={{ width: '160px' }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Estado: Todos</option>
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
        </select>

        <button type="button" className="btn btn-secundario" onClick={cargarAplicaciones}>
          Buscar
        </button>
      </div>

      {/* Tabla de Aplicaciones */}
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
                {/* Columna: Nombre Aplicación */}
                <th style={{ padding: '10px 16px', textAlign: 'left', minWidth: '220px' }}>
                  <div style={{ marginBottom: '6px' }}>Nombre Aplicación</div>
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

                {/* Columna: Siglas */}
                <th style={{ padding: '10px 16px', textAlign: 'left', minWidth: '120px' }}>
                  <div style={{ marginBottom: '6px' }}>Siglas</div>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', height: '28px', width: '100%', fontWeight: 'normal' }}
                    placeholder="Siglas..."
                    value={filtroCabeceraSiglas}
                    onChange={e => {
                      setFiltroCabeceraSiglas(e.target.value);
                      setPaginaActual(1);
                    }}
                  />
                </th>

                {/* Columna: Líder Técnico */}
                <th style={{ padding: '10px 16px', textAlign: 'left', minWidth: '170px' }}>
                  <div style={{ marginBottom: '6px' }}>Líder Técnico</div>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', height: '28px', width: '100%', fontWeight: 'normal' }}
                    placeholder="Filtrar líder..."
                    value={filtroCabeceraLider}
                    onChange={e => {
                      setFiltroCabeceraLider(e.target.value);
                      setPaginaActual(1);
                    }}
                  />
                </th>

                {/* Columna: PO Contacto */}
                <th style={{ padding: '10px 16px', textAlign: 'left', minWidth: '170px' }}>
                  <div style={{ marginBottom: '6px' }}>PO Contacto</div>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', height: '28px', width: '100%', fontWeight: 'normal' }}
                    placeholder="Filtrar PO..."
                    value={filtroCabeceraPO}
                    onChange={e => {
                      setFiltroCabeceraPO(e.target.value);
                      setPaginaActual(1);
                    }}
                  />
                </th>

                {/* Columna: Scrum Datos */}
                <th style={{ padding: '10px 16px', textAlign: 'left', minWidth: '160px' }}>
                  <div style={{ marginBottom: '6px' }}>SCRUM Datos</div>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', height: '28px', width: '100%', fontWeight: 'normal' }}
                    placeholder="Filtrar Scrum..."
                    value={filtroCabeceraScrum}
                    onChange={e => {
                      setFiltroCabeceraScrum(e.target.value);
                      setPaginaActual(1);
                    }}
                  />
                </th>

                {/* Columna: Descripción Actividad */}
                <th style={{ padding: '10px 16px', textAlign: 'left', minWidth: '220px' }}>
                  <div style={{ marginBottom: '6px' }}>Descripción Actividad</div>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', height: '28px', width: '100%', fontWeight: 'normal' }}
                    placeholder="Filtrar descripción..."
                    value={filtroCabeceraDescripcion}
                    onChange={e => {
                      setFiltroCabeceraDescripcion(e.target.value);
                      setPaginaActual(1);
                    }}
                  />
                </th>

                {/* Columna: Fecha Registro */}
                <th style={{ padding: '12px 16px', textAlign: 'left', width: '130px', verticalAlign: 'bottom' }}>
                  F. Registro
                </th>

                {/* Columna: Estado */}
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
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </th>

                {/* Columna: Acciones */}
                <th style={{ padding: '12px 16px', textAlign: 'center', width: '110px', verticalAlign: 'bottom' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: 'var(--color-texto-terciario)' }}>
                    Cargando aplicaciones...
                  </td>
                </tr>
              ) : aplicacionesPaginadas.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: 'var(--color-texto-terciario)' }}>
                    No se encontraron aplicaciones registradas.
                  </td>
                </tr>
              ) : (
                aplicacionesPaginadas.map(a => (
                  <tr
                    key={a.aplicacion_id}
                    className="fila-interactiva"
                    tabIndex={0}
                    title="Doble clic para editar aplicación"
                    onDoubleClick={() => handleAbrirEditar(a)}
                    style={{ borderBottom: '1px solid var(--color-borde-suave)' }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-primario)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Layers size={16} style={{ color: 'var(--color-primario)', flexShrink: 0 }} />
                        <span>{a.nombre_aplicacion}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {a.siglas ? (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radio-sm)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          color: '#2563EB',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                        }}>
                          {a.siglas}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-texto-terciario)' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-texto-principal)' }}>
                      {a.lider_tecno || <span style={{ color: 'var(--color-texto-terciario)' }}>-</span>}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-texto-secundario)' }}>
                      {a.po_contacto || <span style={{ color: 'var(--color-texto-terciario)' }}>-</span>}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-texto-secundario)' }}>
                      {a.scrum_datos || <span style={{ color: 'var(--color-texto-terciario)' }}>-</span>}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-texto-secundario)', maxWidth: '220px' }}>
                      {a.descripcion_actividad ? (
                        <div
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={a.descripcion_actividad}
                        >
                          {a.descripcion_actividad}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-texto-terciario)' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-texto-terciario)', whiteSpace: 'nowrap' }}>
                      {a.fecha_registro ? a.fecha_registro.split('T')[0] : '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 'var(--radio-full)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: a.estado === 'Activo' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: a.estado === 'Activo' ? '#059669' : '#DC2626',
                        border: a.estado === 'Activo' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: a.estado === 'Activo' ? '#10B981' : '#EF4444'
                        }} />
                        {a.estado}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn-icono"
                          title="Editar Aplicación"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAbrirEditar(a);
                          }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-icono btn-icono-peligro"
                          title="Eliminar Aplicación"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEliminar(a);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
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
          gap: '8px'
        }}>
          <div>
            Mostrando {aplicacionesFiltradas.length > 0 ? indiceInicio + 1 : 0} a {Math.min(indiceInicio + ITEMS_POR_PAGINA, aplicacionesFiltradas.length)} de {aplicacionesFiltradas.length} aplicaciones
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secundario"
              style={{ padding: '4px 8px' }}
              disabled={paginaActual <= 1}
              onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
              Anterior
            </button>
            <span>
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              type="button"
              className="btn btn-secundario"
              style={{ padding: '4px 8px' }}
              disabled={paginaActual >= totalPaginas}
              onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
            >
              Siguiente
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Nueva Aplicación */}
      {mostrarModalCrear && (
        <div className="modal-overlay" onClick={() => setMostrarModalCrear(false)}>
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '580px', borderRadius: 'var(--radio-lg)' }}
          >
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-borde)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="var(--color-primario)" />
                Nueva Aplicación
              </h3>
              <button
                type="button"
                onClick={() => setMostrarModalCrear(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-texto-terciario)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCrear}>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {errorCrear && (
                  <div style={{
                    padding: '10px 14px',
                    backgroundColor: '#FEE2E2',
                    border: '1px solid #FCA5A5',
                    color: '#991B1B',
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

                {/* Nombre de la Aplicación */}
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-texto-principal)', display: 'block', marginBottom: '6px' }}>
                    Nombre de la Aplicación <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Portal de Clientes, Core Bancario, etc."
                    value={nombreAplicacion}
                    onChange={e => setNombreAplicacion(e.target.value)}
                    required
                  />
                </div>

                {/* Siglas y Estado */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-texto-principal)', display: 'block', marginBottom: '6px' }}>
                      Siglas
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej. PCF, CRM, SGA"
                      value={siglas}
                      onChange={e => setSiglas(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-texto-principal)', display: 'block', marginBottom: '6px' }}>
                      Estado
                    </label>
                    <select
                      className="form-select"
                      value={estadoCrear}
                      onChange={e => setEstadoCrear(e.target.value as EstadoAplicacion)}
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>

                {/* Líder Técnico y PO Contacto */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-texto-principal)', display: 'block', marginBottom: '6px' }}>
                      Líder Técnico (Lider_Tecno)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Nombre del líder técnico..."
                      value={liderTecno}
                      onChange={e => setLiderTecno(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-texto-principal)', display: 'block', marginBottom: '6px' }}>
                      PO Contacto (PO_CONTACTO)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Contacto del Product Owner..."
                      value={poContacto}
                      onChange={e => setPoContacto(e.target.value)}
                    />
                  </div>
                </div>

                {/* SCRUM Datos y Fecha Registro */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-texto-principal)', display: 'block', marginBottom: '6px' }}>
                      SCRUM Datos (SCRUM_DATOS)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Scrum Master o squad..."
                      value={scrumDatos}
                      onChange={e => setScrumDatos(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-texto-principal)', display: 'block', marginBottom: '6px' }}>
                      Fecha de Registro
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={fechaRegistro}
                      onChange={e => setFechaRegistro(e.target.value)}
                    />
                  </div>
                </div>

                {/* Descripción de Actividad */}
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-texto-principal)', display: 'block', marginBottom: '6px' }}>
                    Descripción de Actividad (Descripcion_Actividad)
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Detalles o descripción de la actividad / aplicación..."
                    value={descripcionActividad}
                    onChange={e => setDescripcionActividad(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--color-borde)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                backgroundColor: 'var(--color-superficie)'
              }}>
                <button
                  type="button"
                  className="btn btn-secundario"
                  onClick={() => setMostrarModalCrear(false)}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primario"
                  disabled={guardando}
                >
                  {guardando ? 'Guardando...' : 'Crear Aplicación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Aplicación */}
      {mostrarModalEditar && aplicacionSeleccionada && (
        <div className="modal-overlay" onClick={() => setMostrarModalEditar(false)}>
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '580px', borderRadius: 'var(--radio-lg)' }}
          >
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-borde)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} color="var(--color-primario)" />
                Editar Aplicación #{aplicacionSeleccionada.aplicacion_id}
              </h3>
              <button
                type="button"
                onClick={() => setMostrarModalEditar(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-texto-terciario)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditarSubmit}>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {errorEditar && (
                  <div style={{
                    padding: '10px 14px',
                    backgroundColor: '#FEE2E2',
                    border: '1px solid #FCA5A5',
                    color: '#991B1B',
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

                {/* Nombre de la Aplicación */}
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-texto-principal)', display: 'block', marginBottom: '6px' }}>
                    Nombre de la Aplicación <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={editNombreAplicacion}
                    onChange={e => setEditNombreAplicacion(e.target.value)}
                    required
                  />
                </div>

                {/* Siglas y Estado */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-texto-principal)', display: 'block', marginBottom: '6px' }}>
                      Siglas
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={editSiglas}
                      onChange={e => setEditSiglas(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-texto-principal)', display: 'block', marginBottom: '6px' }}>
                      Estado
                    </label>
                    <select
                      className="form-select"
                      value={editEstado}
                      onChange={e => setEditEstado(e.target.value as EstadoAplicacion)}
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>

                {/* Líder Técnico y PO Contacto */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-texto-principal)', display: 'block', marginBottom: '6px' }}>
                      Líder Técnico (Lider_Tecno)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={editLiderTecno}
                      onChange={e => setEditLiderTecno(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-texto-principal)', display: 'block', marginBottom: '6px' }}>
                      PO Contacto (PO_CONTACTO)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={editPoContacto}
                      onChange={e => setEditPoContacto(e.target.value)}
                    />
                  </div>
                </div>

                {/* SCRUM Datos y Fecha Registro */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-texto-principal)', display: 'block', marginBottom: '6px' }}>
                      SCRUM Datos (SCRUM_DATOS)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={editScrumDatos}
                      onChange={e => setEditScrumDatos(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-texto-principal)', display: 'block', marginBottom: '6px' }}>
                      Fecha de Registro
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={editFechaRegistro}
                      onChange={e => setEditFechaRegistro(e.target.value)}
                    />
                  </div>
                </div>

                {/* Descripción de Actividad */}
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-texto-principal)', display: 'block', marginBottom: '6px' }}>
                    Descripción de Actividad (Descripcion_Actividad)
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Detalles o descripción de la actividad / aplicación..."
                    value={editDescripcionActividad}
                    onChange={e => setEditDescripcionActividad(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--color-borde)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                backgroundColor: 'var(--color-superficie)'
              }}>
                <button
                  type="button"
                  className="btn btn-secundario"
                  onClick={() => setMostrarModalEditar(false)}
                  disabled={guardandoEditar}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primario"
                  disabled={guardandoEditar}
                >
                  {guardandoEditar ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación */}
      <ModalConfirmacionEliminar
        abierto={Boolean(aplicacionParaEliminar)}
        titulo="Eliminar Aplicación"
        mensaje={`¿Está seguro de eliminar definitivamente la aplicación "${aplicacionParaEliminar?.nombre_aplicacion}"?`}
        detalle={
          aplicacionParaEliminar && (
            <div>
              <strong>Aplicación:</strong> {aplicacionParaEliminar.nombre_aplicacion}
              <br />
              <strong>Siglas:</strong> {aplicacionParaEliminar.siglas || 'No especificado'}
              <br />
              <strong>Líder Técnico:</strong> {aplicacionParaEliminar.lider_tecno || 'No especificado'}
              <br />
              <strong>Descripción Actividad:</strong> {aplicacionParaEliminar.descripcion_actividad || 'No especificada'}
              <br />
              <strong>Estado:</strong> {aplicacionParaEliminar.estado}
            </div>
          )
        }
        cargando={eliminandoAplicacion}
        onConfirmar={confirmarEliminar}
        onCerrar={() => setAplicacionParaEliminar(null)}
      />

      {/* Modal Exportar a Excel */}
      {mostrarModalExportar && (
        <ModalExportarAplicaciones
          aplicaciones={aplicaciones}
          onCerrar={() => setMostrarModalExportar(false)}
        />
      )}

    </div>
  );
};
