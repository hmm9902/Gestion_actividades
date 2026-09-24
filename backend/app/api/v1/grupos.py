from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.schemas import GrupoCreate, GrupoUpdate, GrupoResponse, AgregarMiembroRequest
from app.services.grupo_service import GrupoService
from app.api.deps import require_roles, get_current_user_and_registro

router = APIRouter()

@router.get("", response_model=List[GrupoResponse])
def listar_grupos(
    estado: Optional[str] = None,
    current_user: dict = Depends(get_current_user_and_registro),
    db: Session = Depends(get_db)
):
    service = GrupoService(db)
    return service.listar_grupos(estado=estado)

@router.get("/{codigo_grupo}", response_model=GrupoResponse)
def obtener_grupo(
    codigo_grupo: str,
    current_user: dict = Depends(get_current_user_and_registro),
    db: Session = Depends(get_db)
):
    service = GrupoService(db)
    return service.get_grupo_detalle(codigo_grupo)

@router.post("", response_model=GrupoResponse, status_code=status.HTTP_201_CREATED)
def crear_grupo(
    data: GrupoCreate,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    service = GrupoService(db)
    return service.crear_grupo(data, usuario_actual_registro=current_user["registro_cod"])

@router.put("/{codigo_grupo}", response_model=GrupoResponse)
def actualizar_grupo(
    codigo_grupo: str,
    data: GrupoUpdate,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    service = GrupoService(db)
    return service.actualizar_grupo(codigo_grupo, data, usuario_actual_registro=current_user["registro_cod"])

@router.post("/{codigo_grupo}/miembros")
def agregar_miembro(
    codigo_grupo: str,
    data: AgregarMiembroRequest,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    service = GrupoService(db)
    service.agregar_miembro(codigo_grupo, data.registro.upper(), usuario_actual_registro=current_user["registro_cod"])
    return service.get_grupo_detalle(codigo_grupo)

@router.delete("/{codigo_grupo}/miembros/{registro}")
def remover_miembro(
    codigo_grupo: str,
    registro: str,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    service = GrupoService(db)
    service.remover_miembro(codigo_grupo, registro.upper(), usuario_actual_registro=current_user["registro_cod"])
    return service.get_grupo_detalle(codigo_grupo)

@router.delete("/{codigo_grupo}", status_code=status.HTTP_200_OK)
def eliminar_grupo(
    codigo_grupo: str,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    from app.repositories.grupo_repo import GrupoRepository
    from app.repositories.auditoria_repo import AuditoriaRepository
    repo = GrupoRepository(db)
    grupo = repo.get_grupo(codigo_grupo.upper())
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")

    if repo.has_active_or_finished_activities(codigo_grupo.upper()):
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar el grupo porque contiene actividades en PRD o Finalizadas"
        )

    AuditoriaRepository(db).registrar(
        registro_usuario=current_user["registro_cod"],
        accion="ELIMINAR_GRUPO",
        entidad="GRUPOS",
        entidad_id=grupo.CODIGO_GRUPO,
        datos_anteriores={"nombre": grupo.NOMBRE_GRUPO, "lider": grupo.REGISTRO_PRINCIPAL}
    )
    repo.delete_grupo(grupo)
    return {"mensaje": f"Grupo {codigo_grupo} eliminado correctamente"}

