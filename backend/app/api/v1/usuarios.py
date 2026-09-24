from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.schemas import UsuarioCreate, UsuarioUpdate, UsuarioResponse
from app.repositories.usuario_repo import UsuarioRepository
from app.repositories.auditoria_repo import AuditoriaRepository
from app.api.deps import require_roles
from app.core.security import hash_password

router = APIRouter()

@router.get("", response_model=List[UsuarioResponse])
def listar_usuarios(
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = UsuarioRepository(db)
    usuarios = repo.list_usuarios()
    res = []
    for u in usuarios:
        reg = repo.get_registro(u.REGISTRO)
        res.append(UsuarioResponse(
            usuario_id=u.USUARIO_ID,
            registro=u.REGISTRO,
            fecha_registro=u.FECHA_REGISTRO,
            estado=u.ESTADO,
            debe_cambiar_password=u.DEBE_CAMBIAR_PASSWORD,
            nombres=reg.NOMBRES if reg else None,
            perfil=reg.PERFIL if reg else None,
            correo=reg.CORREO if reg else None
        ))
    return res

@router.post("", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    data: UsuarioCreate,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = UsuarioRepository(db)
    auditoria_repo = AuditoriaRepository(db)

    reg = repo.get_registro(data.registro.upper())
    if not reg:
        raise HTTPException(status_code=400, detail="El código de REGISTRO no existe")
    if repo.get_usuario(data.registro.upper()):
        raise HTTPException(status_code=400, detail="Este usuario ya cuenta con acceso creado")

    user = repo.create_usuario(
        registro=reg.REGISTRO,
        hashed_pw=hash_password(data.password),
        debe_cambiar_password=False,
        estado=data.estado
    )

    auditoria_repo.registrar(
        registro_usuario=current_user["registro_cod"],
        accion="CREAR_USUARIO",
        entidad="USUARIOS",
        entidad_id=user.REGISTRO,
        datos_nuevos={"registro": user.REGISTRO, "estado": user.ESTADO}
    )

    return UsuarioResponse(
        usuario_id=user.USUARIO_ID,
        registro=user.REGISTRO,
        fecha_registro=user.FECHA_REGISTRO,
        estado=user.ESTADO,
        debe_cambiar_password=user.DEBE_CAMBIAR_PASSWORD,
        nombres=reg.NOMBRES,
        perfil=reg.PERFIL,
        correo=reg.CORREO
    )

@router.put("/{registro_cod}", response_model=UsuarioResponse)
def actualizar_usuario(
    registro_cod: str,
    data: UsuarioUpdate,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = UsuarioRepository(db)
    auditoria_repo = AuditoriaRepository(db)

    user = repo.get_usuario(registro_cod.upper())
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    update_dict = {}
    if data.estado is not None:
        update_dict["ESTADO"] = data.estado
    if data.debe_cambiar_password is not None:
        update_dict["DEBE_CAMBIAR_PASSWORD"] = data.debe_cambiar_password
    if data.password:
        update_dict["PASSWORD"] = hash_password(data.password)

    if update_dict:
        repo.update_usuario(user, update_dict)

    reg = repo.get_registro(user.REGISTRO)

    auditoria_repo.registrar(
        registro_usuario=current_user["registro_cod"],
        accion="ACTUALIZAR_USUARIO",
        entidad="USUARIOS",
        entidad_id=user.REGISTRO,
        datos_nuevos={"registro": user.REGISTRO, "estado": user.ESTADO, "debe_cambiar": user.DEBE_CAMBIAR_PASSWORD}
    )

    return UsuarioResponse(
        usuario_id=user.USUARIO_ID,
        registro=user.REGISTRO,
        fecha_registro=user.FECHA_REGISTRO,
        estado=user.ESTADO,
        debe_cambiar_password=user.DEBE_CAMBIAR_PASSWORD,
        nombres=reg.NOMBRES if reg else None,
        perfil=reg.PERFIL if reg else None,
        correo=reg.CORREO if reg else None
    )

@router.delete("/{registro_cod}", status_code=status.HTTP_200_OK)
def eliminar_usuario(
    registro_cod: str,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = UsuarioRepository(db)
    auditoria_repo = AuditoriaRepository(db)

    user = repo.get_usuario(registro_cod.upper())
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if user.REGISTRO == current_user["registro_cod"].upper():
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propio acceso de usuario activo")

    auditoria_repo.registrar(
        registro_usuario=current_user["registro_cod"],
        accion="ELIMINAR_USUARIO",
        entidad="USUARIOS",
        entidad_id=user.REGISTRO,
        datos_anteriores={"registro": user.REGISTRO, "estado": user.ESTADO}
    )
    repo.delete_usuario(user)
    return {"mensaje": f"Acceso de usuario {registro_cod} eliminado correctamente"}

