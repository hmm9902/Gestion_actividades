import React, { useState, useEffect } from 'react';
import {
  Database, Cloud, HardDrive, CheckCircle2, AlertTriangle,
  RefreshCw, ArrowRightLeft, ShieldCheck, FileCheck, Layers,
  Terminal, Lock, Check, X, Info
} from 'lucide-react';
import { apiRequest, setToken } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useNotificacion } from '../context/NotificacionContext';

interface BdInfoResponse {
  current_provider: 'LOCAL' | 'TURSO';
  local: {
    name: string;
    source: string;
    file_path: string;
    exists: boolean;
    size_bytes: number;
    tables_count: number;
    is_active: boolean;
  };
  turso: {
    name: string;
    source: string;
    database_url: string;
    auth_token_masked: string;
    platform_token_masked: string;
    org_slug: string;
    is_configured: boolean;
    has_platform_token: boolean;
    is_active: boolean;
  };
  user: {
    registro: string;
    perfil: string;
  };
}

interface VerificationRow {
  table: string;
  local_rows: number;
  turso_rows: number;
  count_match: boolean;
  hash_verified: boolean | null;
}

interface FunctionalTest {
  test: string;
  passed: boolean;
  details: string;
}

interface MigrationReport {
  timestamp: string;
  user: string;
  database_name: string;
  status: string;
  backup_path: string;
  connection_status: string;
  db_creation_status: string;
  migration_status: string;
  validation_status: string;
  tests_status: string;
  local_schema_summary: {
    tables_count: number;
    indexes_count: number;
    triggers_count: number;
    views_count: number;
  };
  verification: {
    all_matched: boolean;
    tables_verification: VerificationRow[];
    differences: string[];
    critical_hashes_match: boolean;
  };
  functional_tests: {
    all_passed: boolean;
    total_tests: number;
    passed_count: number;
    failed_count: number;
    tests: FunctionalTest[];
  };
  can_activate_turso: boolean;
  error_message?: string;
}

export const SistemaBdPage: React.FC = () => {
  const { usuario } = useAuth();
  const { notificar, exito, error: mostrarError } = useNotificacion();

  const [info, setInfo] = useState<BdInfoResponse | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);

  // Estados para cambio en caliente
  const [modalCambioAbierto, setModalCambioAbierto] = useState<boolean>(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<'LOCAL' | 'TURSO' | null>(null);
  const [probandoConexion, setProbandoConexion] = useState<boolean>(false);
  const [resultadoPrueba, setResultadoPrueba] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);
  const [ejecutandoCambio, setEjecutandoCambio] = useState<boolean>(false);

  // Estados para migración Local -> Turso
  const [modalMigracionAbierto, setModalMigracionAbierto] = useState<boolean>(false);
  const [nombreBdTurso, setNombreBdTurso] = useState<string>('gestor-actividades');
  const [migrando, setMigrando] = useState<boolean>(false);
  const [faseMigracion, setFaseMigracion] = useState<string>('');
  const [reporteMigracion, setReporteMigracion] = useState<MigrationReport | null>(null);

  const cargarInfo = async () => {
    try {
      setCargando(true);
      const data = await apiRequest<BdInfoResponse>('/sistema/bd/info');
      setInfo(data);
    } catch (e: any) {
      mostrarError('Error cargando información de bases de datos: ' + (e.message || ''));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarInfo();
  }, []);

  const abrirModalCambio = async (nuevoProv: 'LOCAL' | 'TURSO') => {
    if (info?.current_provider === nuevoProv) return;
    setProveedorSeleccionado(nuevoProv);
    setResultadoPrueba(null);
    setModalCambioAbierto(true);

    // Auto-ejecutar prueba de conectividad al abrir
    try {
      setProbandoConexion(true);
      const res = await apiRequest<{ ok: boolean; message: string }>('/sistema/bd/test', {
        method: 'POST',
        body: JSON.stringify({ provider: nuevoProv }),
      });
      setResultadoPrueba({ ok: true, message: res.message });
    } catch (err: any) {
      setResultadoPrueba({ ok: false, error: err.message || 'Error de conectividad' });
    } finally {
      setProbandoConexion(false);
    }
  };

  const ejecutarCambioEnCaliente = async () => {
    if (!proveedorSeleccionado) return;
    try {
      setEjecutandoCambio(true);
      await apiRequest('/sistema/bd/switch', {
        method: 'POST',
        body: JSON.stringify({ provider: proveedorSeleccionado }),
      });

      exito(`Base de datos cambiada a ${proveedorSeleccionado}. Reiniciando sesión...`);

      // Invalidar sesión, limpiar storage y recargar completo a /login
      setTimeout(() => {
        setToken(null);
        window.location.href = '/login';
      }, 1500);

    } catch (e: any) {
      mostrarError('Error al cambiar de base de datos: ' + (e.message || ''));
      setEjecutandoCambio(false);
    }
  };

  const iniciarMigracion = async () => {
    try {
      setMigrando(true);
      setFaseMigracion('1. Respaldando BD local, creando base en Turso y transfiriendo datos...');
      setReporteMigracion(null);

      const reporte = await apiRequest<MigrationReport>('/sistema/bd/migrar', {
        method: 'POST',
        body: JSON.stringify({ database_name: nombreBdTurso || 'gestor-actividades' }),
      });

      setReporteMigracion(reporte);

      if (reporte.can_activate_turso) {
        exito('¡Migración y verificación completadas con éxito!');
        cargarInfo();
      } else {
        notificar('La migración concluyó con advertencias o errores.', 'info');
      }
    } catch (e: any) {
      mostrarError('Error durante la migración: ' + (e.message || ''));
    } finally {
      setMigrando(false);
      setFaseMigracion('');
    }
  };

  if (cargando && !info) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <RefreshCw className="anim-spin" size={32} color="var(--color-primario)" />
        <span style={{ marginLeft: '12px', color: 'var(--color-texto-secundario)' }}>
          Cargando configuración de base de datos...
        </span>
      </div>
    );
  }

  const esLocal = info?.current_provider === 'LOCAL';

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <Database size={26} color="var(--color-primario)" />
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-texto-principal)' }}>
              SISTEMA — Elegir Bd_Sistema
            </h1>
          </div>
          <p style={{ color: 'var(--color-texto-secundario)', fontSize: '0.9rem', margin: 0 }}>
            Administración de proveedor de base de datos en caliente (SQLite Local vs Turso Cloud libSQL) y migración integral.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={cargarInfo}
            disabled={cargando}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radio-md)',
              border: '1px solid var(--color-borde)',
              backgroundColor: 'var(--color-superficie)',
              color: 'var(--color-texto-principal)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.85rem',
            }}
          >
            <RefreshCw size={15} className={cargando ? 'anim-spin' : ''} />
            Actualizar
          </button>

          <button
            onClick={() => {
              setReporteMigracion(null);
              setModalMigracionAbierto(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: 'var(--radio-md)',
              border: 'none',
              background: 'var(--color-primario-gradiente)',
              color: '#FFF',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              boxShadow: 'var(--sombra-md)',
            }}
          >
            <ArrowRightLeft size={16} />
            Comprobar y migrar BD local a Turso
          </button>
        </div>
      </div>

      {/* Grid de las dos opciones de Base de Datos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* OPCION 1: LOCAL — SQLite */}
        <div style={{
          backgroundColor: 'var(--color-superficie)',
          borderRadius: 'var(--radio-lg)',
          border: esLocal ? '2px solid var(--color-exito)' : '1px solid var(--color-borde)',
          padding: '24px',
          boxShadow: esLocal ? '0 0 15px rgba(16, 185, 129, 0.15)' : 'var(--sombra-sm)',
          position: 'relative',
          transition: 'all var(--transicion-normal)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  padding: '10px',
                  borderRadius: 'var(--radio-md)',
                  backgroundColor: esLocal ? 'rgba(16, 185, 129, 0.1)' : 'var(--color-fondo)',
                  color: esLocal ? 'var(--color-exito)' : 'var(--color-texto-secundario)',
                }}>
                  <HardDrive size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--color-texto-principal)' }}>
                    1. LOCAL — SQLite
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-texto-terciario)' }}>
                    Almacenamiento embebido local
                  </span>
                </div>
              </div>

              {esLocal ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  color: '#10B981',
                  padding: '4px 12px',
                  borderRadius: 'var(--radio-pildora)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}>
                  <CheckCircle2 size={14} />
                  Base actual
                </div>
              ) : (
                <span style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-texto-terciario)',
                  backgroundColor: 'var(--color-fondo)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radio-pildora)',
                }}>
                  Disponible
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>
              <div>
                <strong style={{ color: 'var(--color-texto-principal)' }}>Fuente: </strong>
                <code style={{
                  backgroundColor: 'var(--color-fondo)',
                  padding: '3px 6px',
                  borderRadius: 'var(--radio-sm)',
                  fontSize: '0.8rem',
                  color: 'var(--color-primario)'
                }}>
                  {info?.local.source}
                </code>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                <div style={{ backgroundColor: 'var(--color-fondo)', padding: '10px', borderRadius: 'var(--radio-sm)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>Tablas detectadas</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-texto-principal)' }}>
                    {info?.local.tables_count ?? 0}
                  </div>
                </div>
                <div style={{ backgroundColor: 'var(--color-fondo)', padding: '10px', borderRadius: 'var(--radio-sm)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>Tamaño archivo</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-texto-principal)' }}>
                    {((info?.local.size_bytes || 0) / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--color-texto-terciario)', marginTop: '4px' }}>
                Ruta absoluta: <span style={{ wordBreak: 'break-all' }}>{info?.local.file_path}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <button
              onClick={() => abrirModalCambio('LOCAL')}
              disabled={esLocal}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 'var(--radio-md)',
                fontWeight: 600,
                fontSize: '0.875rem',
                border: esLocal ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--color-borde)',
                backgroundColor: esLocal ? 'rgba(16, 185, 129, 0.08)' : 'var(--color-superficie-hover)',
                color: esLocal ? '#10B981' : 'var(--color-texto-principal)',
                cursor: esLocal ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {esLocal ? (
                <>
                  <Check size={16} /> Base actual en ejecución
                </>
              ) : (
                <>
                  <ArrowRightLeft size={16} /> Cambiar a Base Local (SQLite)
                </>
              )}
            </button>
          </div>
        </div>

        {/* OPCION 2: TURSO — Cloud */}
        <div style={{
          backgroundColor: 'var(--color-superficie)',
          borderRadius: 'var(--radio-lg)',
          border: !esLocal ? '2px solid var(--color-exito)' : '1px solid var(--color-borde)',
          padding: '24px',
          boxShadow: !esLocal ? '0 0 15px rgba(16, 185, 129, 0.15)' : 'var(--sombra-sm)',
          position: 'relative',
          transition: 'all var(--transicion-normal)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  padding: '10px',
                  borderRadius: 'var(--radio-md)',
                  backgroundColor: !esLocal ? 'rgba(16, 185, 129, 0.1)' : 'var(--color-fondo)',
                  color: !esLocal ? 'var(--color-exito)' : 'var(--color-primario)',
                }}>
                  <Cloud size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--color-texto-principal)' }}>
                    2. TURSO — Cloud
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-texto-terciario)' }}>
                    libSQL Cloud distribuido
                  </span>
                </div>
              </div>

              {!esLocal ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  color: '#10B981',
                  padding: '4px 12px',
                  borderRadius: 'var(--radio-pildora)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}>
                  <CheckCircle2 size={14} />
                  Base actual
                </div>
              ) : (
                <span style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-texto-terciario)',
                  backgroundColor: 'var(--color-fondo)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radio-pildora)',
                }}>
                  Cloud Activo
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>
              <div>
                <strong style={{ color: 'var(--color-texto-principal)' }}>Fuente: </strong>
                <span style={{ fontWeight: 600, color: 'var(--color-primario)' }}>{info?.turso.source}</span>
              </div>

              <div>
                <strong style={{ color: 'var(--color-texto-principal)' }}>URL de la BD: </strong>
                <code style={{
                  backgroundColor: 'var(--color-fondo)',
                  padding: '3px 6px',
                  borderRadius: 'var(--radio-sm)',
                  fontSize: '0.775rem',
                  wordBreak: 'break-all',
                }}>
                  {info?.turso.database_url}
                </code>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                <div style={{ backgroundColor: 'var(--color-fondo)', padding: '10px', borderRadius: 'var(--radio-sm)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>Organización Turso</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-texto-principal)' }}>
                    {info?.turso.org_slug}
                  </div>
                </div>
                <div style={{ backgroundColor: 'var(--color-fondo)', padding: '10px', borderRadius: 'var(--radio-sm)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>Token de BD</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-texto-secundario)' }}>
                    {info?.turso.auth_token_masked}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.775rem', color: 'var(--color-texto-terciario)', marginTop: '4px' }}>
                <Lock size={14} color="var(--color-primario)" />
                <span>Credenciales protegidas y enmascaradas. Token de plataforma: <code>{info?.turso.platform_token_masked}</code></span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <button
              onClick={() => abrirModalCambio('TURSO')}
              disabled={!esLocal}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 'var(--radio-md)',
                fontWeight: 600,
                fontSize: '0.875rem',
                border: !esLocal ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--color-borde)',
                backgroundColor: !esLocal ? 'rgba(16, 185, 129, 0.08)' : 'var(--color-primario)',
                color: !esLocal ? '#10B981' : '#FFF',
                cursor: !esLocal ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: !esLocal ? 'none' : 'var(--sombra-md)',
              }}
            >
              {!esLocal ? (
                <>
                  <Check size={16} /> Base actual en ejecución
                </>
              ) : (
                <>
                  <Cloud size={16} /> Cambiar a Base Turso (Cloud)
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Nota informativa de arquitectura */}
      <div style={{
        backgroundColor: 'var(--color-fondo)',
        border: '1px solid var(--color-borde)',
        borderRadius: 'var(--radio-md)',
        padding: '16px 20px',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        fontSize: '0.85rem',
        color: 'var(--color-texto-secundario)',
      }}>
        <Info size={20} color="var(--color-primario)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ color: 'var(--color-texto-principal)' }}>Persistencia y Cambio en Caliente:</strong>
          <p style={{ margin: '4px 0 0 0', lineHeight: '1.45' }}>
            El proveedor seleccionado se almacena de forma desacoplada y persistente en <code>.active_db_provider</code> (en local) y mediante variable de entorno <code>ACTIVE_DB_PROVIDER</code> (en Render/Cloud).
            Al confirmar el cambio, el sistema verifica conectividad y esquema, reinicializa el pool de conexiones en caliente sin matar el proceso del servidor, invalida la sesión activa y redirige a <strong>/login</strong>.
          </p>
        </div>
      </div>

      {/* MODAL: CONFIRMACIÓN DE CAMBIO DE BD EN CALIENTE */}
      {modalCambioAbierto && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: 'var(--color-superficie)',
            borderRadius: 'var(--radio-lg)',
            width: '100%',
            maxWidth: '540px',
            border: '1px solid var(--color-borde)',
            boxShadow: 'var(--sombra-lg)',
            padding: '28px',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--color-texto-principal)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowRightLeft size={20} color="var(--color-primario)" />
              Confirmar cambio de base de datos
            </h3>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-texto-secundario)', lineHeight: '1.5', margin: '0 0 16px 0' }}>
              Se procederá a cambiar el proveedor activo del sistema. Esta acción reinicializará la conexión y cerrará tu sesión para iniciar en la nueva base de datos.
            </p>

            <div style={{ backgroundColor: 'var(--color-fondo)', padding: '16px', borderRadius: 'var(--radio-md)', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--color-texto-terciario)' }}>Base de datos actual:</span>
                <strong style={{ color: 'var(--color-texto-principal)' }}>{info?.current_provider === 'LOCAL' ? 'LOCAL — SQLite' : 'TURSO — Cloud'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--color-texto-terciario)' }}>Nueva base de datos:</span>
                <strong style={{ color: 'var(--color-primario)' }}>{proveedorSeleccionado === 'LOCAL' ? 'LOCAL — SQLite' : 'TURSO — Cloud'}</strong>
              </div>
            </div>

            {/* Resultado de prueba de conexión previa */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-texto-terciario)', marginBottom: '6px' }}>
                Verificación de conectividad y esquema previo:
              </div>

              {probandoConexion ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primario)', fontSize: '0.85rem' }}>
                  <RefreshCw className="anim-spin" size={16} />
                  <span>Comprobando conectividad y tablas requeridas...</span>
                </div>
              ) : resultadoPrueba?.ok ? (
                <div style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: '#10B981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radio-sm)',
                  fontSize: '0.825rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle2 size={16} />
                  <span>{resultadoPrueba.message || 'Conexión y esquema verificados satisfactoriamente.'}</span>
                </div>
              ) : resultadoPrueba?.error ? (
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#EF4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radio-sm)',
                  fontSize: '0.825rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{resultadoPrueba.error}</span>
                </div>
              ) : null}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setModalCambioAbierto(false)}
                disabled={ejecutandoCambio}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radio-md)',
                  border: '1px solid var(--color-borde)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-texto-secundario)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.85rem',
                }}
              >
                Cancelar
              </button>

              <button
                onClick={ejecutarCambioEnCaliente}
                disabled={ejecutandoCambio || probandoConexion || !resultadoPrueba?.ok}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radio-md)',
                  border: 'none',
                  backgroundColor: resultadoPrueba?.ok ? 'var(--color-primario)' : 'var(--color-borde)',
                  color: '#FFF',
                  cursor: resultadoPrueba?.ok ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {ejecutandoCambio ? (
                  <>
                    <RefreshCw className="anim-spin" size={16} />
                    Reinicializando BD...
                  </>
                ) : (
                  'Confirmar y Reiniciar Sesión'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COMPROBAR Y MIGRAR BD LOCAL A TURSO */}
      {modalMigracionAbierto && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: 'var(--color-superficie)',
            borderRadius: 'var(--radio-lg)',
            width: '100%',
            maxWidth: '820px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid var(--color-borde)',
            boxShadow: 'var(--sombra-lg)',
          }}>
            {/* Header modal */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-borde)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Layers size={22} color="var(--color-primario)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--color-texto-principal)' }}>
                  Comprobar y migrar BD local a Turso
                </h3>
              </div>
              <button
                onClick={() => setModalMigracionAbierto(false)}
                disabled={migrando}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-texto-secundario)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenido modal con scroll */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {!reporteMigracion ? (
                <div>
                  <div style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    borderRadius: 'var(--radio-md)',
                    padding: '16px',
                    marginBottom: '20px',
                    fontSize: '0.85rem',
                    color: 'var(--color-texto-secundario)',
                    lineHeight: '1.5'
                  }}>
                    <strong style={{ color: 'var(--color-primario)' }}>Flujo seguro de migración:</strong>
                    <ul style={{ margin: '8px 0 0 18px', padding: 0 }}>
                      <li>Crea un <strong>backup con timestamp</strong> de <code>gestor_actividades.db</code> antes de cualquier operación.</li>
                      <li>Detecta tablas, índices, triggers, constraints y conteo de filas origen.</li>
                      <li>Crea la base de datos Turso con el nombre que especifiques y genera credenciales.</li>
                      <li>Importa una <strong>copia fiel</strong> preservando íntegramente la BD local sin alteraciones.</li>
                      <li>Verifica esquema, conteo de filas y hashes de tablas críticas origen vs destino.</li>
                      <li>Ejecuta pruebas CRUD y validación funcional en todos los módulos (Auth, Kanban, Registros, etc.).</li>
                    </ul>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-texto-principal)', marginBottom: '6px' }}>
                      Nombre de la base de datos en Turso:
                    </label>
                    <input
                      type="text"
                      value={nombreBdTurso}
                      onChange={(e) => setNombreBdTurso(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      disabled={migrando}
                      placeholder="gestor-actividades"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 'var(--radio-md)',
                        border: '1px solid var(--color-borde)',
                        backgroundColor: 'var(--color-fondo)',
                        color: 'var(--color-texto-principal)',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)', marginTop: '4px', display: 'block' }}>
                      Solo letras minúsculas, números y guiones.
                    </span>
                  </div>

                  {migrando && (
                    <div style={{
                      backgroundColor: 'var(--color-fondo)',
                      border: '1px solid var(--color-borde)',
                      borderRadius: 'var(--radio-md)',
                      padding: '20px',
                      textAlign: 'center',
                      marginBottom: '16px',
                    }}>
                      <RefreshCw className="anim-spin" size={32} color="var(--color-primario)" style={{ margin: '0 auto 12px' }} />
                      <div style={{ fontWeight: 600, color: 'var(--color-texto-principal)', fontSize: '0.95rem' }}>
                        Ejecutando proceso de migración y validación...
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-texto-secundario)', marginTop: '6px' }}>
                        {faseMigracion}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* INFORME FINAL DE MIGRACIÓN */
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: 'var(--radio-md)',
                    backgroundColor: reporteMigracion.can_activate_turso ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: reporteMigracion.can_activate_turso ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    marginBottom: '20px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {reporteMigracion.can_activate_turso ? (
                        <CheckCircle2 size={24} color="#10B981" />
                      ) : (
                        <AlertTriangle size={24} color="#EF4444" />
                      )}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: reporteMigracion.can_activate_turso ? '#10B981' : '#EF4444' }}>
                          {reporteMigracion.can_activate_turso ? 'Migración y validación exitosas (100% OK)' : 'Migración con incidencias'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-texto-secundario)' }}>
                          Ejecutado por {reporteMigracion.user} • BD destino: <strong>{reporteMigracion.database_name}</strong>
                        </div>
                      </div>
                    </div>

                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-texto-terciario)' }}>
                      Backup: {reporteMigracion.backup_path ? reporteMigracion.backup_path.split(/[\\/]/).pop() : 'N/A'}
                    </span>
                  </div>

                  {/* Resumen de estados principales */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ backgroundColor: 'var(--color-fondo)', padding: '12px', borderRadius: 'var(--radio-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>Conexión</div>
                      <div style={{ fontWeight: 700, color: reporteMigracion.connection_status === 'OK' ? '#10B981' : '#EF4444' }}>
                        {reporteMigracion.connection_status}
                      </div>
                    </div>
                    <div style={{ backgroundColor: 'var(--color-fondo)', padding: '12px', borderRadius: 'var(--radio-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>Creación BD</div>
                      <div style={{ fontWeight: 700, color: reporteMigracion.db_creation_status === 'OK' ? '#10B981' : '#EF4444' }}>
                        {reporteMigracion.db_creation_status}
                      </div>
                    </div>
                    <div style={{ backgroundColor: 'var(--color-fondo)', padding: '12px', borderRadius: 'var(--radio-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>Migración</div>
                      <div style={{ fontWeight: 700, color: reporteMigracion.migration_status === 'OK' ? '#10B981' : '#EF4444' }}>
                        {reporteMigracion.migration_status}
                      </div>
                    </div>
                    <div style={{ backgroundColor: 'var(--color-fondo)', padding: '12px', borderRadius: 'var(--radio-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>Pruebas Funcionales</div>
                      <div style={{ fontWeight: 700, color: reporteMigracion.tests_status === 'OK' ? '#10B981' : '#EF4444' }}>
                        {reporteMigracion.functional_tests?.passed_count}/{reporteMigracion.functional_tests?.total_tests} OK
                      </div>
                    </div>
                  </div>

                  {/* Tabla de Verificación de Filas */}
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-texto-principal)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileCheck size={16} color="var(--color-primario)" />
                      Comparación de registros por tabla (Origen vs Destino)
                    </h4>

                    <div style={{ border: '1px solid var(--color-borde)', borderRadius: 'var(--radio-md)', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--color-fondo)', borderBottom: '1px solid var(--color-borde)', textAlign: 'left' }}>
                            <th style={{ padding: '8px 12px' }}>Tabla</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right' }}>Filas Local</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right' }}>Filas Turso</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center' }}>Coincidencia</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center' }}>Hash Crítico</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reporteMigracion.verification?.tables_verification?.map((tv, idx) => (
                            <tr key={tv.table} style={{ borderBottom: idx < reporteMigracion.verification.tables_verification.length - 1 ? '1px solid var(--color-borde)' : 'none' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--color-texto-principal)' }}>{tv.table}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{tv.local_rows}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{tv.turso_rows}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                {tv.count_match ? (
                                  <span style={{ color: '#10B981', fontWeight: 700, fontSize: '0.8rem' }}>✓ MATCH</span>
                                ) : (
                                  <span style={{ color: '#EF4444', fontWeight: 700, fontSize: '0.8rem' }}>✗ ERROR</span>
                                )}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                {tv.hash_verified === true && (
                                  <span style={{ color: '#10B981', fontSize: '0.75rem', fontWeight: 600 }}>SHA-256 OK</span>
                                )}
                                {tv.hash_verified === false && (
                                  <span style={{ color: '#EF4444', fontSize: '0.75rem', fontWeight: 600 }}>HASH DIFF</span>
                                )}
                                {tv.hash_verified === null && (
                                  <span style={{ color: 'var(--color-texto-terciario)', fontSize: '0.75rem' }}>—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pruebas funcionales */}
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-texto-principal)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldCheck size={16} color="var(--color-primario)" />
                      Pruebas funcionales y de humo ejecutadas
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '8px' }}>
                      {reporteMigracion.functional_tests?.tests?.map((t) => (
                        <div key={t.test} style={{
                          backgroundColor: 'var(--color-fondo)',
                          padding: '8px 12px',
                          borderRadius: 'var(--radio-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.8rem'
                        }}>
                          <span style={{ color: 'var(--color-texto-principal)' }}>{t.test}</span>
                          <span style={{
                            color: t.passed ? '#10B981' : '#EF4444',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {t.passed ? <Check size={14} /> : <X size={14} />}
                            {t.passed ? 'APROBADA' : 'FALLIDA'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Garantía de rollback */}
                  <div style={{
                    backgroundColor: 'var(--color-superficie)',
                    border: '1px solid var(--color-borde)',
                    borderRadius: 'var(--radio-md)',
                    padding: '12px 16px',
                    fontSize: '0.8rem',
                    color: 'var(--color-texto-terciario)',
                  }}>
                    🛡️ <strong>Garantía de Rollback:</strong> La base local original no ha sido modificada. Si decides activar Turso y posteriormente necesitas volver a SQLite local, puedes alternar nuevamente a LOCAL en cualquier momento sin pérdida de datos.
                  </div>
                </div>
              )}
            </div>

            {/* Footer modal */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-borde)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setModalMigracionAbierto(false)}
                disabled={migrando}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radio-md)',
                  border: '1px solid var(--color-borde)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-texto-secundario)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.85rem',
                }}
              >
                Cerrar
              </button>

              {!reporteMigracion ? (
                <button
                  onClick={iniciarMigracion}
                  disabled={migrando || !nombreBdTurso}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 'var(--radio-md)',
                    border: 'none',
                    background: 'var(--color-primario-gradiente)',
                    color: '#FFF',
                    cursor: migrando ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    boxShadow: 'var(--sombra-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {migrando ? (
                    <>
                      <RefreshCw className="anim-spin" size={16} />
                      Migrando y Validando...
                    </>
                  ) : (
                    'Iniciar Comprobación y Migración'
                  )}
                </button>
              ) : reporteMigracion.can_activate_turso ? (
                <button
                  onClick={() => {
                    setModalMigracionAbierto(false);
                    abrirModalCambio('TURSO');
                  }}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 'var(--radio-md)',
                    border: 'none',
                    backgroundColor: 'var(--color-exito)',
                    color: '#FFF',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: 'var(--sombra-md)',
                  }}
                >
                  <Cloud size={16} />
                  Usar BD Turso (Activar Ahora)
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SistemaBdPage;
