import React, { useState, useEffect, useMemo } from 'react';
import {
  Rocket, Plus, Search, AlertCircle, Edit2, Trash2,
  RefreshCw, CheckSquare, Square, ChevronLeft, ChevronRight, X, AlertTriangle, ShieldAlert,
  Lock, Eye, CheckCircle2
} from 'lucide-react';
import { Pase, TipoAmbiente, EstadoSRT, Proyecto, Aplicacion, RegistroColaborador } from '../types';
import { apiRequest } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useNotificacion } from '../context/NotificacionContext';
import { ModalConfirmacionEliminar } from '../components/common/ModalConfirmacionEliminar';
import { ModalExportarPases } from '../components/common/ModalExportarPases';
import { OfficeExcelIcon } from '../components/common/OfficeExcelIcon';

const ESTADOS_SRT: EstadoSRT[] = [
  'REGISTRADO',
  'UAT_SOLICITADO',
  'UAT_DESPLEGADO',
  'QA_CERTIFICADO',
  'PRD_SOLICITADO',
  'PRD_EJECUTADO',
  'RECHAZADO',
  'ANULADO',
];

const ITEMS_CONFORMES_BASE = [
  'CONF. TL',
  'STATUS SOLICITUD',
  'CONF.CIBERS',
];
const ITEM_CONFORME_CHAPTER = 'CONF.CHAPTER';

export const PasesPage: React.FC = () => {
  const { usuario } = useAuth();
  const { exito, error: notifyError } = useNotificacion();

  const tienePermiso = usuario?.perfil === 'ADMIN' || usuario?.perfil === 'SWE';

  // Catálogo principal
  const [pases, setPases] = useState<Pase[]>([]);
  const [cargando, setCargando] = useState(true);

  // Catálogos para combos
  const [listaProyectos, setListaProyectos] = useState<Proyecto[]>([]);
  const [listaAplicaciones, setListaAplicaciones] = useState<Aplicacion[]>([]);
  const [colaboradoresQA, setColaboradoresQA] = useState<RegistroColaborador[]>([]);
  const [colaboradoresDEV, setColaboradoresDEV] = useState<RegistroColaborador[]>([]);

  // Filtros principales solicitados: (PROYECTO / TITULO / Fecha_Registro_srt / CODIGO_SRT, OC)
  const [filtroProyecto, setFiltroProyecto] = useState('');
  const [filtroTitulo, setFiltroTitulo] = useState('');
  const [filtroFechaRegistroSrt, setFiltroFechaRegistroSrt] = useState('');
  const [filtroCodigoSrt, setFiltroCodigoSrt] = useState('');
  const [filtroOc, setFiltroOc] = useState('');
  const [filtroEstadoSrt, setFiltroEstadoSrt] = useState('');
  const [filtroTipoAmbiente, setFiltroTipoAmbiente] = useState('');

  // Filtros en cabecera de la tabla
  const [filtroCabeceraTitulo, setFiltroCabeceraTitulo] = useState('');
  const [filtroCabeceraCodigoSrt, setFiltroCabeceraCodigoSrt] = useState('');

  // Paginación 10 en 10
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 10;

  // Modales
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [mostrarModalExportar, setMostrarModalExportar] = useState(false);
  const [paseSeleccionado, setPaseSeleccionado] = useState<Pase | null>(null);
  const [paseParaEliminar, setPaseParaEliminar] = useState<Pase | null>(null);
  const [eliminandoPase, setEliminandoPase] = useState(false);

  // Estados del Formulario (Crear / Editar)
  const [formTipoAmbiente, setFormTipoAmbiente] = useState<TipoAmbiente>('D');
  const [formProyecto, setFormProyecto] = useState('');
  const [formApp, setFormApp] = useState('');
  const [formFechaRegistroSrt, setFormFechaRegistroSrt] = useState('');
  const [formFechaSolicitadoUat, setFormFechaSolicitadoUat] = useState('');
  const [formFechaDesplegadoUat, setFormFechaDesplegadoUat] = useState('');
  const [formEstadoSrt, setFormEstadoSrt] = useState<EstadoSRT>('REGISTRADO');
  const [formCodigoSrt, setFormCodigoSrt] = useState('');
  const [formTitulo, setFormTitulo] = useState('');
  const [formConformesPrd, setFormConformesPrd] = useState<string[]>([]);
  const [formQa, setFormQa] = useState('');
  const [formFechaCertificacion, setFormFechaCertificacion] = useState('');
  const [formFechaRegistroOc, setFormFechaRegistroOc] = useState('');
  const [formFechaHoraPasePrd, setFormFechaHoraPasePrd] = useState('');
  const [formOc, setFormOc] = useState('');
  const [formStadoOc, setFormStadoOc] = useState('');
  const [formOperadorPase, setFormOperadorPase] = useState('');
  const [formDev, setFormDev] = useState('');
  const [formSustentoValorNegocio, setFormSustentoValorNegocio] = useState('');
  const [formUsuarioFinalAprobacion, setFormUsuarioFinalAprobacion] = useState('');
  const [formQSpPrd, setFormQSpPrd] = useState('');
  const [formResponsableOwnerProyecto, setFormResponsableOwnerProyecto] = useState('');
  const [formMotivoEstado, setFormMotivoEstado] = useState('');

  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
  const [guardandoFormulario, setGuardandoFormulario] = useState(false);

  // Indica si el pase seleccionado está en estado final PRD_EJECUTADO (modo solo lectura bloqueado)
  const esBloqueado = Boolean(mostrarModalEditar && paseSeleccionado?.estado_srt === 'PRD_EJECUTADO');

  // Cargar lista de pases desde el backend
  const cargarPases = async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (filtroProyecto) params.append('proyecto', filtroProyecto);
      if (filtroTitulo) params.append('titulo', filtroTitulo);
      if (filtroFechaRegistroSrt) params.append('fecha_registro_srt', filtroFechaRegistroSrt);
      if (filtroCodigoSrt) params.append('codigo_srt', filtroCodigoSrt);
      if (filtroOc) params.append('oc', filtroOc);
      if (filtroEstadoSrt) params.append('estado_srt', filtroEstadoSrt);
      if (filtroTipoAmbiente) params.append('tipo_ambiente', filtroTipoAmbiente);

      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiRequest<Pase[]>(`/pases${query}`);
      setPases(data);
    } catch (err: any) {
      console.error(err);
      notifyError(err.message || 'Error al cargar el catálogo de pases');
    } finally {
      setCargando(false);
    }
  };

  // Cargar catálogos para combos
  const cargarCatalogosCombos = async () => {
    try {
      const [proys, apps, regs] = await Promise.all([
        apiRequest<Proyecto[]>('/proyectos'),
        apiRequest<Aplicacion[]>('/aplicaciones'),
        apiRequest<RegistroColaborador[]>('/registros'),
      ]);
      setListaProyectos(proys);
      setListaAplicaciones(apps);
      setColaboradoresQA(regs.filter(r => r.perfil === 'QA'));
      setColaboradoresDEV(regs.filter(r => r.perfil === 'DESARROLLADOR'));
    } catch (err) {
      console.error('Error cargando catálogos de apoyo para pases:', err);
    }
  };

  useEffect(() => {
    if (tienePermiso) {
      cargarPases();
      cargarCatalogosCombos();
    }
  }, [
    filtroProyecto,
    filtroFechaRegistroSrt,
    filtroEstadoSrt,
    filtroTipoAmbiente,
    filtroCodigoSrt,
    filtroOc
  ]);

  // Formato de fechas: DD/MM/YYYY
  const formatearFecha = (val?: string | null): string => {
    if (!val) return '-';
    try {
      const clean = val.split('T')[0];
      const parts = clean.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
      }
      return val;
    } catch {
      return val;
    }
  };

  // Formato de fecha y hora: DD/MM/YYYY HH:MM
  const formatearFechaHora = (val?: string | null): string => {
    if (!val) return '-';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      const day = String(d.getDate()).padStart(2, '0');
      const mon = String(d.getMonth() + 1).padStart(2, '0');
      const yr = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${mon}/${yr} ${hh}:${mm}`;
    } catch {
      return val;
    }
  };

  // Parsear conformes_prd desde string guardado (ej: "CONF. TL, CONF.CIBERS")
  const parsearConformes = (confStr?: string | null): string[] => {
    if (!confStr) return [];
    return confStr
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  };

  // Filtrado reactivo en grilla (incluyendo filtros de cabecera rápida)
  const pasesFiltrados = useMemo(() => {
    return pases.filter(p => {
      if (filtroCabeceraTitulo.trim()) {
        const busq = filtroCabeceraTitulo.trim().toLowerCase();
        if (!p.titulo.toLowerCase().includes(busq)) return false;
      }
      if (filtroCabeceraCodigoSrt.trim()) {
        const busq = filtroCabeceraCodigoSrt.trim().toLowerCase();
        if (!p.codigo_srt?.toLowerCase().includes(busq)) return false;
      }
      if (filtroTitulo.trim()) {
        const busq = filtroTitulo.trim().toLowerCase();
        if (!p.titulo.toLowerCase().includes(busq)) return false;
      }
      return true;
    });
  }, [pases, filtroCabeceraTitulo, filtroCabeceraCodigoSrt, filtroTitulo]);

  // Paginación
  const totalPaginas = Math.ceil(pasesFiltrados.length / ITEMS_POR_PAGINA) || 1;
  const pasesPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    return pasesFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [pasesFiltrados, paginaActual]);

  // Limpiar filtros
  const handleLimpiarFiltros = () => {
    setFiltroProyecto('');
    setFiltroTitulo('');
    setFiltroFechaRegistroSrt('');
    setFiltroCodigoSrt('');
    setFiltroOc('');
    setFiltroEstadoSrt('');
    setFiltroTipoAmbiente('');
    setFiltroCabeceraTitulo('');
    setFiltroCabeceraCodigoSrt('');
    setPaginaActual(1);
  };

  // Abrir modal de creación
  const handleAbrirCrear = () => {
    setErrorFormulario(null);
    setFormTipoAmbiente('D');
    setFormProyecto(listaProyectos[0]?.nombre_proyecto || '');
    setFormApp(listaAplicaciones[0]?.siglas || '');
    setFormFechaRegistroSrt(new Date().toISOString().split('T')[0]);
    setFormFechaSolicitadoUat('');
    setFormFechaDesplegadoUat('');
    setFormEstadoSrt('REGISTRADO');
    setFormCodigoSrt('');
    setFormTitulo('');
    setFormConformesPrd([]);
    setFormQa(colaboradoresQA[0]?.nombres || '');
    setFormFechaCertificacion('');
    setFormFechaRegistroOc('');
    setFormFechaHoraPasePrd('');
    setFormOc('');
    setFormStadoOc('');
    setFormOperadorPase('');
    setFormDev(colaboradoresDEV[0]?.nombres || '');
    setFormSustentoValorNegocio('');
    setFormUsuarioFinalAprobacion('');
    setFormQSpPrd('');
    setFormResponsableOwnerProyecto('');
    setFormMotivoEstado('');

    setMostrarModalCrear(true);
  };

  // Abrir modal de edición
  const handleAbrirEditar = (p: Pase) => {
    setPaseSeleccionado(p);
    setErrorFormulario(null);

    setFormTipoAmbiente(p.tipo_ambiente || 'D');
    setFormProyecto(p.proyecto || '');
    setFormApp(p.app || '');
    setFormFechaRegistroSrt(p.fecha_registro_srt ? p.fecha_registro_srt.split('T')[0] : '');
    setFormFechaSolicitadoUat(p.fecha_solicitado_uat ? p.fecha_solicitado_uat.split('T')[0] : '');
    setFormFechaDesplegadoUat(p.fecha_desplegado_uat ? p.fecha_desplegado_uat.split('T')[0] : '');
    setFormEstadoSrt(p.estado_srt || 'REGISTRADO');
    setFormCodigoSrt(p.codigo_srt || '');
    setFormTitulo(p.titulo || '');
    setFormConformesPrd(parsearConformes(p.conformes_prd));
    setFormQa(p.qa || '');
    setFormFechaCertificacion(p.fecha_certificacion ? p.fecha_certificacion.split('T')[0] : '');
    setFormFechaRegistroOc(p.fecha_registro_oc ? p.fecha_registro_oc.split('T')[0] : '');
    setFormFechaHoraPasePrd(p.fecha_hora_pase_prd ? p.fecha_hora_pase_prd.slice(0, 16) : '');
    setFormOc(p.oc || '');
    setFormStadoOc(p.stado_oc || '');
    setFormOperadorPase(p.operador_pase || '');
    setFormDev(p.dev || '');
    setFormSustentoValorNegocio(p.sustento_valor_negocio || '');
    setFormUsuarioFinalAprobacion(p.usuario_final_aprobacion || '');
    setFormQSpPrd(p.q_sp_prd || '');
    setFormResponsableOwnerProyecto(p.responsable_owner_proyecto || '');
    setFormMotivoEstado(p.motivo_estado || '');

    setMostrarModalEditar(true);
  };

  // Manejo de checkboxes de CONFORMES_PRD
  const toggleConformeItem = (item: string) => {
    if (esBloqueado) return;
    setFormConformesPrd(prev => {
      if (prev.includes(item)) {
        return prev.filter(x => x !== item);
      } else {
        return [...prev, item];
      }
    });
  };

  // Guardar (Crear o Actualizar)
  const handleGuardarPase = async (e: React.FormEvent) => {
    e.preventDefault();

    // REGLA FUNDAMENTAL:
    // Un pase en estado PRD_EJECUTADO ya no se puede modificar
    if (mostrarModalEditar && paseSeleccionado?.estado_srt === 'PRD_EJECUTADO') {
      const errorMsg = 'El pase ya se encuentra en estado PRD_EJECUTADO (estado final para un SRT) y ya no se puede modificar.';
      setErrorFormulario(errorMsg);
      notifyError(errorMsg);
      return;
    }

    if (!formTitulo.trim()) {
      setErrorFormulario('El título del pase es obligatorio.');
      return;
    }

    // REGLA FUNDAMENTAL:
    // "al momento de registrar un nuevo pase se debe validar que solo se puede registrar un unico dato en el campo SRT RATIONAL no puede existir 2 registros con el mismo valor"
    if (formCodigoSrt.trim()) {
      const srtNormalizado = formCodigoSrt.trim().toLowerCase();
      const yaExiste = pases.some(p => {
        if (!p.codigo_srt) return false;
        if (mostrarModalEditar && p.pase_id === paseSeleccionado?.pase_id) return false;
        return p.codigo_srt.trim().toLowerCase() === srtNormalizado;
      });
      if (yaExiste) {
        const errorMsg = `Ya existe un pase registrado con el código SRT '${formCodigoSrt.trim()}'. El campo SRT RATIONAL debe ser único y no pueden existir 2 registros con el mismo valor.`;
        setErrorFormulario(errorMsg);
        notifyError(errorMsg);
        return;
      }
    }

    // REGLA FUNDAMENTAL:
    // "POR ESTOS 2 ULTIMOS ESTADOS(RECHAZADO,ANULADO) CUANDO SE DE CLIC EN GRABAR SE DEBE INDICAR EL MOTIVO"
    if (formEstadoSrt === 'RECHAZADO' || formEstadoSrt === 'ANULADO') {
      if (!formMotivoEstado.trim()) {
        const errorMsg = `Debe indicar el motivo obligatorio cuando el estado del pase es ${formEstadoSrt}.`;
        setErrorFormulario(errorMsg);
        notifyError(errorMsg);
        return;
      }
    }

    // REGLA FUNDAMENTAL:
    // "CUANDO EL ESTADO ES PRD_EJECUTADO, ES OBLIGATORIO LOS SIGUIENTES CAMPOS:
    //  Orden de Cambio (OC), Estado OC, Fecha Registro OC, Fecha y Hora Pase PRD (*), Fecha Certificación, Operador Pase"
    if (formEstadoSrt === 'PRD_EJECUTADO') {
      const camposFaltantes: string[] = [];
      if (!formOc.trim()) camposFaltantes.push('Orden de Cambio (OC)');
      if (!formStadoOc.trim()) camposFaltantes.push('Estado OC');
      if (!formFechaRegistroOc.trim()) camposFaltantes.push('Fecha Registro OC');
      if (!formFechaHoraPasePrd.trim()) camposFaltantes.push('Fecha y Hora Pase PRD (*)');
      if (!formFechaCertificacion.trim()) camposFaltantes.push('Fecha Certificación');
      if (!formOperadorPase.trim()) camposFaltantes.push('Operador Pase');

      if (camposFaltantes.length > 0) {
        const errorMsg = `Cuando el estado es PRD_EJECUTADO, son obligatorios los siguientes campos: ${camposFaltantes.join(', ')}.`;
        setErrorFormulario(errorMsg);
        notifyError(errorMsg);
        return;
      }
    }

    try {
      setGuardandoFormulario(true);
      setErrorFormulario(null);

      // Si ambiente no es 'A', excluir CONF.CHAPTER
      const conformesFinales = formTipoAmbiente === 'A'
        ? formConformesPrd
        : formConformesPrd.filter(x => x !== ITEM_CONFORME_CHAPTER);

      const payload = {
        tipo_ambiente: formTipoAmbiente,
        proyecto: formProyecto.trim() || null,
        app: formApp.trim() || null,
        fecha_registro_srt: formFechaRegistroSrt || null,
        fecha_solicitado_uat: formFechaSolicitadoUat || null,
        fecha_desplegado_uat: formFechaDesplegadoUat || null,
        estado_srt: formEstadoSrt,
        codigo_srt: formCodigoSrt.trim() || null,
        titulo: formTitulo.trim(),
        conformes_prd: conformesFinales.length > 0 ? conformesFinales.join(', ') : null,
        qa: formQa.trim() || null,
        fecha_certificacion: formFechaCertificacion || null,
        fecha_registro_oc: formFechaRegistroOc || null,
        fecha_hora_pase_prd: formFechaHoraPasePrd ? new Date(formFechaHoraPasePrd).toISOString() : null,
        oc: formOc.trim() || null,
        stado_oc: formStadoOc.trim() || null,
        estado_oc: formStadoOc.trim() || null,
        operador_pase: formOperadorPase.trim() || null,
        dev: formDev.trim() || null,
        sustento_valor_negocio: formSustentoValorNegocio.trim() || null,
        usuario_final_aprobacion: formUsuarioFinalAprobacion.trim() || null,
        q_sp_prd: formQSpPrd.trim() || null,
        responsable_owner_proyecto: formResponsableOwnerProyecto.trim() || null,
        motivo_estado: formMotivoEstado.trim() || null,
      };

      if (mostrarModalCrear) {
        await apiRequest('/pases', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        exito(`Pase ${formCodigoSrt || formTitulo} registrado correctamente.`);
        setMostrarModalCrear(false);
      } else if (mostrarModalEditar && paseSeleccionado) {
        await apiRequest(`/pases/${paseSeleccionado.pase_id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        exito(`Pase ${paseSeleccionado.codigo_srt || paseSeleccionado.pase_id} actualizado con éxito.`);
        setMostrarModalEditar(false);
      }

      cargarPases();
    } catch (err: any) {
      const msg = err.message || 'Error al procesar el pase';
      setErrorFormulario(msg);
      notifyError(msg);
    } finally {
      setGuardandoFormulario(false);
    }
  };

  // Eliminar pase
  const handleConfirmarEliminar = async () => {
    if (!paseParaEliminar) return;
    try {
      setEliminandoPase(true);
      await apiRequest(`/pases/${paseParaEliminar.pase_id}`, { method: 'DELETE' });
      exito(`Pase ${paseParaEliminar.codigo_srt || paseParaEliminar.pase_id} eliminado exitosamente.`);
      setPaseParaEliminar(null);
      cargarPases();
    } catch (err: any) {
      notifyError(err.message || 'Error al eliminar el pase');
    } finally {
      setEliminandoPase(false);
    }
  };

  // Renderizado condicional si no tiene permiso
  if (!tienePermiso) {
    return (
      <div style={{
        padding: '40px',
        backgroundColor: 'var(--color-superficie)',
        borderRadius: 'var(--radio-lg)',
        border: '1px solid var(--color-borde)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        maxWidth: '600px',
        margin: '40px auto'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-error)'
        }}>
          <ShieldAlert size={32} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-texto-principal)', margin: 0 }}>
          Acceso Restringido a Gestión de Pases
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-texto-secundario)', lineHeight: 1.5, margin: 0 }}>
          Este módulo de mantenimiento está reservado exclusivamente para colaboradores con perfil <strong>ADMIN</strong> o <strong>SWE</strong>.
        </p>
      </div>
    );
  }

  // Insignia para Estado SRT
  const renderBadgeEstado = (estado: EstadoSRT | string) => {
    let bg = 'rgba(100, 116, 139, 0.12)';
    let color = '#475569';
    let border = 'rgba(100, 116, 139, 0.3)';

    switch (estado) {
      case 'REGISTRADO':
        bg = 'rgba(14, 165, 233, 0.12)';
        color = '#0284c7';
        border = 'rgba(14, 165, 233, 0.3)';
        break;
      case 'UAT_SOLICITADO':
      case 'UAT_DESPLEGADO':
        bg = 'rgba(245, 158, 11, 0.12)';
        color = '#d97706';
        border = 'rgba(245, 158, 11, 0.3)';
        break;
      case 'QA_CERTIFICADO':
        bg = 'rgba(99, 102, 241, 0.12)';
        color = '#4f46e5';
        border = 'rgba(99, 102, 241, 0.3)';
        break;
      case 'PRD_SOLICITADO':
        bg = 'rgba(168, 85, 247, 0.12)';
        color = '#9333ea';
        border = 'rgba(168, 85, 247, 0.3)';
        break;
      case 'PRD_EJECUTADO':
        bg = 'rgba(16, 185, 129, 0.12)';
        color = '#059669';
        border = 'rgba(16, 185, 129, 0.3)';
        break;
      case 'RECHAZADO':
      case 'ANULADO':
        bg = 'rgba(239, 68, 68, 0.12)';
        color = '#dc2626';
        border = 'rgba(239, 68, 68, 0.3)';
        break;
    }

    return (
      <span style={{
        padding: '3px 8px',
        borderRadius: 'var(--radio-pildora)',
        fontSize: '0.72rem',
        fontWeight: 700,
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        {estado === 'PRD_EJECUTADO' && <Lock size={12} />}
        {estado}
      </span>
    );
  };

  // Insignia para Ambiente
  const renderBadgeAmbiente = (amb: TipoAmbiente | string) => {
    let label = 'DISTRIBUIDO';
    let color = '#2563eb';
    let bg = 'rgba(37, 99, 235, 0.1)';

    if (amb === 'A') {
      label = 'APIC_IFX';
      color = '#7c3aed';
      bg = 'rgba(124, 58, 237, 0.1)';
    } else if (amb === 'H') {
      label = 'HOST';
      color = '#059669';
      bg = 'rgba(5, 150, 105, 0.1)';
    }

    return (
      <span
        title={`${amb} = ${label}`}
        style={{
          padding: '2px 6px',
          borderRadius: 'var(--radio-sm)',
          fontSize: '0.72rem',
          fontWeight: 700,
          backgroundColor: bg,
          color: color,
          border: `1px solid ${color}33`,
          whiteSpace: 'nowrap'
        }}
      >
        {amb} - {label}
      </span>
    );
  };

  // Renderizar la columna Conformes_PRD con todos sus checks marcados / desmarcados
  const renderColumnaConformes = (pase: Pase) => {
    const seleccionados = parsearConformes(pase.conformes_prd);
    const itemsAMostrar = pase.tipo_ambiente === 'A'
      ? [...ITEMS_CONFORMES_BASE, ITEM_CONFORME_CHAPTER]
      : ITEMS_CONFORMES_BASE;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '150px' }}>
        {itemsAMostrar.map(item => {
          const marcado = seleccionados.includes(item);
          return (
            <div
              key={item}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.68rem',
                color: marcado ? 'var(--color-primario)' : 'var(--color-texto-terciario)',
                fontWeight: marcado ? 700 : 500,
              }}
            >
              {marcado ? (
                <CheckSquare size={13} style={{ color: 'var(--color-primario)', flexShrink: 0 }} />
              ) : (
                <Square size={13} style={{ color: 'var(--color-texto-terciario)', flexShrink: 0 }} />
              )}
              <span style={{ textDecoration: marcado ? 'none' : 'none' }}>{item}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* Cabecera Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-texto-principal)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Rocket size={24} style={{ color: 'var(--color-primario)' }} />
            Gestión de Pases (IBK)
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)', margin: 0 }}>
            Mantenimiento y trazabilidad de pases a UAT y Producción basados en PASES2026
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secundario"
            onClick={cargarPases}
            disabled={cargando}
            title="Recargar catálogo de pases"
          >
            <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </button>

          <button
            type="button"
            className="btn btn-secundario"
            onClick={() => setMostrarModalExportar(true)}
            title="Exportar pases a Excel (.xlsx)"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
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
            Nuevo Pase
          </button>
        </div>
      </div>

      {/* Panel de Filtros Requeridos: (PROYECTO/TITULO/Fecha_Registro_srt/CODIGO_SRT,OC) */}
      <div style={{
        backgroundColor: 'var(--color-superficie)',
        border: '1px solid var(--color-borde)',
        borderRadius: 'var(--radio-lg)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: 'var(--sombra-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-texto-principal)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Filtros de Búsqueda
          </span>
          <button
            type="button"
            onClick={handleLimpiarFiltros}
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-primario)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Limpiar filtros
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '10px'
        }}>
          {/* Filtro: PROYECTO */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-texto-secundario)', display: 'block', marginBottom: '4px' }}>
              Proyecto
            </label>
            <select
              className="form-select"
              style={{ width: '100%', fontSize: '0.8rem', height: '34px' }}
              value={filtroProyecto}
              onChange={e => {
                setFiltroProyecto(e.target.value);
                setPaginaActual(1);
              }}
            >
              <option value="">Todos los proyectos</option>
              {listaProyectos.map(p => (
                <option key={p.proyecto_id} value={p.nombre_proyecto}>
                  {p.nombre_proyecto}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro: TITULO */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-texto-secundario)', display: 'block', marginBottom: '4px' }}>
              Título
            </label>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', fontSize: '0.8rem', height: '34px' }}
              placeholder="Buscar en título..."
              value={filtroTitulo}
              onChange={e => {
                setFiltroTitulo(e.target.value);
                setPaginaActual(1);
              }}
            />
          </div>

          {/* Filtro: Fecha_Registro_srt */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-texto-secundario)', display: 'block', marginBottom: '4px' }}>
              Fecha Reg. SRT
            </label>
            <input
              type="date"
              className="form-input"
              style={{ width: '100%', fontSize: '0.8rem', height: '34px' }}
              value={filtroFechaRegistroSrt}
              onChange={e => {
                setFiltroFechaRegistroSrt(e.target.value);
                setPaginaActual(1);
              }}
            />
          </div>

          {/* Filtro: CODIGO_SRT */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-texto-secundario)', display: 'block', marginBottom: '4px' }}>
              Código SRT
            </label>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', fontSize: '0.8rem', height: '34px' }}
              placeholder="Ej: SRT_2026-..."
              value={filtroCodigoSrt}
              onChange={e => {
                setFiltroCodigoSrt(e.target.value);
                setPaginaActual(1);
              }}
            />
          </div>

          {/* Filtro: OC */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-texto-secundario)', display: 'block', marginBottom: '4px' }}>
              Orden de Cambio (OC)
            </label>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', fontSize: '0.8rem', height: '34px' }}
              placeholder="Ej: 167922"
              value={filtroOc}
              onChange={e => {
                setFiltroOc(e.target.value);
                setPaginaActual(1);
              }}
            />
          </div>

          {/* Filtro: ESTADO SRT */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-texto-secundario)', display: 'block', marginBottom: '4px' }}>
              Estado SRT
            </label>
            <select
              className="form-select"
              style={{ width: '100%', fontSize: '0.8rem', height: '34px' }}
              value={filtroEstadoSrt}
              onChange={e => {
                setFiltroEstadoSrt(e.target.value);
                setPaginaActual(1);
              }}
            >
              <option value="">Todos los estados</option>
              {ESTADOS_SRT.map(est => (
                <option key={est} value={est}>{est}</option>
              ))}
            </select>
          </div>

          {/* Filtro: TIPO AMBIENTE */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-texto-secundario)', display: 'block', marginBottom: '4px' }}>
              Ambiente
            </label>
            <select
              className="form-select"
              style={{ width: '100%', fontSize: '0.8rem', height: '34px' }}
              value={filtroTipoAmbiente}
              onChange={e => {
                setFiltroTipoAmbiente(e.target.value);
                setPaginaActual(1);
              }}
            >
              <option value="">Todos</option>
              <option value="A">A - APIC_IFX</option>
              <option value="D">D - DISTRIBUIDO</option>
              <option value="H">H - HOST</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla Principal con Scrollbars Vertical y Horizontal Siempre Visibles */}
      <div style={{
        backgroundColor: 'var(--color-superficie)',
        border: '1px solid var(--color-borde)',
        borderRadius: 'var(--radio-lg)',
        boxShadow: 'var(--sombra-sm)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Contenedor con overflow forzado tanto en X como en Y para garantizar barras de desplazamiento */}
        <div style={{
          overflowX: 'scroll',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 350px)',
          minHeight: '380px',
          scrollbarWidth: 'auto',
          position: 'relative'
        }}>
          <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead style={{
              backgroundColor: 'var(--color-superficie-hover)',
              borderBottom: '2px solid var(--color-borde)',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}>
              <tr>
                <th style={{ padding: '10px 12px', textAlign: 'center', width: '90px' }}>Acciones</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '110px' }}>Ambiente</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '110px' }}>Proyecto</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '90px' }}>APP</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '110px' }}>F. Reg. SRT</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '110px' }}>F. Sol. UAT</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '110px' }}>F. Desp. UAT</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '130px' }}>Estado SRT</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', minWidth: '150px' }}>
                  <div style={{ marginBottom: '4px' }}>Cód. SRT</div>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.72rem', padding: '2px 6px', height: '24px', width: '100%', fontWeight: 'normal' }}
                    placeholder="Filtrar..."
                    value={filtroCabeceraCodigoSrt}
                    onChange={e => {
                      setFiltroCabeceraCodigoSrt(e.target.value);
                      setPaginaActual(1);
                    }}
                  />
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'left', minWidth: '260px' }}>
                  <div style={{ marginBottom: '4px' }}>Título</div>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.72rem', padding: '2px 6px', height: '24px', width: '100%', fontWeight: 'normal' }}
                    placeholder="Filtrar por título..."
                    value={filtroCabeceraTitulo}
                    onChange={e => {
                      setFiltroCabeceraTitulo(e.target.value);
                      setPaginaActual(1);
                    }}
                  />
                </th>
                <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '170px' }}>Conformes PRD</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '130px' }}>QA</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '110px' }}>F. Certificación</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '110px' }}>F. Reg. OC</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '150px' }}>F. Hora Pase PRD</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '100px' }}>OC</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '100px' }}>Estado OC</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '130px' }}>Operador Pase</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '120px' }}>DEV</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '220px' }}>Sustento Negocio</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '130px' }}>Usuario Final</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '110px' }}>Q-SP-PRD</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '160px' }}>Owner Proyecto</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: '160px' }}>Motivo</th>
              </tr>
            </thead>

            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={24} style={{ padding: '36px', textAlign: 'center', color: 'var(--color-texto-terciario)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Cargando registros del catálogo de pases...</span>
                    </div>
                  </td>
                </tr>
              ) : pasesPaginados.length === 0 ? (
                <tr>
                  <td colSpan={24} style={{ padding: '36px', textAlign: 'center', color: 'var(--color-texto-terciario)' }}>
                    No se encontraron pases coincidentes con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                pasesPaginados.map(pase => (
                  <tr
                    key={pase.pase_id}
                    className="fila-interactiva"
                    tabIndex={0}
                    title={pase.estado_srt === 'PRD_EJECUTADO' ? "Doble clic para ver este pase (PRD_EJECUTADO - Finalizado)" : "Doble clic para editar este pase"}
                    onDoubleClick={() => handleAbrirEditar(pase)}
                    style={{ borderBottom: '1px solid var(--color-borde-suave)' }}
                  >
                    {/* Acciones */}
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {pase.estado_srt === 'PRD_EJECUTADO' ? (
                          <button
                            type="button"
                            className="btn-icono"
                            title="Ver Pase (PRD_EJECUTADO - Finalizado, solo lectura)"
                            style={{ color: 'var(--color-primario)' }}
                            onClick={e => {
                              e.stopPropagation();
                              handleAbrirEditar(pase);
                            }}
                          >
                            <Eye size={15} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-icono"
                            title="Editar Pase"
                            onClick={e => {
                              e.stopPropagation();
                              handleAbrirEditar(pase);
                            }}
                          >
                            <Edit2 size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-icono btn-icono-peligro"
                          title={pase.estado_srt === 'PRD_EJECUTADO' ? "Pase finalizado en PRD_EJECUTADO (no eliminable)" : "Eliminar Pase"}
                          disabled={pase.estado_srt === 'PRD_EJECUTADO'}
                          style={pase.estado_srt === 'PRD_EJECUTADO' ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
                          onClick={e => {
                            e.stopPropagation();
                            if (pase.estado_srt === 'PRD_EJECUTADO') {
                              notifyError('No se puede eliminar un pase en estado PRD_EJECUTADO (estado final para un SRT).');
                              return;
                            }
                            setPaseParaEliminar(pase);
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>

                    {/* TIPO_AMBIENTE */}
                    <td style={{ padding: '8px 12px' }}>
                      {renderBadgeAmbiente(pase.tipo_ambiente)}
                    </td>

                    {/* PROYECTO */}
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--color-texto-principal)' }}>
                      {pase.proyecto || '-'}
                    </td>

                    {/* APP */}
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: 'var(--radio-sm)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: 'var(--color-superficie-hover)',
                        border: '1px solid var(--color-borde)',
                      }}>
                        {pase.app || '-'}
                      </span>
                    </td>

                    {/* Fecha_Registro_srt */}
                    <td style={{ padding: '8px 12px', color: 'var(--color-texto-secundario)', whiteSpace: 'nowrap' }}>
                      {formatearFecha(pase.fecha_registro_srt)}
                    </td>

                    {/* Fecha_Solicitado_UAT */}
                    <td style={{ padding: '8px 12px', color: 'var(--color-texto-secundario)', whiteSpace: 'nowrap' }}>
                      {formatearFecha(pase.fecha_solicitado_uat)}
                    </td>

                    {/* Fecha_Desplegado_uat */}
                    <td style={{ padding: '8px 12px', color: 'var(--color-texto-secundario)', whiteSpace: 'nowrap' }}>
                      {formatearFecha(pase.fecha_desplegado_uat)}
                    </td>

                    {/* ESTADO SRT */}
                    <td style={{ padding: '8px 12px' }}>
                      {renderBadgeEstado(pase.estado_srt)}
                    </td>

                    {/* CODIGO_SRT */}
                    <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primario)', whiteSpace: 'nowrap' }}>
                      {pase.codigo_srt || '-'}
                    </td>

                    {/* TITULO */}
                    <td style={{ padding: '8px 12px', maxWidth: '280px' }}>
                      <div style={{
                        fontWeight: 600,
                        color: 'var(--color-texto-principal)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }} title={pase.titulo}>
                        {pase.titulo}
                      </div>
                    </td>

                    {/* Conformes_PRD (Muestra todos los checks con su respectivo marcado) */}
                    <td style={{ padding: '8px 12px' }}>
                      {renderColumnaConformes(pase)}
                    </td>

                    {/* QA */}
                    <td style={{ padding: '8px 12px', color: 'var(--color-texto-principal)' }}>
                      {pase.qa || '-'}
                    </td>

                    {/* Fecha Certificacion */}
                    <td style={{ padding: '8px 12px', color: 'var(--color-texto-secundario)', whiteSpace: 'nowrap' }}>
                      {formatearFecha(pase.fecha_certificacion)}
                    </td>

                    {/* Fecha Registro OC */}
                    <td style={{ padding: '8px 12px', color: 'var(--color-texto-secundario)', whiteSpace: 'nowrap' }}>
                      {formatearFecha(pase.fecha_registro_oc)}
                    </td>

                    {/* Fecha_Hora_Pase_PRD (DD/MM/YYYY HH:MM) */}
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--color-primario)', whiteSpace: 'nowrap' }}>
                      {formatearFechaHora(pase.fecha_hora_pase_prd)}
                    </td>

                    {/* OC */}
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600 }}>
                      {pase.oc || '-'}
                    </td>

                    {/* STADO OC */}
                    <td style={{ padding: '8px 12px', color: 'var(--color-texto-secundario)' }}>
                      {pase.stado_oc || '-'}
                    </td>

                    {/* Operador Pase */}
                    <td style={{ padding: '8px 12px' }}>
                      {pase.operador_pase || '-'}
                    </td>

                    {/* DEV */}
                    <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                      {pase.dev || '-'}
                    </td>

                    {/* Sustento_VALOR_NEGOCIO */}
                    <td style={{ padding: '8px 12px', maxWidth: '240px' }}>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-texto-secundario)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }} title={pase.sustento_valor_negocio || ''}>
                        {pase.sustento_valor_negocio || '-'}
                      </div>
                    </td>

                    {/* usuario final APROBACION */}
                    <td style={{ padding: '8px 12px' }}>
                      {pase.usuario_final_aprobacion || '-'}
                    </td>

                    {/* Q-SP- PRD */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      {pase.q_sp_prd ? (
                        <span style={{
                          padding: '1px 5px',
                          borderRadius: 'var(--radio-sm)',
                          fontSize: '0.7rem',
                          backgroundColor: 'var(--color-superficie-hover)',
                          border: '1px solid var(--color-borde)',
                          fontWeight: 600
                        }}>
                          {pase.q_sp_prd}
                        </span>
                      ) : '-'}
                    </td>

                    {/* RESPONSABLE-OWNER-PROYECTO */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'pre-line' }}>
                      {pase.responsable_owner_proyecto || '-'}
                    </td>

                    {/* Motivo (en caso de RECHAZADO o ANULADO) */}
                    <td style={{ padding: '8px 12px', maxWidth: '200px' }}>
                      {pase.motivo_estado ? (
                        <span style={{ color: 'var(--color-error)', fontWeight: 600, fontSize: '0.72rem' }} title={pase.motivo_estado}>
                          {pase.motivo_estado}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación y Resumen */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--color-borde)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '0.85rem'
        }}>
          <div style={{ color: 'var(--color-texto-secundario)' }}>
            Mostrando <strong>{pasesPaginados.length}</strong> de <strong>{pasesFiltrados.length}</strong> pases
            {pasesFiltrados.length !== pases.length && ` (filtrados de ${pases.length} totales)`}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secundario"
              style={{ padding: '4px 8px', height: '30px' }}
              disabled={paginaActual <= 1}
              onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
              Anterior
            </button>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0 6px' }}>
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              type="button"
              className="btn btn-secundario"
              style={{ padding: '4px 8px', height: '30px' }}
              disabled={paginaActual >= totalPaginas}
              onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
            >
              Siguiente
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Crear / Editar Pase */}
      {(mostrarModalCrear || mostrarModalEditar) && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--color-superficie)',
            border: '1px solid var(--color-borde)',
            borderRadius: 'var(--radio-lg)',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--sombra-xl)',
            overflow: 'hidden'
          }}>
            {/* Cabecera del Modal */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-borde)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--color-superficie-hover)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radio-md)',
                  background: esBloqueado ? 'rgba(59, 130, 246, 0.15)' : 'var(--color-primario-suave)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primario)'
                }}>
                  {esBloqueado ? <Lock size={20} /> : <Rocket size={20} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--color-texto-principal)' }}>
                      {mostrarModalCrear ? 'Nuevo Registro de Pase (IBK)' : `Editar Pase: ${paseSeleccionado?.codigo_srt || paseSeleccionado?.pase_id}`}
                    </h3>
                    {esBloqueado && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radio-full)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: 'rgba(59, 130, 246, 0.12)',
                        color: 'var(--color-primario)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Lock size={12} /> Finalizado / Solo Lectura
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-texto-secundario)', margin: 0 }}>
                    {esBloqueado
                      ? 'Este pase se encuentra en estado PRD_EJECUTADO (último estado del SRT) y no se puede modificar.'
                      : 'Complete los campos requeridos del pase a producción o certificación'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="btn-icono"
                onClick={() => {
                  setMostrarModalCrear(false);
                  setMostrarModalEditar(false);
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleGuardarPase} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>

                {/* Banner Informativo cuando el Pase ya está en PRD_EJECUTADO (Bloqueado) */}
                {esBloqueado && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radio-md)',
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}>
                    <div style={{ color: 'var(--color-primario)', marginTop: '2px' }}>
                      <Lock size={20} />
                    </div>
                    <div style={{ flex: 1, fontSize: '0.82rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-primario)', marginBottom: '2px' }}>
                        Pase Cerrado en Estado PRD_EJECUTADO (No Modificable)
                      </div>
                      <div style={{ color: 'var(--color-texto-secundario)', lineHeight: 1.4 }}>
                        El estado <strong>PRD_EJECUTADO</strong> es el último estado para un SRT. Para preservar la integridad y trazabilidad de los despliegues a producción, <strong>este registro ya no se puede modificar ni cambiar de estado</strong>.
                      </div>
                    </div>
                  </div>
                )}

                {/* Mensaje de Error si lo hay */}
                {errorFormulario && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radio-md)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: 'var(--color-error)',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertCircle size={16} />
                    <span>{errorFormulario}</span>
                  </div>
                )}

                {/* Sección 1: Identificación y Clasificación */}
                <div>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primario)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
                    1. Identificación y Clasificación
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    {/* TIPO_AMBIENTE */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                        Tipo de Ambiente (*)
                      </label>
                      <select
                        className="form-select"
                        value={formTipoAmbiente}
                        disabled={esBloqueado}
                        onChange={e => {
                          const nuevoAmbiente = e.target.value as TipoAmbiente;
                          setFormTipoAmbiente(nuevoAmbiente);
                          if (nuevoAmbiente !== 'A') {
                            // Si deja de ser 'A', remover CONF.CHAPTER
                            setFormConformesPrd(prev => prev.filter(x => x !== ITEM_CONFORME_CHAPTER));
                          }
                        }}
                      >
                        <option value="A">A - APIC_IFX</option>
                        <option value="D">D - DISTRIBUIDO</option>
                        <option value="H">H - HOST</option>
                      </select>
                    </div>

                    {/* PROYECTO (Combo desde Mantenimiento Proyecto) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                        Proyecto (*)
                      </label>
                      <select
                        className="form-select"
                        value={formProyecto}
                        disabled={esBloqueado}
                        onChange={e => setFormProyecto(e.target.value)}
                      >
                        <option value="">-- Seleccione Proyecto --</option>
                        {listaProyectos.map(p => (
                          <option key={p.proyecto_id} value={p.nombre_proyecto}>
                            {p.nombre_proyecto}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* APP (Combo con Siglas de Catálogo de Aplicaciones) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                        Aplicación (Siglas) (*)
                      </label>
                      <select
                        className="form-select"
                        value={formApp}
                        disabled={esBloqueado}
                        onChange={e => setFormApp(e.target.value)}
                      >
                        <option value="">-- Seleccione Sigla App --</option>
                        {listaAplicaciones.map(a => (
                          <option key={a.aplicacion_id} value={a.siglas || a.nombre_aplicacion}>
                            {a.siglas ? `${a.siglas} (${a.nombre_aplicacion})` : a.nombre_aplicacion}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* CODIGO_SRT */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                        Código SRT {mostrarModalCrear && <span style={{ color: 'var(--color-primario)', fontSize: '0.75rem', fontWeight: 600 }}>(Único)</span>}
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej: SRT_2026-17785"
                        value={formCodigoSrt}
                        disabled={esBloqueado}
                        onChange={e => setFormCodigoSrt(e.target.value)}
                        style={{
                          borderColor: (mostrarModalCrear && formCodigoSrt.trim() && pases.some(p => p.codigo_srt?.trim().toLowerCase() === formCodigoSrt.trim().toLowerCase())) ? 'var(--color-error)' : undefined
                        }}
                      />
                      {mostrarModalCrear && formCodigoSrt.trim() && pases.some(p => p.codigo_srt?.trim().toLowerCase() === formCodigoSrt.trim().toLowerCase()) && (
                        <div style={{ color: 'var(--color-error)', fontSize: '0.72rem', marginTop: '3px', fontWeight: 600 }}>
                          * Ya existe un pase registrado con este código SRT. Debe ser único.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Título del Pase */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Título del Pase (*)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Descripción resumida o título del pase"
                    value={formTitulo}
                    disabled={esBloqueado}
                    onChange={e => setFormTitulo(e.target.value)}
                    required
                  />
                </div>

                {/* Sección 2: Estado SRT y Motivo Obligatorio */}
                <div style={{
                  padding: '14px',
                  borderRadius: 'var(--radio-md)',
                  backgroundColor: 'var(--color-superficie-hover)',
                  border: '1px solid var(--color-borde)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                        Estado SRT (*)
                      </label>
                      <select
                        className="form-select"
                        value={formEstadoSrt}
                        disabled={esBloqueado}
                        onChange={e => setFormEstadoSrt(e.target.value as EstadoSRT)}
                        style={{
                          fontWeight: 600,
                          borderColor: (formEstadoSrt === 'RECHAZADO' || formEstadoSrt === 'ANULADO')
                            ? 'var(--color-error)'
                            : (formEstadoSrt === 'PRD_EJECUTADO' ? 'var(--color-primario)' : undefined)
                        }}
                      >
                        {ESTADOS_SRT.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    {/* Q-SP-PRD */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                        Q-SP- PRD
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej: 2026-Q5-SP5"
                        value={formQSpPrd}
                        disabled={esBloqueado}
                        onChange={e => setFormQSpPrd(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Alerta Informativa cuando se selecciona PRD_EJECUTADO (y no estaba bloqueado) */}
                  {formEstadoSrt === 'PRD_EJECUTADO' && !esBloqueado && (
                    <div style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radio-md)',
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 700, fontSize: '0.82rem' }}>
                        <AlertTriangle size={16} />
                        <span>¡Atención! Cambio al estado final PRD_EJECUTADO</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-texto-principal)' }}>
                        <strong>PRD_EJECUTADO</strong> es el último estado para un SRT. Una vez guardado en este estado, <strong>el pase quedará cerrado y ya no se podrá modificar ni cambiar de estado</strong>.
                      </p>
                      <div style={{ fontSize: '0.76rem', color: '#b45309', fontWeight: 600 }}>
                        Son obligatorios los 6 campos siguientes:
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '4px', marginTop: '4px' }}>
                          <span>• Orden de Cambio (OC)</span>
                          <span>• Estado OC</span>
                          <span>• Fecha Registro OC</span>
                          <span>• Fecha y Hora Pase PRD (*)</span>
                          <span>• Fecha Certificación</span>
                          <span>• Operador Pase</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Campo Motivo (Obligatorio para RECHAZADO y ANULADO) */}
                  {(formEstadoSrt === 'RECHAZADO' || formEstadoSrt === 'ANULADO') && (
                    <div style={{
                      padding: '12px',
                      borderRadius: 'var(--radio-sm)',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-error)', fontWeight: 700, fontSize: '0.8rem' }}>
                        <AlertTriangle size={15} />
                        <span>Motivo de {formEstadoSrt} (Obligatorio para grabar) *</span>
                      </div>
                      <textarea
                        className="form-input"
                        rows={2}
                        placeholder={`Indique el motivo por el cual el pase pasa a estado ${formEstadoSrt}...`}
                        value={formMotivoEstado}
                        disabled={esBloqueado}
                        onChange={e => setFormMotivoEstado(e.target.value)}
                        required
                        style={{ borderColor: 'var(--color-error)' }}
                      />
                    </div>
                  )}
                </div>

                {/* Sección 3: Conformes PRD (Checklist con condición para CONF.CHAPTER) */}
                <div>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primario)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                    2. Conformes PRD
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-texto-secundario)', margin: '0 0 10px 0' }}>
                    Marque las conformidades obtenidas. (Nota: <em>CONF.CHAPTER</em> solo está disponible para tipo de ambiente <strong>A = APIC_IFX</strong>)
                  </p>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '10px',
                    padding: '12px',
                    backgroundColor: 'var(--color-superficie-hover)',
                    borderRadius: 'var(--radio-md)',
                    border: '1px solid var(--color-borde)'
                  }}>
                    {ITEMS_CONFORMES_BASE.map(item => {
                      const check = formConformesPrd.includes(item);
                      return (
                        <label
                          key={item}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: esBloqueado ? 'not-allowed' : 'pointer',
                            fontSize: '0.82rem',
                            fontWeight: check ? 700 : 500,
                            color: check ? 'var(--color-primario)' : 'var(--color-texto-principal)',
                            opacity: esBloqueado ? 0.75 : 1
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={check}
                            disabled={esBloqueado}
                            onChange={() => toggleConformeItem(item)}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--color-primario)', cursor: esBloqueado ? 'not-allowed' : 'pointer' }}
                          />
                          <span>{item}</span>
                        </label>
                      );
                    })}

                    {/* CONF.CHAPTER: Solo visible si TIPO_AMBIENTE = 'A' */}
                    {formTipoAmbiente === 'A' && (
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: esBloqueado ? 'not-allowed' : 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: formConformesPrd.includes(ITEM_CONFORME_CHAPTER) ? 700 : 500,
                          color: formConformesPrd.includes(ITEM_CONFORME_CHAPTER) ? 'var(--color-primario)' : 'var(--color-texto-principal)',
                          opacity: esBloqueado ? 0.75 : 1
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formConformesPrd.includes(ITEM_CONFORME_CHAPTER)}
                          disabled={esBloqueado}
                          onChange={() => toggleConformeItem(ITEM_CONFORME_CHAPTER)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--color-primario)', cursor: esBloqueado ? 'not-allowed' : 'pointer' }}
                        />
                        <span>{ITEM_CONFORME_CHAPTER} <small style={{ color: 'var(--color-primario)' }}>(APIC)</small></span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Sección 4: Asignaciones y Responsables */}
                <div>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primario)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
                    3. Asignaciones y Responsables
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    {/* QA (Combo con usuarios perfil QA) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                        QA Responsable
                      </label>
                      <select
                        className="form-select"
                        value={formQa}
                        disabled={esBloqueado}
                        onChange={e => setFormQa(e.target.value)}
                      >
                        <option value="">-- Sin asignar --</option>
                        {colaboradoresQA.map(q => (
                          <option key={q.registro_id} value={q.nombres}>
                            {q.nombres} ({q.perfil})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* DEV (Combo con usuarios perfil DESARROLLADOR) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                        Desarrollador (DEV)
                      </label>
                      <select
                        className="form-select"
                        value={formDev}
                        disabled={esBloqueado}
                        onChange={e => setFormDev(e.target.value)}
                      >
                        <option value="">-- Sin asignar --</option>
                        {colaboradoresDEV.map(d => (
                          <option key={d.registro_id} value={d.nombres}>
                            {d.nombres} ({d.perfil})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Operador Pase (Obligatorio para PRD_EJECUTADO) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                        Operador Pase {formEstadoSrt === 'PRD_EJECUTADO' && (
                          <span style={{ color: 'var(--color-error)', fontWeight: 700 }}>* (Obligatorio)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Nombre de operador de pase"
                        value={formOperadorPase}
                        disabled={esBloqueado}
                        onChange={e => setFormOperadorPase(e.target.value)}
                        style={{
                          borderColor: (formEstadoSrt === 'PRD_EJECUTADO' && !formOperadorPase.trim()) ? 'var(--color-error)' : undefined
                        }}
                      />
                    </div>

                    {/* Usuario Final Aprobación */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                        Usuario Final Aprobación
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Usuario de negocio / aprobación"
                        value={formUsuarioFinalAprobacion}
                        disabled={esBloqueado}
                        onChange={e => setFormUsuarioFinalAprobacion(e.target.value)}
                      />
                    </div>

                    {/* Responsable Owner Proyecto */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                        Responsable / Owner Proyecto
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Nombres de owners / responsables"
                        value={formResponsableOwnerProyecto}
                        disabled={esBloqueado}
                        onChange={e => setFormResponsableOwnerProyecto(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Sección 5: Fechas del Flujo */}
                <div>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primario)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
                    4. Fechas del Flujo (Formato DD/MM/YYYY y DD/MM/YYYY HH:MM)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                        Fecha Registro SRT
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        value={formFechaRegistroSrt}
                        disabled={esBloqueado}
                        onChange={e => setFormFechaRegistroSrt(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                        Fecha Solicitado UAT
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        value={formFechaSolicitadoUat}
                        disabled={esBloqueado}
                        onChange={e => setFormFechaSolicitadoUat(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                        Fecha Desplegado UAT
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        value={formFechaDesplegadoUat}
                        disabled={esBloqueado}
                        onChange={e => setFormFechaDesplegadoUat(e.target.value)}
                      />
                    </div>

                    {/* Fecha Certificación (Obligatorio para PRD_EJECUTADO) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                        Fecha Certificación {formEstadoSrt === 'PRD_EJECUTADO' && (
                          <span style={{ color: 'var(--color-error)', fontWeight: 700 }}>* (Obligatorio)</span>
                        )}
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        value={formFechaCertificacion}
                        disabled={esBloqueado}
                        onChange={e => setFormFechaCertificacion(e.target.value)}
                        style={{
                          borderColor: (formEstadoSrt === 'PRD_EJECUTADO' && !formFechaCertificacion.trim()) ? 'var(--color-error)' : undefined
                        }}
                      />
                    </div>

                    {/* Fecha Registro OC (Obligatorio para PRD_EJECUTADO) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                        Fecha Registro OC {formEstadoSrt === 'PRD_EJECUTADO' && (
                          <span style={{ color: 'var(--color-error)', fontWeight: 700 }}>* (Obligatorio)</span>
                        )}
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        value={formFechaRegistroOc}
                        disabled={esBloqueado}
                        onChange={e => setFormFechaRegistroOc(e.target.value)}
                        style={{
                          borderColor: (formEstadoSrt === 'PRD_EJECUTADO' && !formFechaRegistroOc.trim()) ? 'var(--color-error)' : undefined
                        }}
                      />
                    </div>

                    {/* Fecha y Hora Pase PRD (*) (Obligatorio para PRD_EJECUTADO) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-primario)', marginBottom: '4px' }}>
                        Fecha y Hora Pase PRD (*) {formEstadoSrt === 'PRD_EJECUTADO' && (
                          <span style={{ color: 'var(--color-error)', fontWeight: 700 }}>* (Obligatorio)</span>
                        )}
                      </label>
                      <input
                        type="datetime-local"
                        className="form-input"
                        value={formFechaHoraPasePrd}
                        disabled={esBloqueado}
                        onChange={e => setFormFechaHoraPasePrd(e.target.value)}
                        style={{
                          fontWeight: 600,
                          borderColor: (formEstadoSrt === 'PRD_EJECUTADO' && !formFechaHoraPasePrd.trim()) ? 'var(--color-error)' : undefined
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Sección 6: Datos de Orden de Cambio y Sustento */}
                <div>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primario)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
                    5. Orden de Cambio y Sustento
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                    {/* Orden de Cambio (OC) (Obligatorio para PRD_EJECUTADO) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                        Orden de Cambio (OC) {formEstadoSrt === 'PRD_EJECUTADO' && (
                          <span style={{ color: 'var(--color-error)', fontWeight: 700 }}>* (Obligatorio)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej: 167922"
                        value={formOc}
                        disabled={esBloqueado}
                        onChange={e => setFormOc(e.target.value)}
                        style={{
                          borderColor: (formEstadoSrt === 'PRD_EJECUTADO' && !formOc.trim()) ? 'var(--color-error)' : undefined
                        }}
                      />
                    </div>

                    {/* Estado OC (Obligatorio para PRD_EJECUTADO) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                        Estado OC {formEstadoSrt === 'PRD_EJECUTADO' && (
                          <span style={{ color: 'var(--color-error)', fontWeight: 700 }}>* (Obligatorio)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Estado de la OC"
                        value={formStadoOc}
                        disabled={esBloqueado}
                        onChange={e => setFormStadoOc(e.target.value)}
                        style={{
                          borderColor: (formEstadoSrt === 'PRD_EJECUTADO' && !formStadoOc.trim()) ? 'var(--color-error)' : undefined
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                      Sustento de Valor de Negocio
                    </label>
                    <textarea
                      className="form-input"
                      rows={3}
                      placeholder="Detalle técnico o justificación de negocio del pase..."
                      value={formSustentoValorNegocio}
                      disabled={esBloqueado}
                      onChange={e => setFormSustentoValorNegocio(e.target.value)}
                    />
                  </div>
                </div>

              </div>

              {/* Pie de Formulario */}
              <div style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--color-borde)',
                backgroundColor: 'var(--color-superficie-hover)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px'
              }}>
                {esBloqueado ? (
                  <button
                    type="button"
                    className="btn btn-secundario"
                    onClick={() => {
                      setMostrarModalEditar(false);
                    }}
                  >
                    Cerrar (Pase Finalizado)
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-secundario"
                      onClick={() => {
                        setMostrarModalCrear(false);
                        setMostrarModalEditar(false);
                      }}
                      disabled={guardandoFormulario}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primario"
                      disabled={guardandoFormulario}
                    >
                      {guardandoFormulario ? 'Guardando...' : (mostrarModalCrear ? 'Grabar Pase' : 'Actualizar Pase')}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación */}
      <ModalConfirmacionEliminar
        abierto={!!paseParaEliminar}
        titulo="Eliminar Registro de Pase"
        mensaje={`¿Está seguro de que desea eliminar el pase "${paseParaEliminar?.codigo_srt || paseParaEliminar?.titulo}"? Esta acción no se puede deshacer.`}
        textoConfirmar="Eliminar Pase"
        cargando={eliminandoPase}
        onConfirmar={handleConfirmarEliminar}
        onCerrar={() => setPaseParaEliminar(null)}
      />

      {/* Modal Exportación a Excel */}
      {mostrarModalExportar && (
        <ModalExportarPases
          pases={pases}
          onCerrar={() => setMostrarModalExportar(false)}
        />
      )}

    </div>
  );
};
