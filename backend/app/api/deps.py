from typing import Optional, List
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import decode_access_token
from app.repositories.usuario_repo import UsuarioRepository
from app.models.entities import Usuario, Registro

security_bearer = HTTPBearer(auto_error=False)

def get_token_from_request(request: Request, creds: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)) -> Optional[str]:
    # 1. Bearer header
    if creds and creds.credentials:
        return creds.credentials
    # 2. Cookie de respaldo
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token
    return None

def get_current_user_and_registro(
    token: Optional[str] = Depends(get_token_from_request),
    db: Session = Depends(get_db)
) -> dict:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado"
        )
    
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado"
        )
    
    registro_id = payload["sub"]
    user_repo = UsuarioRepository(db)
    usuario = user_repo.get_usuario(registro_id)
    if not usuario or usuario.ESTADO != "ACTIVO":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo o inexistente"
        )
    
    registro_info = user_repo.get_registro(registro_id)
    if not registro_info or registro_info.ESTADO != "ACTIVO":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Registro inactivo o inexistente"
        )

    return {
        "usuario": usuario,
        "registro": registro_info,
        "registro_cod": registro_info.REGISTRO,
        "perfil": registro_info.PERFIL,
        "correo": registro_info.CORREO,
        "nombres": registro_info.NOMBRES
    }

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: dict = Depends(get_current_user_and_registro)) -> dict:
        if current_user["perfil"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Perfil '{current_user['perfil']}' no autorizado para esta acción."
            )
        return current_user
    return role_checker
