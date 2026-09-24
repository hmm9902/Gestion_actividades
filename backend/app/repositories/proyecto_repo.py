from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.entities import Proyecto

class ProyectoRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_proyecto(self, proyecto_id: int) -> Optional[Proyecto]:
        return self.db.query(Proyecto).filter(Proyecto.PROYECTO_ID == proyecto_id).first()

    def get_proyecto_by_nombre(self, nombre_proyecto: str) -> Optional[Proyecto]:
        return self.db.query(Proyecto).filter(
            Proyecto.NOMBRE_PROYECTO.ilike(nombre_proyecto.strip())
        ).first()

    def list_proyectos(
        self,
        search: Optional[str] = None,
        estado: Optional[str] = None
    ) -> List[Proyecto]:
        query = self.db.query(Proyecto)
        if estado:
            query = query.filter(Proyecto.ESTADO.ilike(estado.strip()))
        if search:
            s = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Proyecto.NOMBRE_PROYECTO.ilike(s),
                    Proyecto.DESCRIPCION_PROYECTO.ilike(s),
                    Proyecto.EQUIPO_SOLICITANTE.ilike(s),
                    Proyecto.POSIBLES_IMPEDIMENTOS.ilike(s)
                )
            )
        return query.order_by(Proyecto.FECHA_REGISTRO.desc()).all()

    def create_proyecto(self, data: dict) -> Proyecto:
        fecha_reg = data.get("fecha_registro")
        if not fecha_reg:
            fecha_reg = datetime.now()
        elif isinstance(fecha_reg, str):
            try:
                fecha_reg = datetime.strptime(fecha_reg, "%Y-%m-%d")
            except ValueError:
                fecha_reg = datetime.now()

        proyecto = Proyecto(
            NOMBRE_PROYECTO=data["nombre_proyecto"].strip(),
            DESCRIPCION_PROYECTO=data.get("descripcion_proyecto"),
            EQUIPO_SOLICITANTE=data.get("equipo_solicitante"),
            POSIBLES_IMPEDIMENTOS=data.get("posibles_impedimentos"),
            FECHA_DEAD_LINE=data.get("fecha_dead_line"),
            FECHA_REGISTRO=fecha_reg,
            ESTADO=data.get("estado", "Activo")
        )
        self.db.add(proyecto)
        self.db.commit()
        self.db.refresh(proyecto)
        return proyecto

    def update_proyecto(self, proyecto: Proyecto, data: dict) -> Proyecto:
        mapping = {
            "nombre_proyecto": "NOMBRE_PROYECTO",
            "descripcion_proyecto": "DESCRIPCION_PROYECTO",
            "equipo_solicitante": "EQUIPO_SOLICITANTE",
            "fecha_registro": "FECHA_REGISTRO",
            "posibles_impedimentos": "POSIBLES_IMPEDIMENTOS",
            "fecha_dead_line": "FECHA_DEAD_LINE",
            "estado": "ESTADO"
        }
        for k, v in data.items():
            col_name = mapping.get(k)
            if col_name and v is not None:
                if isinstance(v, str):
                    v = v.strip()
                setattr(proyecto, col_name, v)
        self.db.commit()
        self.db.refresh(proyecto)
        return proyecto

    def delete_proyecto(self, proyecto: Proyecto) -> bool:
        self.db.delete(proyecto)
        self.db.commit()
        return True
