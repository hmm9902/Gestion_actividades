import os
import sqlite3
from typing import Dict, Any, List
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.engine import Engine

from app.core.config import (
    settings,
    get_effective_provider,
    set_effective_provider
)
from app.db.turso_adapter import create_turso_engine

Base = declarative_base()

class DatabaseManager:
    """
    Gestor dinámico de conexiones desacoplado de los repositorios.
    Permite el cambio en caliente entre base local SQLite y nube Turso.
    """
    def __init__(self):
        self._current_provider: str = "LOCAL"
        self._engine: Engine = None
        self._sessionmaker: sessionmaker = None
        self.initialize()

    def initialize(self) -> None:
        effective_provider = get_effective_provider()
        self._setup_provider(effective_provider)

    def _setup_provider(self, provider: str) -> None:
        provider = provider.upper()
        if self._engine is not None:
            try:
                self._engine.dispose()
            except Exception:
                pass

        if provider == "TURSO":
            if not settings.TURSO_DATABASE_URL or not settings.TURSO_AUTH_TOKEN:
                # Si faltan credenciales de Turso, fallback seguro a LOCAL
                provider = "LOCAL"
                self._engine = self._create_local_engine()
            else:
                self._engine = create_turso_engine(
                    settings.TURSO_DATABASE_URL,
                    settings.TURSO_AUTH_TOKEN
                )
        else:
            provider = "LOCAL"
            self._engine = self._create_local_engine()

        self._current_provider = provider
        self._sessionmaker = sessionmaker(autocommit=False, autoflush=False, bind=self._engine)
        global engine
        engine = self._engine

    def _create_local_engine(self) -> Engine:
        eng = create_engine(
            settings.local_sqlalchemy_url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True
        )

        @event.listens_for(eng, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        return eng

    @property
    def current_provider(self) -> str:
        return self._current_provider

    @property
    def engine(self) -> Engine:
        return self._engine

    def get_session(self) -> Session:
        return self._sessionmaker()

    def test_provider_connection(self, provider: str) -> Dict[str, Any]:
        """
        Prueba conectividad y existencia de esquema requerido sin alterar el proveedor activo.
        """
        provider = provider.upper()
        required_tables = ["PERFIL", "USUARIOS", "REGISTRO", "ACTIVIDADES", "PROYECTOS"]

        if provider == "LOCAL":
            local_path = settings.local_sqlite_path
            if not os.path.exists(local_path):
                return {
                    "ok": False,
                    "provider": "LOCAL",
                    "error": f"El archivo local de base de datos no existe en: {local_path}"
                }
            try:
                conn = sqlite3.connect(local_path)
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = [r[0] for r in cursor.fetchall()]
                conn.close()

                missing = [t for t in required_tables if t not in tables]
                if missing:
                    return {
                        "ok": False,
                        "provider": "LOCAL",
                        "error": f"Esquema incompleto en SQLite local. Faltan tablas: {', '.join(missing)}"
                    }

                return {
                    "ok": True,
                    "provider": "LOCAL",
                    "tables_count": len(tables),
                    "tables": tables,
                    "message": "Conexión y esquema local verificados con éxito."
                }
            except Exception as e:
                return {
                    "ok": False,
                    "provider": "LOCAL",
                    "error": f"Error verificando SQLite local: {str(e)}"
                }

        elif provider == "TURSO":
            if not settings.TURSO_DATABASE_URL:
                return {
                    "ok": False,
                    "provider": "TURSO",
                    "error": "TURSO_DATABASE_URL no está configurada en el entorno."
                }
            if not settings.TURSO_AUTH_TOKEN:
                return {
                    "ok": False,
                    "provider": "TURSO",
                    "error": "TURSO_AUTH_TOKEN no está configurada en el entorno."
                }

            try:
                import httpx
                u = settings.TURSO_DATABASE_URL.replace("libsql://", "https://").replace("wss://", "https://")
                if not u.startswith("http"):
                    u = f"https://{u}"
                pipeline_url = f"{u.rstrip('/')}/v2/pipeline"

                req_payload = {
                    "requests": [
                        {"type": "execute", "stmt": {"sql": "SELECT name FROM sqlite_master WHERE type='table'"}},
                        {"type": "close"}
                    ]
                }
                r = httpx.post(
                    pipeline_url,
                    headers={
                        "Authorization": f"Bearer {settings.TURSO_AUTH_TOKEN}",
                        "Content-Type": "application/json"
                    },
                    json=req_payload,
                    timeout=15.0
                )
                if r.status_code != 200:
                    return {
                        "ok": False,
                        "provider": "TURSO",
                        "error": f"Error HTTP {r.status_code} conectando a Turso: {r.text[:200]}"
                    }

                data = r.json()
                results = data.get("results", [])
                if not results or results[0].get("type") == "error":
                    err_msg = results[0].get("error", {}).get("message", "Error en consulta a Turso") if results else "Sin respuesta"
                    return {
                        "ok": False,
                        "provider": "TURSO",
                        "error": f"Fallo al consultar Turso: {err_msg}"
                    }

                raw_rows = results[0].get("response", {}).get("result", {}).get("rows", [])
                tables = [row[0].get("value") for row in raw_rows if row and row[0].get("value")]

                missing = [t for t in required_tables if t not in tables]
                if missing:
                    return {
                        "ok": False,
                        "provider": "TURSO",
                        "error": f"Esquema incompleto en Turso Cloud. Faltan tablas requeridas: {', '.join(missing)}. Debe ejecutar 'Comprobar y migrar BD local a Turso' primero."
                    }

                return {
                    "ok": True,
                    "provider": "TURSO",
                    "tables_count": len(tables),
                    "tables": tables,
                    "message": "Conexión a Turso Cloud y esquema requeridos verificados con éxito."
                }
            except Exception as e:
                return {
                    "ok": False,
                    "provider": "TURSO",
                    "error": f"Excepción conectando a Turso: {str(e)}"
                }
        else:
            return {
                "ok": False,
                "provider": provider,
                "error": f"Proveedor desconocido: {provider}"
            }

    def switch_provider(self, new_provider: str) -> Dict[str, Any]:
        """
        Cambio de BD en caliente:
        1. Verifica conectividad y esquema de la nueva BD.
        2. No cambia el proveedor si falla la validación.
        3. Persiste la nueva configuración.
        4. Cierra y libera conexiones anteriores.
        5. Reinicializa el pool de conexiones en caliente.
        """
        new_prov = new_provider.upper()
        if new_prov not in ("LOCAL", "TURSO"):
            raise ValueError(f"Proveedor no válido: {new_provider}")

        # 1. Verificar conectividad y esquema
        check = self.test_provider_connection(new_prov)
        if not check.get("ok"):
            raise ValueError(check.get("error", "Fallo de validación de conexión"))

        previous_provider = self._current_provider

        # 2. Persistir configuración
        set_effective_provider(new_prov)

        # 3. Reinicializar en caliente liberando conexiones anteriores
        self._setup_provider(new_prov)

        return {
            "ok": True,
            "previous_provider": previous_provider,
            "new_provider": self._current_provider,
            "message": f"Base de datos cambiada exitosamente de {previous_provider} a {self._current_provider}."
        }

db_manager = DatabaseManager()

# Compatibilidad con código existente
SessionLocal = lambda: db_manager.get_session()
engine = db_manager.engine

def get_db():
    db: Session = db_manager.get_session()
    try:
        yield db
    finally:
        db.close()
