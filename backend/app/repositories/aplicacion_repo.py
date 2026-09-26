from typing import Optional, List
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.entities import Aplicacion

class AplicacionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_aplicacion(self, aplicacion_id: int) -> Optional[Aplicacion]:
        return self.db.query(Aplicacion).filter(Aplicacion.APLICACION_ID == aplicacion_id).first()

    def get_aplicacion_by_nombre(self, nombre_aplicacion: str) -> Optional[Aplicacion]:
        return self.db.query(Aplicacion).filter(
            Aplicacion.NOMBRE_APLICACION.ilike(nombre_aplicacion.strip())
        ).first()

    def list_aplicaciones(
        self,
        search: Optional[str] = None,
        estado: Optional[str] = None
    ) -> List[Aplicacion]:
        query = self.db.query(Aplicacion)
        if estado:
            query = query.filter(Aplicacion.ESTADO.ilike(estado.strip()))
        if search:
            s = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Aplicacion.NOMBRE_APLICACION.ilike(s),
                    Aplicacion.SIGLAS.ilike(s),
                    Aplicacion.LIDER_TECNO.ilike(s),
                    Aplicacion.PO_CONTACTO.ilike(s),
                    Aplicacion.SCRUM_DATOS.ilike(s),
                    Aplicacion.DESCRIPCION_ACTIVIDAD.ilike(s)
                )
            )
        return query.order_by(Aplicacion.FECHA_REGISTRO.desc()).all()

    def create_aplicacion(self, data: dict) -> Aplicacion:
        fecha_reg = data.get("fecha_registro")
        if not fecha_reg:
            fecha_reg = datetime.now()
        elif isinstance(fecha_reg, str):
            try:
                fecha_reg = datetime.strptime(fecha_reg, "%Y-%m-%d")
            except ValueError:
                fecha_reg = datetime.now()
        elif isinstance(fecha_reg, date) and not isinstance(fecha_reg, datetime):
            fecha_reg = datetime.combine(fecha_reg, datetime.min.time())

        aplicacion = Aplicacion(
            NOMBRE_APLICACION=data["nombre_aplicacion"].strip(),
            SIGLAS=data.get("siglas").strip() if data.get("siglas") else None,
            LIDER_TECNO=data.get("lider_tecno").strip() if data.get("lider_tecno") else None,
            PO_CONTACTO=data.get("po_contacto").strip() if data.get("po_contacto") else None,
            SCRUM_DATOS=data.get("scrum_datos").strip() if data.get("scrum_datos") else None,
            DESCRIPCION_ACTIVIDAD=data.get("descripcion_actividad").strip() if data.get("descripcion_actividad") else None,
            FECHA_REGISTRO=fecha_reg,
            ESTADO=data.get("estado", "Activo")
        )
        self.db.add(aplicacion)
        self.db.commit()
        self.db.refresh(aplicacion)
        return aplicacion

    def update_aplicacion(self, aplicacion: Aplicacion, data: dict) -> Aplicacion:
        mapping = {
            "nombre_aplicacion": "NOMBRE_APLICACION",
            "siglas": "SIGLAS",
            "lider_tecno": "LIDER_TECNO",
            "po_contacto": "PO_CONTACTO",
            "scrum_datos": "SCRUM_DATOS",
            "descripcion_actividad": "DESCRIPCION_ACTIVIDAD",
            "fecha_registro": "FECHA_REGISTRO",
            "estado": "ESTADO"
        }
        for k, v in data.items():
            col_name = mapping.get(k)
            if col_name and v is not None:
                if isinstance(v, str):
                    v = v.strip()
                elif k == "fecha_registro":
                    if isinstance(v, str):
                        try:
                            v = datetime.strptime(v, "%Y-%m-%d")
                        except ValueError:
                            pass
                    elif isinstance(v, date) and not isinstance(v, datetime):
                        v = datetime.combine(v, datetime.min.time())
                setattr(aplicacion, col_name, v)
        self.db.commit()
        self.db.refresh(aplicacion)
        return aplicacion

    def delete_aplicacion(self, aplicacion: Aplicacion) -> bool:
        self.db.delete(aplicacion)
        self.db.commit()
        return True
