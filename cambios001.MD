# Bitácora de Cambios - Requerimiento 001: Campo VISIBLE en Proyectos

**Fecha de Implementación:** 2026-09-27  
**Sistema:** Gestor de Actividades y Pases  
**Solicitud:** En la pantalla "Editar Proyecto" añadir un nuevo campo llamado `VISIBLE` con opciones `SI` / `NO`. Cuando esté en `SI` será posible elegirlo en cualquiera de las otras pantallas, pero cuando está en `NO` ya no es visible ni seleccionable en los combos/listas desplegables de ninguna otra pantalla, evitando la sobrecarga visual y operativa.

---

## 1. Resumen de la Solución

Se implementó un mecanismo integral de control de visibilidad para iniciativas y proyectos:
1. **Base de Datos:** Se incorporó el campo `VISIBLE VARCHAR(2) DEFAULT 'SI'` en la tabla `PROYECTOS` tanto en SQLite local (`backend/gestor_actividades.db` y `gestor_actividades.db`) como en la nube en **Turso** (`app.turso.tech`).
2. **Backend:** Se extendieron los modelos de datos, esquemas Pydantic de validación estricta (`Literal["SI", "NO"]`), consultas en repositorios y el endpoint de catálogo con soporte para filtro `?visible=SI` o `?visible=NO`.
3. **Frontend - Mantenimiento de Proyectos:**
   - En el modal **"Editar Proyecto"** se agregó el selector interactivo **VISIBLE** (`SI` / `NO`) con mensaje de advertencia dinámico.
   - En el modal **"Nuevo Proyecto"** se añadió el campo **VISIBLE** (por defecto `SI`).
   - En la **Tabla de Proyectos** se incorporó la columna `Visible` con badges de color (verde para `SI`, rojo para `NO`) y filtro rápido en cabecera.
   - En la **Exportación Excel** se añadió la columna correspondiente.
4. **Frontend - Filtro en Pantallas y Combos:**
   - **Kanban / Nueva Actividad:** Solo se cargan y muestran proyectos visibles.
   - **Pases (Creación, Edición y Filtro):** Los selectores excluyen proyectos con `VISIBLE = 'NO'`, protegiendo además los valores previamente asignados en pases históricos.
   - **Tickets (Creación y Edición):** La lista de proyectos disponibles excluye proyectos ocultos para evitar sobrecarga.

---

## 2. Modificaciones en Base de Datos (SQLite Local y Turso Cloud)

### 2.1 Sentencias SQL Ejecutadas (DDL & DML)

```sql
-- 1. Agregar columna VISIBLE a la tabla PROYECTOS con valor por defecto 'SI'
ALTER TABLE PROYECTOS ADD COLUMN VISIBLE VARCHAR(2) NOT NULL DEFAULT 'SI';

-- 2. Asegurar que los registros existentes tengan el valor 'SI'
UPDATE PROYECTOS SET VISIBLE = 'SI' WHERE VISIBLE IS NULL OR VISIBLE = '';

-- 3. Verificación de estructura
PRAGMA table_info('PROYECTOS');
```

### 2.2 Bases de Datos Actualizadas
- **Backend SQLite:** `d:\Proyectos_Anti\backend\gestor_actividades.db` (348 KB)
- **Raíz SQLite:** `d:\Proyectos_Anti\gestor_actividades.db` (348 KB)
- **Turso Cloud Database:** `https://gestor-actividades-anarchy9902.aws-us-east-1.turso.io`

### 2.3 Mecanismo de Migración Automática y Homologación
- En `backend/app/main.py` (función `lifespan`), se agregó una verificación DDL en el arranque del servidor que comprueba automáticamente si la columna `VISIBLE` existe en SQLite y la crea si hace falta.
- En `backend/app/scripts/sync_homologacion.py`, se integró la verificación de la columna en el proceso de replicación.
- **Resultado de Homologación:** 16 de 16 tablas 100% homologadas idénticamente entre SQLite y Turso Cloud.

---

## 3. Matriz de Archivos Afectados

| Componente | Archivo | Tipo de Cambio | Descripción del Cambio |
| :--- | :--- | :--- | :--- |
| **BD SQLite** | `backend/gestor_actividades.db` | Modificado | Se agregó la columna `VISIBLE VARCHAR(2) NOT NULL DEFAULT 'SI'` y se actualizaron los 9 proyectos existentes a `SI`. |
| **BD SQLite** | `gestor_actividades.db` | Modificado | Copia homologada idéntica de la base de datos local en la raíz del proyecto. |
| **Backend** | `backend/app/models/entities.py` | Modificado | Se añadió el atributo de modelo `VISIBLE = Column(String(2), nullable=False, default="SI")` y su sinónimo `visible = synonym("VISIBLE")`. |
| **Backend** | `backend/app/schemas/schemas.py` | Modificado | Se creó `VisibleLiteral = Literal["SI", "NO"]`. Se actualizó `ProyectoCreate` (`visible: VisibleLiteral = "SI"`), `ProyectoUpdate` (`visible: Optional[VisibleLiteral] = None`) y `ProyectoResponse` (`visible: str = "SI"`). |
| **Backend** | `backend/app/repositories/proyecto_repo.py` | Modificado | Parámetro `visible: Optional[str] = None` en `list_proyectos` para filtrar por SQL. Mapeo del campo `VISIBLE` en `create_proyecto` y `update_proyecto`. |
| **Backend** | `backend/app/api/v1/proyectos.py` | Modificado | Ruta `GET /api/proyectos` acepta query param `visible: Optional[str] = Query(None)`. |
| **Backend** | `backend/app/main.py` | Modificado | Migración DDL ligera automática en el arranque (`lifespan`) para asegurar que la columna `VISIBLE` exista en SQLite sin intervención manual. |
| **Backend** | `backend/app/scripts/sync_homologacion.py` | Modificado | Inclusión de la columna `VISIBLE` en la rutina de sincronización entre SQLite y Turso. |
| **Backend** | `backend/app/scripts/migrate_proyectos_visible.py` | Creado | Script de utilidad para aplicar la migración y verificación en bases de datos locales y remotas. |
| **Backend** | `backend/tests/test_proyectos.py` | Modificado | Pruebas unitarias completas: creación con `visible='SI'`, creación con `visible='NO'`, filtro `/api/proyectos?visible=SI`, actualización de visibilidad y rechazo 422 para valores no válidos. |
| **Backend** | `backend/migration_manifest.json` | Modificado | Manifiesto de sincronización actualizado tras la replicación a Turso Cloud. |
| **Frontend** | `frontend/src/types/index.ts` | Modificado | Definición de tipo `export type VisibleProyecto = 'SI' \| 'NO';` y adición de `visible?: VisibleProyecto;` en la interfaz `Proyecto`. |
| **Frontend** | `frontend/src/pages/ProyectosPage.tsx` | Modificado | - Selector `VISIBLE *` (`SI` / `NO`) con mensaje informativo en modal **Editar Proyecto**.<br>- Selector `VISIBLE *` en modal **Nuevo Proyecto**.<br>- Columna `Visible` con pill verde/rojo en la grilla.<br>- Filtro desplegable `Visible: Todos / SI / NO` en cabecera de grilla.<br>- Soporte en estado para edición y creación. |
| **Frontend** | `frontend/src/components/common/ModalExportarProyectos.tsx` | Modificado | Inclusión de la columna `'Visible': p.visible \|\| 'SI'` en las filas exportadas a Microsoft Excel (.xlsx). |
| **Frontend** | `frontend/src/components/kanban/ModalNuevaActividad.tsx` | Modificado | La función `cargarProyectos` ahora consulta `/proyectos?visible=SI` y filtra `p.visible === 'SI'`, impidiendo la selección de proyectos no visibles. |
| **Frontend** | `frontend/src/pages/PasesPage.tsx` | Modificado | - Combo de filtros de cabecera filtra proyectos visibles (`visible === 'SI'`).<br>- Combo de selección de proyectos en modal de creación/edición solo lista proyectos con `visible === 'SI'`.<br>- Inicialización al crear pase asigna el primer proyecto visible disponible. |
| **Frontend** | `frontend/src/components/common/ModalEditarPase.tsx` | Modificado | Combo de selección de proyectos filtra estrictamente proyectos con `visible === 'SI'` (preservando el nombre actual si ya estaba asociado). |
| **Frontend** | `frontend/src/pages/TicketsPage.tsx` | Modificado | `listaNombresProyectos` filtra únicamente los proyectos donde `visible === 'SI'`, eliminando del combo de tickets cualquier proyecto marcado en `NO`. |

---

## 4. Detalle de Implementación en Frontend

### 4.1 Modal "Editar Proyecto" (`ProyectosPage.tsx`)
Se incorporó el nuevo selector:
```tsx
<div>
  <label className="form-label" style={{ fontWeight: 700, color: editVisible === 'NO' ? '#DC2626' : 'inherit' }}>
    VISIBLE *
  </label>
  <select
    className="form-select"
    value={editVisible}
    onChange={e => setEditVisible(e.target.value as VisibleProyecto)}
    required
    style={{
      borderColor: editVisible === 'NO' ? '#F87171' : undefined,
      backgroundColor: editVisible === 'NO' ? '#FEF2F2' : undefined,
      fontWeight: 700,
    }}
  >
    <option value="SI">SI</option>
    <option value="NO">NO</option>
  </select>
</div>
```
Junto con el banner de alerta dinámica:
- Si está en **`SI`**: Indica que el proyecto estará activo y visible para ser seleccionado en las demás pantallas.
- Si está en **`NO`**: Advierte que el proyecto dejará de mostrarse en los combos y listas desplegables de las demás pantallas para evitar sobrecarga.

### 4.2 Lógica de Combos en Otras Pantallas
Para evitar que un proyecto histórico ya vinculado se quede en blanco visualmente si fue ocultado con posterioridad, la regla aplicada en los selectores es:
```tsx
{listaProyectos.filter(p => (p.visible || 'SI') === 'SI' || p.nombre_proyecto === formProyecto).map(p => (
  <option key={p.proyecto_id} value={p.nombre_proyecto}>
    {p.nombre_proyecto}
  </option>
))}
```
Y en los combos de creación nueva (donde no hay valor previo), solo se muestran los que cumplen `(p.visible || 'SI') === 'SI'`.

---

## 5. Pruebas y Validación Realizadas

1. **Pruebas Automatizadas Backend (Pytest):**
   - Ejecutado: `python -m pytest tests/test_proyectos.py` -> **5/5 passed** (100%).
   - Ejecutado: `python -m pytest` (Suite completa) -> **48/48 passed** (100%).
2. **Compilación de Frontend (Vite / TypeScript):**
   - Ejecutado: `npm run build` (`tsc -b && vite build`) -> **Éxito (0 errores)**.
3. **Prueba Funcional en Vivo (FastAPI puerto 8000):**
   - Se probó el ciclo de vida completo vía API HTTP:
     - Login con usuario `ADMIN`.
     - Actualización de un proyecto a `visible = "NO"`.
     - Consulta a `/api/proyectos?visible=SI` verificando que el proyecto quedó excluido.
     - Restauración a `visible = "SI"` verificando que volvió a aparecer en las listas de selección.
4. **Verificación de Homologación:**
   - Ejecutado: `python -m app.scripts.check_homologacion` -> **16/16 tablas 100% homologadas** entre SQLite local y Turso Cloud.

---

## 6. Guía de Ejecución y Despliegue Paso a Paso (Para Replicar en Otro Entorno o Pedido)

Si se requiere replicar este cambio en otra máquina, clon del proyecto, servidor o en un nuevo pedido, siga estos pasos en orden:

### Paso 1: Migración de Base de Datos y Homologación
Desde el directorio `backend`:
```powershell
# 1.1 Activar entorno virtual
cd d:\Proyectos_Anti\backend
.\.venv\Scripts\Activate.ps1

# 1.2 Ejecutar migración de columna VISIBLE en SQLite
python -m app.scripts.migrate_proyectos_visible

# 1.3 Sincronizar y homologar con Turso Cloud (si aplica)
python -m app.scripts.sync_homologacion

# 1.4 Validar homologación 100%
python -m app.scripts.check_homologacion
```

### Paso 2: Ejecutar Pruebas Automatizadas de Backend
```powershell
# Pruebas específicas del módulo de proyectos
python -m pytest tests/test_proyectos.py

# Pruebas de toda la suite
python -m pytest
```
*Resultado esperado:* Todos los tests deben pasar exitosamente (`48 passed`).

### Paso 3: Validar y Compilar Frontend
Desde el directorio `frontend`:
```powershell
cd d:\Proyectos_Anti\frontend

# Validar TypeScript y compilar bundle de producción
npm run build
```
*Resultado esperado:* `✓ built in ~X.XXs` sin errores de tipado ni compilación.

### Paso 4: Levantar los Servidores en Localhost
- **Terminal 1 - Backend:**
  ```powershell
  cd d:\Proyectos_Anti\backend
  .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
  ```
- **Terminal 2 - Frontend:**
  ```powershell
  cd d:\Proyectos_Anti\frontend
  npm run dev
  ```
  Aplicación accesible en: `http://localhost:5173`

### Paso 5: Checklist de Verificación Funcional
1. Iniciar sesión con perfil `ADMIN` o `SWE`.
2. Acceder al menú **Proyectos** (`/proyectos`).
3. Verificar la nueva columna **Visible** con badges verde (`SI`) o rojo (`NO`), y el filtro en cabecera.
4. Presionar el botón **Editar** (ícono de lápiz) en un proyecto.
5. Cambiar el campo **VISIBLE** a **NO** y presionar **Actualizar Proyecto**.
6. Ir a la pantalla de **Actividades (Kanban)** y presionar **Nueva Actividad**:
   - Abrir el selector *Nombre_proyecto* y verificar que el proyecto oculto **NO** aparezca en la lista.
7. Ir a la pantalla de **Pases** (`/pases`) y presionar **Nuevo Pase**:
   - Verificar que el proyecto oculto **NO** esté disponible para selección.
8. Ir a la pantalla de **Tickets** (`/tickets`) y presionar **Nuevo Ticket**:
   - Verificar que el proyecto oculto **NO** esté disponible para selección.
9. Regresar a **Proyectos**, editar el mismo proyecto y cambiarlo nuevamente a **SI**:
   - Verificar que vuelve a estar visible inmediatamente en todos los combos de actividades, pases y tickets.

