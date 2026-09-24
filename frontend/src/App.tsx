import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { TemaProvider } from './hooks/useTema';
import { NotificacionProvider } from './context/NotificacionContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { ActividadesPage } from './pages/ActividadesPage';
import { GruposPage } from './pages/GruposPage';
import { RegistrosPage } from './pages/RegistrosPage';
import { ProyectosPage } from './pages/ProyectosPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { PerfilesPage } from './pages/PerfilesPage';
import { ConfiguracionPage } from './pages/ConfiguracionPage';
import { AuditoriaPage } from './pages/AuditoriaPage';
import { SistemaBdPage } from './pages/SistemaBdPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <TemaProvider>
        <AuthProvider>
          <NotificacionProvider>
            <Routes>
              {/* Ruta pública */}
              <Route path="/login" element={<LoginPage />} />

              {/* Rutas protegidas dentro de AppLayout */}
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Navigate to="/actividades" replace />} />
                <Route path="actividades" element={<ActividadesPage />} />
                <Route path="grupos" element={<GruposPage />} />
                <Route path="registros" element={<RegistrosPage />} />
                <Route path="proyectos" element={<ProyectosPage />} />
                <Route path="usuarios" element={<UsuariosPage />} />
                <Route path="perfiles" element={<PerfilesPage />} />
                <Route path="configuracion" element={<ConfiguracionPage />} />
                <Route path="auditoria" element={<AuditoriaPage />} />
                <Route path="sistema/bd" element={<SistemaBdPage />} />
              </Route>

              {/* Redirección por defecto */}
              <Route path="*" element={<Navigate to="/actividades" replace />} />
            </Routes>
          </NotificacionProvider>
        </AuthProvider>
      </TemaProvider>
    </BrowserRouter>
  );
};

export default App;
