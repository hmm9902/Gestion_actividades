from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.schemas import AplicacionCreate, AplicacionUpdate, AplicacionResponse
from app.repositories.aplicacion_repo import AplicacionRepository
from app.repositories.auditoria_repo import AuditoriaRepository
from app.api.deps import require_roles, get_current_user_and_registro

router = APIRouter()

@router.get("", response_model=List[AplicacionResponse])
def listar_aplicaciones(
    search: Optional[str] = None,
    estado: Optional[str] = None,
    current_user: dict = Depends(get_current_user_and_registro),
    db: Session = Depends(get_db)
):
    repo = AplicacionRepository(db)
    return repo.list_aplicaciones(search=search, estado=estado)

@router.get("/{aplicacion_id}", response_model=AplicacionResponse)
def obtener_aplicacion(
    aplicacion_id: int,
    current_user: dict = Depends(get_current_user_and_registro),
    db: Session = Depends(get_db)
):
    repo = AplicacionRepository(db)
    app = repo.get_aplicacion(aplicacion_id)
    if not app:
        raise HTTPException(status_code=404, detail="Aplicación no encontrada")
    return app

@router.post("", response_model=AplicacionResponse, status_code=status.HTTP_201_CREATED)
def crear_aplicacion(
    data: AplicacionCreate,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = AplicacionRepository(db)
    auditoria_repo = AuditoriaRepository(db)

    # Validar unicidad del nombre de la aplicación
    if not data.nombre_aplicacion or not data.nombre_aplicacion.strip():
        raise HTTPException(status_code=400, detail="El nombre de la aplicación es obligatorio")

    existente = repo.get_aplicacion_by_nombre(data.nombre_aplicacion)
    if existente:
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe una aplicación con el nombre '{data.nombre_aplicacion.strip()}'"
        )

    app = repo.create_aplicacion(data.model_dump())

    auditoria_repo.registrar(
        registro_usuario=current_user["registro_cod"],
        accion="CREAR_APLICACION",
        entidad="APLICACIONES",
        entidad_id=str(app.APLICACION_ID),
        datos_nuevos={
            "nombre_aplicacion": app.NOMBRE_APLICACION,
            "siglas": app.SIGLAS,
            "lider_tecno": app.LIDER_TECNO,
            "po_contacto": app.PO_CONTACTO,
            "scrum_datos": app.SCRUM_DATOS,
            "descripcion_actividad": app.DESCRIPCION_ACTIVIDAD,
            "estado": app.ESTADO
        }
    )

    return app

@router.put("/{aplicacion_id}", response_model=AplicacionResponse)
def actualizar_aplicacion(
    aplicacion_id: int,
    data: AplicacionUpdate,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = AplicacionRepository(db)
    auditoria_repo = AuditoriaRepository(db)

    app = repo.get_aplicacion(aplicacion_id)
    if not app:
        raise HTTPException(status_code=404, detail="Aplicación no encontrada")

    # Si se intenta cambiar el nombre, validar que no choque con otra aplicación existente
    if data.nombre_aplicacion and data.nombre_aplicacion.strip():
        otro = repo.get_aplicacion_by_nombre(data.nombre_aplicacion)
        if otro and otro.APLICACION_ID != aplicacion_id:
            raise HTTPException(
                status_code=400,
                detail=f"Ya existe otra aplicación con el nombre '{data.nombre_aplicacion.strip()}'"
            )

    datos_nuevos = data.model_dump(exclude_unset=True)
    actualizado = repo.update_aplicacion(app, datos_nuevos)

    auditoria_repo.registrar(
        registro_usuario=current_user["registro_cod"],
        accion="ACTUALIZAR_APLICACION",
        entidad="APLICACIONES",
        entidad_id=str(aplicacion_id),
        datos_nuevos=datos_nuevos
    )

    return actualizado

@router.delete("/{aplicacion_id}")
def eliminar_aplicacion(
    aplicacion_id: int,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = AplicacionRepository(db)
    auditoria_repo = AuditoriaRepository(db)

    app = repo.get_aplicacion(aplicacion_id)
    if not app:
        raise HTTPException(status_code=404, detail="Aplicación no encontrada")

    nombre = app.NOMBRE_APLICACION
    repo.delete_aplicacion(app)

    auditoria_repo.registrar(
        registro_usuario=current_user["registro_cod"],
        accion="ELIMINAR_APLICACION",
        entidad="APLICACIONES",
        entidad_id=str(aplicacion_id),
        datos_anteriores={"nombre_aplicacion": nombre}
    )

    return {"detail": f"Aplicación '{nombre}' eliminada exitosamente"}
