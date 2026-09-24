from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.schemas import LoginRequest, TokenResponse, UsuarioMeResponse, CambioPasswordRequest
from app.services.auth_service import AuthService
from app.api.deps import get_current_user_and_registro

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    token, me = auth_service.login(
        registro_input=login_data.registro.strip().upper(),
        password=login_data.password,
        ip=client_ip,
        user_agent=user_agent
    )

    # Establecer cookie segura HttpOnly opcional
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False  # True en producción con HTTPS
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        usuario=me
    )

@router.get("/me", response_model=UsuarioMeResponse)
def get_current_user(current_user: dict = Depends(get_current_user_and_registro), db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    return auth_service.build_me_response(current_user["registro"], current_user["usuario"])

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"status": "ok", "message": "Sesión cerrada"}

@router.post("/cambiar-password")
def cambiar_password(
    data: CambioPasswordRequest,
    request: Request,
    current_user: dict = Depends(get_current_user_and_registro),
    db: Session = Depends(get_db)
):
    auth_service = AuthService(db)
    client_ip = request.client.host if request.client else None
    auth_service.cambiar_password(
        registro=current_user["registro_cod"],
        password_actual=data.password_actual,
        password_nuevo=data.password_nuevo,
        ip=client_ip
    )
    return {"status": "ok", "message": "Contraseña actualizada exitosamente"}

@router.post("/retirar-alerta")
def retirar_alerta(
    current_user: dict = Depends(get_current_user_and_registro),
    db: Session = Depends(get_db)
):
    auth_service = AuthService(db)
    return auth_service.retirar_alerta_expiracion(current_user["registro_cod"])
