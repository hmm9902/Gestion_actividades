from datetime import date, datetime, timedelta
from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.repositories.usuario_repo import UsuarioRepository
from app.repositories.auditoria_repo import AuditoriaRepository
from app.core.security import verify_password, hash_password, create_access_token
from app.schemas.schemas import UsuarioMeResponse

class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.usuario_repo = UsuarioRepository(db)
        self.auditoria_repo = AuditoriaRepository(db)

    def login(self, registro_input: str, password: str, ip: Optional[str] = None, user_agent: Optional[str] = None) -> Tuple[str, UsuarioMeResponse]:
        usuario = self.usuario_repo.get_usuario(registro_input)
        if not usuario:
            self.auditoria_repo.registrar(
                registro_usuario=registro_input,
                accion="LOGIN_FALLIDO",
                entidad="USUARIOS",
                datos_nuevos={"motivo": "Usuario no encontrado"},
                ip=ip,
                user_agent=user_agent
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas"
            )

        if usuario.ESTADO != "ACTIVO":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El usuario se encuentra inactivo"
            )

        if not verify_password(password, usuario.PASSWORD):
            self.auditoria_repo.registrar(
                registro_usuario=registro_input,
                accion="LOGIN_FALLIDO",
                entidad="USUARIOS",
                datos_nuevos={"motivo": "Contraseña inválida"},
                ip=ip,
                user_agent=user_agent
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas"
            )

        registro_info = self.usuario_repo.get_registro(usuario.REGISTRO)
        if not registro_info or registro_info.ESTADO != "ACTIVO":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El registro asociado está inactivo o no existe"
            )

        # Token JWT (sin PASSWORD_DOMAIN)
        token_data = {
            "sub": usuario.REGISTRO,
            "perfil": registro_info.PERFIL,
            "correo": registro_info.CORREO
        }
        token = create_access_token(token_data)

        # Auditoria de login exitoso
        self.auditoria_repo.registrar(
            registro_usuario=usuario.REGISTRO,
            accion="LOGIN_EXITOSO",
            entidad="USUARIOS",
            ip=ip,
            user_agent=user_agent
        )

        me_response = self.build_me_response(registro_info, usuario)
        return token, me_response

    def build_me_response(self, registro_info, usuario) -> UsuarioMeResponse:
        alerta_msg = None
        dias_restantes = None
        alerta_retirada = False

        if registro_info.FECHA_EXPIRACION and registro_info.PERFIL == "SWE":
            hoy = date.today()
            delta = (registro_info.FECHA_EXPIRACION - hoy).days
            dias_restantes = delta

            # Comprobar si ya fue retirada
            retirada = self.usuario_repo.get_alerta_retirada(registro_info.REGISTRO, registro_info.FECHA_EXPIRACION)
            alerta_retirada = bool(retirada)

            if delta < 0:
                alerta_msg = f"Tu cuenta de SWE venció hace {abs(delta)} días. Contacta con el Administrador."
            elif delta <= 10:
                alerta_msg = f"Atención: Tu cuenta de SWE expira en {delta} días ({registro_info.FECHA_EXPIRACION})."

        return UsuarioMeResponse(
            registro=registro_info.REGISTRO,
            correo=registro_info.CORREO,
            nombres_completos=registro_info.NOMBRES,
            fecha_expiracion=registro_info.FECHA_EXPIRACION,
            perfil=registro_info.PERFIL,
            domain_empresa=registro_info.DOMAIN_EMPRESA,
            empresa=registro_info.EMPRESA,
            estado=usuario.ESTADO,
            debe_cambiar_password=usuario.DEBE_CAMBIAR_PASSWORD,
            alerta_expiracion=alerta_msg,
            alerta_expiracion_dias=dias_restantes,
            alerta_retirada=alerta_retirada
        )

    def cambiar_password(self, registro: str, password_actual: str, password_nuevo: str, ip: Optional[str] = None):
        usuario = self.usuario_repo.get_usuario(registro)
        if not usuario or not verify_password(password_actual, usuario.PASSWORD):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La contraseña actual no es correcta"
            )

        if len(password_nuevo) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La nueva contraseña debe tener al menos 6 caracteres"
            )

        usuario.PASSWORD = hash_password(password_nuevo)
        usuario.DEBE_CAMBIAR_PASSWORD = False
        self.db.commit()

        self.auditoria_repo.registrar(
            registro_usuario=registro,
            accion="CAMBIO_PASSWORD",
            entidad="USUARIOS",
            ip=ip
        )
        return True

    def retirar_alerta_expiracion(self, registro: str):
        registro_info = self.usuario_repo.get_registro(registro)
        if not registro_info or not registro_info.FECHA_EXPIRACION:
            raise HTTPException(status_code=400, detail="El usuario no tiene fecha de expiración configurada")
        
        self.usuario_repo.retirar_alerta(registro, registro_info.FECHA_EXPIRACION)
        return {"status": "ok", "mensaje": "Alerta retirada exitosamente"}
