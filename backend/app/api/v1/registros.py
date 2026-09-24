from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.schemas import RegistroCreate, RegistroUpdate, RegistroResponse
from app.repositories.usuario_repo import UsuarioRepository
from app.repositories.auditoria_repo import AuditoriaRepository
from app.api.deps import require_roles, get_current_user_and_registro
from app.core.security import hash_password

router = APIRouter()

@router.get("", response_model=List[RegistroResponse])
def listar_registros(
    search: Optional[str] = None,
    perfil: Optional[str] = None,
    estado: Optional[str] = None,
    current_user: dict = Depends(get_current_user_and_registro),
    db: Session = Depends(get_db)
):
    repo = UsuarioRepository(db)
    return repo.list_registros(search=search, perfil=perfil, estado=estado)

@router.get("/{registro_cod}", response_model=RegistroResponse)
def obtener_registro(
    registro_cod: str,
    current_user: dict = Depends(get_current_user_and_registro),
    db: Session = Depends(get_db)
):
    repo = UsuarioRepository(db)
    reg = repo.get_registro(registro_cod.upper())
    if not reg:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    return reg

@router.post("", response_model=RegistroResponse, status_code=status.HTTP_201_CREATED)
def crear_registro(
    data: RegistroCreate,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = UsuarioRepository(db)
    auditoria_repo = AuditoriaRepository(db)

    # Validar unicidad
    if repo.get_registro(data.registro.upper()):
        raise HTTPException(status_code=400, detail="El código de REGISTRO ya existe")
    if repo.get_registro_by_dni(data.dni):
        raise HTTPException(status_code=400, detail="El DNI ya se encuentra registrado")
    if repo.get_registro_by_correo(data.correo):
        raise HTTPException(status_code=400, detail="El correo ya se encuentra registrado")
    
    # Validar perfil existente
    if not repo.get_perfil_by_desc(data.perfil):
        raise HTTPException(status_code=400, detail=f"El perfil {data.perfil} no es válido")

    create_dict = {
        "DNI": data.dni.strip(),
        "NOMBRES": data.nombres.strip(),
        "REGISTRO": data.registro.strip().upper(),
        "CORREO": data.correo.strip().lower(),
        "FECHA_EXPIRACION": data.fecha_expiracion,
        "PERFIL": data.perfil,
        "EMPRESA": data.empresa,
        "DOMAIN_EMPRESA": data.domain_empresa,
        "PASSWORD_DOMAIN": data.password_domain,  # Guardado solo internamente si viene
        "ESTADO": data.estado
    }
    
    reg = repo.create_registro(create_dict)

    # Si se solicitó crear usuario con contraseña
    if data.password_inicial:
        repo.create_usuario(
            registro=reg.REGISTRO,
            hashed_pw=hash_password(data.password_inicial),
            debe_cambiar_password=False,
            estado="ACTIVO"
        )

    auditoria_repo.registrar(
        registro_usuario=current_user["registro_cod"],
        accion="CREAR_REGISTRO",
        entidad="REGISTRO",
        entidad_id=reg.REGISTRO,
        datos_nuevos={"registro": reg.REGISTRO, "perfil": reg.PERFIL, "correo": reg.CORREO}
    )

    return reg

@router.put("/{registro_cod}", response_model=RegistroResponse)
def actualizar_registro(
    registro_cod: str,
    data: RegistroUpdate,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = UsuarioRepository(db)
    auditoria_repo = AuditoriaRepository(db)

    reg = repo.get_registro(registro_cod.upper())
    if not reg:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    update_dict = {}
    if data.dni is not None:
        dni_clean = data.dni.strip()
        reg_dni = repo.get_registro_by_dni(dni_clean)
        if reg_dni and reg_dni.REGISTRO != reg.REGISTRO:
            raise HTTPException(status_code=400, detail="El DNI ya se encuentra registrado por otro colaborador")
        update_dict["DNI"] = dni_clean
    if data.nombres is not None:
        update_dict["NOMBRES"] = data.nombres.strip()
    if data.correo is not None:
        correo_clean = data.correo.strip().lower()
        reg_correo = repo.get_registro_by_correo(correo_clean)
        if reg_correo and reg_correo.REGISTRO != reg.REGISTRO:
            raise HTTPException(status_code=400, detail="El correo ya se encuentra registrado por otro colaborador")
        update_dict["CORREO"] = correo_clean
    if "fecha_expiracion" in data.model_fields_set:
        update_dict["FECHA_EXPIRACION"] = data.fecha_expiracion
    if data.perfil is not None:
        if not repo.get_perfil_by_desc(data.perfil):
            raise HTTPException(status_code=400, detail="Perfil no válido")
        update_dict["PERFIL"] = data.perfil
    if data.empresa is not None:
        update_dict["EMPRESA"] = data.empresa
    if data.domain_empresa is not None:
        update_dict["DOMAIN_EMPRESA"] = data.domain_empresa
    if data.password_domain is not None:
        update_dict["PASSWORD_DOMAIN"] = data.password_domain
    if data.estado is not None:
        update_dict["ESTADO"] = data.estado

    repo.update_registro(reg, update_dict)

    auditoria_repo.registrar(
        registro_usuario=current_user["registro_cod"],
        accion="ACTUALIZAR_REGISTRO",
        entidad="REGISTRO",
        entidad_id=reg.REGISTRO,
        datos_nuevos=update_dict
    )

    return reg

@router.delete("/{registro_cod}", status_code=status.HTTP_200_OK)
def eliminar_registro(
    registro_cod: str,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = UsuarioRepository(db)
    auditoria_repo = AuditoriaRepository(db)

    reg = repo.get_registro(registro_cod.upper())
    if not reg:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    if reg.REGISTRO == current_user["registro_cod"].upper():
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propio registro de sesión")

    auditoria_repo.registrar(
        registro_usuario=current_user["registro_cod"],
        accion="ELIMINAR_REGISTRO",
        entidad="REGISTRO",
        entidad_id=reg.REGISTRO,
        datos_anteriores={"nombres": reg.NOMBRES, "correo": reg.CORREO, "perfil": reg.PERFIL}
    )
    repo.delete_registro(reg)
    return {"mensaje": f"Registro {registro_cod} eliminado correctamente"}

