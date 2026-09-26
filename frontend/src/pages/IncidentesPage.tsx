import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertOctagon, Plus, Search, AlertCircle, Edit2, ShieldAlert,
  X, Trash2, ChevronLeft, ChevronRight, RefreshCw, Eye, CheckCircle2,
  FileText, Server, Clock, Calendar, CheckSquare, Layers
} from 'lucide-react';
import { Incidente, Aplicacion, RegistroColaborador, AmbienteIncidente, RutaCriticaIncidente } from '../types';
import { apiRequest } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useNotificacion } from '../context/NotificacionContext';
import { ModalConfirmacionEliminar } from '../components/common/ModalConfirmacionEliminar';
import { ModalExportarIncidentes } from '../components/common/ModalExportarIncidentes';
import { OfficeExcelIcon } from '../components/common/OfficeExcelIcon';
import {
  formatearFecha,
  formatearFechaHora,
  fechaParaInputDate,
  fechaParaInputDateTime
} from '../lib/dateUtils';

const AMBIENTES_DISPONIBLES: AmbienteIncidente[] = ['PRD', 'UAT'];
const RUTAS_CRITICAS_DISPONIBLES: RutaCriticaIncidente[] = ['SI', 'NO'];
export const OPCIONES_APLICAR = [
  'Reelanzar',
  'Force Ok',
  'Termino OK',
  'Deuda_tecnica'
];

export const IncidentesPage: React.FC = () => {
  const { usuario } = useAuth();
  const { exito, error: notifyError } = useNotificacion();

  const tienePermiso = usuario?.perfil === 'ADMIN' || usuario?.perfil === 'SWE';

  // Datos principales
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [cargando, setCargando] = useState(true);

  // Catálogos de apoyo para combos
  const [aplicaciones, setAplicaciones] = useState<Aplicacion[]>([]);
  const [colaboradores, setColaboradores] = useState<RegistroColaborador[]>([]);

  // Filtros de barra superior
  const [busqueda, setBusqueda] = useState('');
  const [filtroAmbiente, setFiltroAmbiente] = useState('');
  const [filtroRutaCritica, setFiltroRutaCritica] = useState('');
  const [filtroAplicativo, setFiltroAplicativo] = useState('');

  // Filtros específicos en cabecera de la grilla (modelo exacto de Catálogo de Registros de Personal)
  // Requerido: (AMBIENTE / job / DTSX / ATENDIDO_POR)
  const [filtroCabeceraAmbiente, setFiltroCabeceraAmbiente] = useState('');
  const [filtroCabeceraJob, setFiltroCabeceraJob] = useState('');
  const [filtroCabeceraDtsx, setFiltroCabeceraDtsx] = useState('');
  const [filtroCabeceraAtendidoPor, setFiltroCabeceraAtendidoPor] = useState('');

  // Paginación 10 en 10
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 10;

  // Modales
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [mostrarModalDetalle, setMostrarModalDetalle] = useState(false);
  const [mostrarModalExportar, setMostrarModalExportar] = useState(false);
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<Incidente | null>(null);
  const [incidenteParaEliminar, setIncidenteParaEliminar] = useState<Incidente | null>(null);

  // Formulario Crear / Editar Estados
  const [formAmbiente, setFormAmbiente] = useState<AmbienteIncidente>('PRD');
  const [formAplicativo, setFormAplicativo] = useState('');
  const [formRutaCritica, setFormRutaCritica] = useState<RutaCriticaIncidente>('NO');
  const [formAtendidoPor, setFormAtendidoPor] = useState('');
  const [formJob, setFormJob] = useState('');
  const [formDtsx, setFormDtsx] = useState('');
  const [formServer, setFormServer] = useState('');
  const [formRuta, setFormRuta] = useState('');
  const [formAplicar, setFormAplicar] = useState('Force Ok');
  const [formFechaCancelacion, setFormFechaCancelacion] = useState('');
  const [formHoraCancelacion, setFormHoraCancelacion] = useState('');
  const [formDescripcionError, setFormDescripcionError] = useState('');
  const [formSolucion, setFormSolucion] = useState('');
  const [formFechaHoraSolucion, setFormFechaHoraSolucion] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  // Cargar incidentes desde API
  const cargarIncidentes = async () => {
    if (!tienePermiso) return;
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (filtroAmbiente) params.append('ambiente', filtroAmbiente);
      if (filtroRutaCritica) params.append('ruta_critica', filtroRutaCritica);
      if (filtroAplicativo) params.append('aplicativo', filtroAplicativo);
      if (busqueda.trim()) params.append('search', busqueda.trim());

      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiRequest<Incidente[]>(`/incidentes${query}`);
      setIncidentes(data);
    } catch (err: any) {
      notifyError(err.message || 'Error al cargar el catálogo de incidentes');
    } finally {
      setCargando(false);
    }
  };

  // Cargar catálogos de apoyo (Aplicaciones y Registros de personal)
  const cargarCatalogosApoyo = async () => {
    try {
      const [apps, regs] = await Promise.all([
        apiRequest<Aplicacion[]>('/aplicaciones'),
        apiRequest<RegistroColaborador[]>('/registros'),
      ]);
      setAplicaciones(apps);
      setColaboradores(regs);
    } catch (err) {
      console.error('Error al cargar catálogos de apoyo:', err);
    }
  };

  useEffect(() => {
    if (tienePermiso) {
      cargarIncidentes();
      cargarCatalogosApoyo();
    }
  }, [filtroAmbiente, filtroRutaCritica, filtroAplicativo]);

  // Lista única de siglas de aplicaciones
  const listaSiglasApps = useMemo(() => {
    const s = new Set<string>();
    aplicaciones.forEach(a => {
      if (a.siglas?.trim()) s.add(a.siglas.trim());
    });
    return Array.from(s).sort();
  }, [aplicaciones]);

  // Filtrado local en cabecera de la grilla (modelo exacto de Catálogo de Registros de Personal)
  const incidentesFiltrados = useMemo(() => {
    return incidentes.filter(item => {
      // 1. Filtro Cabecera AMBIENTE
      if (filtroCabeceraAmbiente && item.ambiente !== filtroCabeceraAmbiente) {
        return false;
      }
      // 2. Filtro Cabecera JOB
      if (filtroCabeceraJob.trim() && !(item.job || '').toLowerCase().includes(filtroCabeceraJob.trim().toLowerCase())) {
        return false;
      }
      // 3. Filtro Cabecera DTSX
      if (filtroCabeceraDtsx.trim() && !(item.dtsx || '').toLowerCase().includes(filtroCabeceraDtsx.trim().toLowerCase())) {
        return false;
      }
      // 4. Filtro Cabecera ATENDIDO_POR
      if (filtroCabeceraAtendidoPor.trim() && !(item.atendido_por || '').toLowerCase().includes(filtroCabeceraAtendidoPor.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [incidentes, filtroCabeceraAmbiente, filtroCabeceraJob, filtroCabeceraDtsx, filtroCabeceraAtendidoPor]);

  // Paginación
  const totalPaginas = Math.max(1, Math.ceil(incidentesFiltrados.length / ITEMS_POR_PAGINA));
  const incidentesPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    return incidentesFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [incidentesFiltrados, paginaActual]);

  // Modal Crear Abrir
  const handleAbrirCrear = () => {
    setErrorForm(null);
    setFormAmbiente('PRD');
    setFormAplicativo(listaSiglasApps[0] || 'FCD');
    setFormRutaCritica('NO');
    setFormAtendidoPor(colaboradores[0]?.nombres || '');
    setFormJob('');
    setFormDtsx('');
    setFormServer('S64rP1');
    setFormRuta('');
    setFormAplicar('Force Ok');
    setFormFechaCancelacion('');
    setFormHoraCancelacion('');
    setFormDescripcionError('');
    setFormSolucion('');
    setFormFechaHoraSolucion('');
    setMostrarModalCrear(true);
  };

  // Modal Editar Abrir
  const handleAbrirEditar = (inc: Incidente) => {
    setIncidenteSeleccionado(inc);
    setErrorForm(null);
    setFormAmbiente((inc.ambiente as AmbienteIncidente) || 'PRD');
    setFormAplicativo(inc.aplicativo || (listaSiglasApps[0] || 'FCD'));
    setFormRutaCritica((inc.ruta_critica as RutaCriticaIncidente) || 'NO');
    setFormAtendidoPor(inc.atendido_por || '');
    setFormJob(inc.job || '');
    setFormDtsx(inc.dtsx || '');
    setFormServer(inc.server || '');
    setFormRuta(inc.ruta || '');
    setFormAplicar(inc.aplicar || 'Force Ok');
    setFormFechaCancelacion(fechaParaInputDate(inc.fecha_cancelacion));
    setFormHoraCancelacion(inc.hora_cancelacion || '');
    setFormDescripcionError(inc.descripcion_error || '');
    setFormSolucion(inc.solucion || '');
    setFormFechaHoraSolucion(fechaParaInputDateTime(inc.fecha_hora_solucion));
    setMostrarModalEditar(true);
  };

  // Modal Detalle Abrir
  const handleAbrirDetalle = (inc: Incidente) => {
    setIncidenteSeleccionado(inc);
    setMostrarModalDetalle(true);
  };

  // Submit Crear
  const handleCrearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJob.trim()) {
      setErrorForm('El código del Job es obligatorio.');
      return;
    }

    try {
      setGuardando(true);
      setErrorForm(null);

      const payload = {
        ambiente: formAmbiente,
        aplicativo: formAplicativo.trim() || null,
        ruta_critica: formRutaCritica,
        atendido_por: formAtendidoPor.trim() || null,
        job: formJob.trim(),
        dtsx: formDtsx.trim() || null,
        server: formServer.trim() || null,
        ruta: formRuta.trim() || null,
        aplicar: formAplicar.trim() || null,
        fecha_cancelacion: formFechaCancelacion ? formFechaCancelacion : null,
        hora_cancelacion: formHoraCancelacion.trim() || null,
        descripcion_error: formDescripcionError.trim() || null,
        solucion: formSolucion.trim() || null,
        fecha_hora_solucion: formFechaHoraSolucion ? formFechaHoraSolucion : null,
      };

      await apiRequest('/incidentes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      exito(`Incidente para job '${formJob.trim()}' creado satisfactoriamente.`);
      setMostrarModalCrear(false);
      cargarIncidentes();
    } catch (err: any) {
      const msg = err.message || 'Error al registrar el incidente';
      setErrorForm(msg);
      notifyError(msg);
    } finally {
      setGuardando(false);
    }
  };

  // Submit Editar
  const handleEditarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidenteSeleccionado) return;

    if (!formJob.trim()) {
      setErrorForm('El código del Job es obligatorio.');
      return;
    }

    try {
      setGuardando(true);
      setErrorForm(null);

      const payload = {
        ambiente: formAmbiente,
        aplicativo: formAplicativo.trim() || null,
        ruta_critica: formRutaCritica,
        atendido_por: formAtendidoPor.trim() || null,
        job: formJob.trim(),
        dtsx: formDtsx.trim() || null,
        server: formServer.trim() || null,
        ruta: formRuta.trim() || null,
        aplicar: formAplicar.trim() || null,
        fecha_cancelacion: formFechaCancelacion ? formFechaCancelacion : null,
        hora_cancelacion: formHoraCancelacion.trim() || null,
        descripcion_error: formDescripcionError.trim() || null,
        solucion: formSolucion.trim() || null,
        fecha_hora_solucion: formFechaHoraSolucion ? formFechaHoraSolucion : null,
      };

      await apiRequest(`/incidentes/${incidenteSeleccionado.incidente_id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      exito(`Incidente #${incidenteSeleccionado.incidente_id} actualizado satisfactoriamente.`);
      setMostrarModalEditar(false);
      setIncidenteSeleccionado(null);
      cargarIncidentes();
    } catch (err: any) {
      const msg = err.message || 'Error al actualizar el incidente';
      setErrorForm(msg);
      notifyError(msg);
    } finally {
      setGuardando(false);
    }
  };

  // Eliminar
  const handleConfirmarEliminar = async () => {
    if (!incidenteParaEliminar) return;
    try {
      await apiRequest(`/incidentes/${incidenteParaEliminar.incidente_id}`, {
        method: 'DELETE',
      });
      exito(`Incidente #${incidenteParaEliminar.incidente_id} (${incidenteParaEliminar.job}) eliminado exitosamente.`);
      setIncidenteParaEliminar(null);
      cargarIncidentes();
    } catch (err: any) {
      notifyError(err.message || 'Error al eliminar el incidente');
    }
  };

  // Función auxiliar para obtener formato visual de colaborador
  const obtenerTextoColaborador = (nombreOAtendido?: string | null) => {
    if (!nombreOAtendido) return '-';
    const found = colaboradores.find(c => c.nombres.toLowerCase() === nombreOAtendido.toLowerCase());
    if (found) {
      return `${found.nombres} (${found.perfil})`;
    }
    // Si contiene "HENRY"
    const henryMatch = colaboradores.find(c => c.nombres.toLowerCase().includes('henry') && nombreOAtendido.toLowerCase().includes('henry'));
    if (henryMatch) {
      return `${henryMatch.nombres} (${henryMatch.perfil})`;
    }
    return nombreOAtendido;
  };

  // Render si no tiene permiso
  if (!tienePermiso) {
    return (
      <div style={{
        padding: '40px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        backgroundColor: 'var(--color-superficie)',
        borderRadius: 'var(--radio-lg)',
        border: '1px solid var(--color-borde)',
        marginTop: '20px',
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
          color: '#991B1B'
        }}>
          <ShieldAlert size={32} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-texto-principal)' }}>
          Acceso Restringido al Módulo de Incidentes
        </h2>
        <p style={{ maxWidth: '540px', color: 'var(--color-texto-secundario)', fontSize: '0.9rem', lineHeight: 1.5 }}>
          El módulo de <strong>Registro de Incidentes</strong> está habilitado exclusivamente para colaboradores con perfil <strong>ADMIN</strong> o <strong>SWE</strong>.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Cabecera Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-texto-principal)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertOctagon size={24} style={{ color: 'var(--color-primario)' }} />
            Catálogo de Incidentes (Jobs y DTSX)
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>
            Mantenimiento y catálogo de incidentes de jobs, paquetes DTSX y soluciones aplicadas
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secundario"
            onClick={cargarIncidentes}
            disabled={cargando}
            title="Recargar catálogo de incidentes"
          >
            <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </button>

          {/* Botón Exportar a Excel */}
          <button
            type="button"
            className="btn btn-secundario"
            onClick={() => setMostrarModalExportar(true)}
            title="Exportar incidentes a archivo Excel (.xlsx)"
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
            onClick={handleAbrirCrear}
          >
            <Plus size={16} />
            Nuevo Incidente
          </button>
        </div>
      </div>

      {/* Barra de Filtros Superiores */}
      <div style={{
        backgroundColor: 'var(--color-superficie)',
        border: '1px solid var(--color-borde)',
        borderRadius: 'var(--radio-lg)',
        padding: '16px',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-texto-terciario)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '38px' }}
            placeholder="Buscar por Job, DTSX, error, solución, aplicativo o servidor..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && cargarIncidentes()}
          />
        </div>

        <select
          className="form-select"
          style={{ width: '170px' }}
          value={filtroAmbiente}
          onChange={e => setFiltroAmbiente(e.target.value)}
        >
          <option value="">Ambiente: Todos</option>
          {AMBIENTES_DISPONIBLES.map(amb => (
            <option key={amb} value={amb}>{amb}</option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ width: '180px' }}
          value={filtroRutaCritica}
          onChange={e => setFiltroRutaCritica(e.target.value)}
        >
          <option value="">Ruta Crítica: Todas</option>
          {RUTAS_CRITICAS_DISPONIBLES.map(rc => (
            <option key={rc} value={rc}>Ruta Crítica: {rc}</option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ width: '190px' }}
          value={filtroAplicativo}
          onChange={e => setFiltroAplicativo(e.target.value)}
        >
          <option value="">Aplicativo: Todos</option>
          {listaSiglasApps.map(sig => (
            <option key={sig} value={sig}>{sig}</option>
          ))}
        </select>

        <button type="button" className="btn btn-secundario" onClick={cargarIncidentes}>
          Buscar
        </button>
      </div>

      {/* Tabla de Incidentes (modelo exacto de Catálogo de Registros de Personal) */}
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
                {/* 1. Columna: AMBIENTE (con filtro exclusivo en cabecera) */}
                <th style={{ padding: '10px 14px', textAlign: 'left', minWidth: '130px' }}>
                  <div style={{ marginBottom: '6px', fontWeight: 700 }}>Ambiente</div>
                  <select
                    className="form-select"
                    style={{ fontSize: '0.75rem', padding: '2px 6px', height: '28px', width: '100%', fontWeight: 'normal' }}
                    value={filtroCabeceraAmbiente}
                    onChange={e => {
                      setFiltroCabeceraAmbiente(e.target.value);
                      setPaginaActual(1);
                    }}
                  >
                    <option value="">Todos</option>
                    <option value="PRD">PRD</option>
                    <option value="UAT">UAT</option>
                  </select>
                </th>

                {/* 2. Columna: JOB (con filtro exclusivo en cabecera) */}
                <th style={{ padding: '10px 14px', textAlign: 'left', minWidth: '170px' }}>
                  <div style={{ marginBottom: '6px', fontWeight: 700 }}>Job</div>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', height: '28px', width: '100%', fontWeight: 'normal' }}
                    placeholder="Filtrar Job..."
                    value={filtroCabeceraJob}
                    onChange={e => {
                      setFiltroCabeceraJob(e.target.value);
                      setPaginaActual(1);
                    }}
                  />
                </th>

                {/* 3. Columna: DTSX (con filtro exclusivo en cabecera) */}
                <th style={{ padding: '10px 14px', textAlign: 'left', minWidth: '210px' }}>
                  <div style={{ marginBottom: '6px', fontWeight: 700 }}>DTSX</div>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', height: '28px', width: '100%', fontWeight: 'normal' }}
                    placeholder="Filtrar DTSX..."
                    value={filtroCabeceraDtsx}
                    onChange={e => {
                      setFiltroCabeceraDtsx(e.target.value);
                      setPaginaActual(1);
                    }}
                  />
                </th>

                {/* 4. Columna: ATENDIDO_POR (con filtro exclusivo en cabecera) */}
                <th style={{ padding: '10px 14px', textAlign: 'left', minWidth: '220px' }}>
                  <div style={{ marginBottom: '6px', fontWeight: 700 }}>Atendido Por</div>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', height: '28px', width: '100%', fontWeight: 'normal' }}
                    placeholder="Filtrar Atendido por..."
                    value={filtroCabeceraAtendidoPor}
                    onChange={e => {
                      setFiltroCabeceraAtendidoPor(e.target.value);
                      setPaginaActual(1);
                    }}
                  />
                </th>

                {/* 5. Columna: APLICATIVO */}
                <th style={{ padding: '12px 14px', textAlign: 'left', verticalAlign: 'bottom', minWidth: '95px' }}>
                  Aplicativo
                </th>

                {/* 6. Columna: RUTA_CRITICA */}
                <th style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'bottom', minWidth: '95px' }}>
                  R. Crítica
                </th>

                {/* 7. Columna: F. Cancelación (DD/MM/YYYY) */}
                <th style={{ padding: '12px 14px', textAlign: 'left', verticalAlign: 'bottom', minWidth: '115px' }}>
                  F. Cancelación
                </th>

                {/* 8. Columna: F. Solución (DD/MM/YYYY HH:MM) */}
                <th style={{ padding: '12px 14px', textAlign: 'left', verticalAlign: 'bottom', minWidth: '140px' }}>
                  F. Solución
                </th>

                {/* 9. Columna: ACCIONES */}
                <th style={{ padding: '12px 14px', textAlign: 'center', width: '120px', verticalAlign: 'bottom' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: 'var(--color-texto-terciario)' }}>
                    Cargando catálogo de incidentes...
                  </td>
                </tr>
              ) : incidentesPaginados.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: 'var(--color-texto-terciario)' }}>
                    No se encontraron incidentes con los criterios de búsqueda seleccionados.
                  </td>
                </tr>
              ) : (
                incidentesPaginados.map(inc => (
                  <tr
                    key={inc.incidente_id}
                    className="fila-interactiva"
                    tabIndex={0}
                    title="Doble clic para editar este incidente"
                    onDoubleClick={() => handleAbrirEditar(inc)}
                    style={{ borderBottom: '1px solid var(--color-borde-suave)' }}
                  >
                    {/* AMBIENTE */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radio-pildora)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: inc.ambiente === 'PRD' ? '#DBEAFE' : '#FEF3C7',
                        color: inc.ambiente === 'PRD' ? '#1E40AF' : '#92400E',
                        border: `1px solid ${inc.ambiente === 'PRD' ? '#BFDBFE' : '#FDE68A'}`,
                      }}>
                        {inc.ambiente}
                      </span>
                    </td>

                    {/* JOB */}
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-primario)' }}>
                      {inc.job}
                    </td>

                    {/* DTSX */}
                    <td style={{ padding: '12px 14px', color: 'var(--color-texto-principal)', maxWidth: '240px', wordBreak: 'break-all' }}>
                      <span style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                        {inc.dtsx || '-'}
                      </span>
                    </td>

                    {/* ATENDIDO_POR: NOMBRES (PERFIL) */}
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--color-texto-principal)' }}>
                      {obtenerTextoColaborador(inc.atendido_por)}
                    </td>

                    {/* APLICATIVO */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radio-pildora)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: 'var(--color-superficie-hover)',
                        color: 'var(--color-texto-principal)',
                        border: '1px solid var(--color-borde)',
                      }}>
                        {inc.aplicativo || '-'}
                      </span>
                    </td>

                    {/* RUTA_CRITICA */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radio-pildora)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: inc.ruta_critica === 'SI' ? '#FEE2E2' : '#F1F5F9',
                        color: inc.ruta_critica === 'SI' ? '#991B1B' : '#64748B',
                        border: `1px solid ${inc.ruta_critica === 'SI' ? '#FECACA' : '#E2E8F0'}`,
                      }}>
                        {inc.ruta_critica || 'NO'}
                      </span>
                    </td>

                    {/* FECHA_CANCELACION: Formato DD/MM/YYYY */}
                    <td style={{ padding: '12px 14px', color: 'var(--color-texto-secundario)' }}>
                      {formatearFecha(inc.fecha_cancelacion)}
                    </td>

                    {/* FECHA_HORA_SOLUCION: Formato DD/MM/YYYY HH:MM */}
                    <td style={{ padding: '12px 14px', color: 'var(--color-texto-secundario)' }}>
                      {formatearFechaHora(inc.fecha_hora_solucion)}
                    </td>

                    {/* ACCIONES */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn-icono"
                          title="Ver detalle completo del incidente"
                          onClick={() => handleAbrirDetalle(inc)}
                          style={{
                            padding: '6px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-texto-secundario)',
                            cursor: 'pointer',
                            borderRadius: 'var(--radio-sm)'
                          }}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-icono"
                          title="Editar incidente"
                          onClick={() => handleAbrirEditar(inc)}
                          style={{
                            padding: '6px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-primario)',
                            cursor: 'pointer',
                            borderRadius: 'var(--radio-sm)'
                          }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-icono"
                          title="Eliminar incidente"
                          onClick={() => setIncidenteParaEliminar(inc)}
                          style={{
                            padding: '6px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-error)',
                            cursor: 'pointer',
                            borderRadius: 'var(--radio-sm)'
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

        {/* Paginación y contador */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--color-borde)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--color-superficie-hover)',
          fontSize: '0.8rem',
          color: 'var(--color-texto-secundario)',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <div>
            Mostrando <strong>{incidentesFiltrados.length === 0 ? 0 : (paginaActual - 1) * ITEMS_POR_PAGINA + 1}</strong> a{' '}
            <strong>{Math.min(paginaActual * ITEMS_POR_PAGINA, incidentesFiltrados.length)}</strong> de{' '}
            <strong>{incidentesFiltrados.length}</strong> incidentes
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="btn btn-secundario"
              style={{ padding: '4px 8px', height: '28px' }}
              disabled={paginaActual <= 1}
              onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
              Anterior
            </button>

            <span style={{ padding: '0 8px', fontWeight: 600 }}>
              Pág. {paginaActual} de {totalPaginas}
            </span>

            <button
              type="button"
              className="btn btn-secundario"
              style={{ padding: '4px 8px', height: '28px' }}
              disabled={paginaActual >= totalPaginas}
              onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
            >
              Siguiente
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL CREAR INCIDENTE */}
      {mostrarModalCrear && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--color-superficie)', borderRadius: 'var(--radio-lg)',
            width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: 'var(--sombra-lg)', border: '1px solid var(--color-borde)',
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--color-borde)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-texto-principal)' }}>
                  Nuevo Registro de Incidente
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-texto-secundario)' }}>
                  Complete los campos para registrar un nuevo incidente de Job / DTSX
                </p>
              </div>
              <button type="button" onClick={() => setMostrarModalCrear(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-texto-terciario)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCrearSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {errorForm && (
                <div style={{
                  padding: '10px 14px', borderRadius: 'var(--radio-md)', backgroundColor: '#FEE2E2',
                  border: '1px solid #FECACA', color: '#991B1B', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  <AlertCircle size={16} />
                  <span>{errorForm}</span>
                </div>
              )}

              {/* Fila 1: Ambiente, Aplicativo, Ruta Crítica */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                    Ambiente (*)
                  </label>
                  <select
                    className="form-select"
                    value={formAmbiente}
                    onChange={e => setFormAmbiente(e.target.value as AmbienteIncidente)}
                    style={{ width: '100%' }}
                    required
                  >
                    {AMBIENTES_DISPONIBLES.map(amb => (
                      <option key={amb} value={amb}>{amb}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                    Aplicativo (Siglas) (*)
                  </label>
                  <select
                    className="form-select"
                    value={formAplicativo}
                    onChange={e => setFormAplicativo(e.target.value)}
                    style={{ width: '100%' }}
                    required
                  >
                    <option value="">-- Seleccione Sigla --</option>
                    {listaSiglasApps.map(sig => (
                      <option key={sig} value={sig}>{sig}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                    Ruta Crítica (*)
                  </label>
                  <select
                    className="form-select"
                    value={formRutaCritica}
                    onChange={e => setFormRutaCritica(e.target.value as RutaCriticaIncidente)}
                    style={{ width: '100%' }}
                    required
                  >
                    {RUTAS_CRITICAS_DISPONIBLES.map(rc => (
                      <option key={rc} value={rc}>{rc}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fila 2: Atendido Por (Combo NOMBRES (PERFIL) de Registros) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  Atendido Por (Nombres y Perfil)
                </label>
                <select
                  className="form-select"
                  value={formAtendidoPor}
                  onChange={e => setFormAtendidoPor(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">-- Sin asignar / Seleccionar Colaborador --</option>
                  {colaboradores.map(colab => (
                    <option key={colab.registro_id || colab.registro} value={colab.nombres}>
                      {colab.nombres} ({colab.perfil})
                    </option>
                  ))}
                </select>
              </div>

              {/* Fila 3: Job, DTSX */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                    Job (*)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: EFCD092D034W"
                    value={formJob}
                    onChange={e => setFormJob(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                    Paquete DTSX
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: FCD_Notifica_Factura.dtsx"
                    value={formDtsx}
                    onChange={e => setFormDtsx(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Fila 4: Server, Ruta, Aplicar */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                    Server
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: S64rP1"
                    value={formServer}
                    onChange={e => setFormServer(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                    Ruta
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: \\s429vP2\ISP\BDD\FCD\"
                    value={formRuta}
                    onChange={e => setFormRuta(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                    Aplicar
                  </label>
                  <select
                    className="form-select"
                    value={formAplicar}
                    onChange={e => setFormAplicar(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">-- Seleccionar --</option>
                    {OPCIONES_APLICAR.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fila 5: Fechas y Horas de Cancelación */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                    Fecha Cancelación (DD/MM/YYYY)
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formFechaCancelacion}
                    onChange={e => setFormFechaCancelacion(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                    Hora Cancelación
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: 02:30 - 04:00 am"
                    value={formHoraCancelacion}
                    onChange={e => setFormHoraCancelacion(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Fila 6: Descripción del Error */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  Descripción del Error
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Detalle o mensaje del error / stacktrace..."
                  value={formDescripcionError}
                  onChange={e => setFormDescripcionError(e.target.value)}
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
              </div>

              {/* Fila 7: Solución */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  Solución Aplicada
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Pasos de resolución, comandos ejecutados o procedimiento..."
                  value={formSolucion}
                  onChange={e => setFormSolucion(e.target.value)}
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
              </div>

              {/* Fila 8: Fecha y Hora de Solución (DD/MM/YYYY HH:MM) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  Fecha y Hora Solución (DD/MM/YYYY HH:MM)
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={formFechaHoraSolucion}
                  onChange={e => setFormFechaHoraSolucion(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Botones de acción */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-borde)' }}>
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
                  {guardando ? 'Guardando...' : 'Crear Incidente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR INCIDENTE */}
      {mostrarModalEditar && incidenteSeleccionado && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--color-superficie)', borderRadius: 'var(--radio-lg)',
            width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: 'var(--sombra-lg)', border: '1px solid var(--color-borde)',
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--color-borde)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-texto-principal)' }}>
                  Editar Incidente #{incidenteSeleccionado.incidente_id} ({incidenteSeleccionado.job})
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-texto-secundario)' }}>
                  Modifique la información y solución del incidente
                </p>
              </div>
              <button type="button" onClick={() => setMostrarModalEditar(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-texto-terciario)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditarSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {errorForm && (
                <div style={{
                  padding: '10px 14px', borderRadius: 'var(--radio-md)', backgroundColor: '#FEE2E2',
                  border: '1px solid #FECACA', color: '#991B1B', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  <AlertCircle size={16} />
                  <span>{errorForm}</span>
                </div>
              )}

              {/* Fila 1: Ambiente, Aplicativo, Ruta Crítica */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                    Ambiente (*)
                  </label>
                  <select
                    className="form-select"
                    value={formAmbiente}
                    onChange={e => setFormAmbiente(e.target.value as AmbienteIncidente)}
                    style={{ width: '100%' }}
                    required
                  >
                    {AMBIENTES_DISPONIBLES.map(amb => (
                      <option key={amb} value={amb}>{amb}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                    Aplicativo (Siglas) (*)
                  </label>
                  <select
                    className="form-select"
                    value={formAplicativo}
                    onChange={e => setFormAplicativo(e.target.value)}
                    style={{ width: '100%' }}
                    required
                  >
                    <option value="">-- Seleccione Sigla --</option>
                    {listaSiglasApps.map(sig => (
                      <option key={sig} value={sig}>{sig}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                    Ruta Crítica (*)
                  </label>
                  <select
                    className="form-select"
                    value={formRutaCritica}
                    onChange={e => setFormRutaCritica(e.target.value as RutaCriticaIncidente)}
                    style={{ width: '100%' }}
                    required
                  >
                    {RUTAS_CRITICAS_DISPONIBLES.map(rc => (
                      <option key={rc} value={rc}>{rc}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fila 2: Atendido Por */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  Atendido Por (Nombres y Perfil)
                </label>
                <select
                  className="form-select"
                  value={formAtendidoPor}
                  onChange={e => setFormAtendidoPor(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">-- Sin asignar / Seleccionar Colaborador --</option>
                  {/* Si el valor existente no coincide exactamente con ninguno de los registrados, mostrarlo como opción adicional */}
                  {formAtendidoPor && !colaboradores.some(c => c.nombres.toLowerCase() === formAtendidoPor.toLowerCase()) && (
                    <option value={formAtendidoPor}>{formAtendidoPor} (Registrado en Excel)</option>
                  )}
                  {colaboradores.map(colab => (
                    <option key={colab.registro_id || colab.registro} value={colab.nombres}>
                      {colab.nombres} ({colab.perfil})
                    </option>
                  ))}
                </select>
              </div>

              {/* Fila 3: Job, DTSX */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                    Job (*)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: EFCD092D034W"
                    value={formJob}
                    onChange={e => setFormJob(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                    Paquete DTSX
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: FCD_Notifica_Factura.dtsx"
                    value={formDtsx}
                    onChange={e => setFormDtsx(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Fila 4: Server, Ruta, Aplicar */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                    Server
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: S64rP1"
                    value={formServer}
                    onChange={e => setFormServer(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                    Ruta
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: \\s429vP2\ISP\BDD\FCD\"
                    value={formRuta}
                    onChange={e => setFormRuta(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                    Aplicar
                  </label>
                  <select
                    className="form-select"
                    value={formAplicar}
                    onChange={e => setFormAplicar(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">-- Seleccionar --</option>
                    {formAplicar && !OPCIONES_APLICAR.includes(formAplicar) && (
                      <option value={formAplicar}>{formAplicar} (Registrado)</option>
                    )}
                    {OPCIONES_APLICAR.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fila 5: Fechas y Horas de Cancelación */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                    Fecha Cancelación (DD/MM/YYYY)
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formFechaCancelacion}
                    onChange={e => setFormFechaCancelacion(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                    Hora Cancelación
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: 02:30 - 04:00 am"
                    value={formHoraCancelacion}
                    onChange={e => setFormHoraCancelacion(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Fila 6: Descripción del Error */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  Descripción del Error
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Detalle o mensaje del error..."
                  value={formDescripcionError}
                  onChange={e => setFormDescripcionError(e.target.value)}
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
              </div>

              {/* Fila 7: Solución */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  Solución Aplicada
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Pasos de resolución..."
                  value={formSolucion}
                  onChange={e => setFormSolucion(e.target.value)}
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
              </div>

              {/* Fila 8: Fecha y Hora de Solución */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  Fecha y Hora Solución (DD/MM/YYYY HH:MM)
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={formFechaHoraSolucion}
                  onChange={e => setFormFechaHoraSolucion(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Botones de acción */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-borde)' }}>
                <button
                  type="button"
                  className="btn btn-secundario"
                  onClick={() => setMostrarModalEditar(false)}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primario"
                  disabled={guardando}
                >
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE INCIDENTE */}
      {mostrarModalDetalle && incidenteSeleccionado && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--color-superficie)', borderRadius: 'var(--radio-lg)',
            width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: 'var(--sombra-lg)', border: '1px solid var(--color-borde)',
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--color-borde)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              backgroundColor: 'var(--color-superficie-hover)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  padding: '6px', borderRadius: 'var(--radio-md)',
                  backgroundColor: 'var(--color-primario-suave)', color: 'var(--color-primario)'
                }}>
                  <AlertOctagon size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-texto-principal)' }}>
                    Detalle del Incidente: {incidenteSeleccionado.job}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-texto-secundario)' }}>
                    ID #{incidenteSeleccionado.incidente_id} | Registrado el {formatearFechaHora(incidenteSeleccionado.fecha_creacion)}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setMostrarModalDetalle(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-texto-terciario)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Resumen de Datos Clave */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px',
                backgroundColor: 'var(--color-superficie-hover)', padding: '14px', borderRadius: 'var(--radio-md)',
                border: '1px solid var(--color-borde)'
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-texto-terciario)', textTransform: 'uppercase', fontWeight: 700 }}>Ambiente</span>
                  <div style={{ marginTop: '4px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 'var(--radio-pildora)', fontSize: '0.75rem', fontWeight: 700,
                      backgroundColor: incidenteSeleccionado.ambiente === 'PRD' ? '#DBEAFE' : '#FEF3C7',
                      color: incidenteSeleccionado.ambiente === 'PRD' ? '#1E40AF' : '#92400E'
                    }}>
                      {incidenteSeleccionado.ambiente}
                    </span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-texto-terciario)', textTransform: 'uppercase', fontWeight: 700 }}>Aplicativo</span>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-texto-principal)', marginTop: '4px' }}>
                    {incidenteSeleccionado.aplicativo || '-'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-texto-terciario)', textTransform: 'uppercase', fontWeight: 700 }}>Ruta Crítica</span>
                  <div style={{ marginTop: '4px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 'var(--radio-pildora)', fontSize: '0.75rem', fontWeight: 700,
                      backgroundColor: incidenteSeleccionado.ruta_critica === 'SI' ? '#FEE2E2' : '#F1F5F9',
                      color: incidenteSeleccionado.ruta_critica === 'SI' ? '#991B1B' : '#64748B'
                    }}>
                      {incidenteSeleccionado.ruta_critica || 'NO'}
                    </span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-texto-terciario)', textTransform: 'uppercase', fontWeight: 700 }}>Atendido Por</span>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-texto-principal)', marginTop: '4px' }}>
                    {obtenerTextoColaborador(incidenteSeleccionado.atendido_por)}
                  </div>
                </div>
              </div>

              {/* Detalles Técnicos */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)', fontWeight: 700 }}>Paquete DTSX:</span>
                  <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primario)', marginTop: '2px', wordBreak: 'break-all' }}>
                    {incidenteSeleccionado.dtsx || 'No especificado'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)', fontWeight: 700 }}>Servidor (Server):</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-texto-principal)', marginTop: '2px' }}>
                    {incidenteSeleccionado.server || 'No especificado'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)', fontWeight: 700 }}>Acción a Aplicar:</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-texto-principal)', marginTop: '2px' }}>
                    {incidenteSeleccionado.aplicar || 'No especificado'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)', fontWeight: 700 }}>Ruta de Archivo:</span>
                  <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--color-texto-secundario)', marginTop: '2px', wordBreak: 'break-all' }}>
                    {incidenteSeleccionado.ruta || 'No especificado'}
                  </div>
                </div>
              </div>

              {/* Bloque Fechas con Formatos DD/MM/YYYY y DD/MM/YYYY HH:MM */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px',
                backgroundColor: 'var(--color-superficie)', padding: '12px', borderRadius: 'var(--radio-md)',
                border: '1px solid var(--color-borde)'
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} /> Fecha Cancelación (DD/MM/YYYY)
                  </span>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-texto-principal)', marginTop: '4px' }}>
                    {formatearFecha(incidenteSeleccionado.fecha_cancelacion)}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} /> Hora Cancelación
                  </span>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-texto-principal)', marginTop: '4px' }}>
                    {incidenteSeleccionado.hora_cancelacion || '-'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={14} /> Fecha y Hora Solución (DD/MM/YYYY HH:MM)
                  </span>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primario)', marginTop: '4px' }}>
                    {formatearFechaHora(incidenteSeleccionado.fecha_hora_solucion)}
                  </div>
                </div>
              </div>

              {/* Descripción del Error */}
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-texto-principal)', display: 'block', marginBottom: '6px' }}>
                  Descripción del Error:
                </span>
                <div style={{
                  backgroundColor: '#0F172A', color: '#F8FAFC', padding: '14px', borderRadius: 'var(--radio-md)',
                  fontSize: '0.8rem', fontFamily: 'Consolas, monospace', whiteSpace: 'pre-wrap', maxHeight: '180px', overflowY: 'auto'
                }}>
                  {incidenteSeleccionado.descripcion_error || 'Sin descripción registrada'}
                </div>
              </div>

              {/* Solución Aplicada */}
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-texto-principal)', display: 'block', marginBottom: '6px' }}>
                  Solución Aplicada:
                </span>
                <div style={{
                  backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #DCFCE7', padding: '14px', borderRadius: 'var(--radio-md)',
                  fontSize: '0.85rem', whiteSpace: 'pre-wrap', maxHeight: '180px', overflowY: 'auto', lineHeight: 1.5
                }}>
                  {incidenteSeleccionado.solucion || 'Sin solución registrada aún'}
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-borde)' }}>
                <button
                  type="button"
                  className="btn btn-secundario"
                  onClick={() => setMostrarModalDetalle(false)}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  className="btn btn-primario"
                  onClick={() => {
                    setMostrarModalDetalle(false);
                    handleAbrirEditar(incidenteSeleccionado);
                  }}
                >
                  <Edit2 size={16} />
                  Editar Incidente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINAR */}
      <ModalConfirmacionEliminar
        abierto={!!incidenteParaEliminar}
        titulo="Eliminar Incidente"
        mensaje={incidenteParaEliminar ? `¿Está seguro de que desea eliminar el incidente del job '${incidenteParaEliminar.job}' (DTSX: ${incidenteParaEliminar.dtsx || 'N/A'})? Esta acción no se puede deshacer.` : ''}
        onConfirmar={handleConfirmarEliminar}
        onCerrar={() => setIncidenteParaEliminar(null)}
      />

      {/* MODAL EXPORTAR A EXCEL */}
      {mostrarModalExportar && (
        <ModalExportarIncidentes
          incidentes={incidentes}
          onCerrar={() => setMostrarModalExportar(false)}
        />
      )}

    </div>
  );
};
