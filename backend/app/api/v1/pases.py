from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.schemas import PaseCreate, PaseUpdate, PaseResponse
from app.repositories.pase_repo import PaseRepository
from app.repositories.auditoria_repo import AuditoriaRepository
from app.api.deps import require_roles

router = APIRouter()

@router.get("", response_model=List[PaseResponse])
def listar_pases(
    proyecto: Optional[str] = None,
    titulo: Optional[str] = None,
    fecha_registro_srt: Optional[date] = None,
    codigo_srt: Optional[str] = None,
    oc: Optional[str] = None,
    estado_srt: Optional[str] = None,
    tipo_ambiente: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = PaseRepository(db)
    return repo.list_pases(
        proyecto=proyecto,
        titulo=titulo,
        fecha_registro_srt=fecha_registro_srt,
        codigo_srt=codigo_srt,
        oc=oc,
        estado_srt=estado_srt,
        tipo_ambiente=tipo_ambiente,
        search=search
    )

@router.get("/by-srt/{codigo_srt}", response_model=PaseResponse)
def obtener_pase_por_srt(
    codigo_srt: str,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = PaseRepository(db)
    pase = repo.get_pase_by_codigo_srt(codigo_srt)
    if not pase:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontró ningún pase registrado con el código SRT '{codigo_srt}'."
        )
    return pase

@router.get("/{pase_id}", response_model=PaseResponse)
def obtener_pase(
    pase_id: int,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = PaseRepository(db)
    pase = repo.get_pase(pase_id)
    if not pase:
        raise HTTPException(status_code=404, detail="Registro de pase no encontrado")
    return pase

@router.post("", response_model=PaseResponse, status_code=status.HTTP_201_CREATED)
def crear_pase(
    data: PaseCreate,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = PaseRepository(db)
    auditoria_repo = AuditoriaRepository(db)

    # Validaciones obligatorias
    if not data.titulo or not data.titulo.strip():
        raise HTTPException(status_code=400, detail="El título del pase es obligatorio")

    # Validación de unicidad de CODIGO_SRT al registrar un nuevo pase
    if data.codigo_srt and data.codigo_srt.strip():
        pase_existente = repo.get_pase_by_codigo_srt(data.codigo_srt.strip())
        if pase_existente:
            raise HTTPException(
                status_code=400,
                detail=f"Ya existe un pase registrado con el código SRT '{data.codigo_srt.strip()}'. El código SRT debe ser único."
            )

    # Validación de estados que requieren motivo: RECHAZADO y ANULADO
    if data.estado_srt in ("RECHAZADO", "ANULADO"):
        if not data.motivo_estado or not data.motivo_estado.strip():
            raise HTTPException(
                status_code=400,
                detail=f"Debe indicar el motivo cuando el estado del pase es '{data.estado_srt}'"
            )

    # Validación para estado final PRD_EJECUTADO
    if data.estado_srt == "PRD_EJECUTADO":
        campos_req = {
            "Orden de Cambio (OC)": data.oc,
            "Estado OC": data.stado_oc or data.estado_oc,
            "Fecha Registro OC": data.fecha_registro_oc,
            "Fecha y Hora Pase PRD (*)": data.fecha_hora_pase_prd,
            "Fecha Certificación": data.fecha_certificacion,
            "Operador Pase": data.operador_pase,
        }
        faltantes = [nom for nom, val in campos_req.items() if val is None or (isinstance(val, str) and not val.strip())]
        if faltantes:
            raise HTTPException(
                status_code=400,
                detail=f"Cuando el estado es PRD_EJECUTADO, son obligatorios los siguientes campos: {', '.join(faltantes)}"
            )

    pase = repo.create_pase(data.model_dump())

    auditoria_repo.registrar(
        registro_usuario=current_user["registro_cod"],
        accion="CREAR_PASE",
        entidad="PASES",
        entidad_id=str(pase.PASE_ID),
        datos_nuevos={
            "codigo_srt": pase.CODIGO_SRT,
            "titulo": pase.TITULO,
            "proyecto": pase.PROYECTO,
            "estado_srt": pase.ESTADO_SRT
        }
    )

    return pase

@router.put("/{pase_id}", response_model=PaseResponse)
def actualizar_pase(
    pase_id: int,
    data: PaseUpdate,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = PaseRepository(db)
    auditoria_repo = AuditoriaRepository(db)

    pase = repo.get_pase(pase_id)
    if not pase:
        raise HTTPException(status_code=404, detail="Registro de pase no encontrado")

    # REGLA FUNDAMENTAL:
    # Si el pase ya se encuentra en PRD_EJECUTADO, es el estado final y ya no se puede modificar
    if pase.ESTADO_SRT == "PRD_EJECUTADO":
        raise HTTPException(
            status_code=400,
            detail="El pase ya se encuentra en estado PRD_EJECUTADO (estado final para un SRT) y ya no se puede modificar."
        )

    datos_nuevos = data.model_dump(exclude_unset=True)

    # Validación de unicidad de CODIGO_SRT si se actualiza
    nuevo_codigo_srt = datos_nuevos.get("codigo_srt")
    if nuevo_codigo_srt and nuevo_codigo_srt.strip():
        pase_existente = repo.get_pase_by_codigo_srt(nuevo_codigo_srt.strip())
        if pase_existente and pase_existente.PASE_ID != pase_id:
            raise HTTPException(
                status_code=400,
                detail=f"Ya existe otro pase registrado con el código SRT '{nuevo_codigo_srt.strip()}'. El código SRT debe ser único."
            )

    # Determinar el estado resultante
    nuevo_estado = datos_nuevos.get("estado_srt", pase.ESTADO_SRT)
    nuevo_motivo = datos_nuevos.get("motivo_estado", pase.MOTIVO_ESTADO)

    # Validación de estados que requieren motivo: RECHAZADO y ANULADO
    if nuevo_estado in ("RECHAZADO", "ANULADO"):
        if not nuevo_motivo or not nuevo_motivo.strip():
            raise HTTPException(
                status_code=400,
                detail=f"Debe indicar el motivo cuando el estado del pase es '{nuevo_estado}'"
            )

    # Validación cuando se pasa al estado final PRD_EJECUTADO
    if nuevo_estado == "PRD_EJECUTADO":
        campos_req = {
            "Orden de Cambio (OC)": datos_nuevos.get("oc", pase.OC),
            "Estado OC": datos_nuevos.get("stado_oc") or datos_nuevos.get("estado_oc") or pase.STADO_OC,
            "Fecha Registro OC": datos_nuevos.get("fecha_registro_oc", pase.FECHA_REGISTRO_OC),
            "Fecha y Hora Pase PRD (*)": datos_nuevos.get("fecha_hora_pase_prd", pase.FECHA_HORA_PASE_PRD),
            "Fecha Certificación": datos_nuevos.get("fecha_certificacion", pase.FECHA_CERTIFICACION),
            "Operador Pase": datos_nuevos.get("operador_pase", pase.OPERADOR_PASE),
        }
        faltantes = [nom for nom, val in campos_req.items() if val is None or (isinstance(val, str) and not val.strip())]
        if faltantes:
            raise HTTPException(
                status_code=400,
                detail=f"Cuando el estado es PRD_EJECUTADO, son obligatorios los siguientes campos: {', '.join(faltantes)}"
            )

    actualizado = repo.update_pase(pase, datos_nuevos)

    auditoria_repo.registrar(
        registro_usuario=current_user["registro_cod"],
        accion="ACTUALIZAR_PASE",
        entidad="PASES",
        entidad_id=str(pase_id),
        datos_nuevos=datos_nuevos
    )

    return actualizado

@router.delete("/{pase_id}")
def eliminar_pase(
    pase_id: int,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = PaseRepository(db)
    auditoria_repo = AuditoriaRepository(db)

    pase = repo.get_pase(pase_id)
    if not pase:
        raise HTTPException(status_code=404, detail="Registro de pase no encontrado")

    if pase.ESTADO_SRT == "PRD_EJECUTADO":
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar un pase que se encuentra en estado PRD_EJECUTADO (estado final definitivo para un SRT)."
        )

    repo.delete_pase(pase)

    auditoria_repo.registrar(
        registro_usuario=current_user["registro_cod"],
        accion="ELIMINAR_PASE",
        entidad="PASES",
        entidad_id=str(pase_id),
        datos_anteriores={"codigo_srt": pase.CODIGO_SRT, "titulo": pase.TITULO}
    )

    return {"ok": True, "message": f"Pase {pase_id} eliminado exitosamente"}
