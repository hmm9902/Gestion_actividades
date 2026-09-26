import React, { useState, useEffect } from 'react';
import { Users2, Plus, AlertCircle, ShieldAlert, Check, UserPlus, Trash2, Edit2, UserCheck, X, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Grupo, RegistroColaborador } from '../types';
import { apiRequest } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useNotificacion } from '../context/NotificacionContext';
import { ModalConfirmacionEliminar } from '../components/common/ModalConfirmacionEliminar';

export const GruposPage: React.FC = () => {
  const { usuario } = useAuth();
  const { exito, error: notifyError } = useNotificacion();

  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [registros, setRegistros] = useState<RegistroColaborador[]>([]);
  const [cargando, setCargando] = useState(true);

  // Paginación 10 en 10
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 10;

  // Modal Crear Grupo
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [codigoGrupo, setCodigoGrupo] = useState('');
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [registroPrincipal, setRegistroPrincipal] = useState('');
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  // Modal Editar Grupo (Modificar Código, Título y Líder)
  const [grupoParaEditar, setGrupoParaEditar] = useState<Grupo | null>(null);
  const [nuevoCodigoGrupo, setNuevoCodigoGrupo] = useState('');
  const [nuevoNombreGrupo, setNuevoNombreGrupo] = useState('');
  const [nuevoRegistroPrincipal, setNuevoRegistroPrincipal] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEditar, setErrorEditar] = useState<string | null>(null);

  // Modal Confirmación Cambiar Líder Directo
  const [confirmacionCambiarLider, setConfirmacionCambiarLider] = useState<{
    codigoGrupo: string;
    nuevoLiderRegistro: string;
    nuevoLiderNombre: string;
    liderAnteriorNombre: string;
  } | null>(null);
  const [cambiandoLider, setCambiandoLider] = useState(false);

  // Modal Miembros
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<Grupo | null>(null);
  const [miembroParaAgregar, setMiembroParaAgregar] = useState('');

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [gData, rData] = await Promise.all([
        apiRequest<Grupo[]>('/grupos'),
        apiRequest<RegistroColaborador[]>('/registros?estado=ACTIVO'),
      ]);
      setGrupos(gData);
      setRegistros(rData);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const soloSWEs = registros.filter(r => r.perfil === 'SWE');
  const puedeEditar = usuario?.perfil === 'ADMIN' || usuario?.perfil === 'SWE';

  const handleCrearGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoGrupo.trim() || !nombreGrupo.trim() || !registroPrincipal) {
      setErrorCrear('Todos los campos son obligatorios.');
      return;
    }

    try {
      setErrorCrear(null);
      await apiRequest('/grupos', {
        method: 'POST',
        body: JSON.stringify({
          codigo_grupo: codigoGrupo.trim().toUpperCase(),
          nombre_grupo: nombreGrupo.trim(),
          registro_principal: registroPrincipal,
        }),
      });
      exito(`Grupo ${codigoGrupo} creado exitosamente.`);
      setMostrarModalCrear(false);
      setCodigoGrupo('');
      setNombreGrupo('');
      setRegistroPrincipal('');
      cargarDatos();
    } catch (err: any) {
      setErrorCrear(err.message || 'Error al crear el grupo');
      notifyError(err.message || 'Error al crear el grupo');
    }
  };

  const abrirModalEditar = (g: Grupo) => {
    setGrupoParaEditar(g);
    setNuevoCodigoGrupo(g.codigo_grupo);
    setNuevoNombreGrupo(g.nombre_grupo);
    setNuevoRegistroPrincipal(g.registro_principal);
    setErrorEditar(null);
  };

  const handleActualizarGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grupoParaEditar) return;
    const codNormalizado = nuevoCodigoGrupo.trim().toUpperCase();
    if (!codNormalizado) {
      setErrorEditar('El código del grupo es obligatorio.');
      return;
    }
    if (!nuevoNombreGrupo.trim()) {
      setErrorEditar('El título o nombre del grupo es obligatorio.');
      return;
    }
    if (!nuevoRegistroPrincipal) {
      setErrorEditar('Debe seleccionar un Líder Principal (SWE) obligatorio.');
      return;
    }

    try {
      setGuardandoEdicion(true);
      setErrorEditar(null);
      await apiRequest(`/grupos/${grupoParaEditar.codigo_grupo}`, {
        method: 'PUT',
        body: JSON.stringify({
          codigo_grupo: codNormalizado,
          nombre_grupo: nuevoNombreGrupo.trim(),
          registro_principal: nuevoRegistroPrincipal,
        }),
      });
      const cambioCodigo = codNormalizado !== grupoParaEditar.codigo_grupo;
      const cambioLider = nuevoRegistroPrincipal !== grupoParaEditar.registro_principal;
      exito(`Grupo "${codNormalizado}" actualizado exitosamente${cambioCodigo ? ' (código modificado)' : ''}${cambioLider ? ' (nuevo líder único asignado)' : ''}.`);
      setGrupoParaEditar(null);
      cargarDatos();
    } catch (err: any) {
      setErrorEditar(err.message || 'Error al actualizar el grupo');
      notifyError(err.message || 'Error al actualizar el grupo');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const ejecutarCambioLider = async () => {
    if (!confirmacionCambiarLider) return;
    try {
      setCambiandoLider(true);
      const grupoActualizado = await apiRequest<Grupo>(`/grupos/${confirmacionCambiarLider.codigoGrupo}`, {
        method: 'PUT',
        body: JSON.stringify({
          registro_principal: confirmacionCambiarLider.nuevoLiderRegistro,
        }),
      });
      exito(`Líder del grupo ${confirmacionCambiarLider.codigoGrupo} cambiado a "${confirmacionCambiarLider.nuevoLiderNombre}". Solo hay 1 líder activo en el grupo.`);
      setConfirmacionCambiarLider(null);
      setGrupoSeleccionado(grupoActualizado);
      cargarDatos();
    } catch (err: any) {
      notifyError(err.message || 'Error al cambiar líder de grupo');
    } finally {
      setCambiandoLider(false);
    }
  };

  // Estado para modal elegante de confirmación de eliminación (grupo o miembro)
  const [confirmacionEliminar, setConfirmacionEliminar] = useState<{
    tipo: 'grupo' | 'miembro';
    grupo?: Grupo;
    registroMiembro?: string;
    nombreMiembro?: string;
  } | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const handleInactivarGrupo = async (g: Grupo) => {
    const nuevoEstado = g.estado_grupo === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    try {
      await apiRequest(`/grupos/${g.codigo_grupo}`, {
        method: 'PUT',
        body: JSON.stringify({ estado_grupo: nuevoEstado }),
      });
      exito(`Grupo ${g.codigo_grupo} actualizado a ${nuevoEstado}.`);
      cargarDatos();
    } catch (err: any) {
      notifyError(err.message || 'Error al cambiar estado del grupo');
    }
  };

  const handleEliminarGrupo = (g: Grupo) => {
    if (!puedeEditar) return;
    setConfirmacionEliminar({ tipo: 'grupo', grupo: g });
  };

  const ejecutarConfirmacionEliminar = async () => {
    if (!confirmacionEliminar) return;

    try {
      setEliminando(true);
      if (confirmacionEliminar.tipo === 'grupo' && confirmacionEliminar.grupo) {
        await apiRequest(`/grupos/${confirmacionEliminar.grupo.codigo_grupo}`, { method: 'DELETE' });
        exito(`Grupo ${confirmacionEliminar.grupo.codigo_grupo} eliminado definitivamente.`);
        setConfirmacionEliminar(null);
        cargarDatos();
      } else if (confirmacionEliminar.tipo === 'miembro' && grupoSeleccionado && confirmacionEliminar.registroMiembro) {
        const gActualizado = await apiRequest(`/grupos/${grupoSeleccionado.codigo_grupo}/miembros/${confirmacionEliminar.registroMiembro}`, {
          method: 'DELETE',
        });
        exito(`Miembro ${confirmacionEliminar.registroMiembro} removido del grupo.`);
        setConfirmacionEliminar(null);
        setGrupoSeleccionado(gActualizado);
        cargarDatos();
      }
    } catch (err: any) {
      notifyError(err.message || 'Error en la operación');
    } finally {
      setEliminando(false);
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(grupos.length / ITEMS_POR_PAGINA));
  const indiceInicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const gruposPaginados = grupos.slice(indiceInicio, indiceInicio + ITEMS_POR_PAGINA);

  const handleAgregarMiembro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grupoSeleccionado || !miembroParaAgregar) return;
    try {
      const gActualizado = await apiRequest(`/grupos/${grupoSeleccionado.codigo_grupo}/miembros`, {
        method: 'POST',
        body: JSON.stringify({ registro: miembroParaAgregar }),
      });
      exito(`Miembro ${miembroParaAgregar} asignado al grupo.`);
      setMiembroParaAgregar('');
      setGrupoSeleccionado(gActualizado);
      cargarDatos();
    } catch (err: any) {
      notifyError(err.message || 'Error al agregar miembro');
    }
  };

  const handleRemoverMiembro = async (registroMiembro: string) => {
    if (!grupoSeleccionado) return;
    try {
      const gActualizado = await apiRequest(`/grupos/${grupoSeleccionado.codigo_grupo}/miembros/${registroMiembro}`, {
        method: 'DELETE',
      });
      exito(`Miembro ${registroMiembro} removido del grupo.`);
      setGrupoSeleccionado(gActualizado);
      cargarDatos();
    } catch (err: any) {
      notifyError(err.message || 'Error al remover miembro');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-texto-principal)' }}>
            Asignación de Grupos
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>
            Configuración de Grupos y líderes técnicos (SWE obligatorio)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secundario"
            onClick={cargarDatos}
            disabled={cargando}
            title="Recargar grupos y asignaciones"
          >
            <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </button>

          {puedeEditar && (
            <button
              type="button"
              className="btn btn-primario"
              onClick={() => setMostrarModalCrear(true)}
            >
              <Plus size={16} />
              Nuevo Grupo
            </button>
          )}
        </div>
      </div>

      {/* Tarjetas de Grupos Paginadas de 10 en 10 */}
      {cargando ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-texto-terciario)' }}>
          Cargando grupos...
        </div>
      ) : gruposPaginados.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-texto-terciario)' }}>
          No se encontraron grupos configurados.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {gruposPaginados.map(g => (
            <div
              key={g.codigo_grupo}
              style={{
                backgroundColor: 'var(--color-superficie)',
                border: '1px solid var(--color-borde)',
                borderRadius: 'var(--radio-lg)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'var(--sombra-sm)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--color-primario)',
                        backgroundColor: 'var(--color-primario-suave)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radio-sm)',
                        cursor: puedeEditar ? 'pointer' : 'default',
                      }}
                      onClick={() => puedeEditar && abrirModalEditar(g)}
                      title={puedeEditar ? 'Clic para editar código, título o líder' : undefined}
                    >
                      {g.codigo_grupo}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                      <h3
                        style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-texto-principal)', margin: 0, cursor: puedeEditar ? 'pointer' : 'default' }}
                        onClick={() => puedeEditar && abrirModalEditar(g)}
                        title={puedeEditar ? 'Clic para modificar título' : undefined}
                      >
                        {g.nombre_grupo}
                      </h3>
                      {puedeEditar && (
                        <button
                          type="button"
                          onClick={() => abrirModalEditar(g)}
                          title="Modificar título del grupo"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '3px',
                            color: 'var(--color-texto-terciario)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            borderRadius: 'var(--radio-sm)',
                            transition: 'color 0.15s ease',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primario)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-texto-terciario)')}
                        >
                          <Edit2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radio-pildora)',
                    fontSize: '0.725rem',
                    fontWeight: 600,
                    backgroundColor: g.estado_grupo === 'ACTIVO' ? 'var(--color-primario-suave)' : 'var(--color-borde)',
                    color: g.estado_grupo === 'ACTIVO' ? 'var(--color-primario)' : 'var(--color-texto-terciario)',
                  }}>
                    {g.estado_grupo}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)', margin: '12px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                    <div>Líder Principal: <strong>{g.nombre_principal || g.registro_principal}</strong></div>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: 'var(--color-primario)',
                      backgroundColor: 'var(--color-primario-suave)',
                      padding: '1px 6px',
                      borderRadius: 'var(--radio-sm)',
                    }}>
                      Único Líder SWE
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-texto-terciario)', marginTop: '4px' }}>
                    {g.total_miembros} colaboradores asignados activamente
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '14px',
                borderTop: '1px solid var(--color-borde-suave)',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-secundario btn-sm"
                    onClick={() => setGrupoSeleccionado(g)}
                  >
                    <Users2 size={14} />
                    Miembros ({g.total_miembros})
                  </button>

                  {puedeEditar && (
                    <button
                      type="button"
                      className="btn btn-secundario btn-sm"
                      onClick={() => abrirModalEditar(g)}
                      title="Modificar código, título o cambiar líder del grupo"
                      style={{ padding: '3px 8px' }}
                    >
                      <Edit2 size={13} style={{ marginRight: '4px' }} />
                      Editar Grupo
                    </button>
                  )}
                </div>

                {puedeEditar && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleInactivarGrupo(g)}
                      style={{
                        fontSize: '0.75rem',
                        color: g.estado_grupo === 'ACTIVO' ? '#DC2626' : 'var(--color-primario)',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                      title={g.estado_grupo === 'ACTIVO' ? 'Inactivar grupo' : 'Activar grupo'}
                    >
                      {g.estado_grupo === 'ACTIVO' ? 'Inactivar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-peligro btn-sm"
                      onClick={() => handleEliminarGrupo(g)}
                      title="Eliminar grupo definitivamente"
                      style={{ padding: '3px 8px' }}
                    >
                      <Trash2 size={13} style={{ marginRight: '4px' }} />
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación de 10 en 10 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        border: '1px solid var(--color-borde)',
        borderRadius: 'var(--radio-md)',
        backgroundColor: 'var(--color-superficie)',
        fontSize: '0.85rem',
        color: 'var(--color-texto-secundario)',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <div>
          Mostrando {grupos.length === 0 ? 0 : indiceInicio + 1} a {Math.min(indiceInicio + ITEMS_POR_PAGINA, grupos.length)} de {grupos.length} grupos
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

      {/* Modal Crear Grupo */}
      {mostrarModalCrear && (
        <div className="modal-overlay" onClick={() => setMostrarModalCrear(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-borde)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700 }}>Nuevo Grupo</h3>
              <button
                type="button"
                onClick={() => setMostrarModalCrear(false)}
                className="btn-cerrar-modal"
                title="Cerrar ventana"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCrearGrupo} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {errorCrear && (
                <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px', borderRadius: 'var(--radio-md)', fontSize: '0.85rem' }}>
                  {errorCrear}
                </div>
              )}

              <div>
                <label className="form-label">Código del Grupo *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="SQUAD-ALPHA"
                  value={codigoGrupo}
                  onChange={e => setCodigoGrupo(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div>
                <label className="form-label">Nombre del Grupo *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Squad Canales Digitales"
                  value={nombreGrupo}
                  onChange={e => setNombreGrupo(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label">Registro Principal (Líder SWE Obligatorio) *</label>
                <select
                  className="form-select"
                  value={registroPrincipal}
                  onChange={e => setRegistroPrincipal(e.target.value)}
                  required
                >
                  <option value="">-- Seleccionar SWE Líder --</option>
                  {soloSWEs.map(s => (
                    <option key={s.registro} value={s.registro}>
                      {s.nombres} ({s.registro}) - {s.perfil}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.725rem', color: 'var(--color-texto-terciario)', marginTop: '4px', display: 'block' }}>
                  * Solo usuarios con perfil SWE pueden ser configurados como REGISTRO_PRINCIPAL.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px' }}>
                <button type="button" className="btn btn-secundario" onClick={() => setMostrarModalCrear(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primario">
                  Crear Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modificar Grupo (Código, Título y Líder) */}
      {grupoParaEditar && (
        <div className="modal-overlay" onClick={() => !guardandoEdicion && setGrupoParaEditar(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-borde)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontWeight: 700, margin: 0 }}>Modificar Grupo</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-primario)', fontWeight: 600 }}>
                  Código actual: {grupoParaEditar.codigo_grupo}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setGrupoParaEditar(null)}
                className="btn-cerrar-modal"
                title="Cerrar ventana"
                disabled={guardandoEdicion}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleActualizarGrupo} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {errorEditar && (
                <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px', borderRadius: 'var(--radio-md)', fontSize: '0.85rem' }}>
                  {errorEditar}
                </div>
              )}

              <div>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Código del Grupo *</span>
                  <span style={{ fontSize: '0.725rem', color: 'var(--color-primario)', fontWeight: 600 }}>Identificador Único</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="SQUAD-ALPHA"
                  value={nuevoCodigoGrupo}
                  onChange={e => setNuevoCodigoGrupo(e.target.value.toUpperCase())}
                  maxLength={50}
                  required
                />
                <span style={{ fontSize: '0.725rem', color: 'var(--color-texto-terciario)', marginTop: '4px', display: 'block' }}>
                  * Solo debe existir un código a nivel de grupo (no se puede repetir). Si lo modifica, sus miembros y actividades se migrarán automáticamente al nuevo código.
                </span>
              </div>

              <div>
                <label className="form-label">Título / Nombre del Grupo *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: Squad Canales Digitales"
                  value={nuevoNombreGrupo}
                  onChange={e => setNuevoNombreGrupo(e.target.value)}
                  maxLength={150}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Líder Principal del Grupo *</span>
                  <span style={{ fontSize: '0.725rem', color: 'var(--color-primario)', fontWeight: 600 }}>Solo 1 líder SWE</span>
                </label>
                <select
                  className="form-select"
                  value={nuevoRegistroPrincipal}
                  onChange={e => setNuevoRegistroPrincipal(e.target.value)}
                  required
                >
                  <option value="">-- Seleccionar SWE Líder --</option>
                  {soloSWEs.map(s => (
                    <option key={s.registro} value={s.registro}>
                      {s.nombres} ({s.registro}) {s.registro === grupoParaEditar.registro_principal ? '★ (Líder Actual)' : '- Perfil SWE'}
                    </option>
                  ))}
                </select>
                <div style={{
                  marginTop: '8px',
                  padding: '8px 10px',
                  backgroundColor: 'var(--color-primario-suave)',
                  border: '1px solid var(--color-borde)',
                  borderRadius: 'var(--radio-sm)',
                  fontSize: '0.75rem',
                  color: 'var(--color-texto-secundario)',
                  lineHeight: '1.4'
                }}>
                  🛡️ <strong>Regla:</strong> Cada grupo cuenta con exactamente <strong>1 único líder principal</strong> (perfil SWE obligatorio). Al asignar un nuevo líder, el anterior pasa automáticamente a ser miembro colaborador regular del grupo.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secundario"
                  onClick={() => setGrupoParaEditar(null)}
                  disabled={guardandoEdicion}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primario"
                  disabled={guardandoEdicion || !nuevoNombreGrupo.trim() || !nuevoRegistroPrincipal}
                >
                  {guardandoEdicion ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gestionar Miembros */}
      {grupoSeleccionado && (
        <div className="modal-overlay" onClick={() => setGrupoSeleccionado(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-borde)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontWeight: 700 }}>Miembros de {grupoSeleccionado.nombre_grupo}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-texto-terciario)' }}>{grupoSeleccionado.codigo_grupo}</span>
              </div>
              <button
                type="button"
                onClick={() => setGrupoSeleccionado(null)}
                className="btn-cerrar-modal"
                title="Cerrar ventana"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Formulario agregar miembro */}
              {puedeEditar && (
                <form onSubmit={handleAgregarMiembro} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Asignar Colaborador al Grupo</label>
                    <select
                      className="form-select"
                      value={miembroParaAgregar}
                      onChange={e => setMiembroParaAgregar(e.target.value)}
                      required
                    >
                      <option value="">-- Seleccionar colaborador activo --</option>
                      {registros
                        .filter(r => !grupoSeleccionado.miembros.some(m => m.registro === r.registro && m.estado === 'ACTIVO'))
                        .map(r => (
                          <option key={r.registro} value={r.registro}>
                            {r.nombres} ({r.registro}) - {r.perfil}
                          </option>
                        ))}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primario" disabled={!miembroParaAgregar}>
                    <UserPlus size={16} />
                    Asignar
                  </button>
                </form>
              )}

              {/* Lista de Miembros Actuales */}
              <div style={{ border: '1px solid var(--color-borde)', borderRadius: 'var(--radio-md)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead style={{ backgroundColor: 'var(--color-superficie-hover)', borderBottom: '1px solid var(--color-borde)' }}>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Colaborador</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Registro</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Perfil</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupoSeleccionado.miembros.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: 'var(--color-texto-terciario)' }}>
                          No hay miembros activos en este grupo.
                        </td>
                      </tr>
                    ) : (
                      grupoSeleccionado.miembros.map(m => (
                        <tr key={m.registro} style={{ borderBottom: '1px solid var(--color-borde-suave)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{m.nombres || m.registro}</td>
                          <td style={{ padding: '8px 12px' }}>{m.registro}</td>
                          <td style={{ padding: '8px 12px' }}>{m.perfil}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            {m.registro === grupoSeleccionado.registro_principal ? (
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: 'var(--color-primario)',
                                backgroundColor: 'var(--color-primario-suave)',
                                padding: '3px 8px',
                                borderRadius: 'var(--radio-sm)',
                                display: 'inline-block',
                              }}>
                                ★ LÍDER ÚNICO
                              </span>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                {puedeEditar && m.perfil === 'SWE' && (
                                  <button
                                    type="button"
                                    className="btn btn-secundario btn-sm"
                                    onClick={() => setConfirmacionCambiarLider({
                                      codigoGrupo: grupoSeleccionado.codigo_grupo,
                                      nuevoLiderRegistro: m.registro,
                                      nuevoLiderNombre: m.nombres || m.registro,
                                      liderAnteriorNombre: grupoSeleccionado.nombre_principal || grupoSeleccionado.registro_principal,
                                    })}
                                    style={{ fontSize: '0.725rem', padding: '2px 7px' }}
                                    title="Designar como único líder del grupo"
                                  >
                                    <UserCheck size={13} style={{ marginRight: '3px' }} />
                                    Hacer Líder
                                  </button>
                                )}
                                {puedeEditar && (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmacionEliminar({
                                      tipo: 'miembro',
                                      registroMiembro: m.registro,
                                      nombreMiembro: m.nombres || m.registro
                                    })}
                                    style={{ color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                                    title="Remover del grupo"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Cambiar Líder Directo */}
      {confirmacionCambiarLider && (
        <div className="modal-overlay" onClick={() => !cambiandoLider && setConfirmacionCambiarLider(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-borde)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={20} color="var(--color-primario)" />
                Cambiar Líder del Grupo
              </h3>
              <button
                type="button"
                onClick={() => setConfirmacionCambiarLider(null)}
                className="btn-cerrar-modal"
                disabled={cambiandoLider}
                title="Cerrar ventana"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-texto-principal)' }}>
                ¿Está seguro de asignar a <strong>{confirmacionCambiarLider.nuevoLiderNombre}</strong> como nuevo <strong>Líder Principal</strong> del grupo <strong>{confirmacionCambiarLider.codigoGrupo}</strong>?
              </p>

              <div style={{
                padding: '10px 12px',
                backgroundColor: 'var(--color-primario-suave)',
                border: '1px solid var(--color-borde)',
                borderRadius: 'var(--radio-md)',
                fontSize: '0.8rem',
                color: 'var(--color-texto-secundario)',
                lineHeight: 1.4
              }}>
                🛡️ <strong>Regla: Solo puede haber 1 único líder.</strong><br />
                <strong>{confirmacionCambiarLider.liderAnteriorNombre}</strong> dejará de ser líder y permanecerá como miembro activo del equipo.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secundario"
                  onClick={() => setConfirmacionCambiarLider(null)}
                  disabled={cambiandoLider}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primario"
                  onClick={ejecutarCambioLider}
                  disabled={cambiandoLider}
                >
                  {cambiandoLider ? 'Cambiando líder...' : 'Confirmar Nuevo Líder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Elegante de Confirmación de Eliminación */}
      <ModalConfirmacionEliminar
        abierto={Boolean(confirmacionEliminar)}
        titulo={confirmacionEliminar?.tipo === 'grupo' ? 'Eliminar Grupo' : 'Desvincular Miembro del Grupo'}
        mensaje={
          confirmacionEliminar?.tipo === 'grupo'
            ? `¿Está seguro de eliminar definitivamente el grupo "${confirmacionEliminar.grupo?.nombre_grupo}"?`
            : `¿Está seguro de desvincular a "${confirmacionEliminar?.nombreMiembro}" del grupo "${grupoSeleccionado?.nombre_grupo}"?`
        }
        detalle={
          confirmacionEliminar?.tipo === 'grupo' && confirmacionEliminar.grupo ? (
            <div>
              <strong>Código de Grupo:</strong> {confirmacionEliminar.grupo.codigo_grupo}
              <br />
              <strong>Nombre:</strong> {confirmacionEliminar.grupo.nombre_grupo}
              <br />
              <strong>Líder SWE:</strong> {confirmacionEliminar.grupo.nombre_principal || confirmacionEliminar.grupo.registro_principal}
              <br />
              <strong>Total Miembros:</strong> {confirmacionEliminar.grupo.total_miembros}
            </div>
          ) : confirmacionEliminar?.tipo === 'miembro' ? (
            <div>
              <strong>Colaborador:</strong> {confirmacionEliminar.nombreMiembro} ({confirmacionEliminar.registroMiembro})
              <br />
              <strong>Grupo:</strong> {grupoSeleccionado?.nombre_grupo} ({grupoSeleccionado?.codigo_grupo})
            </div>
          ) : undefined
        }
        textoConfirmar={confirmacionEliminar?.tipo === 'grupo' ? 'Eliminar Grupo' : 'Desvincular'}
        cargando={eliminando}
        onConfirmar={ejecutarConfirmacionEliminar}
        onCerrar={() => setConfirmacionEliminar(null)}
      />

    </div>
  );
};
