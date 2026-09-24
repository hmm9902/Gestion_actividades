import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Lock, User, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNotificacion } from '../context/NotificacionContext';

export const LoginPage: React.FC = () => {
  const [registro, setRegistro] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const { exito, error: notifyError } = useNotificacion();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registro.trim() || !password) {
      setError('Por favor ingresa tu registro y contraseña.');
      return;
    }

    try {
      setCargando(true);
      setError(null);
      await login(registro.trim().toUpperCase(), password);
      exito('Bienvenido al Gestor de Actividades.');
      navigate('/actividades');
    } catch (err: any) {
      const msg = err.message || 'Credenciales incorrectas o usuario inactivo';
      setError(msg);
      notifyError(msg);
    } finally {
      setCargando(false);
    }
  };

  const seleccionarDemo = (reg: string, pass: string) => {
    setRegistro(reg);
    setPassword(pass);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-fondo)',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: 'var(--color-superficie)',
        border: '1px solid var(--color-borde)',
        borderRadius: 'var(--radio-xl)',
        boxShadow: 'var(--sombra-xl)',
        padding: '36px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}>
        {/* Logo y Encabezado */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: 'var(--radio-lg)',
            background: 'var(--color-primario-gradiente)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: 'var(--sombra-md)',
            marginBottom: '16px',
          }}>
            <Layers size={28} />
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-texto-principal)', letterSpacing: '-0.5px' }}>
            Gestor de Actividades
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-texto-secundario)', marginTop: '4px' }}>
            Acceso al Sistema de Seguimiento
          </p>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div style={{
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            padding: '12px 14px',
            borderRadius: 'var(--radio-md)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Código de Registro (Usuario)</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-texto-terciario)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '38px', textTransform: 'uppercase' }}
                placeholder="ADMIN o XS454"
                value={registro}
                onChange={e => setRegistro(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="form-label">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-texto-terciario)' }} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '38px' }}
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primario"
            style={{ width: '100%', padding: '11px', marginTop: '6px' }}
            disabled={cargando}
          >
            {cargando ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Accesos rápidos de prueba */}
        <div style={{
          backgroundColor: 'var(--color-fondo)',
          border: '1px solid var(--color-borde)',
          borderRadius: 'var(--radio-md)',
          padding: '14px',
          fontSize: '0.8rem',
          display: 'none'
        }}>
          <div style={{ fontWeight: 600, color: 'var(--color-texto-principal)', marginBottom: '8px' }}>
            Credenciales de Demostración:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              type="button"
              onClick={() => seleccionarDemo('ADMIN', 'Admin123*Seguro')}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: 'var(--radio-sm)',
                backgroundColor: 'var(--color-superficie)',
                border: '1px solid var(--color-borde)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span><strong>ADMIN</strong> (Administrador Total)</span>
              <span style={{ color: 'var(--color-primario)' }}>Autollenar</span>
            </button>
            <button
              type="button"
              onClick={() => seleccionarDemo('XS454', 'Password123*')}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: 'var(--radio-sm)',
                backgroundColor: 'var(--color-superficie)',
                border: '1px solid var(--color-borde)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span><strong>XS454</strong> (Líder SWE con alerta)</span>
              <span style={{ color: 'var(--color-primario)' }}>Autollenar</span>
            </button>
            <button
              type="button"
              onClick={() => seleccionarDemo('X15400', 'Password123*')}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: 'var(--radio-sm)',
                backgroundColor: 'var(--color-superficie)',
                border: '1px solid var(--color-borde)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span><strong>X15400</strong> (Desarrollador)</span>
              <span style={{ color: 'var(--color-primario)' }}>Autollenar</span>
            </button>
          </div>
        </div>

        {/* Nota de Seguridad */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.725rem', color: 'var(--color-texto-terciario)', justifyContent: 'center' }}>
          <ShieldCheck size={14} color="var(--color-primario)" />
          <span>Seguridad corporativa reforzada. PASSWORD_DOMAIN aislado.</span>
        </div>

      </div>
    </div>
  );
};
