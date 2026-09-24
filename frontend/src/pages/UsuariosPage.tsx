import React, { useState, useEffect } from 'react';
import { Users, Plus, ShieldCheck, Check, X, Key, Edit2, Trash2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { UsuarioSistema, RegistroColaborador } from '../types';
import { apiRequest } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useNotificacion } from '../context/NotificacionContext';
import { ModalConfirmacionEliminar } from '../components/common/ModalConfirmacionEliminar';

export const UsuariosPage: React.FC = () => {
  const { usuario: usuarioActual } = useAuth();
  const { exito, error: notifyError } = useNotificacion();
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [registros, setRegistros] = useState<RegistroColaborador[]>([]);
  const [cargando, setCargando] = useState(true);

  // Filtros de cabecera específicos para Colaborador y Perfil
  const [filtroCabeceraColaborador, setFiltroCabeceraColaborador] = useState('');
  const [filtroCabeceraPerfil, setFiltroCabeceraPerfil] = useState('');

  // Paginación 10 en 10
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 10;

  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [registroSeleccionado, setRegistroSeleccionado] = useState('');
  const [password, setPassword] = useState('');

  // Modal Editar Usuario
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [usuarioParaEditar, setUsuarioParaEditar] = useState<UsuarioSistema | null>(null);
  const [editEstado, setEditEstado] = useState('ACTIVO');
  const [editDebeCambiarPw, setEditDebeCambiarPw] = useState(false);
  const [editNuevaPassword, setEditNuevaPassword] = useState('');
  const [guardandoEditar, setGuardandoEditar] = useState(false);
  const [errorEditar, setErrorEditar] = useState<string | null>(null);

  const puedeEditar = usuarioActual?.perfil === 'ADMIN' || usuarioActual?.perfil === 'SWE';

  // Estado para modal elegante de confirmación de eliminación
  const [usuarioParaEliminar, setUsuarioParaEliminar] = useState<UsuarioSistema | null>(null);
  const [eliminandoUsuario, setEliminandoUsuario] = useState(false);

  const handleEliminarUsuario = (u: UsuarioSistema) => {
    if (!puedeEditar) return;
    if (u.registro === usuarioActual?.registro) {
      notifyError('No puede eliminar su propia cuenta de acceso en sesión activa.');
      return;
    }
    setUsuarioParaEliminar(u);
  };

  const confirmarEliminarUsuario = async () => {
    if (!usuarioParaEliminar) return;

    try {
      setEliminandoUsuario(true);
      await apiRequest(`/usuarios/${usuarioParaEliminar.registro}`, { method: 'DELETE' });
      exito(`Acceso de usuario ${usuarioParaEliminar.registro} eliminado definitivamente.`);
      setUsuarioParaEliminar(null);
      cargarDatos();
    } catch (err: any) {
      notifyError(err.message || 'Error al eliminar usuario');
    } finally {
      setEliminandoUsuario(false);
    }
  };

  const handleAbrirEditar = (u: UsuarioSistema) => {
    if (!puedeEditar) {
      notifyError('No cuenta con privilegios para modificar usuarios (se requiere perfil ADMIN o SWE).');
      return;
    }
    setUsuarioParaEditar(u);
    setEditEstado(u.estado || 'ACTIVO');
    setEditDebeCambiarPw(Boolean(u.debe_cambiar_password));
    setEditNuevaPassword('');
    setErrorEditar(null);
    setMostrarModalEditar(true);
  };

  const handleEditarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioParaEditar) return;

    try {
      setGuardandoEditar(true);
      setErrorEditar(null);

      const payload: any = {
        estado: editEstado,
        debe_cambiar_password: editDebeCambiarPw,
      };
      if (editNuevaPassword.trim()) {
        payload.password = editNuevaPassword.trim();
      }

      await apiRequest(`/usuarios/${usuarioParaEditar.registro}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      exito(`Usuario ${usuarioParaEditar.registro} actualizado satisfactoriamente.`);
      setMostrarModalEditar(false);
      setUsuarioParaEditar(null);
      cargarDatos();
    } catch (err: any) {
      const msg = err.message || 'Error al actualizar usuario';
      setErrorEditar(msg);
      notifyError(msg);
    } finally {
      setGuardandoEditar(false);
    }
  };

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [uData, rData] = await Promise.all([
        apiRequest<UsuarioSistema[]>('/usuarios'),
        apiRequest<RegistroColaborador[]>('/registros'),
      ]);
      setUsuarios(uData);
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

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registroSeleccionado || !password) return;

    try {
      await apiRequest('/usuarios', {
        method: 'POST',
        body: JSON.stringify({
          registro: registroSeleccionado,
          password,
          estado: 'ACTIVO',
        }),
      });
      exito(`Usuario para ${registroSeleccionado} habilitado.`);
      setMostrarModalCrear(false);
      setRegistroSeleccionado('');
      setPassword('');
      cargarDatos();
    } catch (err: any) {
      notifyError(err.message || 'Error al crear usuario');
    }
  };

  const usuariosFiltrados = usuarios.filter(u => {
    if (filtroCabeceraPerfil && u.perfil !== filtroCabeceraPerfil) {
      return false;
    }
    const nombre = (u.nombres || u.registro || '').toLowerCase();
    if (filtroCabeceraColaborador.trim() && !nombre.includes(filtroCabeceraColaborador.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / ITEMS_POR_PAGINA));
  const indiceInicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const usuariosPaginados = usuariosFiltrados.slice(indiceInicio, indiceInicio + ITEMS_POR_PAGINA);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-texto-principal)' }}>
            Control de Usuarios de Acceso
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>
            Gestión de credenciales autenticables con Argon2/Bcrypt
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secundario"
            onClick={cargarDatos}
            disabled={cargando}
            title="Recargar usuarios"
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
              Habilitar Usuario
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Usuarios */}
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
                <th style={{ padding: '12px 16px', textAlign: 'left', verticalAlign: 'bottom' }}>Registro (Usuario)</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', minWidth: '220px' }}>
                  <div style={{ marginBottom: '6px' }}>Colaborador</div>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', height: '28px', width: '100%', fontWeight: 'normal' }}
                    placeholder="Filtrar colaborador..."
                    value={filtroCabeceraColaborador}
                    onChange={e => {
                      setFiltroCabeceraColaborador(e.target.value);
                      setPaginaActual(1);
                    }}
                  />
                </th>
                <th style={{ padding: '10px 16px', textAlign: 'left', minWidth: '150px' }}>
                  <div style={{ marginBottom: '6px' }}>Perfil</div>
                  <select
                    className="form-select"
                    style={{ fontSize: '0.75rem', padding: '2px 6px', height: '28px', width: '100%', fontWeight: 'normal' }}
                    value={filtroCabeceraPerfil}
                    onChange={e => {
                      setFiltroCabeceraPerfil(e.target.value);
                      setPaginaActual(1);
                    }}
                  >
                    <option value="">Todos los perfiles</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SWE">SWE</option>
                    <option value="DESARROLLADOR">DESARROLLADOR</option>
                    <option value="QA">QA</option>
                    <option value="INTEGRADOR">INTEGRADOR</option>
                  </select>
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', verticalAlign: 'bottom' }}>Correo</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', verticalAlign: 'bottom' }}>Fecha Alta</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', verticalAlign: 'bottom' }}>Estado</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: '110px', verticalAlign: 'bottom' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: 'var(--color-texto-terciario)' }}>Cargando usuarios...</td></tr>
              ) : usuariosPaginados.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: 'var(--color-texto-terciario)' }}>No se encontraron usuarios coincidentes.</td></tr>
              ) : (
                usuariosPaginados.map(u => (
                  <tr
                    key={u.usuario_id}
                    className="fila-interactiva"
                    tabIndex={0}
                    title="Doble clic para editar usuario"
                    onDoubleClick={() => handleAbrirEditar(u)}
                    style={{ borderBottom: '1px solid var(--color-borde-suave)' }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-primario)' }}>{u.registro}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{u.nombres || u.registro}</td>
                    <td style={{ padding: '12px 16px' }}>{u.perfil}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-texto-secundario)' }}>{u.correo}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-texto-terciario)' }}>{new Date(u.fecha_registro).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radio-pildora)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: u.estado === 'ACTIVO' ? 'var(--color-primario-suave)' : '#F1F5F9',
                        color: u.estado === 'ACTIVO' ? 'var(--color-primario)' : '#64748B',
                      }}>
                        {u.estado}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-secundario btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAbrirEditar(u);
                          }}
                          title="Editar usuario (o doble clic)"
                          style={{ padding: '4px 8px' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        {puedeEditar && (
                          <button
                            type="button"
                            className="btn btn-peligro btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEliminarUsuario(u);
                            }}
                            title="Eliminar credenciales de usuario definitivamente"
                            style={{ padding: '4px 8px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
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
            Mostrando {usuariosFiltrados.length === 0 ? 0 : indiceInicio + 1} a {Math.min(indiceInicio + ITEMS_POR_PAGINA, usuariosFiltrados.length)} de {usuariosFiltrados.length} usuarios
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

      {/* Modal Habilitar Usuario */}
      {mostrarModalCrear && (
        <div className="modal-overlay" onClick={() => setMostrarModalCrear(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-borde)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700 }}>Habilitar Acceso Web a Registro</h3>
              <button
                type="button"
                onClick={() => setMostrarModalCrear(false)}
                className="btn-cerrar-modal"
                title="Cerrar ventana"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCrearUsuario} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Seleccionar Registro Existente</label>
                <select
                  className="form-select"
                  value={registroSeleccionado}
                  onChange={e => setRegistroSeleccionado(e.target.value)}
                  required
                >
                  <option value="">-- Seleccionar --</option>
                  {registros
                    .filter(r => !usuarios.some(u => u.registro === r.registro))
                    .map(r => (
                      <option key={r.registro} value={r.registro}>
                        {r.nombres} ({r.registro}) - {r.perfil}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="form-label">Contraseña de Acceso *</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px' }}>
                <button type="button" className="btn btn-secundario" onClick={() => setMostrarModalCrear(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primario">
                  Habilitar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Usuario */}
      {mostrarModalEditar && usuarioParaEditar && (
        <div className="modal-overlay" onClick={() => setMostrarModalEditar(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-borde)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} color="var(--color-primario)" />
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  Editar Usuario: {usuarioParaEditar.registro}
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

            <form onSubmit={handleEditarUsuario} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {errorEditar && (
                <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px', borderRadius: 'var(--radio-md)', fontSize: '0.85rem' }}>
                  {errorEditar}
                </div>
              )}

              <div>
                <label className="form-label">Colaborador Asociado</label>
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--color-fondo)',
                  borderRadius: 'var(--radio-md)',
                  border: '1px solid var(--color-borde)',
                  fontSize: '0.875rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{usuarioParaEditar.nombres || usuarioParaEditar.registro}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>{usuarioParaEditar.correo}</div>
                  </div>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radio-pildora)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: 'var(--color-primario-suave)',
                    color: 'var(--color-primario)',
                  }}>
                    {usuarioParaEditar.perfil}
                  </span>
                </div>
              </div>

              <div>
                <label className="form-label">Estado de Acceso *</label>
                <select
                  className="form-select"
                  value={editEstado}
                  onChange={e => setEditEstado(e.target.value)}
                  required
                >
                  <option value="ACTIVO">ACTIVO (Permitir inicio de sesión)</option>
                  <option value="INACTIVO">INACTIVO (Bloquear acceso)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={editDebeCambiarPw}
                    onChange={e => setEditDebeCambiarPw(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Exigir cambio de contraseña en próximo inicio de sesión</span>
                </label>
              </div>

              <div>
                <label className="form-label">Resetear Contraseña (Opcional)</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Dejar en blanco para conservar la actual"
                  value={editNuevaPassword}
                  onChange={e => setEditNuevaPassword(e.target.value)}
                />
                <span style={{ fontSize: '0.725rem', color: 'var(--color-texto-terciario)', marginTop: '2px', display: 'block' }}>
                  * Si escribe una nueva contraseña, se cifrará con Argon2/Bcrypt en backend.
                </span>
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
                  {guardandoEditar ? 'Actualizando...' : 'Actualizar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Elegante de Confirmación de Eliminación */}
      <ModalConfirmacionEliminar
        abierto={Boolean(usuarioParaEliminar)}
        titulo="Eliminar Acceso de Usuario"
        mensaje={`¿Está seguro de eliminar definitivamente las credenciales del usuario "${usuarioParaEliminar?.registro}"?`}
        detalle={
          usuarioParaEliminar && (
            <div>
              <strong>Colaborador:</strong> {usuarioParaEliminar.nombres || usuarioParaEliminar.registro}
              <br />
              <strong>Registro:</strong> {usuarioParaEliminar.registro} | <strong>Perfil:</strong> {usuarioParaEliminar.perfil}
              <br />
              <strong>Correo:</strong> {usuarioParaEliminar.correo || 'No especificado'}
            </div>
          )
        }
        cargando={eliminandoUsuario}
        onConfirmar={confirmarEliminarUsuario}
        onCerrar={() => setUsuarioParaEliminar(null)}
      />

    </div>
  );
};
