# Arquitectura y Diseño del Sistema: Gestor de Actividades FCD

## 1. Visión General

El **Gestor de Actividades FCD** es una solución integral diseñada para organizar, monitorear y gobernar las actividades técnicas e historias de usuario de los equipos de desarrollo, garantizando:

- Trazabilidad total de asignaciones y estados.
- Seguridad estricta y aislamiento de credenciales sensibles.
- Desacoplamiento entre la posición visual del tablero Kanban y el estado funcional de las actividades.
- Persistencia optimizada en Turso / SQLite con capacidad de migración a PostgreSQL sin cambios en la capa de negocio.

---

## 2. Diagrama de Arquitectura

```
                        INTERNET / NAVEGADOR
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │    PLATAFORMA RENDER  │
                     └───────────────────────┘
                         │               │
                         ▼               ▼
                 ┌──────────────┐ ┌──────────────┐
                 │ Static Site  │ │ Web Service  │
                 │ React 19+Vite│ │ FastAPI      │
                 └──────────────┘ └──────────────┘
                                         │
                                         ▼
                                  ┌──────────────┐
                                  │ TURSO/SQLite │
                                  └──────────────┘
```

---

## 3. Modelo de Dominio y Capas

### 3.1 Backend (FastAPI + SQLAlchemy)
- **`app/core/`**: Configuración unificada mediante `pydantic-settings`, gestión de variables de entorno y utilidades criptográficas con `bcrypt` y JWT.
- **`app/models/`**: Entidades ORM con restricciones de integridad referencial (`ON DELETE RESTRICT`), índices en campos de búsqueda y claves únicas.
- **`app/repositories/`**: Patrón Repositorio que encapsula las consultas SQL y transacciones, aislando la lógica de datos de la lógica de aplicación.
- **`app/services/`**: Capa de negocio donde residen las validaciones de permisos, reglas de equipos, exigencia de motivos en cambios de estado y registro automático en bitácora de auditoría.
- **`app/api/`**: Controladores REST con documentación OpenAPI automática (`/docs`), inyección de dependencias (`deps.py`) y serializadores Pydantic v2.

### 3.2 Frontend (React 19 + TypeScript + Vite)
- **Arquitectura de Componentes**: Separación entre componentes de presentación (`comunes/`, `kanban/`, `tabla/`) y contenedores de vista (`pages/`).
- **Estado Global y Contextos**: `AuthContext` (sesión y tokens), `TemaContext` (conmutación en tiempo real entre Normal, Dark y Dracula) y `NotificacionContext` (toasts accesibles).
- **Tablero Kanban**: Flujo Drag & Drop fluido con persistencia en backend mediante `/api/actividades/{codigo}/posicion`.
- **Protección de Datos**: Los modelos TypeScript del frontend omiten por diseño cualquier campo sensible como `PASSWORD_DOMAIN`.

---

## 4. Reglas Críticas de Negocio

1. **Creación de Actividades**: Solo usuarios con perfil `ADMIN` o `SWE` pueden crear actividades. Si un `SWE` es el creador, se establece por defecto como `SWE_ENCARGADO`.
2. **Líder de Squad**: El `REGISTRO_PRINCIPAL` de la tabla `ASIGNACION_GRUPOS` debe contar obligatoriamente con el perfil `SWE`.
3. **Protección de Grupos**: No se permite inactivar un grupo si tiene actividades asociadas en estados `EN_PRD` o `Finalizado`.
4. **Validación de Asignaciones**: Todo colaborador asignado a una actividad debe ser miembro activo del grupo al que pertenece dicha actividad.
5. **Historial Inmutable de Estados**: Cada cambio de estado exige seleccionar el nuevo estado e ingresar un **motivo obligatorio**. Se registra en `ESTADO_DET_ACTIVIDADES` junto con la fecha y el usuario responsable.
6. **Alertas de Expiración**: Si un colaborador con perfil `SWE` tiene `FECHA_EXPIRACION <= 10 días`, el sistema genera una alerta al iniciar sesión con opción de "Retirar mensaje" de forma persistente.
