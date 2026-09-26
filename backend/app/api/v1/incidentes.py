from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.schemas import IncidenteCreate, IncidenteUpdate, IncidenteResponse
from app.repositories.incidente_repo import IncidenteRepository
from app.repositories.auditoria_repo import AuditoriaRepository
from app.api.deps import require_roles

router = APIRouter()

@router.get("", response_model=List[IncidenteResponse])
def listar_incidentes(
    ambiente: Optional[str] = None,
    job: Optional[str] = None,
    dtsx: Optional[str] = None,
    atendido_por: Optional[str] = None,
    aplicativo: Optional[str] = None,
    ruta_critica: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = IncidenteRepository(db)
    return repo.list_incidentes(
        ambiente=ambiente,
        job=job,
        dtsx=dtsx,
        atendido_por=atendido_por,
        aplicativo=aplicativo,
        ruta_critica=ruta_critica,
        search=search
    )

@router.get("/{incidente_id}", response_model=IncidenteResponse)
def obtener_incidente(
    incidente_id: int,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = IncidenteRepository(db)
    item = repo.get_incidente(incidente_id)
    if not item:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
    return item

@router.post("", response_model=IncidenteResponse, status_code=status.HTTP_201_CREATED)
def crear_incidente(
    data: IncidenteCreate,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = IncidenteRepository(db)
    auditoria_repo = AuditoriaRepository(db)

    if not data.job or not str(data.job).strip():
        raise HTTPException(status_code=400, detail="El código de Job es obligatorio")

    item = repo.create_incidente(data.model_dump())

    auditoria_repo.registrar(
        registro_usuario=current_user["registro_cod"],
        accion="CREAR_INCIDENTE",
        entidad="INCIDENTES",
        entidad_id=str(item.INCIDENTE_ID),
        datos_nuevos={
            "job": item.JOB,
            "dtsx": item.DTSX,
            "aplicativo": item.APLICATIVO,
            "ambiente": item.AMBIENTE,
            "ruta_critica": item.RUTA_CRITICA,
            "atendido_por": item.ATENDIDO_POR
        }
    )

    return item

@router.put("/{incidente_id}", response_model=IncidenteResponse)
def actualizar_incidente(
    incidente_id: int,
    data: IncidenteUpdate,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = IncidenteRepository(db)
    auditoria_repo = AuditoriaRepository(db)

    incidente_existente = repo.get_incidente(incidente_id)
    if not incidente_existente:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")

    datos_anteriores = {
        "job": incidente_existente.JOB,
        "dtsx": incidente_existente.DTSX,
        "aplicativo": incidente_existente.APLICATIVO,
        "ambiente": incidente_existente.AMBIENTE,
        "ruta_critica": incidente_existente.RUTA_CRITICA,
        "atendido_por": incidente_existente.ATENDIDO_POR
    }

    try:
        item = repo.update_incidente(incidente_id, data.model_dump(exclude_unset=True))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    auditoria_repo.registrar(
        registro_usuario=current_user["registro_cod"],
        accion="ACTUALIZAR_INCIDENTE",
        entidad="INCIDENTES",
        entidad_id=str(incidente_id),
        datos_anteriores=datos_anteriores,
        datos_nuevos={
            "job": item.JOB,
            "dtsx": item.DTSX,
            "aplicativo": item.APLICATIVO,
            "ambiente": item.AMBIENTE,
            "ruta_critica": item.RUTA_CRITICA,
            "atendido_por": item.ATENDIDO_POR
        }
    )

    return item

@router.delete("/{incidente_id}", status_code=status.HTTP_200_OK)
def eliminar_incidente(
    incidente_id: int,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = IncidenteRepository(db)
    auditoria_repo = AuditoriaRepository(db)

    incidente_existente = repo.get_incidente(incidente_id)
    if not incidente_existente:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")

    datos_eliminados = {
        "job": incidente_existente.JOB,
        "dtsx": incidente_existente.DTSX,
        "aplicativo": incidente_existente.APLICATIVO,
        "ambiente": incidente_existente.AMBIENTE,
        "atendido_por": incidente_existente.ATENDIDO_POR
    }

    exito = repo.delete_incidente(incidente_id)
    if not exito:
        raise HTTPException(status_code=500, detail="No se pudo eliminar el incidente")

    auditoria_repo.registrar(
        registro_usuario=current_user["registro_cod"],
        accion="ELIMINAR_INCIDENTE",
        entidad="INCIDENTES",
        entidad_id=str(incidente_id),
        datos_anteriores=datos_eliminados
    )

    return {"message": "Incidente eliminado exitosamente", "incidente_id": incidente_id}
