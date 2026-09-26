from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.entities import Incidente

class IncidenteRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_incidente(self, incidente_id: int) -> Optional[Incidente]:
        return self.db.query(Incidente).filter(Incidente.INCIDENTE_ID == incidente_id).first()

    def list_incidentes(
        self,
        ambiente: Optional[str] = None,
        job: Optional[str] = None,
        dtsx: Optional[str] = None,
        atendido_por: Optional[str] = None,
        aplicativo: Optional[str] = None,
        ruta_critica: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Incidente]:
        query = self.db.query(Incidente)

        if ambiente and ambiente.strip():
            query = query.filter(Incidente.AMBIENTE.ilike(ambiente.strip()))

        if job and job.strip():
            query = query.filter(Incidente.JOB.ilike(f"%{job.strip()}%"))

        if dtsx and dtsx.strip():
            query = query.filter(Incidente.DTSX.ilike(f"%{dtsx.strip()}%"))

        if atendido_por and atendido_por.strip():
            query = query.filter(Incidente.ATENDIDO_POR.ilike(f"%{atendido_por.strip()}%"))

        if aplicativo and aplicativo.strip():
            query = query.filter(Incidente.APLICATIVO.ilike(f"%{aplicativo.strip()}%"))

        if ruta_critica and ruta_critica.strip():
            query = query.filter(Incidente.RUTA_CRITICA.ilike(ruta_critica.strip()))

        if search and search.strip():
            s = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Incidente.JOB.ilike(s),
                    Incidente.DTSX.ilike(s),
                    Incidente.ATENDIDO_POR.ilike(s),
                    Incidente.APLICATIVO.ilike(s),
                    Incidente.SERVER.ilike(s),
                    Incidente.RUTA.ilike(s),
                    Incidente.APLICAR.ilike(s),
                    Incidente.DESCRIPCION_ERROR.ilike(s),
                    Incidente.SOLUCION.ilike(s),
                    Incidente.AMBIENTE.ilike(s)
                )
            )

        return query.order_by(Incidente.INCIDENTE_ID.desc()).all()

    def create_incidente(self, data: dict) -> Incidente:
        nuevo = Incidente(
            ATENDIDO_POR=data.get("atendido_por"),
            APLICATIVO=data.get("aplicativo"),
            RUTA_CRITICA=data.get("ruta_critica", "NO") or "NO",
            JOB=data.get("job"),
            FECHA_CANCELACION=data.get("fecha_cancelacion"),
            SERVER=data.get("server"),
            RUTA=data.get("ruta"),
            DTSX=data.get("dtsx"),
            APLICAR=data.get("aplicar"),
            HORA_CANCELACION=data.get("hora_cancelacion"),
            DESCRIPCION_ERROR=data.get("descripcion_error"),
            SOLUCION=data.get("solucion"),
            FECHA_HORA_SOLUCION=data.get("fecha_hora_solucion"),
            AMBIENTE=data.get("ambiente", "PRD") or "PRD",
            FECHA_CREACION=datetime.now(),
            FECHA_ACTUALIZACION=datetime.now()
        )
        self.db.add(nuevo)
        self.db.commit()
        self.db.refresh(nuevo)
        return nuevo

    def update_incidente(self, incidente_id: int, data: dict) -> Incidente:
        item = self.get_incidente(incidente_id)
        if not item:
            raise ValueError("Incidente no encontrado")

        for key, val in data.items():
            if val is not None or key in [
                "atendido_por", "aplicativo", "ruta_critica", "fecha_cancelacion",
                "server", "ruta", "dtsx", "aplicar", "hora_cancelacion",
                "descripcion_error", "solucion", "fecha_hora_solucion"
            ]:
                if hasattr(item, key):
                    setattr(item, key, val)

        item.FECHA_ACTUALIZACION = datetime.now()
        self.db.commit()
        self.db.refresh(item)
        return item

    def delete_incidente(self, incidente_id: int) -> bool:
        item = self.get_incidente(incidente_id)
        if not item:
            return False
        self.db.delete(item)
        self.db.commit()
        return True
