import React, { useState, useEffect } from 'react';
import {
  Rocket, AlertCircle, X, AlertTriangle, Lock, RefreshCw
} from 'lucide-react';
import { Pase, TipoAmbiente, EstadoSRT, Proyecto, Aplicacion, RegistroColaborador } from '../../types';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotificacion } from '../../context/NotificacionContext';

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

export interface ModalEditarPaseProps {
  abierto: boolean;
  onCerrar: () => void;
  paseInicial?: Pase | null;
  codigoSrt?: string | null;
  actividadEstado?: string | null;
  soloLectura?: boolean;
  onPaseActualizado?: (pase: Pase) => void;
}

export const ModalEditarPase: React.FC<ModalEditarPaseProps> = ({
  abierto,
  onCerrar,
  paseInicial = null,
  codigoSrt = null,
  actividadEstado = null,
  soloLectura = false,
  onPaseActualizado,
}) => {
  const { usuario } = useAuth();
  const { exito, error: notifyError } = useNotificacion();

  const tienePermisoAdmin = usuario?.perfil === 'ADMIN' || usuario?.perfil === 'SWE';

  const [pase, setPase] = useState<Pase | null>(paseInicial);
  const [cargandoPase, setCargandoPase] = useState(false);

  // Catálogos para combos
  const [listaProyectos, setListaProyectos] = useState<Proyecto[]>([]);
  const [listaAplicaciones, setListaAplicaciones] = useState<Aplicacion[]>([]);
  const [colaboradoresQA, setColaboradoresQA] = useState<RegistroColaborador[]>([]);
  const [colaboradoresDEV, setColaboradoresDEV] = useState<RegistroColaborador[]>([]);

  // Estados del Formulario
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

  const parsearConformes = (confStr?: string | null): string[] => {
    if (!confStr) return [];
    return confStr.split(',').map(s => s.trim()).filter(Boolean);
  };

  const inicializarFormulario = (p: Pase) => {
    setPase(p);
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
  };

  // Cargar catálogos
  useEffect(() => {
    if (!abierto) return;

    const cargarCatalogos = async () => {
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
        console.error('Error cargando catálogos de apoyo para modal editar pase:', err);
      }
    };

    cargarCatalogos();
  }, [abierto]);

  // Cargar datos del Pase
  useEffect(() => {
    if (!abierto) return;

    if (paseInicial) {
      inicializarFormulario(paseInicial);
      return;
    }

    if (codigoSrt && codigoSrt.trim()) {
      const fetchPasePorSrt = async () => {
        try {
          setCargandoPase(true);
          const p = await apiRequest<Pase>(`/pases/by-srt/${encodeURIComponent(codigoSrt.trim())}`);
          inicializarFormulario(p);
        } catch (err: any) {
          console.error(err);
          notifyError(`No se encontró ningún pase registrado con el código SRT "${codigoSrt}".`);
          onCerrar();
        } finally {
          setCargandoPase(false);
        }
      };

      fetchPasePorSrt();
    }
  }, [abierto, paseInicial, codigoSrt]);

  if (!abierto) return null;

  // Condiciones de bloqueo / solo lectura
  const esActividadFinalizada = actividadEstado?.toLowerCase() === 'finalizado';
  const esPrdEjecutado = pase?.estado_srt === 'PRD_EJECUTADO';
  const esBloqueado = Boolean(
    soloLectura ||
    !tienePermisoAdmin ||
    esActividadFinalizada ||
    esPrdEjecutado
  );

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

  const handleGuardarPase = async (e: React.FormEvent) => {
    e.preventDefault();

    if (esBloqueado) {
      if (esActividadFinalizada) {
        notifyError('La actividad está Finalizada. El pase no puede ser modificado.');
      } else if (esPrdEjecutado) {
        notifyError('El pase se encuentra en estado PRD_EJECUTADO (último estado) y ya no se puede modificar.');
      }
      return;
    }

    if (!pase) {
      notifyError('No hay pase seleccionado para actualizar.');
      return;
    }

    if (!formTitulo.trim()) {
      setErrorFormulario('El título del pase es obligatorio.');
      return;
    }

    // Validación de motivo en RECHAZADO y ANULADO
    if (formEstadoSrt === 'RECHAZADO' || formEstadoSrt === 'ANULADO') {
      if (!formMotivoEstado.trim()) {
        const errorMsg = `Debe indicar el motivo obligatorio cuando el estado del pase es ${formEstadoSrt}.`;
        setErrorFormulario(errorMsg);
        notifyError(errorMsg);
        return;
      }
    }

    // Validación para PRD_EJECUTADO
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
        operador_pase: formOperadorPase.trim() || null,
        dev: formDev.trim() || null,
        sustento_valor_negocio: formSustentoValorNegocio.trim() || null,
        usuario_final_aprobacion: formUsuarioFinalAprobacion.trim() || null,
        q_sp_prd: formQSpPrd.trim() || null,
        responsable_owner_proyecto: formResponsableOwnerProyecto.trim() || null,
        motivo_estado: (formEstadoSrt === 'RECHAZADO' || formEstadoSrt === 'ANULADO') ? formMotivoEstado.trim() : null
      };

      const actualizado = await apiRequest<Pase>(`/pases/${pase.pase_id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      exito(`Pase ${actualizado.codigo_srt || actualizado.pase_id} actualizado exitosamente.`);
      if (onPaseActualizado) {
        onPaseActualizado(actualizado);
      }
      onCerrar();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Error al actualizar el pase';
      setErrorFormulario(msg);
      notifyError(msg);
    } finally {
      setGuardandoFormulario(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
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
                  {`Editar Pase: ${formCodigoSrt || pase?.codigo_srt || codigoSrt || 'SRT'}`}
                </h3>
                {esActividadFinalizada ? (
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radio-full)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    color: '#DC2626',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Lock size={12} /> Actividad Finalizada (Solo Lectura)
                  </span>
                ) : esPrdEjecutado ? (
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
                    <Lock size={12} /> PRD_EJECUTADO (Solo Lectura)
                  </span>
                ) : null}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-texto-secundario)', margin: 0 }}>
                {esActividadFinalizada
                  ? 'La actividad vinculada está Finalizada. Solo se permite visualización y no edición del Pase.'
                  : esPrdEjecutado
                  ? 'Este pase se encuentra en estado PRD_EJECUTADO (último estado del SRT) y no se puede modificar.'
                  : 'Modifique los campos requeridos del pase a producción o certificación'}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-icono"
            onClick={onCerrar}
            title="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {cargandoPase ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 16px', color: 'var(--color-primario)' }} />
            <div>Cargando datos del pase SRT...</div>
          </div>
        ) : (
          <form onSubmit={handleGuardarPase} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Banner Informativo si la Actividad está Finalizada */}
              {esActividadFinalizada && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radio-md)',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <div style={{ color: '#DC2626', marginTop: '2px' }}>
                    <Lock size={20} />
                  </div>
                  <div style={{ flex: 1, fontSize: '0.82rem' }}>
                    <div style={{ fontWeight: 700, color: '#DC2626', marginBottom: '2px' }}>
                      Actividad en Estado Finalizado (Visualización Únicamente)
                    </div>
                    <div style={{ color: 'var(--color-texto-secundario)', lineHeight: 1.4 }}>
                      Dado que la actividad asociada se encuentra en estado <strong>Finalizado</strong>, se bloquea la edición de este pase SRT para preservar la integridad de las actividades cerradas.
                    </div>
                  </div>
                </div>
              )}

              {/* Banner Informativo si está en PRD_EJECUTADO */}
              {!esActividadFinalizada && esPrdEjecutado && (
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
                      El estado <strong>PRD_EJECUTADO</strong> es el último estado para un SRT. Para preservar la trazabilidad, <strong>este registro ya no se puede modificar</strong>.
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
                          setFormConformesPrd(prev => prev.filter(x => x !== ITEM_CONFORME_CHAPTER));
                        }
                      }}
                    >
                      <option value="A">A - APIC_IFX</option>
                      <option value="D">D - DISTRIBUIDO</option>
                      <option value="H">H - HOST</option>
                    </select>
                  </div>

                  {/* PROYECTO */}
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

                  {/* APP */}
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
                      Código SRT
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: SRT_2026-17785"
                      value={formCodigoSrt}
                      disabled={esBloqueado}
                      onChange={e => setFormCodigoSrt(e.target.value)}
                    />
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

              {/* Sección 2: Estado SRT y Motivo */}
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

              {/* Sección 3: Conformes PRD */}
              <div>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primario)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  2. Conformes PRD
                </h4>
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
                          style={{ width: '16px', height: '16px', accentColor: 'var(--color-primario)' }}
                        />
                        <span>{item}</span>
                      </label>
                    );
                  })}

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
                        style={{ width: '16px', height: '16px', accentColor: 'var(--color-primario)' }}
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
                    />
                  </div>

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
                  4. Fechas del Flujo
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
                    />
                  </div>

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
                    />
                  </div>

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
                    />
                  </div>
                </div>
              </div>

              {/* Sección 6: Orden de Cambio y Sustento */}
              <div>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primario)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
                  5. Orden de Cambio y Sustento
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
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
                    />
                  </div>

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
                  onClick={onCerrar}
                >
                  Cerrar {esActividadFinalizada ? '(Actividad Finalizada)' : '(Solo Lectura)'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-secundario"
                    onClick={onCerrar}
                    disabled={guardandoFormulario}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primario"
                    disabled={guardandoFormulario}
                  >
                    {guardandoFormulario ? 'Guardando...' : 'Actualizar Pase'}
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
