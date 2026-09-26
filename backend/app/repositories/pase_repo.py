from typing import Optional, List
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.entities import Pase

class PaseRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_pase(self, pase_id: int) -> Optional[Pase]:
        return self.db.query(Pase).filter(Pase.PASE_ID == pase_id).first()

    def get_pase_by_codigo_srt(self, codigo_srt: str) -> Optional[Pase]:
        if not codigo_srt:
            return None
        return self.db.query(Pase).filter(Pase.CODIGO_SRT.ilike(codigo_srt.strip())).first()

    def list_pases(
        self,
        proyecto: Optional[str] = None,
        titulo: Optional[str] = None,
        fecha_registro_srt: Optional[date] = None,
        codigo_srt: Optional[str] = None,
        oc: Optional[str] = None,
        estado_srt: Optional[str] = None,
        tipo_ambiente: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Pase]:
        query = self.db.query(Pase)

        if proyecto and proyecto.strip():
            query = query.filter(Pase.PROYECTO.ilike(f"%{proyecto.strip()}%"))

        if titulo and titulo.strip():
            query = query.filter(Pase.TITULO.ilike(f"%{titulo.strip()}%"))

        if fecha_registro_srt:
            query = query.filter(Pase.FECHA_REGISTRO_SRT == fecha_registro_srt)

        if codigo_srt and codigo_srt.strip():
            query = query.filter(Pase.CODIGO_SRT.ilike(f"%{codigo_srt.strip()}%"))

        if oc and oc.strip():
            query = query.filter(Pase.OC.ilike(f"%{oc.strip()}%"))

        if estado_srt and estado_srt.strip():
            query = query.filter(Pase.ESTADO_SRT.ilike(estado_srt.strip()))

        if tipo_ambiente and tipo_ambiente.strip():
            query = query.filter(Pase.TIPO_AMBIENTE == tipo_ambiente.strip().upper())

        if search and search.strip():
            s = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Pase.TITULO.ilike(s),
                    Pase.CODIGO_SRT.ilike(s),
                    Pase.OC.ilike(s),
                    Pase.PROYECTO.ilike(s),
                    Pase.APP.ilike(s),
                    Pase.DEV.ilike(s),
                    Pase.QA.ilike(s),
                    Pase.SUSTENTO_VALOR_NEGOCIO.ilike(s)
                )
            )

        return query.order_by(Pase.PASE_ID.desc()).all()

    def create_pase(self, data: dict) -> Pase:
        pase = Pase(
            TIPO_AMBIENTE=data.get("tipo_ambiente", "D"),
            PROYECTO=data.get("proyecto"),
            APP=data.get("app"),
            FECHA_REGISTRO_SRT=data.get("fecha_registro_srt"),
            FECHA_SOLICITADO_UAT=data.get("fecha_solicitado_uat"),
            FECHA_DESPLEGADO_UAT=data.get("fecha_desplegado_uat"),
            ESTADO_SRT=data.get("estado_srt", "REGISTRADO"),
            CODIGO_SRT=data.get("codigo_srt"),
            TITULO=data.get("titulo"),
            CONFORMES_PRD=data.get("conformes_prd"),
            QA=data.get("qa"),
            FECHA_CERTIFICACION=data.get("fecha_certificacion"),
            FECHA_REGISTRO_OC=data.get("fecha_registro_oc"),
            FECHA_HORA_PASE_PRD=data.get("fecha_hora_pase_prd"),
            OC=data.get("oc"),
            STADO_OC=data.get("stado_oc") if data.get("stado_oc") is not None else data.get("estado_oc"),
            OPERADOR_PASE=data.get("operador_pase"),
            DEV=data.get("dev"),
            SUSTENTO_VALOR_NEGOCIO=data.get("sustento_valor_negocio"),
            USUARIO_FINAL_APROBACION=data.get("usuario_final_aprobacion"),
            Q_SP_PRD=data.get("q_sp_prd"),
            RESPONSABLE_OWNER_PROYECTO=data.get("responsable_owner_proyecto"),
            MOTIVO_ESTADO=data.get("motivo_estado"),
            FECHA_REGISTRO=datetime.now(),
            FECHA_ACTUALIZACION=datetime.now()
        )
        self.db.add(pase)
        self.db.commit()
        self.db.refresh(pase)
        return pase

    def update_pase(self, pase: Pase, data: dict) -> Pase:
        mapping = {
            "tipo_ambiente": "TIPO_AMBIENTE",
            "proyecto": "PROYECTO",
            "app": "APP",
            "fecha_registro_srt": "FECHA_REGISTRO_SRT",
            "fecha_solicitado_uat": "FECHA_SOLICITADO_UAT",
            "fecha_desplegado_uat": "FECHA_DESPLEGADO_UAT",
            "estado_srt": "ESTADO_SRT",
            "codigo_srt": "CODIGO_SRT",
            "titulo": "TITULO",
            "conformes_prd": "CONFORMES_PRD",
            "qa": "QA",
            "fecha_certificacion": "FECHA_CERTIFICACION",
            "fecha_registro_oc": "FECHA_REGISTRO_OC",
            "fecha_hora_pase_prd": "FECHA_HORA_PASE_PRD",
            "oc": "OC",
            "stado_oc": "STADO_OC",
            "estado_oc": "STADO_OC",
            "operador_pase": "OPERADOR_PASE",
            "dev": "DEV",
            "sustento_valor_negocio": "SUSTENTO_VALOR_NEGOCIO",
            "usuario_final_aprobacion": "USUARIO_FINAL_APROBACION",
            "q_sp_prd": "Q_SP_PRD",
            "responsable_owner_proyecto": "RESPONSABLE_OWNER_PROYECTO",
            "motivo_estado": "MOTIVO_ESTADO",
        }
        for k, v in data.items():
            col_name = mapping.get(k)
            if col_name is not None:
                if isinstance(v, str):
                    v = v.strip()
                setattr(pase, col_name, v)

        pase.FECHA_ACTUALIZACION = datetime.now()
        self.db.commit()
        self.db.refresh(pase)
        return pase

    def delete_pase(self, pase: Pase) -> bool:
        self.db.delete(pase)
        self.db.commit()
        return True
