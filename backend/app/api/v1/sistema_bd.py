import os
import sqlite3
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import require_roles
from app.core.config import settings, get_effective_provider
from app.db.session import db_manager
from app.services.migration_service import migration_service

router = APIRouter()

class TestBdRequest(BaseModel):
    provider: str = Field(..., description="Proveedor a probar: LOCAL o TURSO")

class SwitchBdRequest(BaseModel):
    provider: str = Field(..., description="Nuevo proveedor a activar: LOCAL o TURSO")

class MigrarBdRequest(BaseModel):
    database_name: Optional[str] = Field("gestor-actividades", description="Nombre de la base de datos Turso a crear o poblar")

def mask_secret(secret: str) -> str:
    if not secret:
        return "No configurado"
    if len(secret) <= 12:
        return "***"
    return f"{secret[:6]}...{secret[-5:]}"

@router.get("/info")
def get_bd_info(current_user: dict = Depends(require_roles(["ADMIN", "SWE"]))):
    """
    Retorna la información de los proveedores de base de datos (LOCAL y TURSO).
    Oculta y enmascara los secretos.
    """
    effective_prov = db_manager.current_provider
    local_path = settings.local_sqlite_path
    local_exists = os.path.exists(local_path)
    local_size = os.path.getsize(local_path) if local_exists else 0

    local_tables_count = 0
    if local_exists:
        try:
            conn = sqlite3.connect(local_path)
            cur = conn.cursor()
            cur.execute("SELECT count(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            local_tables_count = cur.fetchone()[0]
            conn.close()
        except Exception:
            pass

    return {
        "current_provider": effective_prov,
        "local": {
            "name": "LOCAL — SQLite",
            "source": "sqlite:///./gestor_actividades.db",
            "file_path": local_path,
            "exists": local_exists,
            "size_bytes": local_size,
            "tables_count": local_tables_count,
            "is_active": effective_prov == "LOCAL"
        },
        "turso": {
            "name": "TURSO — Cloud",
            "source": "Turso / libSQL",
            "database_url": settings.TURSO_DATABASE_URL or "No configurado",
            "auth_token_masked": mask_secret(settings.TURSO_AUTH_TOKEN),
            "platform_token_masked": mask_secret(settings.TURSO_PLATFORM_API_TOKEN),
            "org_slug": settings.TURSO_ORG_SLUG or "No configurado",
            "is_configured": bool(settings.TURSO_DATABASE_URL and settings.TURSO_AUTH_TOKEN),
            "has_platform_token": bool(settings.TURSO_PLATFORM_API_TOKEN),
            "is_active": effective_prov == "TURSO"
        },
        "user": {
            "registro": current_user["registro_cod"],
            "perfil": current_user["perfil"]
        }
    }

@router.post("/test")
def test_bd_connection(
    req: TestBdRequest,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"]))
):
    """
    Verifica conectividad y esquema requerido para el proveedor especificado sin cambiar de base de datos.
    """
    result = db_manager.test_provider_connection(req.provider)
    if not result.get("ok"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Error de conexión con la base de datos")
        )
    return result

@router.post("/switch")
def switch_bd(
    req: SwitchBdRequest,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"]))
):
    """
    Cambio de BD en caliente:
    1. Verifica conectividad con la nueva BD.
    2. Verifica esquema requerido.
    3. Si falla la prueba, no cambia de proveedor.
    4. Persiste la nueva configuración.
    5. Cierra/libera conexiones anteriores.
    6. Reinicializa el proveedor en caliente.
    7. Retorna confirmación para invalidar sesión y redirigir a /login en el frontend.
    """
    try:
        res = db_manager.switch_provider(req.provider)
        return {
            "ok": True,
            "previous_provider": res["previous_provider"],
            "new_provider": res["new_provider"],
            "message": res["message"],
            "action_required": "INVALIDATE_SESSION_AND_LOGOUT"
        }
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fallo durante el cambio de base de datos: {str(e)}"
        )

@router.post("/migrar")
def migrar_local_a_turso(
    req: MigrarBdRequest,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"]))
):
    """
    Operación completa: Comprobar y migrar BD local a Turso:
    - Backup local previo
    - Detección automática de esquema
    - Creación o verificación de base de datos Turso
    - Importación fiel sin modificar la BD local
    - Verificación origen vs destino
    - Pruebas CRUD y funcionales
    - Informe detallado
    """
    report = migration_service.execute_migration(
        user_registro=current_user["registro_cod"],
        target_db_name=req.database_name or "gestor-actividades"
    )

    return report
