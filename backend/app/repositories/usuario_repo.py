from typing import Optional, List
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.entities import Perfil, Registro, Usuario, AlertaRetirada

class UsuarioRepository:
    def __init__(self, db: Session):
        self.db = db

    # --- Perfiles ---
    def get_perfil_by_desc(self, descripcion: str) -> Optional[Perfil]:
        return self.db.query(Perfil).filter(Perfil.DESCRIPCION == descripcion).first()

    def list_perfiles(self) -> List[Perfil]:
        return self.db.query(Perfil).order_by(Perfil.PERFIL_ID).all()

    def create_perfil(self, descripcion: str) -> Perfil:
        perfil = Perfil(DESCRIPCION=descripcion)
        self.db.add(perfil)
        self.db.commit()
        self.db.refresh(perfil)
        return perfil

    # --- Registros ---
    def get_registro(self, registro: str) -> Optional[Registro]:
        return self.db.query(Registro).filter(Registro.REGISTRO == registro).first()

    def get_registro_by_dni(self, dni: str) -> Optional[Registro]:
        return self.db.query(Registro).filter(Registro.DNI == dni).first()

    def get_registro_by_correo(self, correo: str) -> Optional[Registro]:
        return self.db.query(Registro).filter(Registro.CORREO == correo).first()

    def list_registros(self, search: Optional[str] = None, perfil: Optional[str] = None, estado: Optional[str] = None) -> List[Registro]:
        query = self.db.query(Registro)
        if perfil:
            query = query.filter(Registro.PERFIL == perfil)
        if estado:
            query = query.filter(Registro.ESTADO == estado)
        if search:
            s = f"%{search}%"
            query = query.filter(
                or_(
                    Registro.REGISTRO.ilike(s),
                    Registro.NOMBRES.ilike(s),
                    Registro.DNI.ilike(s),
                    Registro.CORREO.ilike(s)
                )
            )
        return query.order_by(Registro.NOMBRES).all()

    def create_registro(self, data: dict) -> Registro:
        registro = Registro(**data)
        self.db.add(registro)
        self.db.commit()
        self.db.refresh(registro)
        return registro

    def update_registro(self, registro: Registro, data: dict) -> Registro:
        for key, val in data.items():
            setattr(registro, key, val)
        self.db.commit()
        self.db.refresh(registro)
        return registro

    # --- Usuarios ---
    def get_usuario(self, registro: str) -> Optional[Usuario]:
        return self.db.query(Usuario).filter(Usuario.REGISTRO == registro).first()

    def list_usuarios(self) -> List[Usuario]:
        return self.db.query(Usuario).all()

    def create_usuario(self, registro: str, hashed_pw: str, debe_cambiar: bool = False, debe_cambiar_password: Optional[bool] = None, estado: str = "ACTIVO") -> Usuario:
        flag_cambiar = debe_cambiar_password if debe_cambiar_password is not None else debe_cambiar
        user = Usuario(
            REGISTRO=registro,
            PASSWORD=hashed_pw,
            DEBE_CAMBIAR_PASSWORD=flag_cambiar,
            ESTADO=estado
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_usuario(self, usuario: Usuario, data: dict) -> Usuario:
        for key, val in data.items():
            if val is not None:
                setattr(usuario, key, val)
        self.db.commit()
        self.db.refresh(usuario)
        return usuario

    # --- Alertas Retiradas ---
    def get_alerta_retirada(self, registro: str, fecha_expiracion: date) -> Optional[AlertaRetirada]:
        return self.db.query(AlertaRetirada).filter(
            AlertaRetirada.REGISTRO == registro,
            AlertaRetirada.FECHA_EXPIRACION_ALERTA == fecha_expiracion
        ).first()

    def retirar_alerta(self, registro: str, fecha_expiracion: date) -> AlertaRetirada:
        alerta = AlertaRetirada(
            REGISTRO=registro,
            FECHA_EXPIRACION_ALERTA=fecha_expiracion,
            FECHA_RETIRO=datetime.now()
        )
        self.db.add(alerta)
        self.db.commit()
        self.db.refresh(alerta)
        return alerta

    def delete_usuario(self, usuario: Usuario) -> None:
        self.db.delete(usuario)
        self.db.commit()

    def delete_registro(self, reg: Registro) -> None:
        # Si tiene usuario web asignado, eliminarlo primero
        usr = self.get_usuario(reg.REGISTRO)
        if usr:
            self.db.delete(usr)
        # Eliminar membresías en grupos
        from app.models.entities import AsignacionDetGrupo
        self.db.query(AsignacionDetGrupo).filter(AsignacionDetGrupo.REGISTRO == reg.REGISTRO).delete()
        self.db.delete(reg)
        self.db.commit()
