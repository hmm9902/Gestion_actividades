# Gestor de Actividades FCD

Sistema web moderno e integral para la gestión de actividades de equipos, con tablero Kanban inspirado en Trello, vista en tabla, drag & drop persistente, historial inmutable de estados y asignaciones, seguimiento cronológico, alertas para perfiles SWE, selector de temas (Normal / Dark / Dracula) y base de datos compatible con Turso/SQLite.

---

## 🚀 Características Principales

- **Tablero Kanban Interactivo**: 7 estados de flujo de trabajo con drag & drop y persistencia de posición visual en base de datos.
- **Panel Lateral de Squad**: Selector de grupos y lista de colaboradores con filtrado dinámico de actividades.
- **Vista Alternativa en Tabla**: Buscador global por código, título, OC o SRT; filtros avanzados por Sprint, Q, Tipo y Estado con ordenamiento y paginación.
- **Reglas de Negocio en Backend**:
  - Creación de actividades restringida a perfiles `ADMIN` y `SWE`.
  - Autoasignación por defecto de `SWE_ENCARGADO` al creador SWE.
  - Validación de que el asignado pertenezca forzosamente a los miembros activos del grupo.
  - Bloqueo de inactivación de grupos que contengan tareas en `EN_PRD` o `Finalizado`.
  - Exigencia estricta de motivo obligatorio en cada cambio de estado con auditoría inmutable.
- **Alertas de Expiración SWE**: Notificación automática cuando la fecha de expiración es $\le 10$ días, con opción de "Retirar mensaje" persistida.
- **Temas Visuales Inmediatos**: Soporte integrado para temas **Normal** (financiero esmeralda), **Dark** (modo oscuro moderno) y **Dracula** (púrpura y alto contraste).
- **Seguridad Robusta**: Hashing con Bcrypt/Argon2, tokens JWT, cabeceras de seguridad HTTP y **cero exposición** del dato confidencial `PASSWORD_DOMAIN`.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 8/6, CSS Moderno con Tokens de Diseño, React Router, Lucide Icons |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy, Pydantic v2, PyJWT, Pytest |
| **Base de Datos** | Turso (libsql) / SQLite local (patrón Repository desacoplado) |
| **Despliegue** | Render (Static Site para Frontend, Web Service para Backend) |

---

## 📁 Estructura del Repositorio

```text
d:\Proyectos_Anti\
├── .gitignore
├── .env.example
├── README.md
├── README_gestor.md
├── docs/
│   └── arquitectura.md
├── scripts/
│   └── backup.py
├── backend/
│   ├── requirements.txt
│   ├── gestor_actividades.db
│   ├── app/
│   │   ├── main.py
│   │   ├── core/ (config.py, security.py)
│   │   ├── db/ (session.py)
│   │   ├── models/ (entities.py)
│   │   ├── schemas/ (schemas.py)
│   │   ├── repositories/ (usuario_repo.py, grupo_repo.py, actividad_repo.py, auditoria_repo.py)
│   │   ├── services/ (auth_service.py, grupo_service.py, actividad_service.py)
│   │   ├── scripts/ (bootstrap.py)
│   │   └── api/v1/ (auth.py, actividades.py, grupos.py, registros.py, usuarios.py, perfiles.py, auditoria.py, health.py)
│   └── tests/
│       ├── conftest.py
│       ├── test_auth.py
│       ├── test_actividades.py
│       └── test_grupos.py
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── styles/ (variables.css, index.css)
        ├── types/ (index.ts)
        ├── lib/ (api.ts)
        ├── hooks/ (useAuth.tsx, useTema.tsx)
        ├── context/ (NotificacionContext.tsx)
        ├── components/
        │   ├── layout/ (Sidebar.tsx, Topbar.tsx, AppLayout.tsx)
        │   ├── kanban/ (TableroKanban.tsx, ModalCambioEstado.tsx, ModalDetalleActividad.tsx, ModalNuevaActividad.tsx)
        │   └── tabla/ (TablaActividades.tsx)
        └── pages/ (LoginPage.tsx, ActividadesPage.tsx, GruposPage.tsx, RegistrosPage.tsx, UsuariosPage.tsx, PerfilesPage.tsx, ConfiguracionPage.tsx, AuditoriaPage.tsx)
```

---

## 💻 Ejecución Local

### 1. Prerrequisitos
- Node.js (v20+) y npm
- Python (v3.11+)

### 2. Configurar Variables de Entorno
Copia el archivo `.env.example` a `.env`:
```powershell
cp .env.example .env
```

### 3. Levantar el Backend (FastAPI)
```powershell
cd backend
# Activar entorno virtual
.\.venv\Scripts\activate

# Inicializar BD y sembrar datos de prueba (si es primera vez)
python -m app.scripts.bootstrap

# Iniciar servidor Uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API Base: `http://localhost:8000`
- Documentación Swagger: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### 4. Levantar el Frontend (React + Vite)
En otra terminal:
```powershell
cd frontend
npm install
npm run dev
```
- Aplicación Web: `http://localhost:5173`

---

## 🔑 Credenciales de Demostración

| Usuario (Registro) | Contraseña | Perfil | Descripción |
|---|---|---|---|
| **ADMIN** | `Admin123*Seguro` | ADMIN | Administrador total del sistema |
| **XS454** | `Password123*` | SWE | Líder Técnico de Squad (tiene alerta $\le 10$ días activa) |
| **X15400** | `Password123*` | DESARROLLADOR | Desarrollador de Squad Canales Digitales |
| **X89201** | `Password123*` | QA | Certificador de Calidad |
| **X33012** | `Password123*` | INTEGRADOR | Integrador de Pases y PRD |

---

## 🧪 Pruebas Automatizadas

Para ejecutar la suite de pruebas unitarias y de integración del backend:
```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests -v
```

Para verificar la compilación y tipado del frontend:
```powershell
cd frontend
npm run build
```

---

## ☁️ Despliegue en Render

### Frontend (Render Static Site)
- **Tipo**: Static Site
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `frontend/dist`
- **Variable de Entorno**:
  - `VITE_API_BASE_URL`: `https://tu-backend.onrender.com/api`

### Backend (Render Web Service)
- **Tipo**: Web Service (Python 3)
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Root Directory**: `backend`
- **Health Check Path**: `/health`
- **Variables de Entorno en Render**:
  - `APP_ENV`: `production`
  - `SESSION_SECRET`: Generar clave aleatoria segura
  - `CORS_ORIGINS`: URL del frontend en Render
  - `TURSO_DATABASE_URL`: `libsql://tu-db-tu-org.turso.io`
  - `TURSO_AUTH_TOKEN`: Token de autenticación de Turso

---

## 🗄️ Base de Datos Turso

Para conectar con una base de datos remota en Turso, simplemente configura en tus variables de entorno:
```env
TURSO_DATABASE_URL=libsql://YOUR-DATABASE-YOUR-ORG.turso.io
TURSO_AUTH_TOKEN=YOUR_TURSO_TOKEN
```
El repositorio encapsula la conexión mediante SQLAlchemy, permitiendo alternar de forma transparente entre SQLite local en desarrollo y Turso/libsql en producción.

---

## 💾 Respaldo y Restauración de Base de Datos

El proyecto incluye la utilidad `scripts/backup.py` para generar volcados SQL lógicos y restauraciones:

### Crear un respaldo:
```powershell
python scripts/backup.py --backup --db backend/gestor_actividades.db --outdir backups
```

### Restaurar desde un respaldo:
```powershell
python scripts/backup.py --restore backups/backup_gestor_YYYYMMDD_HHMMSS.sql --db backend/gestor_actividades.db
```
