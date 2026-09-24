import React, { useState } from 'react';
import { X, ArrowRight, AlertCircle } from 'lucide-react';
import { Actividad, EstadoActividad } from '../../types';
import { apiRequest } from '../../lib/api';
import { useNotificacion } from '../../context/NotificacionContext';

interface ModalCambioEstadoProps {
  actividad: Actividad;
  onCerrar: () => void;
  onEstadoCambiado: () => void;
}

const ESTADOS_DISPONIBLES: { id: EstadoActividad; label: string }[] = [
  { id: 'registrado', label: 'Registrado' },
  { id: 'desarrollo', label: 'En Desarrollo' },
  { id: 'certificacion', label: 'En Certificación' },
  { id: 'Finalizado', label: 'Finalizado' },
  { id: 'GESTION_PRD', label: 'Gestión PRD' },
  { id: 'EN_PRD', label: 'En Producción (PRD)' },
  { id: 'impedimento', label: 'Impedimento' },
];

export const ModalCambioEstado: React.FC<ModalCambioEstadoProps> = ({
  actividad,
  onCerrar,
  onEstadoCambiado,
}) => {
  const [nuevoEstado, setNuevoEstado] = useState<EstadoActividad>(actividad.estado);
  const [motivo, setMotivo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { exito, error: notifyError } = useNotificacion();

  if (actividad.estado === 'Finalizado') {
    return (
      <div className="modal-backdrop">
        <div className="modal-contenido" style={{ maxWidth: '440px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Actividad Finalizada</h3>
            <button type="button" onClick={onCerrar} className="btn-icono"><X size={18} /></button>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#FEF2F2', borderRadius: 'var(--radio-md)', border: '1px solid #FECACA', color: '#991B1B', fontSize: '0.875rem', lineHeight: '1.5' }}>
            Esta actividad ya se encuentra en estado <strong>Finalizado</strong>. Por regla de negocio, una actividad finalizada no puede cambiar de estado.
          </div>
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secundario" onClick={onCerrar}>Cerrar</button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) {
      setError('El motivo del cambio de estado es estrictamente obligatorio.');
      return;
    }
    if (nuevoEstado === actividad.estado) {
      setError('Debes seleccionar un estado diferente al actual.');
      return;
    }

    try {
      setCargando(true);
      setError(null);
      await apiRequest(`/actividades/${actividad.codigo_actividad}/estado`, {
        method: 'POST',
        body: JSON.stringify({
          nuevo_estado: nuevoEstado,
          motivo: motivo.trim(),
        }),
      });
      exito(`Estado de ${actividad.codigo_actividad} actualizado a "${nuevoEstado}".`);
      onEstadoCambiado();
      onCerrar();
    } catch (err: any) {
      const msg = err.message || 'Error al cambiar estado';
      setError(msg);
      notifyError(msg);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        {/* Cabecera del modal */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-borde)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-texto-principal)' }}>
              Cambiar Estado de Actividad
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-texto-terciario)' }}>
              {actividad.codigo_actividad} - {actividad.titulo}
            </span>
          </div>
          <button type="button" onClick={onCerrar} className="btn-cerrar-modal" title="Cerrar ventana">
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {error && (
            <div style={{
              backgroundColor: '#FEE2E2',
              border: '1px solid #FCA5A5',
              color: '#991B1B',
              padding: '10px 14px',
              borderRadius: 'var(--radio-md)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Transición visual de estado actual a nuevo */}
          <div style={{
            backgroundColor: 'var(--color-fondo)',
            border: '1px solid var(--color-borde)',
            borderRadius: 'var(--radio-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)', marginBottom: '4px' }}>
                Estado Actual
              </div>
              <span className={`badge-estado badge-${actividad.estado}`}>
                {actividad.estado}
              </span>
            </div>

            <ArrowRight size={20} color="var(--color-texto-terciario)" />

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)', marginBottom: '4px' }}>
                Nuevo Estado
              </div>
              <span className={`badge-estado badge-${nuevoEstado}`}>
                {nuevoEstado}
              </span>
            </div>
          </div>

          {/* Selector de nuevo estado */}
          <div>
            <label className="form-label">Seleccionar Nuevo Estado *</label>
            <select
              className="form-select"
              value={nuevoEstado}
              onChange={e => setNuevoEstado(e.target.value as EstadoActividad)}
            >
              {ESTADOS_DISPONIBLES.map(est => (
                <option key={est.id} value={est.id}>
                  {est.label} {est.id === actividad.estado ? '(Actual)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Motivo obligatorio */}
          <div>
            <label className="form-label">Motivo del Cambio de Estado (Obligatorio) *</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Describa el motivo, justificación o avance para realizar este cambio de estado..."
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)', marginTop: '4px', display: 'block' }}>
              * Se guardará un registro inmutable en el historial y en la auditoría del sistema.
            </span>
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-borde)' }}>
            <button
              type="button"
              className="btn btn-secundario"
              onClick={onCerrar}
              disabled={cargando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primario"
              disabled={cargando || !motivo.trim() || nuevoEstado === actividad.estado}
            >
              {cargando ? 'Registrando...' : 'Confirmar Cambio de Estado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
