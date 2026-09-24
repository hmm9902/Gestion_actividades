import React, { createContext, useContext, useEffect, useState } from 'react';
import { UsuarioMe } from '../types';
import { apiRequest, setToken, getToken } from '../lib/api';

interface AuthContextType {
  usuario: UsuarioMe | null;
  loading: boolean;
  login: (registro: string, pass: string) => Promise<void>;
  logout: () => void;
  retirarAlerta: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<UsuarioMe | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const cargarUsuario = async () => {
    const token = getToken();
    if (!token) {
      setUsuario(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest<UsuarioMe>('/auth/me');
      setUsuario(data);
    } catch (e) {
      setToken(null);
      setUsuario(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuario();

    const handleUnauthorized = () => {
      setUsuario(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (registro: string, pass: string) => {
    const data = await apiRequest<{ access_token: string; usuario: UsuarioMe }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ registro, password: pass }),
    });
    setToken(data.access_token);
    setUsuario(data.usuario);
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignorar error al salir
    } finally {
      setToken(null);
      setUsuario(null);
    }
  };

  const retirarAlerta = async () => {
    await apiRequest('/auth/retirar-alerta', { method: 'POST' });
    if (usuario) {
      setUsuario({ ...usuario, alerta_retirada: true });
    }
  };

  return (
    <AuthContext.Provider value={{
      usuario,
      loading,
      login,
      logout,
      retirarAlerta,
      refetchUser: cargarUsuario,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return ctx;
};
