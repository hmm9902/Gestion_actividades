import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import { Grupo, MiembroGrupo, TipoActividad, Proyecto } from '../../types';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotificacion } from '../../context/NotificacionContext';

interface ModalNuevaActividadProps {
  grupoPreseleccionado?: string;
  onCerrar: () => void;
  onCreado: () => void;
}

export const ModalNuevaActividad: React.FC<ModalNuevaActividadProps> = ({
  grupoPreseleccionado,
  onCerrar,
  onCreado,
}) => {
  const { usuario } = useAuth();
  const { exito, error: notifyError } = useNotificacion();

  const [codigo, setCodigo] = useState('');
  const [tipo, setTipo] = useState<TipoActividad>('Tarea');
  const [titulo, setTitulo] = useState('');
  const [nombreProyecto, setNombreProyecto] = useState('');
  const [solicitadoPor, setSolicitadoPor] = useState('');
  const [srtRational, setSrtRational] = useState('');
  const [ordenCambio, setOrdenCambio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [impedimentos, setImpedimentos] = useState('');
  const [areasAfectadas, setAreasAfectadas] = useState('');
  const [sprint, setSprint] = useState('1');
  const [qTrabajo, setQTrabajo] = useState('1');
  const [codigoGrupo, setCodigoGrupo] = useState(grupoPreseleccionado || '');
  const [asignado, setAsignado] = useState('');
  const [sweEncargado, setSweEncargado] = useState(usuario?.registro || '');

  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [miembros, setMiembros] = useState<MiembroGrupo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar grupos disponibles
  useEffect(() => {
    const cargarGrupos = async () => {
      try {
        const data = await apiRequest<Grupo[]>('/grupos');
        setGrupos(data);
        if (!codigoGrupo && data.length > 0) {
          setCodigoGrupo(data[0].codigo_grupo);
        }
      } catch (e) {
        console.error(e);
      }
    };

    const cargarProyectos = async () => {
      try {
        const pData = await apiRequest<Proyecto[]>('/proyectos');
        setProyectos(pData.filter(p => p.estado !== 'Entregado'));
      } catch (e) {
        console.error(e);
      }
    };

    cargarGrupos();
    cargarProyectos();
  }, []);

  // Cargar miembros al seleccionar grupo
  useEffect(() => {
    if (!codigoGrupo) {
      setMiembros([]);
      return;
    }
    const g = grupos.find(item => item.codigo_grupo === codigoGrupo);
    if (g) {
      setMiembros(g.miembros || []);
    }
  }, [codigoGrupo, grupos]);

  // Generador de código sugerido si está vacío
  useEffect(() => {
    if (!codigo) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      setCodigo(`ACT-${randomNum}`);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !codigo.trim()) {
      setError('El código y el título son obligatorios.');
      return;
    }

    try {
      setCargando(true);
      setError(null);

      await apiRequest('/actividades', {
        method: 'POST',
        body: JSON.stringify({
          codigo_actividad: codigo.trim().toUpperCase(),
          tipo_actividad: tipo,
          titulo: titulo.trim(),
          nombre_proyecto: nombreProyecto.trim() || null,
          solicitado_por: solicitadoPor.trim() || null,
          srt_rational: srtRational.trim() || null,
          orden_cambio: ordenCambio.trim() || null,
          descripcion: descripcion.trim() || null,
          impedimentos: impedimentos.trim() || null,
          areas_afectadas: areasAfectadas.trim() || null,
          sprint,
          q_trabajo: qTrabajo,
          codigo_grupo: codigoGrupo || null,
          asignado_registro: asignado || null,
          swe_encargado: sweEncargado || usuario?.registro,
        }),
      });

      exito(`Actividad ${codigo} creada exitosamente.`);
      onCreado();
      onCerrar();
    } catch (err: any) {
      const msg = err.message || 'Error al crear la actividad';
      setError(msg);
      notifyError(msg);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px' }}>

        {/* Cabecera */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-borde)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-texto-principal)' }}>
            Nueva Actividad
          </h3>
          <button type="button" onClick={onCerrar} className="btn-cerrar-modal" title="Cerrar ventana">
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label className="form-label">Código de Actividad *</label>
              <input
                type="text"
                className="form-input"
                placeholder="ACT-1001"
                value={codigo}
                onChange={e => setCodigo(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div>
              <label className="form-label">Tipo de Actividad *</label>
              <select
                className="form-select"
                value={tipo}
                onChange={e => setTipo(e.target.value as TipoActividad)}
                required
              >
                <option value="Tarea">Tarea</option>
                <option value="Deuda Tecnica">Deuda Tecnica</option>
                <option value="HU_Negocio">HU_Negocio</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '14px' }}>
            <div>
              <label className="form-label">Título de la Actividad *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Implementar endpoint de consulta de estado..."
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label">Nombre_proyecto</label>
              <select
                className="form-select"
                value={nombreProyecto}
                onChange={e => setNombreProyecto(e.target.value)}
              >
                <option value="">-- Sin Proyecto --</option>
                {proyectos.map(p => (
                  <option key={p.proyecto_id} value={p.nombre_proyecto}>
                    {p.nombre_proyecto}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label className="form-label">Grupo</label>
              <select
                className="form-select"
                value={codigoGrupo}
                onChange={e => setCodigoGrupo(e.target.value)}
              >
                <option value="">-- Sin Grupo --</option>
                {grupos.map(g => (
                  <option key={g.codigo_grupo} value={g.codigo_grupo}>
                    {g.nombre_grupo} ({g.codigo_grupo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Asignado (Miembro del Grupo)</label>
              <select
                className="form-select"
                value={asignado}
                onChange={e => setAsignado(e.target.value)}
              >
                <option value="">-- Sin Asignar --</option>
                {miembros.map(m => (
                  <option key={m.registro} value={m.registro}>
                    {m.nombres || m.registro} ({m.registro}) - {m.perfil}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label className="form-label">Sprint</label>
              <select className="form-select" value={sprint} onChange={e => setSprint(e.target.value)}>
                <option value="1">Sprint 1</option>
                <option value="2">Sprint 2</option>
                <option value="3">Sprint 3</option>
                <option value="4">Sprint 4</option>
                <option value="5">Sprint 5</option>
                <option value="6">Sprint 6</option>
              </select>
            </div>

            <div>
              <label className="form-label">Q de Trabajo</label>
              <select className="form-select" value={qTrabajo} onChange={e => setQTrabajo(e.target.value)}>
                <option value="1">Q1</option>
                <option value="2">Q2</option>
                <option value="3">Q3</option>
                <option value="4">Q4</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label className="form-label">Orden de Cambio (OC)</label>
              <input
                type="text"
                className="form-input"
                placeholder="OC-4412"
                value={ordenCambio}
                onChange={e => setOrdenCambio(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">SRT Rational</label>
              <input
                type="text"
                className="form-input"
                placeholder="SRT-8821"
                value={srtRational}
                onChange={e => setSrtRational(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Descripción</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Detalles funcionales y técnicos de la actividad..."
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Impedimentos Iniciales (Opcional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Dejar vacío si no existen impedimentos..."
              value={impedimentos}
              onChange={e => setImpedimentos(e.target.value)}
            />
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-borde)' }}>
            <button type="button" className="btn btn-secundario" onClick={onCerrar} disabled={cargando}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primario" disabled={cargando}>
              {cargando ? 'Creando...' : 'Crear Actividad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
