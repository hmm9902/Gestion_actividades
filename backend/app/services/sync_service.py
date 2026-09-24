import os
import sqlite3
import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

def sync_delete_actividad_across_dbs(
    codigo_actividad: str,
    current_db: Session,
    current_user_registro: str,
    datos_anteriores: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Asegura que si se elimina una actividad a nivel de base de datos,
    el cambio se aplique tanto en la BD local SQLite como en la BD en TURSO Cloud.
    """
    cod = codigo_actividad.upper()
    resultado = {
        "codigo_actividad": cod,
        "local_synced": False,
        "turso_synced": False,
        "errors": []
    }

    # 1. Determinar el dialecto/URL del bind actual
    is_currently_turso = False
    try:
        bind = current_db.get_bind()
        url_str = str(bind.url) if bind else ""
        is_currently_turso = (
            "turso" in url_str.lower()
            or "libsql" in url_str.lower()
            or "pipeline" in url_str.lower()
        )
    except Exception:
        pass

    # 2. Si la BD actual es TURSO, propagar borrado a BD local SQLite
    if is_currently_turso:
        resultado["turso_synced"] = True  # Ya fue eliminado en Turso por la sesión activa
        local_path = settings.local_sqlite_path
        if os.path.exists(local_path):
            try:
                conn = sqlite3.connect(local_path)
                cursor = conn.cursor()
                cursor.execute("DELETE FROM ASIGNADO_DET_REGISTRO WHERE CODIGO_ACTIVIDAD = ?", (cod,))
                cursor.execute("DELETE FROM ESTADO_DET_ACTIVIDADES WHERE CODIGO_ACTIVIDAD = ?", (cod,))
                cursor.execute("DELETE FROM SEGUIMIENTO WHERE CODIGO_ACTIVIDAD = ?", (cod,))
                cursor.execute("DELETE FROM ACTIVIDADES WHERE CODIGO_ACTIVIDAD = ?", (cod,))
                
                # Registrar auditoría en local
                import json
                from datetime import datetime
                cursor.execute(
                    """
                    INSERT INTO AUDITORIA (FECHA, REGISTRO_USUARIO, ACCION, ENTIDAD, ENTIDAD_ID, DATOS_ANTERIORES)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        current_user_registro,
                        "ELIMINAR_ACTIVIDAD",
                        "ACTIVIDADES",
                        cod,
                        json.dumps(datos_anteriores or {}, ensure_ascii=False)
                    )
                )
                conn.commit()
                conn.close()
                resultado["local_synced"] = True
                logger.info(f"Sincronizada eliminación de actividad {cod} en SQLite local.")
            except Exception as e:
                msg = f"Error propagando eliminación a BD local SQLite: {str(e)}"
                logger.error(msg)
                resultado["errors"].append(msg)
    else:
        # La BD actual es LOCAL (o test SQLite)
        resultado["local_synced"] = True  # Ya fue eliminado en local por la sesión activa
        
        # Propagar borrado a TURSO Cloud si las credenciales están configuradas
        turso_url = settings.TURSO_DATABASE_URL
        turso_token = settings.TURSO_AUTH_TOKEN

        if turso_url and turso_token:
            try:
                u = turso_url.replace("libsql://", "https://").replace("wss://", "https://").rstrip("/")
                if not u.startswith("http"):
                    u = f"https://{u}"
                pipeline_url = f"{u}/v2/pipeline"

                import json
                from datetime import datetime
                now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                datos_str = json.dumps(datos_anteriores or {}, ensure_ascii=False)

                payload = {
                    "requests": [
                        {
                            "type": "execute",
                            "stmt": {
                                "sql": "DELETE FROM ASIGNADO_DET_REGISTRO WHERE CODIGO_ACTIVIDAD = ?",
                                "args": [{"type": "text", "value": cod}]
                            }
                        },
                        {
                            "type": "execute",
                            "stmt": {
                                "sql": "DELETE FROM ESTADO_DET_ACTIVIDADES WHERE CODIGO_ACTIVIDAD = ?",
                                "args": [{"type": "text", "value": cod}]
                            }
                        },
                        {
                            "type": "execute",
                            "stmt": {
                                "sql": "DELETE FROM SEGUIMIENTO WHERE CODIGO_ACTIVIDAD = ?",
                                "args": [{"type": "text", "value": cod}]
                            }
                        },
                        {
                            "type": "execute",
                            "stmt": {
                                "sql": "DELETE FROM ACTIVIDADES WHERE CODIGO_ACTIVIDAD = ?",
                                "args": [{"type": "text", "value": cod}]
                            }
                        },
                        {
                            "type": "execute",
                            "stmt": {
                                "sql": "INSERT INTO AUDITORIA (FECHA, REGISTRO_USUARIO, ACCION, ENTIDAD, ENTIDAD_ID, DATOS_ANTERIORES) VALUES (?, ?, ?, ?, ?, ?)",
                                "args": [
                                    {"type": "text", "value": now_str},
                                    {"type": "text", "value": current_user_registro},
                                    {"type": "text", "value": "ELIMINAR_ACTIVIDAD"},
                                    {"type": "text", "value": "ACTIVIDADES"},
                                    {"type": "text", "value": cod},
                                    {"type": "text", "value": datos_str}
                                ]
                            }
                        },
                        {"type": "close"}
                    ]
                }

                r = httpx.post(
                    pipeline_url,
                    headers={
                        "Authorization": f"Bearer {turso_token}",
                        "Content-Type": "application/json"
                    },
                    json=payload,
                    timeout=10.0
                )
                if r.status_code == 200:
                    resultado["turso_synced"] = True
                    logger.info(f"Sincronizada eliminación de actividad {cod} en Turso Cloud.")
                else:
                    msg = f"Turso pipeline devolvió código {r.status_code}: {r.text[:200]}"
                    logger.warning(msg)
                    resultado["errors"].append(msg)
            except Exception as e:
                msg = f"Excepción propagando eliminación a Turso Cloud: {str(e)}"
                logger.warning(msg)
                resultado["errors"].append(msg)

    return resultado
