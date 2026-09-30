import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from app.core.config import settings
from app.db.session import db_manager, Base
from app.api.v1 import api_router
from app.scripts.bootstrap import ensure_system_bootstrap

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crear tablas en BD al iniciar si no existen usando el motor dinámico activo (TURSO o LOCAL)
    import app.models.entities
    Base.metadata.create_all(bind=db_manager.engine)
    # Migración liviana para SQLite si ya existía la tabla ACTIVIDADES sin NOMBRE_PROYECTO
    try:
        from sqlalchemy import text
        with db_manager.engine.connect() as conn:
            conn.execute(text("ALTER TABLE ACTIVIDADES ADD COLUMN NOMBRE_PROYECTO VARCHAR(150)"))
            conn.commit()
    except Exception:
        pass
    # Migración liviana para PROYECTOS si ya existía sin columna VISIBLE
    try:
        from sqlalchemy import text
        with db_manager.engine.connect() as conn:
            conn.execute(text("ALTER TABLE PROYECTOS ADD COLUMN VISIBLE VARCHAR(2) DEFAULT 'SI'"))
            conn.commit()
    except Exception:
        pass
    # Inicialización esencial del sistema (roles y usuario admin si no existen).
    ensure_system_bootstrap()
    # Inicialización del catálogo de pases desde Excel si la tabla está vacía
    try:
        from app.scripts.seed_pases import seed_pases_from_excel
        seed_pases_from_excel()
    except Exception as e:
        print(f"Aviso: no se pudo sincronizar pases iniciales: {e}")
    # Inicialización del catálogo de tickets desde Excel si la tabla está vacía
    try:
        from app.scripts.seed_tickets import seed_tickets_from_excel
        seed_tickets_from_excel()
    except Exception as e:
        print(f"Aviso: no se pudo sincronizar tickets iniciales: {e}")
    # Inicialización del catálogo de incidentes desde Excel si la tabla está vacía
    try:
        from app.scripts.seed_incidentes import seed_incidentes_from_excel
        seed_incidentes_from_excel()
    except Exception as e:
        print(f"Aviso: no se pudo sincronizar incidentes iniciales: {e}")
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
        "health": "/health",
        "descarga_directa_pdf": "/descargas/Documento_Nora.pdf",
        "ver_online_pdf": "/ver/Documento_Nora.pdf"
    }

# Rutas de descarga directa y visualización para Documento_Nora.pdf
@app.get("/descargas/Documento_Nora.pdf", tags=["Descargas"])
@app.get("/Documento_Nora.pdf", tags=["Descargas"])
@app.get("/api/descargas/Documento_Nora.pdf", tags=["Descargas"])
def descargar_documento_nora():
    """
    Descarga directa del archivo PDF Documento_Nora.pdf.
    Fuerza la descarga en el navegador con encabezado Content-Disposition: attachment.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    static_file = os.path.join(base_dir, "static", "Documento_Nora.pdf")
    root_file = os.path.join(os.path.dirname(base_dir), "Documento_Nora.pdf")
    
    file_path = static_file if os.path.exists(static_file) else root_file
    if not os.path.exists(file_path):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": "Archivo Documento_Nora.pdf no encontrado en el servidor."}
        )
    
    return FileResponse(
        path=file_path,
        filename="Documento_Nora.pdf",
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="Documento_Nora.pdf"',
            "Cache-Control": "public, max-age=86400",
            "Access-Control-Allow-Origin": "*",
        }
    )

@app.get("/ver/Documento_Nora.pdf", tags=["Descargas"])
@app.get("/api/ver/Documento_Nora.pdf", tags=["Descargas"])
def ver_documento_nora():
    """
    Visualización directa (inline) en el navegador del archivo PDF Documento_Nora.pdf.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    static_file = os.path.join(base_dir, "static", "Documento_Nora.pdf")
    root_file = os.path.join(os.path.dirname(base_dir), "Documento_Nora.pdf")
    
    file_path = static_file if os.path.exists(static_file) else root_file
    if not os.path.exists(file_path):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": "Archivo Documento_Nora.pdf no encontrado en el servidor."}
        )
    
    return FileResponse(
        path=file_path,
        filename="Documento_Nora.pdf",
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'inline; filename="Documento_Nora.pdf"',
            "Cache-Control": "public, max-age=86400",
            "Access-Control-Allow-Origin": "*",
        }
    )

# Incluir rutas de API
app.include_router(api_router, prefix="/api")

