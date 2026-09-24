from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.schemas import (
    ActividadCreate, ActividadUpdate, ActividadResponse, ActividadDetalleResponse,
    CambioEstadoRequest, CambioAsignacionRequest, PosicionUpdateRequest,
    SeguimientoCreate, SeguimientoResponse
)
from app.services.actividad_service import ActividadService
from app.api.deps import require_roles, get_current_user_and_registro

router = APIRouter()

@router.get("", response_model=List[ActividadResponse])
def listar_actividades(
    codigo_grupo: Optional[str] = None,
    asignado_registro: Optional[str] = None,
    sprint: Optional[str] = None,
    q_trabajo: Optional[str] = None,
    tipo_actividad: Optional[str] = None,
    estado: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user_and_registro),
    db: Session = Depends(get_db)
):
    service = ActividadService(db)
    return service.listar_actividades(
        codigo_grupo=codigo_grupo,
        asignado_registro=asignado_registro,
        sprint=sprint,
        q_trabajo=q_trabajo,
        tipo_actividad=tipo_actividad,
        estado=estado,
        search=search
    )

@router.get("/{codigo_actividad}", response_model=ActividadDetalleResponse)
def obtener_actividad(
    codigo_actividad: str,
    current_user: dict = Depends(get_current_user_and_registro),
    db: Session = Depends(get_db)
):
    service = ActividadService(db)
    return service.get_actividad_response(codigo_actividad.upper(), incluir_detalle=True)

@router.post("", response_model=ActividadResponse, status_code=status.HTTP_201_CREATED)
def crear_actividad(
    data: ActividadCreate,
    current_user: dict = Depends(get_current_user_and_registro),
    db: Session = Depends(get_db)
):
    service = ActividadService(db)
    return service.crear_actividad(
        data=data,
        usuario_registro=current_user["registro_cod"],
        usuario_perfil=current_user["perfil"]
    )

@router.put("/{codigo_actividad}", response_model=ActividadResponse)
def actualizar_actividad(
    codigo_actividad: str,
    data: ActividadUpdate,
    current_user: dict = Depends(get_current_user_and_registro),
    db: Session = Depends(get_db)
):
    service = ActividadService(db)
    return service.actualizar_actividad(
        codigo_actividad=codigo_actividad.upper(),
        data=data,
        usuario_registro=current_user["registro_cod"],
        usuario_perfil=current_user["perfil"]
    )

@router.post("/{codigo_actividad}/estado", response_model=ActividadResponse)
def cambiar_estado(
    codigo_actividad: str,
    data: CambioEstadoRequest,
    current_user: dict = Depends(get_current_user_and_registro),
    db: Session = Depends(get_db)
):
    # Todos los roles autenticados (ADMIN, SWE, DESARROLLADOR, QA, INTEGRADOR) pueden cambiar estado
    service = ActividadService(db)
    return service.cambiar_estado(
        codigo_actividad=codigo_actividad.upper(),
        data=data,
        usuario_registro=current_user["registro_cod"]
    )

@router.post("/{codigo_actividad}/asignaciones", response_model=ActividadResponse)
def cambiar_asignacion(
    codigo_actividad: str,
    data: CambioAsignacionRequest,
    current_user: dict = Depends(get_current_user_and_registro),
    db: Session = Depends(get_db)
):
    service = ActividadService(db)
    return service.cambiar_asignacion(
        codigo_actividad=codigo_actividad.upper(),
        data=data,
        usuario_registro=current_user["registro_cod"],
        usuario_perfil=current_user["perfil"]
    )

@router.post("/{codigo_actividad}/seguimiento", response_model=SeguimientoResponse)
def agregar_seguimiento(
    codigo_actividad: str,
    data: SeguimientoCreate,
    current_user: dict = Depends(get_current_user_and_registro),
    db: Session = Depends(get_db)
):
    service = ActividadService(db)
    return service.agregar_seguimiento(
        codigo_actividad=codigo_actividad.upper(),
        comentario=data.comentario,
        usuario_registro=current_user["registro_cod"]
    )

@router.put("/{codigo_actividad}/posicion")
def actualizar_posicion(
    codigo_actividad: str,
    data: PosicionUpdateRequest,
    current_user: dict = Depends(get_current_user_and_registro),
    db: Session = Depends(get_db)
):
    service = ActividadService(db)
    return service.actualizar_posicion(
        codigo_actividad=codigo_actividad.upper(),
        nueva_posicion=data.nueva_posicion,
        usuario_registro=current_user["registro_cod"]
    )

@router.delete("/{codigo_actividad}", status_code=status.HTTP_200_OK)
def eliminar_actividad(
    codigo_actividad: str,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    from app.repositories.actividad_repo import ActividadRepository
    from app.repositories.auditoria_repo import AuditoriaRepository
    repo = ActividadRepository(db)
    act = repo.get_actividad(codigo_actividad.upper())
    if not act:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")

    # REGLA ACTUALIZADA: Los perfiles ADMIN y SWE pueden eliminar actividades en cualquier estado (incluyendo Finalizado)
    datos_ant = {"titulo": act.TITULO, "estado": act.ESTADO}
    cod_act = act.CODIGO_ACTIVIDAD

    AuditoriaRepository(db).registrar(
        registro_usuario=current_user["registro_cod"],
        accion="ELIMINAR_ACTIVIDAD",
        entidad="ACTIVIDADES",
        entidad_id=cod_act,
        datos_anteriores=datos_ant
    )
    repo.delete_actividad(act)

    # Propagar cambio a nivel de BD a la otra fuente (Local <-> Turso)
    from app.services.sync_service import sync_delete_actividad_across_dbs
    sync_delete_actividad_across_dbs(
        codigo_actividad=cod_act,
        current_db=db,
        current_user_registro=current_user["registro_cod"],
        datos_anteriores=datos_ant
    )

    return {"mensaje": f"Actividad {codigo_actividad} eliminada correctamente"}
