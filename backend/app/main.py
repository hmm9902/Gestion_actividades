from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.db.session import engine, Base
from app.api.v1 import api_router
from app.scripts.bootstrap import seed_data

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crear tablas en BD al iniciar si no existen
    Base.metadata.create_all(bind=engine)
    # Migración liviana para SQLite si ya existía la tabla ACTIVIDADES sin NOMBRE_PROYECTO
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE ACTIVIDADES ADD COLUMN NOMBRE_PROYECTO VARCHAR(150)"))
            conn.commit()
    except Exception:
        pass
    # Ejecutar seed de perfiles y ADMIN inicial
    seed_data()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="API para Gestión de Actividades FCD con Tablero Kanban, asignaciones, historial y perfiles",
    version="1.0.0",
    lifespan=lifespan
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware de seguridad para cabeceras HTTP
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# Manejador global de excepciones para evitar filtración de stacktraces en producción
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if settings.APP_ENV == "production":
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Ha ocurrido un error interno en el servidor."}
        )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": str(exc)}
    )

# Endpoints de salud requeridos
@app.get("/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.APP_ENV}

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "status": "online",
        "docs": "/docs",
        "health": "/health"
    }

# Incluir rutas de API
app.include_router(api_router, prefix="/api")
