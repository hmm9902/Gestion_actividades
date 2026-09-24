import React, { useState } from 'react';
import { 
  Sun, Moon, Sparkles, User, ShieldCheck, 
  Lock, CheckCircle2, ShieldAlert, KeyRound 
} from 'lucide-react';
import { useTema } from '../hooks/useTema';
import { useAuth } from '../hooks/useAuth';
import { TemaTipo } from '../types';
import { apiRequest } from '../lib/api';
import { useNotificacion } from '../context/NotificacionContext';

export const ConfiguracionPage: React.FC = () => {
  const { tema, cambiarTema } = useTema();
  const { usuario } = useAuth();
  const { exito, error: notifyError } = useNotificacion();

  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [guardando, setGuardando] = useState(false);

  const temasOpciones: { id: TemaTipo; titulo: string; desc: string; icon: React.ReactNode; colorPrimario: string; bgDemo: string }[] = [
    {
      id: 'normal',
      titulo: 'Normal (Financiero Esmeralda)',
      desc: 'Interfaz clara y moderna con paleta esmeralda (#00875A), fondos blancos limpios y contraste óptimo.',
      icon: <Sun size={24} color="#00875A" />,
      colorPrimario: '#00875A',
      bgDemo: '#FFFFFF',
    },
    {
      id: 'dark',
      titulo: 'Dark (Modo Oscuro)',
      desc: 'Aspecto nocturno refinado (#0B1120) que minimiza la fatiga visual con acentos esmeralda brillantes.',
      icon: <Moon size={24} color="#10B981" />,
      colorPrimario: '#10B981',
      bgDemo: '#1E293B',
    },
    {
      id: 'dracula',
      titulo: 'Dracula (Púrpura & Cyan)',
      desc: 'Esquema de color de alto contraste con tonos violeta (#BD93F9) y rosa (#FF79C6) inspirados en el tema Dracula.',
      icon: <Sparkles size={24} color="#BD93F9" />,
      colorPrimario: '#BD93F9',
      bgDemo: '#282A36',
    },
  ];

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordNuevo !== passwordConfirm) {
      notifyError('Las contraseñas nuevas no coinciden.');
      return;
    }
    if (passwordNuevo.length < 6) {
      notifyError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setGuardando(true);
      await apiRequest('/auth/cambiar-password', {
        method: 'POST',
        body: JSON.stringify({
          password_actual: passwordActual,
          password_nuevo: passwordNuevo,
        }),
      });
      exito('Contraseña actualizada correctamente.');
      setPasswordActual('');
      setPasswordNuevo('');
      setPasswordConfirm('');
    } catch (err: any) {
      notifyError(err.message || 'Error al actualizar contraseña');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '960px' }}>
      
      {/* Encabezado */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-texto-principal)' }}>
          Configuración y Preferencias
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>
          Personaliza los temas visuales, revisa los datos de tu sesión y actualiza tus credenciales
        </p>
      </div>

      {/* SECCIÓN 1: TEMAS VISUALES */}
      <div style={{
        backgroundColor: 'var(--color-superficie)',
        border: '1px solid var(--color-borde)',
        borderRadius: 'var(--radio-lg)',
        padding: '24px',
        boxShadow: 'var(--sombra-sm)',
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-texto-principal)' }}>
          Temas del Sistema
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)', marginBottom: '16px' }}>
          El cambio es instantáneo y se guarda automáticamente en tu navegador.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {temasOpciones.map(t => {
            const activo = tema === t.id;
            return (
              <div
                key={t.id}
                onClick={() => cambiarTema(t.id)}
                style={{
                  border: `2px solid ${activo ? 'var(--color-primario)' : 'var(--color-borde)'}`,
                  borderRadius: 'var(--radio-md)',
                  padding: '18px',
                  backgroundColor: activo ? 'var(--color-primario-suave)' : 'var(--color-fondo)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'all var(--transicion-rapida)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {t.icon}
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-texto-principal)' }}>
                        {t.titulo}
                      </span>
                    </div>
                    {activo && (
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--color-primario)',
                      }}>
                        <CheckCircle2 size={16} /> Activo
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-texto-secundario)', lineHeight: '1.4' }}>
                    {t.desc}
                  </p>
                </div>

                {/* Vista previa de muestra de colores */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  borderRadius: 'var(--radio-sm)',
                  backgroundColor: t.bgDemo,
                  border: '1px solid rgba(0,0,0,0.1)',
                }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: t.colorPrimario }} />
                  <span style={{ fontSize: '0.725rem', color: t.id === 'normal' ? '#0F172A' : '#F8FAFC' }}>
                    Ejemplo de superficie
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN 2: INFORMACIÓN DE SESIÓN */}
      {usuario && (
        <div style={{
          backgroundColor: 'var(--color-superficie)',
          border: '1px solid var(--color-borde)',
          borderRadius: 'var(--radio-lg)',
          padding: '24px',
          boxShadow: 'var(--sombra-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <User size={20} color="var(--color-primario)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-texto-principal)' }}>
              Información de Sesión Activa
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)', marginBottom: '16px' }}>
            Datos del usuario autenticado actualmente en la plataforma.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div style={{ padding: '12px', backgroundColor: 'var(--color-fondo)', borderRadius: 'var(--radio-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>Registro</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{usuario.registro}</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--color-fondo)', borderRadius: 'var(--radio-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>Nombres Completos</div>
              <div style={{ fontWeight: 600 }}>{usuario.nombres_completos}</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--color-fondo)', borderRadius: 'var(--radio-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>Correo Electrónico</div>
              <div style={{ fontWeight: 600 }}>{usuario.correo}</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--color-fondo)', borderRadius: 'var(--radio-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>Perfil Asignado</div>
              <div style={{ fontWeight: 700, color: 'var(--color-primario)' }}>{usuario.perfil}</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--color-fondo)', borderRadius: 'var(--radio-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>Empresa / Dominio</div>
              <div style={{ fontWeight: 600 }}>{usuario.empresa} ({usuario.domain_empresa})</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--color-fondo)', borderRadius: 'var(--radio-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>Fecha de Expiración</div>
              <div style={{ fontWeight: 600 }}>{usuario.fecha_expiracion || 'Sin límite definido'}</div>
            </div>
          </div>

          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: 'var(--color-primario-suave)',
            borderRadius: 'var(--radio-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.8rem',
            color: 'var(--color-primario)',
          }}>
            <ShieldCheck size={18} />
            <span>
              <strong>Garantía de Confidencialidad:</strong> Conforme a las reglas de negocio, <code>PASSWORD_DOMAIN</code> nunca se devuelve ni expone al cliente.
            </span>
          </div>
        </div>
      )}

      {/* SECCIÓN 3: CAMBIO DE CONTRASEÑA */}
      <div style={{
        backgroundColor: 'var(--color-superficie)',
        border: '1px solid var(--color-borde)',
        borderRadius: 'var(--radio-lg)',
        padding: '24px',
        boxShadow: 'var(--sombra-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <KeyRound size={20} color="var(--color-primario)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-texto-principal)' }}>
            Seguridad: Actualizar Contraseña
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)', marginBottom: '16px' }}>
          Mantén tu cuenta protegida mediante contraseñas robustas.
        </p>

        <form onSubmit={handleCambiarPassword} style={{ maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label className="form-label">Contraseña Actual *</label>
            <input
              type="password"
              className="form-input"
              value={passwordActual}
              onChange={e => setPasswordActual(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="form-label">Nueva Contraseña *</label>
            <input
              type="password"
              className="form-input"
              value={passwordNuevo}
              onChange={e => setPasswordNuevo(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="form-label">Confirmar Nueva Contraseña *</label>
            <input
              type="password"
              className="form-input"
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primario"
            style={{ width: 'fit-content', marginTop: '6px' }}
            disabled={guardando}
          >
            {guardando ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
          </button>
        </form>
      </div>

    </div>
  );
};
