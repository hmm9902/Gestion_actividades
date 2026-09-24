import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Search, AlertCircle, Edit2, ShieldAlert, X, Trash2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { RegistroColaborador, PerfilTipo } from '../types';
import { apiRequest } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useNotificacion } from '../context/NotificacionContext';
import { ModalConfirmacionEliminar } from '../components/common/ModalConfirmacionEliminar';
import { ModalExportarRegistros } from '../components/common/ModalExportarRegistros';
import { OfficeExcelIcon } from '../components/common/OfficeExcelIcon';

export const RegistrosPage: React.FC = () => {
  const { usuario } = useAuth();
  const { exito, error: notifyError } = useNotificacion();

  const puedeCrear = usuario?.perfil === 'ADMIN' || usuario?.perfil === 'SWE';

  const [registros, setRegistros] = useState<RegistroColaborador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Filtros exclusivos en cabecera de la grilla
  const [filtroCabeceraNombre, setFiltroCabeceraNombre] = useState('');
  const [filtroCabeceraPerfil, setFiltroCabeceraPerfil] = useState('');

  // Paginación 10 en 10
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 10;

  // Modal Crear Registro
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [dni, setDni] = useState('');
  const [nombres, setNombres] = useState('');
  const [codigoRegistro, setCodigoRegistro] = useState('');
  const [correo, setCorreo] = useState('');
  const [perfil, setPerfil] = useState<PerfilTipo>('DESARROLLADOR');
  const [fechaExpiracion, setFechaExpiracion] = useState('');
  const [passwordInicial, setPasswordInicial] = useState('');
  const [passwordDomain, setPasswordDomain] = useState('');
  const [errorCrear, setErrorCrear] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Modal Editar Registro
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [registroSeleccionado, setRegistroSeleccionado] = useState<RegistroColaborador | null>(null);
  const [editDni, setEditDni] = useState('');
  const [editNombres, setEditNombres] = useState('');
  const [editCorreo, setEditCorreo] = useState('');
  const [editPerfil, setEditPerfil] = useState<PerfilTipo>('DESARROLLADOR');
  const [editFechaExpiracion, setEditFechaExpiracion] = useState('');
  const [editEstado, setEditEstado] = useState('ACTIVO');
  const [editEmpresa, setEditEmpresa] = useState('FCD');
  const [editDomainEmpresa, setEditDomainEmpresa] = useState('EMPRESA');
  const [editPasswordDomain, setEditPasswordDomain] = useState('');
  const [errorEditar, setErrorEditar] = useState<string | null>(null);
  const [guardandoEditar, setGuardandoEditar] = useState(false);

  // Modal Exportar Excel
  const [mostrarModalExportar, setMostrarModalExportar] = useState(false);

  const handleAbrirEditar = (r: RegistroColaborador) => {
    if (!puedeCrear) {
      notifyError('No cuenta con privilegios para modificar registros (se requiere perfil ADMIN o SWE).');
      return;
    }
    setRegistroSeleccionado(r);
    setEditDni(r.dni || '');
    setEditNombres(r.nombres || '');
    setEditCorreo(r.correo || '');
    setEditPerfil((r.perfil as PerfilTipo) || 'DESARROLLADOR');
    setEditFechaExpiracion(r.fecha_expiracion || '');
    setEditEstado(r.estado || 'ACTIVO');
    setEditEmpresa(r.empresa || 'FCD');
    setEditDomainEmpresa(r.domain_empresa || 'EMPRESA');
    setEditPasswordDomain('');
    setErrorEditar(null);
    setMostrarModalEditar(true);
  };

  const handleEditarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registroSeleccionado) return;

    if (!editDni.trim() || !editNombres.trim() || !editCorreo.trim()) {
      setErrorEditar('Por favor complete los campos obligatorios (*).');
      return;
    }

    try {
      setGuardandoEditar(true);
      setErrorEditar(null);

      const bodyData: any = {
        dni: editDni.trim(),
        nombres: editNombres.trim(),
        correo: editCorreo.trim().toLowerCase(),
        perfil: editPerfil,
        fecha_expiracion: editFechaExpiracion.trim() ? editFechaExpiracion.trim() : null,
        estado: editEstado,
        empresa: editEmpresa.trim(),
        domain_empresa: editDomainEmpresa.trim(),
      };
      if (editPasswordDomain.trim()) {
        bodyData.password_domain = editPasswordDomain.trim();
      }

      await apiRequest(`/registros/${registroSeleccionado.registro}`, {
        method: 'PUT',
        body: JSON.stringify(bodyData),
      });

      exito(`Registro ${registroSeleccionado.registro} actualizado satisfactoriamente.`);
      setMostrarModalEditar(false);
      setRegistroSeleccionado(null);
      cargarRegistros();
    } catch (err: any) {
      const msg = err.message || 'Error al actualizar el registro';
      setErrorEditar(msg);
      notifyError(msg);
    } finally {
      setGuardandoEditar(false);
    }
  };

  const cargarRegistros = async () => {
    try {
      setCargando(true);
      let query = '';
      const params = new URLSearchParams();
      if (filtroPerfil) params.append('perfil', filtroPerfil);
      if (filtroEstado) params.append('estado', filtroEstado);
      if (busqueda.trim()) params.append('search', busqueda.trim());
      if (params.toString()) query = `?${params.toString()}`;

      const data = await apiRequest<RegistroColaborador[]>(`/registros${query}`);
      setRegistros(data);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarRegistros();
  }, [filtroPerfil, filtroEstado]);

  // Estado para modal elegante de confirmación de eliminación
  const [registroParaEliminar, setRegistroParaEliminar] = useState<RegistroColaborador | null>(null);
  const [eliminandoRegistro, setEliminandoRegistro] = useState(false);

  const handleEliminarRegistro = (r: RegistroColaborador) => {
    if (!puedeCrear) return;
    if (r.registro === usuario?.registro) {
      notifyError('No puede eliminar su propio registro de sesión activa.');
      return;
    }
    setRegistroParaEliminar(r);
  };

  const confirmarEliminarRegistro = async () => {
    if (!registroParaEliminar) return;

    try {
      setEliminandoRegistro(true);
      await apiRequest(`/registros/${registroParaEliminar.registro}`, { method: 'DELETE' });
      exito(`Registro ${registroParaEliminar.registro} eliminado definitivamente.`);
      setRegistroParaEliminar(null);
      cargarRegistros();
    } catch (err: any) {
      notifyError(err.message || 'Error al eliminar registro');
    } finally {
      setEliminandoRegistro(false);
    }
  };

  // Filtrado exclusivo por cabeceras
  const registrosFiltrados = registros.filter(r => {
    if (filtroCabeceraPerfil && r.perfil !== filtroCabeceraPerfil) {
      return false;
    }
    if (filtroCabeceraNombre.trim() && !r.nombres.toLowerCase().includes(filtroCabeceraNombre.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  const totalPaginas = Math.max(1, Math.ceil(registrosFiltrados.length / ITEMS_POR_PAGINA));
  const indiceInicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const registrosPaginados = registrosFiltrados.slice(indiceInicio, indiceInicio + ITEMS_POR_PAGINA);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dni.trim() || !nombres.trim() || !codigoRegistro.trim() || !correo.trim()) {
      setErrorCrear('Por favor complete los campos obligatorios (*).');
      return;
    }

    try {
      setGuardando(true);
      setErrorCrear(null);
      await apiRequest('/registros', {
        method: 'POST',
        body: JSON.stringify({
          dni: dni.trim(),
          nombres: nombres.trim(),
          registro: codigoRegistro.trim().toUpperCase(),
          correo: correo.trim().toLowerCase(),
          perfil,
          fecha_expiracion: fechaExpiracion.trim() ? fechaExpiracion.trim() : null,
          password_inicial: passwordInicial.trim() ? passwordInicial.trim() : null,
          password_domain: passwordDomain.trim() ? passwordDomain.trim() : null,
          estado: 'ACTIVO',
        }),
      });

      exito(`Registro ${codigoRegistro.trim().toUpperCase()} grabado correctamente.`);
      setMostrarModalCrear(false);
      setDni('');
      setNombres('');
      setCodigoRegistro('');
      setCorreo('');
      setFechaExpiracion('');
      setPasswordInicial('');
      setPasswordDomain('');
      cargarRegistros();
    } catch (err: any) {
      const msg = err.message || 'Error al grabar el registro';
      setErrorCrear(msg);
      notifyError(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-texto-principal)' }}>
            Catálogo de Registros de Personal
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>
            Mantenimiento y perfiles de colaboradores para asignación
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secundario"
            onClick={cargarRegistros}
            disabled={cargando}
            title="Recargar catálogo de colaboradores"
          >
            <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </button>

          {/* Botón Exportar a Excel */}
          <button
            type="button"
            className="btn btn-secundario"
            onClick={() => setMostrarModalExportar(true)}
            title="Exportar colaboradores a archivo Excel (.xlsx)"
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

          {puedeCrear && (
            <button
              type="button"
              className="btn btn-primario"
              onClick={() => {
                setErrorCrear(null);
                setMostrarModalCrear(true);
              }}
            >
              <Plus size={16} />
              Nuevo Registro
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
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
            placeholder="Buscar por DNI, nombres, registro o correo..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && cargarRegistros()}
          />
        </div>

        <select className="form-select" style={{ width: '180px' }} value={filtroPerfil} onChange={e => setFiltroPerfil(e.target.value)}>
          <option value="">Perfil: Todos</option>
          <option value="ADMIN">ADMIN</option>
          <option value="SWE">SWE</option>
          <option value="DESARROLLADOR">DESARROLLADOR</option>
          <option value="QA">QA</option>
          <option value="INTEGRADOR">INTEGRADOR</option>
        </select>

        <select className="form-select" style={{ width: '160px' }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Estado: Todos</option>
          <option value="ACTIVO">ACTIVO</option>
          <option value="INACTIVO">INACTIVO</option>
        </select>

        <button type="button" className="btn btn-secundario" onClick={cargarRegistros}>
          Buscar
        </button>
      </div>

      {/* Tabla de Registros */}
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
                <th style={{ padding: '12px 16px', textAlign: 'left', verticalAlign: 'bottom' }}>Registro</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', verticalAlign: 'bottom' }}>DNI</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', minWidth: '220px' }}>
                  <div style={{ marginBottom: '6px' }}>Nombres Completos</div>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', height: '28px', width: '100%', fontWeight: 'normal' }}
                    placeholder="Filtrar por letra o nombre..."
                    value={filtroCabeceraNombre}
                    onChange={e => {
                      setFiltroCabeceraNombre(e.target.value);
                      setPaginaActual(1);
                    }}
                  />
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', verticalAlign: 'bottom' }}>Correo</th>
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
                <th style={{ padding: '12px 16px', textAlign: 'left', verticalAlign: 'bottom' }}>F. Expiración</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', verticalAlign: 'bottom' }}>Estado</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: '110px', verticalAlign: 'bottom' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'var(--color-texto-terciario)' }}>
                    Cargando registros...
                  </td>
                </tr>
              ) : registrosPaginados.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'var(--color-texto-terciario)' }}>
                    No se encontraron registros coincidentes.
                  </td>
                </tr>
              ) : (
                registrosPaginados.map(r => (
                  <tr
                    key={r.registro_id}
                    className="fila-interactiva"
                    tabIndex={0}
                    title="Doble clic para editar registro"
                    onDoubleClick={() => handleAbrirEditar(r)}
                    style={{ borderBottom: '1px solid var(--color-borde-suave)' }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-primario)' }}>
                      {r.registro}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{r.dni}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.nombres}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-texto-secundario)' }}>{r.correo}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radio-pildora)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: r.perfil === 'ADMIN' ? '#FEE2E2' :
                          r.perfil === 'SWE' ? 'var(--color-primario-suave)' : 'var(--color-borde)',
                        color: r.perfil === 'ADMIN' ? '#991B1B' :
                          r.perfil === 'SWE' ? 'var(--color-primario)' : 'var(--color-texto-secundario)',
                      }}>
                        {r.perfil}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-texto-terciario)' }}>
                      {r.fecha_expiracion || 'Sin límite'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radio-pildora)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: r.estado === 'ACTIVO' ? 'var(--color-primario-suave)' : '#F1F5F9',
                        color: r.estado === 'ACTIVO' ? 'var(--color-primario)' : '#64748B',
                      }}>
                        {r.estado}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-secundario btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAbrirEditar(r);
                          }}
                          title="Editar registro (o doble clic)"
                          style={{ padding: '4px 8px' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        {puedeCrear && (
                          <button
                            type="button"
                            className="btn btn-peligro btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEliminarRegistro(r);
                            }}
                            title="Eliminar registro definitivamente"
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
            Mostrando {registrosFiltrados.length === 0 ? 0 : indiceInicio + 1} a {Math.min(indiceInicio + ITEMS_POR_PAGINA, registrosFiltrados.length)} de {registrosFiltrados.length} registros
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

      {/* Modal Crear Registro */}
      {mostrarModalCrear && (
        <div className="modal-overlay" onClick={() => setMostrarModalCrear(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-borde)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700 }}>Nuevo Registro de Personal</h3>
              <button
                type="button"
                onClick={() => setMostrarModalCrear(false)}
                className="btn-cerrar-modal"
                title="Cerrar ventana"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCrear} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
              {errorCrear && (
                <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px', borderRadius: 'var(--radio-md)', fontSize: '0.85rem' }}>
                  {errorCrear}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label">DNI *</label>
                  <input type="text" className="form-input" placeholder="8 dígitos" value={dni} onChange={e => setDni(e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Código de Registro *</label>
                  <input type="text" className="form-input" placeholder="Ej: X18900" value={codigoRegistro} onChange={e => setCodigoRegistro(e.target.value.toUpperCase())} required />
                </div>
              </div>

              <div>
                <label className="form-label">Nombres Completos *</label>
                <input type="text" className="form-input" placeholder="Ej: JUAN PEREZ GARCIA" value={nombres} onChange={e => setNombres(e.target.value.toUpperCase())} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label">Correo Electrónico *</label>
                  <input type="email" className="form-input" placeholder="correo@empresa.com" value={correo} onChange={e => setCorreo(e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Perfil *</label>
                  <select className="form-select" value={perfil} onChange={e => setPerfil(e.target.value as PerfilTipo)}>
                    <option value="SWE">SWE (Líder Técnico)</option>
                    <option value="DESARROLLADOR">DESARROLLADOR</option>
                    <option value="QA">QA</option>
                    <option value="INTEGRADOR">INTEGRADOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label">Fecha de Expiración</label>
                  <input type="date" className="form-input" value={fechaExpiracion} onChange={e => setFechaExpiracion(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Contraseña de Acceso Web Inicial</label>
                  <input type="password" className="form-input" placeholder="Opcional para login" value={passwordInicial} onChange={e => setPasswordInicial(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="form-label">PASSWORD_DOMAIN (Dato Sensible Opcional)</label>
                <input type="password" className="form-input" placeholder="Solo se almacena cifrado en backend" value={passwordDomain} onChange={e => setPasswordDomain(e.target.value)} />
                <span style={{ fontSize: '0.725rem', color: 'var(--color-texto-terciario)', marginTop: '2px', display: 'block' }}>
                  * Conforme a la política de seguridad, nunca se transmite en consultas de visualización ni al frontend.
                </span>
              </div>

              {errorCrear && (
                <div style={{
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  padding: '12px 14px',
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-borde)' }}>
                <button
                  type="button"
                  className="btn btn-secundario"
                  onClick={() => {
                    setMostrarModalCrear(false);
                    setErrorCrear(null);
                  }}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primario"
                  disabled={guardando}
                  style={{ minWidth: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {guardando ? (
                    <>
                      <span style={{
                        display: 'inline-block',
                        width: '14px',
                        height: '14px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderRadius: '50%',
                        borderTopColor: '#fff',
                        animation: 'spin 0.8s linear infinite'
                      }}></span>
                      Grabando...
                    </>
                  ) : (
                    'Grabar Registro'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Registro */}
      {mostrarModalEditar && registroSeleccionado && (
        <div className="modal-overlay" onClick={() => setMostrarModalEditar(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-borde)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} color="var(--color-primario)" />
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  Editar Registro de Personal: {registroSeleccionado.registro}
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

            <form onSubmit={handleEditarSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
              {errorEditar && (
                <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px', borderRadius: 'var(--radio-md)', fontSize: '0.85rem' }}>
                  {errorEditar}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label">Código de Registro (No editable)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={registroSeleccionado.registro}
                    disabled
                    style={{ backgroundColor: 'var(--color-fondo)', opacity: 0.85, cursor: 'not-allowed', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label className="form-label">DNI *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="8 dígitos"
                    value={editDni}
                    onChange={e => setEditDni(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Nombres Completos *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: JUAN PEREZ GARCIA"
                  value={editNombres}
                  onChange={e => setEditNombres(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label">Correo Electrónico *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="correo@empresa.com"
                    value={editCorreo}
                    onChange={e => setEditCorreo(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Perfil *</label>
                  <select
                    className="form-select"
                    value={editPerfil}
                    onChange={e => setEditPerfil(e.target.value as PerfilTipo)}
                  >
                    <option value="SWE">SWE (Líder Técnico)</option>
                    <option value="DESARROLLADOR">DESARROLLADOR</option>
                    <option value="QA">QA</option>
                    <option value="INTEGRADOR">INTEGRADOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label">Fecha de Expiración</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editFechaExpiracion}
                    onChange={e => setEditFechaExpiracion(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Estado</label>
                  <select
                    className="form-select"
                    value={editEstado}
                    onChange={e => setEditEstado(e.target.value)}
                  >
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label">Empresa</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editEmpresa}
                    onChange={e => setEditEmpresa(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Dominio Empresa</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editDomainEmpresa}
                    onChange={e => setEditDomainEmpresa(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">PASSWORD_DOMAIN (Dato Sensible Opcional)</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Dejar en blanco para no modificar"
                  value={editPasswordDomain}
                  onChange={e => setEditPasswordDomain(e.target.value)}
                />
                <span style={{ fontSize: '0.725rem', color: 'var(--color-texto-terciario)', marginTop: '2px', display: 'block' }}>
                  * Solo se almacena cifrado en backend. Dejar vacío si no se desea actualizar.
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
                  style={{ minWidth: '160px' }}
                >
                  {guardandoEditar ? 'Actualizando...' : 'Actualizar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Elegante de Confirmación de Eliminación */}
      <ModalConfirmacionEliminar
        abierto={Boolean(registroParaEliminar)}
        titulo="Eliminar Registro de Colaborador"
        mensaje={`¿Está seguro de eliminar definitivamente el registro de "${registroParaEliminar?.nombres}"?`}
        detalle={
          registroParaEliminar && (
            <div>
              <strong>Registro:</strong> {registroParaEliminar.registro} | <strong>DNI:</strong> {registroParaEliminar.dni}
              <br />
              <strong>Colaborador:</strong> {registroParaEliminar.nombres}
              <br />
              <strong>Perfil:</strong> {registroParaEliminar.perfil} | <strong>Correo:</strong> {registroParaEliminar.correo}
            </div>
          )
        }
        cargando={eliminandoRegistro}
        onConfirmar={confirmarEliminarRegistro}
        onCerrar={() => setRegistroParaEliminar(null)}
      />

      {/* Modal Exportación a Excel */}
      {mostrarModalExportar && (
        <ModalExportarRegistros
          registros={registros}
          onCerrar={() => setMostrarModalExportar(false)}
        />
      )}

    </div>
  );
};
