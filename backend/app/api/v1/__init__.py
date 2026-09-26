from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.usuarios import router as usuarios_router
from app.api.v1.registros import router as registros_router
from app.api.v1.perfiles import router as perfiles_router
from app.api.v1.grupos import router as grupos_router
from app.api.v1.proyectos import router as proyectos_router
from app.api.v1.aplicaciones import router as aplicaciones_router
from app.api.v1.actividades import router as actividades_router
from app.api.v1.auditoria import router as auditoria_router
from app.api.v1.health import router as health_router
from app.api.v1.sistema_bd import router as sistema_bd_router
from app.api.v1.pases import router as pases_router
from app.api.v1.tickets import router as tickets_router
from app.api.v1.incidentes import router as incidentes_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["Health"])
api_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_router.include_router(usuarios_router, prefix="/usuarios", tags=["Usuarios"])
api_router.include_router(registros_router, prefix="/registros", tags=["Registros"])
api_router.include_router(perfiles_router, prefix="/perfiles", tags=["Perfiles"])
api_router.include_router(grupos_router, prefix="/grupos", tags=["Grupos"])
api_router.include_router(proyectos_router, prefix="/proyectos", tags=["Proyectos"])
api_router.include_router(aplicaciones_router, prefix="/aplicaciones", tags=["Aplicaciones"])
api_router.include_router(pases_router, prefix="/pases", tags=["Pases"])
api_router.include_router(tickets_router, prefix="/tickets", tags=["Tickets"])
api_router.include_router(incidentes_router, prefix="/incidentes", tags=["Incidentes"])
api_router.include_router(actividades_router, prefix="/actividades", tags=["Actividades"])
api_router.include_router(auditoria_router, prefix="/auditoria", tags=["Auditoria"])
api_router.include_router(sistema_bd_router, prefix="/sistema/bd", tags=["Sistema BD"])

