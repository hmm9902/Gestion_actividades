# Gestor de Actividades FCD

## Objetivo

Construir una aplicación web moderna para la gestión de actividades de equipos, con:

- Usuarios, registros y perfiles.
- Gestión de grupos.
- Creación y asignación de actividades.
- Vista Kanban inspirada en Trello.
- Vista tabla.
- Drag & drop persistente.
- Historial de cambios de estado.
- Historial de asignaciones.
- Seguimiento de actividades.
- Alertas de expiración.
- Temas Normal / Dark / Dracula.
- Despliegue continuo en Render.
- Base de datos Turso.
- Arquitectura desacoplada para facilitar una futura migración de BD.

> **SEGURIDAD:** No colocar tokens, API keys, contraseñas ni secretos reales dentro del repositorio. Las credenciales compartidas durante el diseño deben considerarse expuestas y deben rotarse/revocarse antes de usar el proyecto en un entorno real. Utilizar variables de entorno y secretos del proveedor.

---

# Prompt maestro para Antigravity

Copia todo el bloque siguiente como prompt inicial en Antigravity.

```text
Eres un arquitecto de software senior, analista de sistemas, especialista en UX/UI y seguridad web. Diseña y desarrolla una aplicación web moderna de Gestión de Actividades.

OBJETIVO
Crear una aplicación web para gestionar actividades de equipos, usuarios, perfiles, asignaciones, estados y seguimiento, con una interfaz moderna inspirada visualmente en Trello, sin copiar código, branding, imágenes, assets o contenido privado de terceros.

ENTORNO
- IDE principal: Antigravity.
- Código compatible con Visual Studio Code.
- Git como control de versiones.
- README.md completo.
- .env.example.
- Nunca incluir secretos reales en el repositorio.

STACK RECOMENDADO

FRONTEND
- React 19.x + TypeScript.
- Vite 8.x.
- Tailwind CSS 4.x.
- React Router.
- TanStack Query.
- React Hook Form + Zod.
- Librería moderna de drag & drop compatible con React actual.
- Diseño responsive.
- SPA con rutas protegidas.
- UI accesible.

BACKEND
- Python 3.12+.
- FastAPI.
- Pydantic / pydantic-settings.
- SQLAlchemy o Repository Pattern bien encapsulado.
- Autenticación segura.
- OpenAPI.
- pytest.
- Logs estructurados.

BASE DE DATOS
- Turso / SQLite-compatible.
- Variables:
  TURSO_DATABASE_URL
  TURSO_AUTH_TOKEN
- Acceso encapsulado en Repository para facilitar futura migración a PostgreSQL.
- Claves foráneas, índices, UNIQUE/CHECK y timestamps.
- Evitar borrados físicos cuando exista historial.

HOSTING
- Frontend: Render Static Site.
- Backend: Render Web Service.
- Deploy continuo desde Git.
- Secrets solamente en Render Environment.
- Endpoint GET /health.
- CORS restringido al dominio real del frontend.

REFERENCIA VISUAL
Existe una aplicación de referencia:
https://registro-actividades-ssdq.onrender.com/#/configuracion

Usarla solamente como referencia visual y funcional.
Si está disponible:
- Explorar layout, navegación, tablas, formularios, modales, configuración, colores y comportamiento.
- Reutilizar ideas de presentación.
- No copiar código fuente, assets, imágenes, logos o textos protegidos.
Si no está disponible, continuar con el diseño indicado en este prompt.

TEMAS
En Configuración:
- Normal
- Dark
- Dracula

El cambio debe ser inmediato y persistente.

SESION
El sistema necesita manejar:
- registro
- correo
- nombres_completos
- fecha_expiracion
- perfil
- PASSWORD_DOMAIN
- DOMAIN_EMPRESA

REGLA CRÍTICA:
PASSWORD_DOMAIN es sensible.
- Nunca devolverlo al navegador.
- No guardarlo en localStorage/sessionStorage.
- No ponerlo en JWT.
- No escribirlo en logs.
- No devolverlo en /auth/me.
- Si es imprescindible, tratarlo únicamente en backend y protegerlo/cifrarlo.
- El frontend recibe solamente los datos mínimos necesarios.

MENÚS

REGISTROS
- Usuarios
- Registros
- Perfiles

GESTIÓN DE ACTIVIDADES
- Lista Actividades
- Asignación de Grupos
- Gestión de Actividades / Kanban / Tabla

CONFIGURACIÓN
- Normal
- Dark
- Dracula
- Preferencias
- Información de sesión

ROLES

ADMIN
- Acceso total.

SWE
- Gestión funcional completa de actividades.
- Crear actividades.
- Asignar actividades.
- Mover actividades.
- Cambiar estado.
- Registrar seguimiento.
- Consultar información.
- Alertas.

DESARROLLADOR / QA / INTEGRADOR
- Consultar actividades.
- Mover actividades.
- Registrar seguimiento.
- Cambiar estado.

La autorización debe validarse SIEMPRE en backend.

TABLA USUARIOS
- USUARIO_ID
- REGISTRO
- PASSWORD
- FECHA_REGISTRO
- ESTADO: ACTIVO / INACTIVO

TABLA REGISTRO
- REGISTRO_ID
- DNI
- NOMBRES
- REGISTRO
- CORREO
- FECHA_REGISTRO
- FECHA_EXPIRACION
- PERFIL
- EMPRESA
- DOMAIN_EMPRESA
- PASSWORD_DOMAIN
- ESTADO: ACTIVO / INACTIVO

TABLA PERFIL
- PERFIL_ID
- DESCRIPCION
- FECHA_REGISTRO

Perfiles:
ADMIN, SWE, DESARROLLADOR, QA, INTEGRADOR.

TABLA ASIGNACION_GRUPOS
- CODIGO_GRUPO
- NOMBRE_GRUPO
- REGISTRO_PRINCIPAL
- ESTADO_GRUPO
- FECHA_REGISTRO

REGLAS:
- REGISTRO_PRINCIPAL solo puede tener perfil SWE.
- No permitir inactivar un grupo si existen actividades EN_PRD o Finalizado relacionadas.

TABLA ASIGNACION_DET_GRUPOS
- CODIGO_GRUPO_DET
- CODIGO_GRUPO
- REGISTRO
- FECHA_REGISTRO
- ESTADO

REGLAS:
- Solo registros activos pueden ser asignados.
- Evitar duplicados activos del mismo registro en el mismo grupo.

TABLA ACTIVIDADES
- ACTIVIDAD_ID
- CODIGO_ACTIVIDAD
- TIPO_ACTIVIDAD: TAREA / HU_NEGOCIO
- SOLICITADO_POR
- SRT_RATIONAL
- TITULO
- ORDEN_CAMBIO
- DESCRIPCION
- IMPEDIMENTOS
- AREAS_AFECTADAS
- SPRINT: 1/2/3/4/5/6
- Q_TRABAJO: 1/2/3/4
- ASIGNADO_REGISTRO
- SWE_ENCARGADO
- ESTADO
- FECHA_REGISTRO
- FECHA_ACTUALIZACION

REGLAS:
- Solo ADMIN y SWE pueden crear actividades.
- SWE_ENCARGADO por defecto = quien crea la actividad cuando es SWE.
- ASIGNADO_REGISTRO debe pertenecer al grupo permitido.
- ESTADO visible = último estado válido registrado.

TABLA ASIGNADO_DET_REGISTRO
- ASIGNADO_ID
- CODIGO_ACTIVIDAD
- ASIGNADO
- ESTADO
- FECHA_REGISTRO

Cada cambio de asignación debe crear historial.
ACTIVIDADES.ASIGNADO_REGISTRO refleja el último asignado activo.

TABLA ESTADO_DET_ACTIVIDADES
- ESTADO_DET_ID
- CODIGO_ACTIVIDAD
- ESTADO
- FECHA_CAMBIO_ESTADO
- REGISTRO_CAMBIO

Estados:
- registrado
- desarrollo
- certificacion
- Finalizado
- GESTION_PRD
- EN_PRD
- impedimento

Cada cambio de estado:
1. Abrir modal.
2. Mostrar estado actual.
3. Permitir seleccionar nuevo estado.
4. Solicitar motivo obligatorio.
5. Validar permiso.
6. Insertar historial.
7. Actualizar estado actual.
8. Registrar auditoría.
9. Refrescar UI.
10. Mostrar confirmación.

TABLA SEGUIMIENTO
- SEGUIMIENTO_ID
- CODIGO_ACTIVIDAD
- FECHA_REGISTRO
- REGISTRO
- COMENTARIO

Mostrar seguimientos por FECHA_REGISTRO DESC.
Permitir agregar seguimiento.

KANBAN
Inspirarse en la experiencia visual de Trello.

Panel izquierdo:
- Combo de grupo.
- Lista de personas del grupo.
- Al seleccionar persona, filtrar actividades.

Ejemplo:
- MAICOL MIRAMIRA (XS454)
- PIERO YALAN (X15400)

Tarjeta:
- Título
- Código
- Tipo
- Estado
- Asignado
- SWE
- Fecha
- Indicador de impedimento

Colores:
- registrado = amarillo claro
- desarrollo = naranja claro
- certificacion = celeste claro
- Finalizado = gris claro
- GESTION_PRD = verde claro
- EN_PRD = verde oscuro
- impedimento = rojo claro

Usar tokens/variables CSS para los colores.

Cada tarjeta debe tener botón + en la esquina inferior para abrir el detalle.

DRAG & DROP
- Mover tarjetas.
- Persistir la posición.
- Recuperar posiciones al regresar al tablero.
- Persistir en backend.
- Separar estado funcional de posición visual.

MODAL DE DETALLE
Tab 1: Información de actividad.
Tab 2: Asignaciones.
Tab 3: Seguimiento.

TAB 2:
- Tabla ASIGNADO_DET_REGISTRO.
- Asociar nuevo registro.
- Historial.
- Actualizar último asignado activo.

TAB 3:
- Listar seguimientos por fecha descendente.
- Añadir seguimiento.

ALERTAS DE EXPIRACIÓN
Cuando FECHA_EXPIRACION tenga <=10 días y el registro sea SWE:
- mostrar alerta al iniciar sesión;
- mostrarla como tarea pendiente;
- permitir "Retirar mensaje";
- guardar de forma persistente que fue retirada;
- si no se retira, volver a mostrarla al iniciar sesión;
- si está vencida, mostrar alerta diferenciada;
- las validaciones críticas deben estar en backend.

REGLAS DE NEGOCIO
1. No permitir crear actividades a DESARROLLADOR, QA o INTEGRADOR.
2. No permitir asignar usuarios INACTIVOS.
3. No asignar registros fuera del grupo.
4. Solo SWE como REGISTRO_PRINCIPAL.
5. No inactivar grupo con actividades EN_PRD o Finalizado.
6. Cada cambio de estado genera historial.
7. Cada cambio de asignación genera historial.
8. Motivo obligatorio al cambiar estado.
9. Comentario no vacío al registrar seguimiento.
10. CODIGO_ACTIVIDAD único.
11. Validar formato de correo.
12. Aplicar reglas de fechas.
13. Controlar estados/perfiles como catálogos.
14. Backend es la autoridad de permisos y reglas.
15. Las constraints de BD deben reforzar las reglas posibles.

SEGURIDAD
- Argon2id o bcrypt para contraseñas.
- Nunca texto plano.
- Sesiones/tokens con expiración.
- Preferir cookies HttpOnly/Secure/SameSite cuando corresponda.
- Rate limit de login.
- Protección de intentos repetidos.
- CORS restringido.
- Queries parametrizadas.
- Protección XSS.
- CSRF cuando aplique.
- Security headers.
- HTTPS.
- Secretos solo por variables de entorno.
- .env fuera de Git.
- No logs con tokens/contraseñas.
- No stack traces en producción.
- Manejo global de errores.
- No usar PASSWORD_DOMAIN para autenticar la web.
- Si PASSWORD_DOMAIN es imprescindible para una operación, restringirlo al backend y protegerlo.

ADMIN INICIAL
Crear ADMIN mediante bootstrap usando:
BOOTSTRAP_ADMIN_USER
BOOTSTRAP_ADMIN_PASSWORD

No dejar ADMIN/ADMIN en producción.
Forzar cambio de contraseña en el primer acceso.

AUDITORÍA
Crear tabla AUDITORIA recomendada:
- AUDITORIA_ID
- FECHA
- REGISTRO_USUARIO
- ACCION
- ENTIDAD
- ENTIDAD_ID
- DATOS_ANTERIORES
- DATOS_NUEVOS
- IP
- USER_AGENT

Registrar:
- login exitoso/fallido
- cambios de usuarios/perfiles
- creación de actividad
- cambio de estado
- cambio de asignación
- seguimiento
- configuración crítica

API
Diseñar endpoints:
- /api/auth/login
- /api/auth/logout
- /api/auth/me
- /api/usuarios
- /api/registros
- /api/perfiles
- /api/grupos
- /api/grupos/{codigo}/miembros
- /api/actividades
- /api/actividades/{codigo}
- /api/actividades/{codigo}/estado
- /api/actividades/{codigo}/asignaciones
- /api/actividades/{codigo}/seguimiento
- /api/actividades/{codigo}/posicion
- /api/configuracion
- /api/health

Todas las listas grandes:
- paginación
- búsqueda
- filtros
- ordenamiento

UX/UI
- Sidebar colapsable.
- Breadcrumbs.
- Toasts.
- Modales.
- Confirmaciones.
- Loading states.
- Skeletons.
- Empty states.
- Responsive.
- Accesibilidad.
- Buen contraste.
- Navegación por teclado.

VISTAS
Permitir:
- Kanban
- Tabla

Filtros:
- Grupo
- Asignado
- Sprint
- Q de trabajo
- Tipo
- Estado
- búsqueda por código/título/OC/SRT

ESTADO vs POSICIÓN
No modificar el estado funcional solo por arrastrar una tarjeta, excepto que una regla de negocio explícita lo defina.

CALIDAD
Frontend:
- TypeScript estricto
- ESLint
- Prettier

Backend:
- Ruff
- Black
- Tipado fuerte
- pytest

No colocar lógica de negocio compleja en componentes UI.

ESTRUCTURA

root/
  frontend/
  backend/
  docs/
  scripts/
  .env.example
  .gitignore
  README.md

frontend/src/
  app/
  components/
  features/
  layouts/
  pages/
  services/
  hooks/
  lib/
  types/
  styles/

backend/app/
  api/
  core/
  models/
  schemas/
  repositories/
  services/
  security/
  db/
  main.py

backend/tests/

FASES

FASE 1
- auth
- usuarios
- registros
- perfiles
- grupos
- actividades
- Kanban
- cambio de estado
- seguimiento
- temas

FASE 2
- historial de asignaciones
- auditoría
- alertas
- filtros avanzados
- tabla
- reportes

FASE 3
- optimización
- E2E
- observabilidad
- hardening
- backups
- mejoras UX

ANTES DE PROGRAMAR
1. Analiza el requerimiento.
2. Define arquitectura.
3. Identifica ambigüedades.
4. Decide de forma razonable y documenta la decisión.
5. Crea estructura.
6. Construye backend.
7. Construye frontend.
8. Construye migraciones/seed.
9. Implementa pruebas.
10. Configura despliegue.

ENTREGA
Genera código real y ejecutable.
No entregar pseudocódigo cuando pueda entregarse código.
Las instrucciones deben poder copiarse/pegarse.
```

---

# Arquitectura recomendada

```text
                    INTERNET
                       |
                       v
              +------------------+
              |      RENDER      |
              +------------------+
                 |            |
                 v            v
          Static Site      Web Service
           React/Vite       FastAPI
                              |
                              v
                           TURSO
```

La elección del frontend es **React 19 + TypeScript + Vite 8 + Tailwind 4**. React documenta actualmente la versión 19.3; Vite 8 incorporó Rolldown y la línea 8.x está soportada; Tailwind está en la línea 4.3. 

El backend recomendado es **FastAPI + Python**. Su documentación de releases muestra la rama 0.141.x durante 2026.

Turso es SQLite-compatible y dispone de conexión desde Python mediante variables de entorno para URL y token.

---

# Crear el proyecto

## Frontend

```powershell
mkdir gestor-actividades-fcd
cd gestor-actividades-fcd

npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install react-router-dom @tanstack/react-query react-hook-form zod @hookform/resolvers
cd ..
```

Instalar Tailwind CSS siguiendo la instalación actual de Tailwind 4.

## Backend

```powershell
mkdir backend
cd backend

python -m venv .venv
.\.venv\Scripts\activate

python -m pip install --upgrade pip
pip install fastapi "uvicorn[standard]" pydantic-settings sqlalchemy alembic argon2-cffi python-multipart httpx pytest pytest-asyncio

cd ..
```

---

# Variables de entorno

Crear `.env.example`:

```env
APP_ENV=development
APP_NAME=GestorActividadesFCD
APP_SECRET_KEY=CHANGE_ME

TURSO_DATABASE_URL=libsql://YOUR-DATABASE-YOUR-ORG.turso.io
TURSO_AUTH_TOKEN=YOUR_TURSO_TOKEN

SESSION_SECRET=CHANGE_ME
SESSION_EXPIRE_MINUTES=60

BOOTSTRAP_ADMIN_USER=ADMIN
BOOTSTRAP_ADMIN_PASSWORD=CHANGE_ME

CORS_ORIGINS=http://localhost:5173

VITE_API_BASE_URL=http://localhost:8000/api
```

Nunca colocar tokens reales en este archivo.

---

# .gitignore

```gitignore
backend/.venv/
__pycache__/
*.pyc
.pytest_cache/

frontend/node_modules/
frontend/dist/

.env
.env.*
!.env.example

.vscode/
.idea/

*.log
Thumbs.db
.DS_Store
```

---

# Ejecutar localmente

## Backend

```powershell
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Abrir:

```text
http://localhost:8000
```

Swagger:

```text
http://localhost:8000/docs
```

Health:

```text
http://localhost:8000/health
```

## Frontend

En otra terminal:

```powershell
cd frontend
npm run dev
```

Abrir:

```text
http://localhost:5173
```

---

# Render

## Frontend

Tipo:

```text
Static Site
```

Build Command:

```bash
npm install && npm run build
```

Publish Directory:

```text
frontend/dist
```

## Backend

Tipo:

```text
Web Service
```

Build Command:

```bash
pip install -r requirements.txt
```

Start Command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Las Static Sites de Render son gratuitas y soportan despliegue automático desde Git. Render también dispone de instancias gratuitas para algunos Web Services, con limitaciones y orientadas a proyectos de prueba/hobby. 

---

# Turso

Utilizar únicamente:

```text
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
```

El backend debe leerlos desde el entorno.

No usar un token Turso en JavaScript del frontend.

La documentación actual de Turso para Python recomienda utilizar variables de entorno para la URL de la base y el token en conexiones remotas.

---

# Seguridad de las credenciales proporcionadas

Las credenciales reales compartidas durante la conversación **no deben copiarse en este README ni en código**.

Antes de desplegar:

1. Revocar/rotar la API Key de Turso compartida.
2. Revocar/rotar la API Key de Render compartida.
3. Crear nuevas credenciales.
4. Guardarlas como Secrets/Environment Variables.
5. Revisar Git para comprobar que ningún secreto haya quedado comprometido.

---

# Backup

Mantener una copia independiente de la BD.

Como Turso mantiene compatibilidad con SQLite, la estrategia debe incluir:

- exportación lógica SQL;
- procedimiento de restauración;
- backup periódico;
- documentación de recuperación.

No depender de un único mecanismo de backup.

---

# Orden de implementación

```text
1. Crear repositorio
2. Crear frontend
3. Crear backend
4. Configurar variables
5. Configurar Turso
6. Migraciones
7. Seed de perfiles
8. Seed de ADMIN
9. Login
10. Usuarios
11. Registros
12. Grupos
13. Actividades
14. Historial
15. Kanban
16. Drag & drop persistente
17. Seguimiento
18. Alertas
19. Temas
20. Auditoría
21. Tests
22. Render
23. Deploy
```

---

# Aplicación de referencia

La URL entregada para usar como referencia visual fue:

```text
https://registro-actividades-ssdq.onrender.com/#/configuracion
```

Durante la preparación de este README el acceso web devolvió **HTTP 503 Service Unavailable**, por lo que no fue posible inspeccionar sus pantallas de forma fiable. El prompt indica a Antigravity que vuelva a explorarla cuando esté disponible.

---

# Resultado esperado

```text
+-------------------------------------------------------------+
| Logo | Gestor de Actividades                 Usuario | ⚙    |
+-------------------------------------------------------------+
| Sidebar             | Kanban / Tabla                         |
|                     |                                       |
| REGISTROS           | [Registrado] [Desarrollo] [QA] ...    |
|  Usuarios           |                                       |
|  Registros          | [Actividad] [Actividad]              |
|  Perfiles           |                                       |
|                     |                                       |
| GESTIÓN             | [Actividad] [Actividad]              |
|  Actividades        |                                       |
|  Grupos             |                                       |
|                     |                                       |
| CONFIGURACIÓN       |                                       |
|  Normal             |                                       |
|  Dark               |                                       |
|  Dracula            |                                       |
+-------------------------------------------------------------+
```

Prioridades del sistema:

- simplicidad;
- trazabilidad;
- seguridad;
- rapidez;
- mantenibilidad;
- separación frontend/backend;
- despliegue continuo;
- posibilidad de migración futura;
- experiencia visual moderna.
