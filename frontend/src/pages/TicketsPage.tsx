import React, { useState, useEffect, useMemo } from 'react';
import {
  Ticket as TicketIcon, Plus, Search, AlertCircle, Edit2, ShieldAlert,
  X, Trash2, ChevronLeft, ChevronRight, RefreshCw, Lock, AlertTriangle,
  FolderKanban, Layers, Calendar, Phone, User
} from 'lucide-react';
import { Ticket, TipoTicket, AmbienteTicket, EstadoTicket, Proyecto, Aplicacion } from '../types';
import { apiRequest } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useNotificacion } from '../context/NotificacionContext';
import { ModalConfirmacionEliminar } from '../components/common/ModalConfirmacionEliminar';
import { ModalExportarTickets } from '../components/common/ModalExportarTickets';
import { OfficeExcelIcon } from '../components/common/OfficeExcelIcon';
import { formatearFecha, formatearFechaHora, fechaParaInputDateTime } from '../lib/dateUtils';

const ESTADOS_TERMINALES: EstadoTicket[] = ['SOLUCIONADO', 'ANULADO', 'RECHAZADO'];

const TIPOS_DISPONIBLES: TipoTicket[] = ['Incident', 'Request', 'OC'];
const AMBIENTES_DISPONIBLES: AmbienteTicket[] = ['UAT', 'PRD'];
const ESTADOS_DISPONIBLES: EstadoTicket[] = [
  'ABIERTO',
  'ASIGNADO',
  'EN_PROCESO',
  'DEVUELTO',
  'SOLUCIONADO',
  'ANULADO',
  'RECHAZADO'
];

export const TicketsPage: React.FC = () => {
  const { usuario } = useAuth();
  const { exito, error: notifyError } = useNotificacion();

  const tienePermiso = usuario?.perfil === 'ADMIN' || usuario?.perfil === 'SWE';

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [cargando, setCargando] = useState(true);

  // Catálogos para combos
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [aplicaciones, setAplicaciones] = useState<Aplicacion[]>([]);

  // Filtros principales solicitados: tipo / ticket / descripcion + estado / ambiente
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroTicket, setFiltroTicket] = useState('');
  const [filtroDescripcion, setFiltroDescripcion] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroAmbiente, setFiltroAmbiente] = useState('');

  // Filtros interactivos en cabecera de la grilla (modelo RegistrosPage)
  const [filtroCabeceraTipo, setFiltroCabeceraTipo] = useState('');
  const [filtroCabeceraTicket, setFiltroCabeceraTicket] = useState('');
  const [filtroCabeceraDescripcion, setFiltroCabeceraDescripcion] = useState('');
  const [filtroCabeceraEstado, setFiltroCabeceraEstado] = useState('');

  // Paginación 10 en 10 (modelo RegistrosPage)
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 10;

  // Modales
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [mostrarModalExportar, setMostrarModalExportar] = useState(false);
  const [ticketParaEliminar, setTicketParaEliminar] = useState<Ticket | null>(null);
  const [eliminandoTicket, setEliminandoTicket] = useState(false);
  const [ticketSeleccionado, setTicketSeleccionado] = useState<Ticket | null>(null);

  // Estados del Formulario (Crear)
  const [tipo, setTipo] = useState<TipoTicket>('Incident');
  const [ticketCod, setTicketCod] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [proyecto, setProyecto] = useState('');
  const [aplicativo, setAplicativo] = useState('');
  const [ambiente, setAmbiente] = useState<AmbienteTicket | ''>('');
  const [estado, setEstado] = useState<EstadoTicket>('ABIERTO');
  const [fechaRegistro, setFechaRegistro] = useState('');
  const [fechaAtencion, setFechaAtencion] = useState('');
  const [ibmAsignado, setIbmAsignado] = useState('');
  const [celContacto, setCelContacto] = useState('');
  const [comentario, setComentario] = useState('');
  const [errorCrear, setErrorCrear] = useState<string | null>(null);
  const [guardandoCrear, setGuardandoCrear] = useState(false);

  // Estados del Formulario (Editar)
  const [editTipo, setEditTipo] = useState<TipoTicket>('Incident');
  const [editTicketCod, setEditTicketCod] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editProyecto, setEditProyecto] = useState('');
  const [editAplicativo, setEditAplicativo] = useState('');
  const [editAmbiente, setEditAmbiente] = useState<AmbienteTicket | ''>('');
  const [editEstado, setEditEstado] = useState<EstadoTicket>('ABIERTO');
  const [editFechaRegistro, setEditFechaRegistro] = useState('');
  const [editFechaAtencion, setEditFechaAtencion] = useState('');
  const [editIbmAsignado, setEditIbmAsignado] = useState('');
  const [editCelContacto, setEditCelContacto] = useState('');
  const [editComentario, setEditComentario] = useState('');
  const [errorEditar, setErrorEditar] = useState<string | null>(null);
  const [guardandoEditar, setGuardandoEditar] = useState(false);

  // Cargar tickets desde API
  const cargarTickets = async () => {
    if (!tienePermiso) return;
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (filtroTipo) params.append('tipo', filtroTipo);
      if (filtroTicket) params.append('ticket', filtroTicket);
      if (filtroDescripcion) params.append('descripcion', filtroDescripcion);
      if (filtroEstado) params.append('estado', filtroEstado);
      if (filtroAmbiente) params.append('ambiente', filtroAmbiente);
      if (busqueda.trim()) params.append('search', busqueda.trim());

      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiRequest<Ticket[]>(`/tickets${query}`);
      setTickets(data);
      setPaginaActual(1);
    } catch (err: any) {
      console.error(err);
      notifyError(err.message || 'Error al cargar el catálogo de tickets');
    } finally {
      setCargando(false);
    }
  };

  // Cargar catálogos de soporte para combos (Proyectos y Aplicaciones)
  const cargarCatalogosCombos = async () => {
    try {
      const [proys, apps] = await Promise.all([
        apiRequest<Proyecto[]>('/proyectos'),
        apiRequest<Aplicacion[]>('/aplicaciones'),
      ]);
      setProyectos(proys);
      setAplicaciones(apps);
    } catch (err) {
      console.error('Error al cargar catálogos de apoyo para tickets:', err);
    }
  };

  useEffect(() => {
    if (tienePermiso) {
      cargarTickets();
      cargarCatalogosCombos();
    }
  }, [tienePermiso, filtroTipo, filtroEstado, filtroAmbiente]);

  // Lista de Siglas únicas de Aplicaciones
  const listaSiglasApps = useMemo(() => {
    const s = new Set<string>();
    aplicaciones.forEach(a => {
      if (a.siglas?.trim()) s.add(a.siglas.trim());
    });
    return Array.from(s).sort();
  }, [aplicaciones]);

  // Lista de Nombres únicos de Proyectos
  const listaNombresProyectos = useMemo(() => {
    const s = new Set<string>();
    proyectos.forEach(p => {
      if (p.nombre_proyecto?.trim()) s.add(p.nombre_proyecto.trim());
    });
    return Array.from(s).sort();
  }, [proyectos]);

  // Filtrado reactivo en grilla (búsqueda y filtros de cabecera)
  const ticketsFiltrados = useMemo(() => {
    return tickets.filter(t => {
      if (filtroCabeceraTipo && t.tipo !== filtroCabeceraTipo) return false;
      if (filtroCabeceraTicket && !t.ticket.toLowerCase().includes(filtroCabeceraTicket.toLowerCase())) return false;
      if (filtroCabeceraDescripcion && !(t.descripcion || '').toLowerCase().includes(filtroCabeceraDescripcion.toLowerCase())) return false;
      if (filtroCabeceraEstado && t.estado !== filtroCabeceraEstado) return false;
      return true;
    });
  }, [tickets, filtroCabeceraTipo, filtroCabeceraTicket, filtroCabeceraDescripcion, filtroCabeceraEstado]);

  // Paginación 10 en 10
  const totalPaginas = Math.max(1, Math.ceil(ticketsFiltrados.length / ITEMS_POR_PAGINA));
  const ticketsPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    return ticketsFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [ticketsFiltrados, paginaActual]);

  const handleAbrirCrear = () => {
    setTipo('Incident');
    setTicketCod('');
    setDescripcion('');
    setProyecto(listaNombresProyectos[0] || 'C2C-FCD');
    setAplicativo(listaSiglasApps[0] || 'FCD');
    setAmbiente('UAT');
    setEstado('ABIERTO');
    setFechaRegistro(new Date().toISOString().slice(0, 16));
    setFechaAtencion('');
    setIbmAsignado('');
    setCelContacto('');
    setComentario('');
    setErrorCrear(null);
    setMostrarModalCrear(true);
  };

  const handleCrearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketCod.trim()) {
      setErrorCrear('Por favor ingrese el número o código de Ticket (*).');
      return;
    }
    if (!descripcion.trim()) {
      setErrorCrear('Por favor ingrese la descripción del Ticket (*).');
      return;
    }

    try {
      setGuardandoCrear(true);
      setErrorCrear(null);

      const payload: any = {
        tipo,
        ticket: ticketCod.trim(),
        descripcion: descripcion.trim(),
        proyecto: proyecto.trim() || null,
        aplicativo: aplicativo.trim() || null,
        ambiente: ambiente || null,
        estado,
        fecha_registro: fechaRegistro ? new Date(fechaRegistro).toISOString() : null,
        fecha_atencion: fechaAtencion ? new Date(fechaAtencion).toISOString() : null,
        ibm_asignado: ibmAsignado.trim() || null,
        cel_contacto: celContacto.trim() || null,
        comentario: comentario.trim() || null,
      };

      await apiRequest('/tickets', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      exito(`Ticket #${ticketCod} registrado correctamente.`);
      setMostrarModalCrear(false);
      cargarTickets();
    } catch (err: any) {
      console.error(err);
      setErrorCrear(err.message || 'Error al crear el registro de ticket');
    } finally {
      setGuardandoCrear(false);
    }
  };

  const handleAbrirEditar = (t: Ticket) => {
    setTicketSeleccionado(t);
    setEditTipo(t.tipo);
    setEditTicketCod(t.ticket);
    setEditDescripcion(t.descripcion || '');
    setEditProyecto(t.proyecto || '');
    setEditAplicativo(t.aplicativo || '');
    setEditAmbiente((t.ambiente as AmbienteTicket) || '');
    setEditEstado(t.estado);
    setEditFechaRegistro(fechaParaInputDateTime(t.fecha_registro));
    setEditFechaAtencion(fechaParaInputDateTime(t.fecha_atencion));
    setEditIbmAsignado(t.ibm_asignado || '');
    setEditCelContacto(t.cel_contacto || '');
    setEditComentario(t.comentario || '');
    setErrorEditar(null);
    setMostrarModalEditar(true);
  };

  const handleEditarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSeleccionado) return;

    if (!editTicketCod.trim()) {
      setErrorEditar('El código o número de Ticket es obligatorio (*).');
      return;
    }
    if (!editDescripcion.trim()) {
      setErrorEditar('La descripción del Ticket es obligatoria (*).');
      return;
    }

    // Validación de estado terminal
    const esTerminal = ESTADOS_TERMINALES.includes(ticketSeleccionado.estado);
    if (esTerminal && editEstado !== ticketSeleccionado.estado) {
      setErrorEditar(`El ticket está en estado final '${ticketSeleccionado.estado}' y ya no puede cambiar de estado.`);
      return;
    }

    try {
      setGuardandoEditar(true);
      setErrorEditar(null);

      const payload: any = {
        tipo: editTipo,
        ticket: editTicketCod.trim(),
        descripcion: editDescripcion.trim(),
        proyecto: editProyecto.trim() || null,
        aplicativo: editAplicativo.trim() || null,
        ambiente: editAmbiente || null,
        estado: editEstado,
        fecha_registro: editFechaRegistro ? new Date(editFechaRegistro).toISOString() : null,
        fecha_atencion: editFechaAtencion ? new Date(editFechaAtencion).toISOString() : null,
        ibm_asignado: editIbmAsignado.trim() || null,
        cel_contacto: editCelContacto.trim() || null,
        comentario: editComentario.trim() || null,
      };

      await apiRequest(`/tickets/${ticketSeleccionado.ticket_id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      exito(`Ticket #${editTicketCod} actualizado correctamente.`);
      setMostrarModalEditar(false);
      cargarTickets();
    } catch (err: any) {
      console.error(err);
      setErrorEditar(err.message || 'Error al actualizar el ticket');
    } finally {
      setGuardandoEditar(false);
    }
  };

  const handleEliminarTicket = async () => {
    if (!ticketParaEliminar) return;
    try {
      setEliminandoTicket(true);
      await apiRequest(`/tickets/${ticketParaEliminar.ticket_id}`, {
        method: 'DELETE',
      });
      exito(`Ticket #${ticketParaEliminar.ticket} eliminado correctamente.`);
      setTicketParaEliminar(null);
      cargarTickets();
    } catch (err: any) {
      console.error(err);
      notifyError(err.message || 'Error al eliminar el ticket');
    } finally {
      setEliminandoTicket(false);
    }
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroTipo('');
    setFiltroTicket('');
    setFiltroDescripcion('');
    setFiltroEstado('');
    setFiltroAmbiente('');
    setFiltroCabeceraTipo('');
    setFiltroCabeceraTicket('');
    setFiltroCabeceraDescripcion('');
    setFiltroCabeceraEstado('');
    cargarTickets();
  };

  // Validación de seguridad para perfil
  if (!tienePermiso) {
    return (
      <div style={{
        padding: '60px 20px',
        textAlign: 'center',
        maxWidth: '520px',
        margin: '0 auto',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#FEE2E2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: '#DC2626'
        }}>
          <ShieldAlert size={36} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-texto-principal)', marginBottom: '8px' }}>
          Acceso Restringido
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-texto-secundario)', lineHeight: 1.5 }}>
          El módulo de <strong>Gestión de Tickets</strong> está habilitado exclusivamente para colaboradores con perfil <strong>ADMIN</strong> o <strong>SWE</strong>.
        </p>
      </div>
    );
  }

  // Estilo de badge según tipo
  const getBadgeTipo = (t: TipoTicket) => {
    switch (t) {
      case 'Incident':
        return { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' };
      case 'Request':
        return { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD' };
      case 'OC':
        return { bg: '#E0E7FF', color: '#3730A3', border: '#A5B4FC' };
      default:
        return { bg: 'var(--color-superficie-hover)', color: 'var(--color-texto-secundario)', border: 'var(--color-borde)' };
    }
  };

  // Estilo de badge según estado
  const getBadgeEstado = (st: EstadoTicket) => {
    switch (st) {
      case 'ABIERTO':
        return { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' };
      case 'ASIGNADO':
        return { bg: '#EEF2FF', color: '#4F46E5', border: '#C7D2FE' };
      case 'EN_PROCESO':
        return { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' };
      case 'DEVUELTO':
        return { bg: '#FFEDD5', color: '#C2410C', border: '#FED7AA' };
      case 'SOLUCIONADO':
        return { bg: '#DCFCE7', color: '#166534', border: '#BBF7D0' };
      case 'ANULADO':
        return { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' };
      case 'RECHAZADO':
        return { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' };
      default:
        return { bg: '#F1F5F9', color: '#64748B', border: '#E2E8F0' };
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Cabecera / Banner Superior (modelo RegistrosPage) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radio-md)',
            backgroundColor: 'var(--color-primario-suave)',
            color: 'var(--color-primario)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <TicketIcon size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--color-texto-principal)' }}>
              Catálogo de Gestión de Tickets
            </h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-texto-terciario)' }}>
              Mantenimiento, seguimiento y control de incidencias, requerimientos y órdenes de cambio
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secundario"
            onClick={cargarTickets}
            title="Refrescar lista"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={16} className={cargando ? 'anim-spin' : ''} />
            <span>Refrescar</span>
          </button>

          <button
            type="button"
            className="btn btn-secundario"
            onClick={() => setMostrarModalExportar(true)}
            title="Exportar registros a archivo Excel (.xlsx)"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <OfficeExcelIcon size={16} />
            <span>Exportar Excel</span>
          </button>

          <button
            type="button"
            className="btn btn-primario"
            onClick={handleAbrirCrear}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={18} />
            <span>Nuevo Ticket</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros Principales (tipo / ticket / descripcion + estado / ambiente) */}
      <div style={{
        backgroundColor: 'var(--color-superficie)',
        border: '1px solid var(--color-borde)',
        borderRadius: 'var(--radio-lg)',
        padding: '16px',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        {/* Búsqueda General */}
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-texto-terciario)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '38px', width: '100%' }}
            placeholder="Buscar por descripción, aplicativo, proyecto, responsable..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && cargarTickets()}
          />
        </div>

        {/* Filtro: Tipo (Incident / Request / OC) */}
        <select
          className="form-select"
          style={{ width: '170px' }}
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
        >
          <option value="">Tipo: Todos</option>
          {TIPOS_DISPONIBLES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Filtro: Ticket */}
        <div style={{ width: '170px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Filtrar Ticket..."
            value={filtroTicket}
            onChange={e => setFiltroTicket(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && cargarTickets()}
          />
        </div>

        {/* Filtro: Estado */}
        <select
          className="form-select"
          style={{ width: '180px' }}
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
        >
          <option value="">Estado: Todos</option>
          {ESTADOS_DISPONIBLES.map(st => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>

        {/* Filtro: Ambiente */}
        <select
          className="form-select"
          style={{ width: '150px' }}
          value={filtroAmbiente}
          onChange={e => setFiltroAmbiente(e.target.value)}
        >
          <option value="">Ambiente: Todos</option>
          {AMBIENTES_DISPONIBLES.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <button type="button" className="btn btn-secundario" onClick={cargarTickets}>
          Buscar
        </button>

        {(busqueda || filtroTipo || filtroTicket || filtroDescripcion || filtroEstado || filtroAmbiente) && (
          <button type="button" className="btn btn-secundario" onClick={limpiarFiltros} title="Limpiar todos los filtros">
            Limpiar
          </button>
        )}
      </div>

      {/* Tabla de Tickets (modelo exacto de Catálogo de Registros de Personal) */}
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
                {/* Columna: Ticket */}
                <th style={{ padding: '10px 14px', textAlign: 'left', minWidth: '130px', verticalAlign: 'bottom' }}>
                  <div style={{ marginBottom: '6px' }}>Ticket</div>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', height: '28px', width: '100%', fontWeight: 'normal' }}
                    placeholder="Filtrar N°..."
                    value={filtroCabeceraTicket}
                    onChange={e => {
                      setFiltroCabeceraTicket(e.target.value);
                      setPaginaActual(1);
                    }}
                  />
                </th>

                {/* Columna: Tipo */}
                <th style={{ padding: '10px 14px', textAlign: 'left', minWidth: '120px', verticalAlign: 'bottom' }}>
                  <div style={{ marginBottom: '6px' }}>Tipo</div>
                  <select
                    className="form-select"
                    style={{ fontSize: '0.75rem', padding: '2px 6px', height: '28px', width: '100%', fontWeight: 'normal' }}
                    value={filtroCabeceraTipo}
                    onChange={e => {
                      setFiltroCabeceraTipo(e.target.value);
                      setPaginaActual(1);
                    }}
                  >
                    <option value="">Todos</option>
                    {TIPOS_DISPONIBLES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </th>

                {/* Columna: Descripción */}
                <th style={{ padding: '10px 14px', textAlign: 'left', minWidth: '260px', verticalAlign: 'bottom' }}>
                  <div style={{ marginBottom: '6px' }}>Descripción</div>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', height: '28px', width: '100%', fontWeight: 'normal' }}
                    placeholder="Filtrar por texto..."
                    value={filtroCabeceraDescripcion}
                    onChange={e => {
                      setFiltroCabeceraDescripcion(e.target.value);
                      setPaginaActual(1);
                    }}
                  />
                </th>

                {/* Columna: Aplicativo */}
                <th style={{ padding: '12px 14px', textAlign: 'left', verticalAlign: 'bottom' }}>
                  Aplicativo
                </th>

                {/* Columna: Proyecto */}
                <th style={{ padding: '12px 14px', textAlign: 'left', verticalAlign: 'bottom' }}>
                  Proyecto
                </th>

                {/* Columna: Ambiente */}
                <th style={{ padding: '12px 14px', textAlign: 'left', verticalAlign: 'bottom' }}>
                  Ambiente
                </th>

                {/* Columna: IBM Asignado */}
                <th style={{ padding: '12px 14px', textAlign: 'left', verticalAlign: 'bottom' }}>
                  IBM Asignado
                </th>

                {/* Columna: F. Registro (DD/MM/YYYY) */}
                <th style={{ padding: '12px 14px', textAlign: 'left', verticalAlign: 'bottom', minWidth: '110px' }}>
                  F. Registro
                </th>

                {/* Columna: F. Atención (DD/MM/YYYY) */}
                <th style={{ padding: '12px 14px', textAlign: 'left', verticalAlign: 'bottom', minWidth: '110px' }}>
                  F. Atención
                </th>

                {/* Columna: Estado */}
                <th style={{ padding: '10px 14px', textAlign: 'left', minWidth: '140px', verticalAlign: 'bottom' }}>
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
                    <option value="">Todos</option>
                    {ESTADOS_DISPONIBLES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </th>

                {/* Columna: Acciones */}
                <th style={{ padding: '12px 14px', textAlign: 'center', width: '110px', verticalAlign: 'bottom' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={11} style={{ padding: '36px', textAlign: 'center', color: 'var(--color-texto-terciario)' }}>
                    Cargando catálogo de tickets...
                  </td>
                </tr>
              ) : ticketsPaginados.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: '36px', textAlign: 'center', color: 'var(--color-texto-terciario)' }}>
                    No se encontraron tickets con los criterios de búsqueda seleccionados.
                  </td>
                </tr>
              ) : (
                ticketsPaginados.map(t => {
                  const bTipo = getBadgeTipo(t.tipo);
                  const bEstado = getBadgeEstado(t.estado);
                  const esTerminal = ESTADOS_TERMINALES.includes(t.estado);

                  return (
                    <tr
                      key={t.ticket_id}
                      className="fila-interactiva"
                      tabIndex={0}
                      title="Doble clic para editar este ticket"
                      onDoubleClick={() => handleAbrirEditar(t)}
                      style={{ borderBottom: '1px solid var(--color-borde-suave)' }}
                    >
                      {/* Ticket Codigo */}
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-primario)' }}>
                        #{t.ticket}
                      </td>

                      {/* Tipo */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radio-pildora)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: bTipo.bg,
                          color: bTipo.color,
                          border: `1px solid ${bTipo.border}`,
                        }}>
                          {t.tipo}
                        </span>
                      </td>

                      {/* Descripción */}
                      <td style={{ padding: '12px 14px', maxWidth: '300px' }}>
                        <div
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: 'var(--color-texto-principal)',
                            fontWeight: 500,
                          }}
                          title={t.descripcion || ''}
                        >
                          {t.descripcion || '-'}
                        </div>
                      </td>

                      {/* Aplicativo */}
                      <td style={{ padding: '12px 14px' }}>
                        {t.aplicativo ? (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 'var(--radio-sm)',
                            backgroundColor: 'var(--color-superficie-hover)',
                            border: '1px solid var(--color-borde)',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                          }}>
                            {t.aplicativo}
                          </span>
                        ) : '-'}
                      </td>

                      {/* Proyecto */}
                      <td style={{ padding: '12px 14px', color: 'var(--color-texto-secundario)' }}>
                        {t.proyecto || '-'}
                      </td>

                      {/* Ambiente */}
                      <td style={{ padding: '12px 14px' }}>
                        {t.ambiente ? (
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: 'var(--radio-pildora)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            backgroundColor: t.ambiente === 'PRD' ? '#FEF2F2' : '#F5F3FF',
                            color: t.ambiente === 'PRD' ? '#B91C1C' : '#6D28D9',
                            border: `1px solid ${t.ambiente === 'PRD' ? '#FCA5A5' : '#DDD6FE'}`,
                          }}>
                            {t.ambiente}
                          </span>
                        ) : '-'}
                      </td>

                      {/* IBM Asignado */}
                      <td style={{ padding: '12px 14px', color: 'var(--color-texto-secundario)', fontSize: '0.8rem' }}>
                        {t.ibm_asignado || '-'}
                      </td>

                      {/* Fecha Registro (DD/MM/YYYY) */}
                      <td style={{ padding: '12px 14px', color: 'var(--color-texto-terciario)', fontSize: '0.8rem' }}>
                        {formatearFecha(t.fecha_registro)}
                      </td>

                      {/* Fecha Atención (DD/MM/YYYY) */}
                      <td style={{ padding: '12px 14px', color: 'var(--color-texto-terciario)', fontSize: '0.8rem' }}>
                        {formatearFecha(t.fecha_atencion)}
                      </td>

                      {/* Estado */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 'var(--radio-pildora)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: bEstado.bg,
                          color: bEstado.color,
                          border: `1px solid ${bEstado.border}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          {esTerminal && <Lock size={10} />}
                          {t.estado}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleAbrirEditar(t)}
                            title="Editar Ticket"
                            style={{
                              padding: '5px',
                              borderRadius: 'var(--radio-sm)',
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: 'var(--color-primario)',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTicketParaEliminar(t)}
                            title="Eliminar Ticket"
                            style={{
                              padding: '5px',
                              borderRadius: 'var(--radio-sm)',
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: '#EF4444',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación 10 en 10 (modelo RegistrosPage) */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--color-borde)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--color-superficie)',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-texto-terciario)' }}>
            Mostrando <strong>{ticketsFiltrados.length === 0 ? 0 : (paginaActual - 1) * ITEMS_POR_PAGINA + 1}</strong> a{' '}
            <strong>{Math.min(paginaActual * ITEMS_POR_PAGINA, ticketsFiltrados.length)}</strong> de{' '}
            <strong>{ticketsFiltrados.length}</strong> tickets
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="btn btn-secundario"
              style={{ padding: '5px 10px', fontSize: '0.8rem' }}
              disabled={paginaActual <= 1}
              onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <span style={{ fontSize: '0.8rem', padding: '0 8px', fontWeight: 600, color: 'var(--color-texto-principal)' }}>
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              type="button"
              className="btn btn-secundario"
              style={{ padding: '5px 10px', fontSize: '0.8rem' }}
              disabled={paginaActual >= totalPaginas}
              onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
            >
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: CREAR TICKET */}
      {mostrarModalCrear && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '16px',
        }}>
          <div style={{
            backgroundColor: 'var(--color-superficie)',
            borderRadius: 'var(--radio-lg)',
            width: '100%',
            maxWidth: '680px',
            border: '1px solid var(--color-borde)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Cabecera modal */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-borde)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--color-superficie-hover)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <TicketIcon size={20} style={{ color: 'var(--color-primario)' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-texto-principal)' }}>
                  Registrar Nuevo Ticket
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalCrear(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-texto-terciario)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleCrearSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {errorCrear && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radio-md)',
                    backgroundColor: '#FEE2E2',
                    color: '#991B1B',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <AlertCircle size={16} />
                    <span>{errorCrear}</span>
                  </div>
                )}

                {/* Fila 1: Tipo y Ticket (código) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                      Tipo de Ticket <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                      className="form-select"
                      value={tipo}
                      onChange={e => setTipo(e.target.value as TipoTicket)}
                      style={{ width: '100%' }}
                      required
                    >
                      {TIPOS_DISPONIBLES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                      Número / Código Ticket <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: 2447321"
                      value={ticketCod}
                      onChange={e => setTicketCod(e.target.value)}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>
                </div>

                {/* Fila 2: Descripción */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Descripción <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Detalle o descripción de la incidencia o solicitud..."
                    value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                    style={{ width: '100%', resize: 'vertical' }}
                    required
                  />
                </div>

                {/* Fila 3: Proyecto y Aplicativo */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                      Proyecto (Mantenimiento Proyecto)
                    </label>
                    <select
                      className="form-select"
                      value={proyecto}
                      onChange={e => setProyecto(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="">Seleccione Proyecto...</option>
                      {listaNombresProyectos.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                      Aplicativo (Siglas Catálogo Aplicaciones)
                    </label>
                    <select
                      className="form-select"
                      value={aplicativo}
                      onChange={e => setAplicativo(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="">Seleccione Sigla...</option>
                      {listaSiglasApps.map(sig => (
                        <option key={sig} value={sig}>{sig}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Fila 4: Ambiente y Estado */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                      Ambiente (UAT / PRD)
                    </label>
                    <select
                      className="form-select"
                      value={ambiente}
                      onChange={e => setAmbiente(e.target.value as AmbienteTicket)}
                      style={{ width: '100%' }}
                    >
                      <option value="">Sin definir</option>
                      {AMBIENTES_DISPONIBLES.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                      Estado
                    </label>
                    <select
                      className="form-select"
                      value={estado}
                      onChange={e => setEstado(e.target.value as EstadoTicket)}
                      style={{ width: '100%' }}
                    >
                      {ESTADOS_DISPONIBLES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Fila 5: Fechas (Registro y Atención) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                      Fecha de Registro
                    </label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={fechaRegistro}
                      onChange={e => setFechaRegistro(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                      Fecha de Atención
                    </label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={fechaAtencion}
                      onChange={e => setFechaAtencion(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Fila 6: IBM Asignado y Cel Contacto */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                      IBM Asignado / Responsable
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: IBM.Mirez Florian, Cesar"
                      value={ibmAsignado}
                      onChange={e => setIbmAsignado(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                      Cel Contacto
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: 958954683"
                      value={celContacto}
                      onChange={e => setCelContacto(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Fila 7: Comentario */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Comentarios Adicionales
                  </label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Notas o comentarios complementarios..."
                    value={comentario}
                    onChange={e => setComentario(e.target.value)}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* Pie modal */}
              <div style={{
                padding: '16px 20px',
                borderTop: '1px solid var(--color-borde)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
                backgroundColor: 'var(--color-superficie-hover)',
              }}>
                <button
                  type="button"
                  className="btn btn-secundario"
                  onClick={() => setMostrarModalCrear(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primario"
                  disabled={guardandoCrear}
                >
                  {guardandoCrear ? 'Guardando...' : 'Crear Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: EDITAR TICKET */}
      {mostrarModalEditar && ticketSeleccionado && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '16px',
        }}>
          <div style={{
            backgroundColor: 'var(--color-superficie)',
            borderRadius: 'var(--radio-lg)',
            width: '100%',
            maxWidth: '680px',
            border: '1px solid var(--color-borde)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Cabecera modal */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-borde)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--color-superficie-hover)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit2 size={20} style={{ color: 'var(--color-primario)' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-texto-principal)' }}>
                    Editar Ticket #{ticketSeleccionado.ticket}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-texto-terciario)' }}>
                    Registrado el {formatearFechaHora(ticketSeleccionado.fecha_creacion)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalEditar(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-texto-terciario)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleEditarSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {errorEditar && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radio-md)',
                    backgroundColor: '#FEE2E2',
                    color: '#991B1B',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <AlertCircle size={16} />
                    <span>{errorEditar}</span>
                  </div>
                )}

                {/* Alerta de Estado Terminal */}
                {ESTADOS_TERMINALES.includes(ticketSeleccionado.estado) && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radio-md)',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    color: '#991B1B',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <Lock size={16} />
                    <span>
                      Este ticket se encuentra en estado terminal (<strong>{ticketSeleccionado.estado}</strong>). Según la regla de negocio, ya no podrá cambiar de estado.
                    </span>
                  </div>
                )}

                {/* Fila 1: Tipo y Ticket (código) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                      Tipo de Ticket <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                      className="form-select"
                      value={editTipo}
                      onChange={e => setEditTipo(e.target.value as TipoTicket)}
                      style={{ width: '100%' }}
                      required
                    >
                      {TIPOS_DISPONIBLES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                      Número / Código Ticket <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={editTicketCod}
                      onChange={e => setEditTicketCod(e.target.value)}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>
                </div>

                {/* Fila 2: Descripción */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Descripción <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={editDescripcion}
                    onChange={e => setEditDescripcion(e.target.value)}
                    style={{ width: '100%', resize: 'vertical' }}
                    required
                  />
                </div>

                {/* Fila 3: Proyecto y Aplicativo */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                      Proyecto (Mantenimiento Proyecto)
                    </label>
                    <select
                      className="form-select"
                      value={editProyecto}
                      onChange={e => setEditProyecto(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="">Seleccione Proyecto...</option>
                      {listaNombresProyectos.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                      Aplicativo (Siglas Catálogo Aplicaciones)
                    </label>
                    <select
                      className="form-select"
                      value={editAplicativo}
                      onChange={e => setEditAplicativo(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="">Seleccione Sigla...</option>
                      {listaSiglasApps.map(sig => (
                        <option key={sig} value={sig}>{sig}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Fila 4: Ambiente y Estado */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                      Ambiente (UAT / PRD)
                    </label>
                    <select
                      className="form-select"
                      value={editAmbiente}
                      onChange={e => setEditAmbiente(e.target.value as AmbienteTicket)}
                      style={{ width: '100%' }}
                    >
                      <option value="">Sin definir</option>
                      {AMBIENTES_DISPONIBLES.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                      Estado
                      {ESTADOS_TERMINALES.includes(ticketSeleccionado.estado) && (
                        <span style={{ fontSize: '0.72rem', color: '#991B1B', marginLeft: '6px', fontWeight: 'normal' }}>
                          (Bloqueado - Estado final)
                        </span>
                      )}
                    </label>
                    <select
                      className="form-select"
                      value={editEstado}
                      onChange={e => setEditEstado(e.target.value as EstadoTicket)}
                      style={{ width: '100%', opacity: ESTADOS_TERMINALES.includes(ticketSeleccionado.estado) ? 0.7 : 1 }}
                      disabled={ESTADOS_TERMINALES.includes(ticketSeleccionado.estado)}
                    >
                      {ESTADOS_DISPONIBLES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Fila 5: Fechas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                      Fecha de Registro
                    </label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={editFechaRegistro}
                      onChange={e => setEditFechaRegistro(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                      Fecha de Atención
                    </label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={editFechaAtencion}
                      onChange={e => setEditFechaAtencion(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Fila 6: IBM Asignado y Cel Contacto */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                      IBM Asignado / Responsable
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={editIbmAsignado}
                      onChange={e => setEditIbmAsignado(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                      Cel Contacto
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={editCelContacto}
                      onChange={e => setEditCelContacto(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Fila 7: Comentario */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Comentarios Adicionales
                  </label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={editComentario}
                    onChange={e => setEditComentario(e.target.value)}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* Pie modal */}
              <div style={{
                padding: '16px 20px',
                borderTop: '1px solid var(--color-borde)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
                backgroundColor: 'var(--color-superficie-hover)',
              }}>
                <button
                  type="button"
                  className="btn btn-secundario"
                  onClick={() => setMostrarModalEditar(false)}
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

      {/* Modal: Confirmación Eliminar */}
      {ticketParaEliminar && (
        <ModalConfirmacionEliminar
          abierto={Boolean(ticketParaEliminar)}
          titulo="Eliminar Registro de Ticket"
          mensaje={`¿Está seguro de que desea eliminar el ticket #${ticketParaEliminar.ticket} (${ticketParaEliminar.tipo})? Esta acción se registrará en auditoría y no se puede deshacer.`}
          onConfirmar={handleEliminarTicket}
          onCerrar={() => setTicketParaEliminar(null)}
          cargando={eliminandoTicket}
        />
      )}

      {/* Modal: Exportar a Excel */}
      {mostrarModalExportar && (
        <ModalExportarTickets
          tickets={tickets}
          onCerrar={() => setMostrarModalExportar(false)}
        />
      )}
    </div>
  );
};
