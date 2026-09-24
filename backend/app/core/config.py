import os
import json
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_NAME: str = "GestorActividadesFCD"
    APP_SECRET_KEY: str = "dev_secret_key_change_in_production_839217391"
    
    # Proveedor de base de datos activo ("LOCAL" o "TURSO")
    ACTIVE_DB_PROVIDER: str = "LOCAL"
    LOCAL_SQLITE_URL: str = "sqlite:///./gestor_actividades.db"
    
    # Credenciales separadas para Turso
    TURSO_DATABASE_URL: str = "https://gestor-actividades-anarchy9902.aws-us-east-1.turso.io"
    TURSO_AUTH_TOKEN: str = ""
    TURSO_PLATFORM_API_TOKEN: str = ""
    TURSO_ORG_SLUG: str = "anarchy9902"
    
    # JWT / Sesión
    SESSION_SECRET: str = "dev_session_secret_change_in_production_91823719"
    SESSION_EXPIRE_MINUTES: int = 480
    ALGORITHM: str = "HS256"
    
    # Bootstrap ADMIN
    BOOTSTRAP_ADMIN_USER: str = "ADMIN"
    BOOTSTRAP_ADMIN_PASSWORD: str = "Admin123*Seguro"
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )
    
    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def local_sqlite_path(self) -> str:
        url = self.LOCAL_SQLITE_URL.strip()
        if url.startswith("sqlite:///."):
            rel_path = url.replace("sqlite:///.", "").lstrip("/\\")
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            return os.path.join(backend_dir, rel_path).replace("\\", "/")
        elif url.startswith("sqlite:///"):
            return url.replace("sqlite:///", "")
        return url

    @property
    def local_sqlalchemy_url(self) -> str:
        return f"sqlite:///{self.local_sqlite_path}"

settings = Settings()

def get_provider_config_path() -> str:
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(backend_dir, ".active_db_provider")

def get_effective_provider() -> str:
    """
    Obtiene el proveedor efectivo respetando:
    1. Variable de entorno ACTIVE_DB_PROVIDER (ideal para Render / Cloud)
    2. Archivo local .active_db_provider (ideal para desarrollo local)
    3. Valor predeterminado en settings
    """
    env_prov = os.getenv("ACTIVE_DB_PROVIDER")
    if env_prov and env_prov.upper() in ("LOCAL", "TURSO"):
        return env_prov.upper()
        
    cfg_path = get_provider_config_path()
    if os.path.exists(cfg_path):
        try:
            with open(cfg_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                p = data.get("provider", "").upper()
                if p in ("LOCAL", "TURSO"):
                    return p
        except Exception:
            pass
            
    return settings.ACTIVE_DB_PROVIDER.upper()

def set_effective_provider(provider: str) -> None:
    """
    Persiste la selección del proveedor en archivo local sin guardar secretos.
    """
    prov = provider.upper()
    if prov not in ("LOCAL", "TURSO"):
        raise ValueError(f"Proveedor no válido: {provider}. Debe ser LOCAL o TURSO.")
        
    cfg_path = get_provider_config_path()
    with open(cfg_path, "w", encoding="utf-8") as f:
        json.dump({"provider": prov}, f, indent=2)
