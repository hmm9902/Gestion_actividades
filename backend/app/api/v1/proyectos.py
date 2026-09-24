from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.schemas import ProyectoCreate, ProyectoUpdate, ProyectoResponse
from app.repositories.proyecto_repo import ProyectoRepository
from app.repositories.auditoria_repo import AuditoriaRepository
from app.api.deps import require_roles, get_current_user_and_registro

router = APIRouter()

@router.get("", response_model=List[ProyectoResponse])
def listar_proyectos(
    search: Optional[str] = None,
    estado: Optional[str] = None,
    current_user: dict = Depends(get_current_user_and_registro),
    db: Session = Depends(get_db)
):
    repo = ProyectoRepository(db)
    return repo.list_proyectos(search=search, estado=estado)

@router.get("/{proyecto_id}", response_model=ProyectoResponse)
def obtener_proyecto(
    proyecto_id: int,
    current_user: dict = Depends(get_current_user_and_registro),
    db: Session = Depends(get_db)
):
    repo = ProyectoRepository(db)
    proy = repo.get_proyecto(proyecto_id)
    if not proy:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return proy

@router.post("", response_model=ProyectoResponse, status_code=status.HTTP_201_CREATED)
def crear_proyecto(
    data: ProyectoCreate,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = ProyectoRepository(db)
    auditoria_repo = AuditoriaRepository(db)

    # Validar unicidad del nombre de proyecto
    if not data.nombre_proyecto or not data.nombre_proyecto.strip():
        raise HTTPException(status_code=400, detail="El nombre del proyecto es obligatorio")

    existente = repo.get_proyecto_by_nombre(data.nombre_proyecto)
    if existente:
        raise HTTPException(status_code=400, detail=f"Ya existe un proyecto con el nombre '{data.nombre_proyecto.strip()}'")

    proy = repo.create_proyecto(data.model_dump())

    auditoria_repo.registrar(
        registro_usuario=current_user["registro_cod"],
        accion="CREAR_PROYECTO",
        entidad="PROYECTOS",
        entidad_id=str(proy.PROYECTO_ID),
        datos_nuevos={"nombre_proyecto": proy.NOMBRE_PROYECTO, "equipo_solicitante": proy.EQUIPO_SOLICITANTE}
    )

    return proy

@router.put("/{proyecto_id}", response_model=ProyectoResponse)
def actualizar_proyecto(
    proyecto_id: int,
    data: ProyectoUpdate,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = ProyectoRepository(db)
    auditoria_repo = AuditoriaRepository(db)

    proy = repo.get_proyecto(proyecto_id)
    if not proy:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    # Si se intenta cambiar el nombre, validar que no choque con otro
    if data.nombre_proyecto and data.nombre_proyecto.strip():
        otro = repo.get_proyecto_by_nombre(data.nombre_proyecto)
        if otro and otro.PROYECTO_ID != proyecto_id:
            raise HTTPException(status_code=400, detail=f"Ya existe otro proyecto con el nombre '{data.nombre_proyecto.strip()}'")

    datos_nuevos = data.model_dump(exclude_unset=True)
    actualizado = repo.update_proyecto(proy, datos_nuevos)

    auditoria_repo.registrar(
        registro_usuario=current_user["registro_cod"],
        accion="ACTUALIZAR_PROYECTO",
        entidad="PROYECTOS",
        entidad_id=str(proyecto_id),
        datos_nuevos=datos_nuevos
    )

    return actualizado

@router.delete("/{proyecto_id}")
def eliminar_proyecto(
    proyecto_id: int,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = ProyectoRepository(db)
    auditoria_repo = AuditoriaRepository(db)

    proy = repo.get_proyecto(proyecto_id)
    if not proy:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    nombre = proy.NOMBRE_PROYECTO
    repo.delete_proyecto(proy)

    auditoria_repo.registrar(
        registro_usuario=current_user["registro_cod"],
        accion="ELIMINAR_PROYECTO",
        entidad="PROYECTOS",
        entidad_id=str(proyecto_id),
        datos_anteriores={"nombre_proyecto": nombre}
    )

    return {"detail": f"Proyecto '{nombre}' eliminado exitosamente"}
