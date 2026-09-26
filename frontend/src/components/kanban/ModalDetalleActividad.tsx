import React, { useState, useEffect } from 'react';
import { 
  X, Info, UserCheck, MessageSquare, Plus, Clock, 
  Calendar, CheckCircle, AlertTriangle, Shield, RefreshCw, Trash2,
  Edit2, Rocket
} from 'lucide-react';
import { ActividadDetalle, MiembroGrupo } from '../../types';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotificacion } from '../../context/NotificacionContext';
import { ModalConfirmacionEliminar } from '../common/ModalConfirmacionEliminar';
import { ModalEditarPase } from '../common/ModalEditarPase';

interface ModalDetalleActividadProps {
  codigoActividad: string;
  onCerrar: () => void;
  onAbrirCambioEstado: () => void;
  onActualizado: () => void;
}

export const ModalDetalleActividad: React.FC<ModalDetalleActividadProps> = ({
  codigoActividad,
  onCerrar,
  onAbrirCambioEstado,
  onActualizado,
}) => {
  const { usuario } = useAuth();
  const { exito, error: notifyError } = useNotificacion();

  const [actividad, setActividad] = useState<ActividadDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [tabActiva, setTabActiva] = useState<'info' | 'asignaciones' | 'seguimiento'>('info');

  // Estado para abrir modal de Editar Pase según SRT Rational
  const [srtParaEditarPase, setSrtParaEditarPase] = useState<string | null>(null);

  // Estados para modo de edición de actividad
  const [modoEdicion, setModoEdicion] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formSprint, setFormSprint] = useState('');
  const [formQTrabajo, setFormQTrabajo] = useState('');
  const [formOrdenCambio, setFormOrdenCambio] = useState('');
  const [formSrtRational, setFormSrtRational] = useState('');
  const [formSolicitadoPor, setFormSolicitadoPor] = useState('');
  const [formAreasAfectadas, setFormAreasAfectadas] = useState('');
  const [formImpedimentos, setFormImpedimentos] = useState('');

  const sincronizarFormularioEdicion = (act: ActividadDetalle) => {
    setFormTitulo(act.titulo || '');
    setFormDescripcion(act.descripcion || '');
    setFormSprint(act.sprint ? String(act.sprint) : '');
    setFormQTrabajo(act.q_trabajo ? String(act.q_trabajo) : '');
    setFormOrdenCambio(act.orden_cambio || '');
    setFormSrtRational(act.srt_rational || '');
    setFormSolicitadoPor(act.solicitado_por || '');
    setFormAreasAfectadas(act.areas_afectadas || '');
    setFormImpedimentos(act.impedimentos || '');
  };

  // Estados para reasignación (Tab 2)
  const [miembrosGrupo, setMiembrosGrupo] = useState<MiembroGrupo[]>([]);
  const [nuevoAsignado, setNuevoAsignado] = useState('');
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false);

  // Estados para nuevo seguimiento (Tab 3)
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [guardandoComentario, setGuardandoComentario] = useState(false);

  const cargarDetalle = async () => {
    try {
      setCargando(true);
      const data = await apiRequest<ActividadDetalle>(`/actividades/${codigoActividad}`);
      setActividad(data);
      sincronizarFormularioEdicion(data);

      if (data.codigo_grupo) {
        try {
          const gData = await apiRequest(`/grupos/${data.codigo_grupo}`);
          setMiembrosGrupo(gData.miembros || []);
        } catch (e) {
          // Si no se pueden cargar miembros
        }
      }
    } catch (err: any) {
      notifyError('No se pudo cargar el detalle de la actividad.');
      onCerrar();
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDetalle();
  }, [codigoActividad]);

  const handleReasignar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoAsignado) return;
    try {
      setGuardandoAsignacion(true);
      await apiRequest(`/actividades/${codigoActividad}/asignaciones`, {
        method: 'POST',
        body: JSON.stringify({ nuevo_asignado: nuevoAsignado }),
      });
      exito(`Actividad reasignada a ${nuevoAsignado}.`);
      setNuevoAsignado('');
      await cargarDetalle();
      onActualizado();
    } catch (err: any) {
      notifyError(err.message || 'Error al reasignar actividad');
    } finally {
      setGuardandoAsignacion(false);
    }
  };

  const handleAgregarSeguimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoComentario.trim()) return;
    try {
      setGuardandoComentario(true);
      await apiRequest(`/actividades/${codigoActividad}/seguimiento`, {
        method: 'POST',
        body: JSON.stringify({ comentario: nuevoComentario.trim() }),
      });
      exito('Seguimiento registrado exitosamente.');
      setNuevoComentario('');
      await cargarDetalle();
    } catch (err: any) {
      notifyError(err.message || 'Error al registrar seguimiento');
    } finally {
      setGuardandoComentario(false);
    }
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim()) {
      notifyError('El título de la actividad es obligatorio.');
      return;
    }
    try {
      setGuardandoEdicion(true);
      await apiRequest(`/actividades/${codigoActividad}`, {
        method: 'PUT',
        body: JSON.stringify({
          titulo: formTitulo.trim(),
          descripcion: formDescripcion.trim() || null,
          sprint: formSprint.trim() || null,
          q_trabajo: formQTrabajo.trim() || null,
          orden_cambio: formOrdenCambio.trim() || null,
          srt_rational: formSrtRational.trim() || null,
          solicitado_por: formSolicitadoPor.trim() || null,
          areas_afectadas: formAreasAfectadas.trim() || null,
          impedimentos: formImpedimentos.trim() || null,
        }),
      });
      exito('Actividad actualizada exitosamente.');
      setModoEdicion(false);
      await cargarDetalle();
      onActualizado();
    } catch (err: any) {
      notifyError(err.message || 'Error al actualizar la actividad');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const [mostrarConfirmacionEliminar, setMostrarConfirmacionEliminar] = useState(false);
  const [eliminandoActividad, setEliminandoActividad] = useState(false);

  const handleEliminarActividad = () => {
    if (!actividad) return;
    setMostrarConfirmacionEliminar(true);
  };

  const confirmarEliminarActividad = async () => {
    if (!actividad) return;
    try {
      setEliminandoActividad(true);
      await apiRequest(`/actividades/${actividad.codigo_actividad}`, { method: 'DELETE' });
      exito(`Actividad ${actividad.codigo_actividad} eliminada definitivamente.`);
      setMostrarConfirmacionEliminar(false);
      onActualizado();
      onCerrar();
    } catch (err: any) {
      notifyError(err.message || 'Error al eliminar actividad');
    } finally {
      setEliminandoActividad(false);
    }
  };


  if (cargando || !actividad) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ padding: '40px', textAlign: 'center' }}>
          <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 16px', color: 'var(--color-primario)' }} />
          <div>Cargando detalle de la actividad...</div>
        </div>
      </div>
    );
  }

  const puedeReasignar = usuario?.perfil === 'ADMIN' || usuario?.perfil === 'SWE';
  const puedeEliminar = usuario?.perfil === 'ADMIN' || usuario?.perfil === 'SWE';

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '780px', maxHeight: '88vh' }}>
        
        {/* Cabecera */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--color-borde)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--color-superficie-hover)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={`badge-estado badge-${actividad.estado}`}>
              {actividad.estado}
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primario)' }}>
              {actividad.codigo_actividad}
            </span>
            <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--color-borde)', color: 'var(--color-texto-secundario)' }}>
              {actividad.tipo_actividad}
            </span>
          </div>

          <button type="button" onClick={onCerrar} className="btn-cerrar-modal" title="Cerrar ventana">
            <X size={20} />
          </button>
        </div>

        {/* Título de la actividad */}
        <div style={{ padding: '16px 24px 0' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-texto-principal)', marginBottom: '8px' }}>
            {actividad.titulo}
          </h2>
          <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--color-texto-secundario)', flexWrap: 'wrap' }}>
            <span>Proyecto: <strong style={{ color: 'var(--color-primario)' }}>{actividad.nombre_proyecto || 'Sin proyecto'}</strong></span>
            <span>Grupo: <strong>{actividad.nombre_grupo || actividad.codigo_grupo || 'Sin grupo'}</strong></span>
            <span>Asignado: <strong>{actividad.nombre_asignado ? `${actividad.nombre_asignado} (${actividad.asignado_registro})` : 'Sin asignar'}</strong></span>
            <span>SWE: <strong>{actividad.nombre_swe ? `${actividad.nombre_swe} (${actividad.swe_encargado})` : actividad.swe_encargado}</strong></span>
          </div>
        </div>

        {/* Tabs de Navegación */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--color-borde)',
          padding: '12px 24px 0',
          gap: '8px',
        }}>
          <button
            onClick={() => setTabActiva('info')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderBottom: tabActiva === 'info' ? '2px solid var(--color-primario)' : '2px solid transparent',
              color: tabActiva === 'info' ? 'var(--color-primario)' : 'var(--color-texto-secundario)',
              fontWeight: tabActiva === 'info' ? 600 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            <Info size={16} />
            Información General
          </button>

          <button
            onClick={() => setTabActiva('asignaciones')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderBottom: tabActiva === 'asignaciones' ? '2px solid var(--color-primario)' : '2px solid transparent',
              color: tabActiva === 'asignaciones' ? 'var(--color-primario)' : 'var(--color-texto-secundario)',
              fontWeight: tabActiva === 'asignaciones' ? 600 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            <UserCheck size={16} />
            Asignaciones ({actividad.historial_asignaciones.length})
          </button>

          <button
            onClick={() => setTabActiva('seguimiento')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderBottom: tabActiva === 'seguimiento' ? '2px solid var(--color-primario)' : '2px solid transparent',
              color: tabActiva === 'seguimiento' ? 'var(--color-primario)' : 'var(--color-texto-secundario)',
              fontWeight: tabActiva === 'seguimiento' ? 600 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            <MessageSquare size={16} />
            Seguimiento ({actividad.seguimientos.length})
          </button>
        </div>

        {/* Contenido de la Tab Activa */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          
          {/* TAB 1: INFORMACIÓN */}
          {tabActiva === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Botón directo de cambiar estado */}
              <div style={{
                backgroundColor: 'var(--color-fondo)',
                padding: '12px 16px',
                borderRadius: 'var(--radio-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid var(--color-borde)',
              }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-texto-terciario)' }}>Estado actual:</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{actividad.estado}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {actividad.estado === 'Finalizado' ? (
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radio-sm)',
                      backgroundColor: 'var(--color-estado-finalizado-fondo, #F1F5F9)',
                      border: '1px solid var(--color-estado-finalizado-borde, #CBD5E1)',
                      color: 'var(--color-estado-finalizado-texto, #334155)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}>
                      Actividad Finalizada (Bloqueada)
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-primario btn-sm"
                        onClick={onAbrirCambioEstado}
                      >
                        Cambiar Estado...
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${modoEdicion ? 'btn-secundario' : 'btn-primario'}`}
                        onClick={() => {
                          if (!modoEdicion) {
                            sincronizarFormularioEdicion(actividad);
                          }
                          setModoEdicion(!modoEdicion);
                        }}
                      >
                        <Edit2 size={14} style={{ marginRight: '4px' }} />
                        {modoEdicion ? 'Cancelar' : 'Editar Actividad'}
                      </button>
                    </>
                  )}
                  {puedeEliminar && (
                    <button
                      type="button"
                      className="btn btn-peligro btn-sm"
                      onClick={handleEliminarActividad}
                      title="Eliminar actividad definitivamente"
                    >
                      <Trash2 size={14} style={{ marginRight: '4px' }} />
                      Eliminar Actividad
                    </button>
                  )}
                </div>
              </div>

              {modoEdicion ? (
                /* FORMULARIO EDITAR ACTIVIDAD */
                <form onSubmit={handleGuardarEdicion} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  backgroundColor: 'var(--color-superficie)',
                  padding: '16px',
                  borderRadius: 'var(--radio-md)',
                  border: '1px solid var(--color-borde)'
                }}>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radio-md)',
                    backgroundColor: 'var(--color-primario-suave, #EFF6FF)',
                    border: '1px solid var(--color-primario, #2563EB)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primario)' }}>
                      Edición de Actividad: {actividad.codigo_actividad}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secundario btn-sm"
                      onClick={() => setModoEdicion(false)}
                    >
                      Cancelar
                    </button>
                  </div>

                  {/* Título */}
                  <div>
                    <label className="form-label">Título de la Actividad (*)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formTitulo}
                      onChange={e => setFormTitulo(e.target.value)}
                      required
                    />
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="form-label">Descripción</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      value={formDescripcion}
                      onChange={e => setFormDescripcion(e.target.value)}
                    />
                  </div>

                  {/* Impedimentos */}
                  <div>
                    <label className="form-label" style={{ color: '#DC2626' }}>
                      <AlertTriangle size={14} style={{ display: 'inline', marginRight: '4px' }} />
                      Impedimentos Reportados
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Dejar vacío si no existen impedimentos..."
                      value={formImpedimentos}
                      onChange={e => setFormImpedimentos(e.target.value)}
                    />
                  </div>

                  {/* Metadatos editables */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <label className="form-label">Sprint</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej: 1"
                        value={formSprint}
                        onChange={e => setFormSprint(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="form-label">Q de Trabajo</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej: 1"
                        value={formQTrabajo}
                        onChange={e => setFormQTrabajo(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="form-label">Orden de Cambio (OC)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej: OC-4412"
                        value={formOrdenCambio}
                        onChange={e => setFormOrdenCambio(e.target.value)}
                      />
                    </div>

                    {/* SRT Rational con botón e icono */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label className="form-label" style={{ margin: 0 }}>SRT Rational</label>
                        {formSrtRational.trim() && (
                          <button
                            type="button"
                            onClick={() => setSrtParaEditarPase(formSrtRational.trim())}
                            title={`Editar Pase: ${formSrtRational.trim()}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'var(--color-primario-suave, #EFF6FF)',
                              color: 'var(--color-primario, #2563EB)',
                              border: '1px solid var(--color-primario, #2563EB)',
                              borderRadius: 'var(--radio-sm, 4px)',
                              padding: '2px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <Rocket size={12} />
                            <span>Editar Pase</span>
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Ej: SRT_2026-16777"
                          value={formSrtRational}
                          onChange={e => setFormSrtRational(e.target.value)}
                        />
                        {formSrtRational.trim() && (
                          <button
                            type="button"
                            onClick={() => setSrtParaEditarPase(formSrtRational.trim())}
                            title={`Abrir ventana Editar Pase: ${formSrtRational.trim()}`}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 'var(--radio-md)',
                              backgroundColor: 'var(--color-primario, #2563EB)',
                              color: '#FFF',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <Rocket size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="form-label">Solicitado por</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej: Jefatura de Canales"
                        value={formSolicitadoPor}
                        onChange={e => setFormSolicitadoPor(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="form-label">Áreas Afectadas</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej: Canales, Middleware"
                        value={formAreasAfectadas}
                        onChange={e => setFormAreasAfectadas(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secundario"
                      onClick={() => setModoEdicion(false)}
                      disabled={guardandoEdicion}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primario"
                      disabled={guardandoEdicion}
                    >
                      {guardandoEdicion ? 'Guardando...' : 'Guardar Cambios de Actividad'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Descripción */}
                  <div>
                    <label className="form-label">Descripción</label>
                    <div style={{
                      padding: '12px',
                      borderRadius: 'var(--radio-md)',
                      backgroundColor: 'var(--color-fondo)',
                      border: '1px solid var(--color-borde)',
                      fontSize: '0.875rem',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                    }}>
                      {actividad.descripcion || 'Sin descripción registrada.'}
                    </div>
                  </div>

                  {/* Impedimentos */}
                  {actividad.impedimentos && (
                    <div>
                      <label className="form-label" style={{ color: '#DC2626' }}>
                        <AlertTriangle size={14} style={{ display: 'inline', marginRight: '4px' }} />
                        Impedimentos Reportados
                      </label>
                      <div style={{
                        padding: '12px',
                        borderRadius: 'var(--radio-md)',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FECACA',
                        color: '#991B1B',
                        fontSize: '0.875rem',
                      }}>
                        {actividad.impedimentos}
                      </div>
                    </div>
                  )}

                  {/* Cuadrícula de metadatos */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div style={{ padding: '10px', backgroundColor: 'var(--color-fondo)', borderRadius: 'var(--radio-sm)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>Sprint</div>
                      <div style={{ fontWeight: 600 }}>Sprint {actividad.sprint || '-'}</div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: 'var(--color-fondo)', borderRadius: 'var(--radio-sm)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>Q de Trabajo</div>
                      <div style={{ fontWeight: 600 }}>Q{actividad.q_trabajo || '-'}</div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: 'var(--color-fondo)', borderRadius: 'var(--radio-sm)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>Orden de Cambio (OC)</div>
                      <div style={{ fontWeight: 600 }}>{actividad.orden_cambio || 'N/A'}</div>
                    </div>

                    {/* SRT Rational con Icono al lado */}
                    <div style={{ padding: '10px', backgroundColor: 'var(--color-fondo)', borderRadius: 'var(--radio-sm)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>SRT Rational</span>
                        {actividad.srt_rational && actividad.srt_rational.trim() && (
                          <button
                            type="button"
                            onClick={() => setSrtParaEditarPase(actividad.srt_rational!.trim())}
                            className="btn-icono-srt"
                            title={`Editar Pase: ${actividad.srt_rational.trim()}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'var(--color-primario-suave, #EFF6FF)',
                              color: 'var(--color-primario, #2563EB)',
                              border: '1px solid var(--color-primario, #2563EB)',
                              borderRadius: 'var(--radio-sm, 4px)',
                              padding: '2px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Rocket size={12} />
                            <span>Editar Pase</span>
                          </button>
                        )}
                      </div>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span>{actividad.srt_rational || 'N/A'}</span>
                        {actividad.srt_rational && actividad.srt_rational.trim() && (
                          <button
                            type="button"
                            onClick={() => setSrtParaEditarPase(actividad.srt_rational!.trim())}
                            title={`Abrir ventana Editar Pase: ${actividad.srt_rational.trim()}`}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: '2px',
                              color: 'var(--color-primario, #2563EB)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                          >
                            <Rocket size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ padding: '10px', backgroundColor: 'var(--color-fondo)', borderRadius: 'var(--radio-sm)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>Solicitado por</div>
                      <div style={{ fontWeight: 600 }}>{actividad.solicitado_por || 'N/A'}</div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: 'var(--color-fondo)', borderRadius: 'var(--radio-sm)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>Áreas Afectadas</div>
                      <div style={{ fontWeight: 600 }}>{actividad.areas_afectadas || 'N/A'}</div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: 'var(--color-fondo)', borderRadius: 'var(--radio-sm)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>Proyecto</div>
                      <div style={{ fontWeight: 600, color: actividad.nombre_proyecto ? 'var(--color-primario)' : 'inherit' }}>
                        {actividad.nombre_proyecto || 'N/A'}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Historial de cambios de estado */}
              <div>
                <label className="form-label">Historial de Estados y Motivos</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {actividad.historial_estados.map(h => (
                    <div key={h.estado_det_id} style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radio-md)',
                      border: '1px solid var(--color-borde)',
                      backgroundColor: 'var(--color-superficie)',
                      fontSize: '0.85rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span className={`badge-estado badge-${h.estado}`}>
                          {h.estado}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>
                          {new Date(h.fecha_cambio_estado).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ color: 'var(--color-texto-principal)', marginTop: '4px' }}>
                        "{h.motivo}"
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)', marginTop: '2px' }}>
                        Registrado por: <strong>{h.nombres_cambio || h.registro_cambio}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: ASIGNACIONES */}
          {tabActiva === 'asignaciones' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Formulario para reasignar si tiene permisos */}
              {puedeReasignar && miembrosGrupo.length > 0 && (
                <form onSubmit={handleReasignar} style={{
                  padding: '16px',
                  backgroundColor: 'var(--color-fondo)',
                  borderRadius: 'var(--radio-md)',
                  border: '1px solid var(--color-borde)',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-end',
                }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Reasignar a Miembro del Grupo {actividad.codigo_grupo}</label>
                    <select
                      className="form-select"
                      value={nuevoAsignado}
                      onChange={e => setNuevoAsignado(e.target.value)}
                      required
                    >
                      <option value="">-- Seleccionar nuevo responsable --</option>
                      {miembrosGrupo.map(m => (
                        <option key={m.registro} value={m.registro}>
                          {m.nombres || m.registro} ({m.registro}) - {m.perfil}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primario"
                    disabled={guardandoAsignacion || !nuevoAsignado}
                  >
                    {guardandoAsignacion ? 'Asignando...' : 'Asignar'}
                  </button>
                </form>
              )}

              {/* Tabla de Historial de Asignaciones */}
              <div>
                <label className="form-label">Historial de Asignaciones (ASIGNADO_DET_REGISTRO)</label>
                <div style={{ border: '1px solid var(--color-borde)', borderRadius: 'var(--radio-md)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead style={{ backgroundColor: 'var(--color-superficie-hover)', borderBottom: '1px solid var(--color-borde)' }}>
                      <tr>
                        <th style={{ padding: '10px 14px', textAlign: 'left' }}>Asignado</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left' }}>Registro</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left' }}>Estado</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left' }}>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actividad.historial_asignaciones.map((a, idx) => (
                        <tr key={a.asignado_id} style={{
                          borderBottom: idx < actividad.historial_asignaciones.length - 1 ? '1px solid var(--color-borde)' : 'none',
                          backgroundColor: a.estado === 'ACTIVO' ? 'var(--color-primario-suave)' : 'transparent',
                        }}>
                          <td style={{ padding: '10px 14px', fontWeight: a.estado === 'ACTIVO' ? 600 : 400 }}>
                            {a.nombres || a.asignado}
                          </td>
                          <td style={{ padding: '10px 14px' }}>{a.asignado}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: a.estado === 'ACTIVO' ? 'var(--color-primario)' : 'var(--color-borde)',
                              color: a.estado === 'ACTIVO' ? '#FFF' : 'var(--color-texto-terciario)',
                            }}>
                              {a.estado}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--color-texto-terciario)' }}>
                            {new Date(a.fecha_registro).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: SEGUIMIENTO */}
          {tabActiva === 'seguimiento' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Formulario para nuevo seguimiento */}
              <form onSubmit={handleAgregarSeguimiento} style={{
                padding: '16px',
                backgroundColor: 'var(--color-fondo)',
                borderRadius: 'var(--radio-md)',
                border: '1px solid var(--color-borde)',
              }}>
                <label className="form-label">Registrar Nuevo Seguimiento / Comentario *</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Escribe una actualización técnica, bloqueo o avance de esta actividad..."
                  value={nuevoComentario}
                  onChange={e => setNuevoComentario(e.target.value)}
                  required
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button
                    type="submit"
                    className="btn btn-primario btn-sm"
                    disabled={guardandoComentario || !nuevoComentario.trim()}
                  >
                    {guardandoComentario ? 'Guardando...' : 'Publicar Seguimiento'}
                  </button>
                </div>
              </form>

              {/* Lista cronológica descendente de comentarios */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {actividad.seguimientos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-texto-terciario)' }}>
                    No hay seguimientos registrados aún para esta actividad.
                  </div>
                ) : (
                  actividad.seguimientos.map(s => (
                    <div key={s.seguimiento_id} style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radio-md)',
                      backgroundColor: 'var(--color-superficie)',
                      border: '1px solid var(--color-borde)',
                      boxShadow: 'var(--sombra-sm)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-primario)' }}>
                          {s.nombres_usuario || s.registro} ({s.registro})
                        </span>
                        <span style={{ color: 'var(--color-texto-terciario)' }}>
                          {new Date(s.fecha_registro).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.875rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', color: 'var(--color-texto-principal)' }}>
                        {s.comentario}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Modal Elegante de Confirmación de Eliminación */}
      <ModalConfirmacionEliminar
        abierto={mostrarConfirmacionEliminar}
        titulo="Eliminar Actividad"
        mensaje={`¿Está seguro de eliminar definitivamente la actividad "${actividad.codigo_actividad}"?`}
        detalle={
          <div>
            <strong>Código:</strong> {actividad.codigo_actividad} | <strong>Tipo:</strong> {actividad.tipo_actividad}
            <br />
            <strong>Título:</strong> {actividad.titulo}
            <br />
            <strong>Estado actual:</strong> {actividad.estado} | <strong>Asignado:</strong> {actividad.nombre_asignado || actividad.asignado_registro || 'Sin asignar'}
          </div>
        }
        cargando={eliminandoActividad}
        onConfirmar={confirmarEliminarActividad}
        onCerrar={() => setMostrarConfirmacionEliminar(false)}
      />

      {/* Modal Editar Pase vinculado a la Actividad según SRT Rational */}
      {srtParaEditarPase && (
        <ModalEditarPase
          abierto={!!srtParaEditarPase}
          codigoSrt={srtParaEditarPase}
          actividadEstado={actividad.estado}
          onCerrar={() => setSrtParaEditarPase(null)}
          onPaseActualizado={() => {
            cargarDetalle();
            onActualizado();
          }}
        />
      )}
    </div>
  );
};
