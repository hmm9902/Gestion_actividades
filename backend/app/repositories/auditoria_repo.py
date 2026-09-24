from typing import Optional, List
from datetime import datetime
import json
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.entities import Auditoria

class AuditoriaRepository:
    def __init__(self, db: Session):
        self.db = db

    def registrar(
        self,
        registro_usuario: str,
        accion: str,
        entidad: str,
        entidad_id: Optional[str] = None,
        datos_anteriores: Optional[dict] = None,
        datos_nuevos: Optional[dict] = None,
        ip: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Auditoria:
        # Sanitizar para asegurar que ninguna contraseña o campo sensible aparezca en auditoría
        def sanitizar(d: Optional[dict]):
            if not d:
                return None
            clean = d.copy()
            for sensitive_key in ["password", "PASSWORD", "password_domain", "PASSWORD_DOMAIN"]:
                if sensitive_key in clean:
                    clean[sensitive_key] = "********"
            return json.dumps(clean, ensure_ascii=False, default=str)

        auditoria = Auditoria(
            FECHA=datetime.now(),
            REGISTRO_USUARIO=registro_usuario,
            ACCION=accion,
            ENTIDAD=entidad,
            ENTIDAD_ID=str(entidad_id) if entidad_id is not None else None,
            DATOS_ANTERIORES=sanitizar(datos_anteriores),
            DATOS_NUEVOS=sanitizar(datos_nuevos),
            IP=ip,
            USER_AGENT=user_agent
        )
        self.db.add(auditoria)
        self.db.commit()
        self.db.refresh(auditoria)
        return auditoria

    def list_auditorias(
        self,
        entidad: Optional[str] = None,
        registro_usuario: Optional[str] = None,
        limit: int = 100,
        skip: int = 0
    ) -> List[Auditoria]:
        query = self.db.query(Auditoria)
        if entidad:
            query = query.filter(Auditoria.ENTIDAD == entidad)
        if registro_usuario:
            query = query.filter(Auditoria.REGISTRO_USUARIO == registro_usuario)
        return query.order_by(desc(Auditoria.FECHA)).offset(skip).limit(limit).all()
