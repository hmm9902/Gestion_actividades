from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from app.models.entities import Actividad, AsignadoDetRegistro, EstadoDetActividades, Seguimiento

class ActividadRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_actividad(self, codigo_actividad: str) -> Optional[Actividad]:
        return self.db.query(Actividad).filter(Actividad.CODIGO_ACTIVIDAD == codigo_actividad).first()

    def list_actividades(
        self,
        codigo_grupo: Optional[str] = None,
        asignado_registro: Optional[str] = None,
        sprint: Optional[str] = None,
        q_trabajo: Optional[str] = None,
        tipo_actividad: Optional[str] = None,
        estado: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Actividad]:
        query = self.db.query(Actividad)
        
        if codigo_grupo:
            query = query.filter(Actividad.CODIGO_GRUPO == codigo_grupo)
        if asignado_registro:
            query = query.filter(Actividad.ASIGNADO_REGISTRO == asignado_registro)
        if sprint:
            query = query.filter(Actividad.SPRINT == sprint)
        if q_trabajo:
            query = query.filter(Actividad.Q_TRABAJO == q_trabajo)
        if tipo_actividad:
            query = query.filter(Actividad.TIPO_ACTIVIDAD == tipo_actividad)
        if estado:
            query = query.filter(Actividad.ESTADO == estado)
        if search:
            s = f"%{search}%"
            query = query.filter(
                or_(
                    Actividad.CODIGO_ACTIVIDAD.ilike(s),
                    Actividad.TITULO.ilike(s),
                    Actividad.ORDEN_CAMBIO.ilike(s),
                    Actividad.SRT_RATIONAL.ilike(s),
                    Actividad.SOLICITADO_POR.ilike(s)
                )
            )
        # Ordenamos por posición visual y fecha
        return query.order_by(Actividad.POSICION.asc(), Actividad.FECHA_REGISTRO.desc()).all()

    def create_actividad(self, data: dict, creador_registro: str) -> Actividad:
        actividad = Actividad(**data)
        self.db.add(actividad)
        self.db.commit()
        self.db.refresh(actividad)

        # Historial inicial de estado ('registrado' por defecto)
        self.add_historial_estado(
            codigo_actividad=actividad.CODIGO_ACTIVIDAD,
            nuevo_estado=actividad.ESTADO,
            motivo="Creación inicial de la actividad",
            registro_cambio=creador_registro
        )

        # Historial inicial de asignación si tiene asignado
        if actividad.ASIGNADO_REGISTRO:
            self.add_historial_asignado(
                codigo_actividad=actividad.CODIGO_ACTIVIDAD,
                nuevo_asignado=actividad.ASIGNADO_REGISTRO
            )

        return actividad

    def update_actividad(self, actividad: Actividad, data: dict) -> Actividad:
        for k, v in data.items():
            if v is not None:
                setattr(actividad, k, v)
        actividad.FECHA_ACTUALIZACION = datetime.now()
        self.db.commit()
        self.db.refresh(actividad)
        return actividad

    def update_posicion(self, codigo_actividad: str, nueva_posicion: int) -> Optional[Actividad]:
        actividad = self.get_actividad(codigo_actividad)
        if actividad:
            actividad.POSICION = nueva_posicion
            actividad.FECHA_ACTUALIZACION = datetime.now()
            self.db.commit()
            self.db.refresh(actividad)
        return actividad

    def add_historial_estado(self, codigo_actividad: str, nuevo_estado: str, motivo: str, registro_cambio: str) -> EstadoDetActividades:
        historial = EstadoDetActividades(
            CODIGO_ACTIVIDAD=codigo_actividad,
            ESTADO=nuevo_estado,
            MOTIVO=motivo,
            FECHA_CAMBIO_ESTADO=datetime.now(),
            REGISTRO_CAMBIO=registro_cambio
        )
        self.db.add(historial)
        
        # Actualizamos también el estado de la actividad
        actividad = self.get_actividad(codigo_actividad)
        if actividad:
            actividad.ESTADO = nuevo_estado
            actividad.FECHA_ACTUALIZACION = datetime.now()

        self.db.commit()
        self.db.refresh(historial)
        return historial

    def add_historial_asignado(self, codigo_actividad: str, nuevo_asignado: str) -> AsignadoDetRegistro:
        # Inactivar asignaciones previas
        self.db.query(AsignadoDetRegistro).filter(
            AsignadoDetRegistro.CODIGO_ACTIVIDAD == codigo_actividad
        ).update({"ESTADO": "INACTIVO"})

        asignacion = AsignadoDetRegistro(
            CODIGO_ACTIVIDAD=codigo_actividad,
            ASIGNADO=nuevo_asignado,
            ESTADO="ACTIVO",
            FECHA_REGISTRO=datetime.now()
        )
        self.db.add(asignacion)

        # Actualizar asignado en actividad
        actividad = self.get_actividad(codigo_actividad)
        if actividad:
            actividad.ASIGNADO_REGISTRO = nuevo_asignado
            actividad.FECHA_ACTUALIZACION = datetime.now()

        self.db.commit()
        self.db.refresh(asignacion)
        return asignacion

    def add_seguimiento(self, codigo_actividad: str, registro: str, comentario: str) -> Seguimiento:
        seguimiento = Seguimiento(
            CODIGO_ACTIVIDAD=codigo_actividad,
            REGISTRO=registro,
            COMENTARIO=comentario,
            FECHA_REGISTRO=datetime.now()
        )
        self.db.add(seguimiento)
        self.db.commit()
        self.db.refresh(seguimiento)
        return seguimiento

    def list_seguimientos(self, codigo_actividad: str) -> List[Seguimiento]:
        return self.db.query(Seguimiento).filter(
            Seguimiento.CODIGO_ACTIVIDAD == codigo_actividad
        ).order_by(desc(Seguimiento.FECHA_REGISTRO)).all()

    def list_historial_estados(self, codigo_actividad: str) -> List[EstadoDetActividades]:
        return self.db.query(EstadoDetActividades).filter(
            EstadoDetActividades.CODIGO_ACTIVIDAD == codigo_actividad
        ).order_by(desc(EstadoDetActividades.FECHA_CAMBIO_ESTADO)).all()

    def list_historial_asignaciones(self, codigo_actividad: str) -> List[AsignadoDetRegistro]:
        return self.db.query(AsignadoDetRegistro).filter(
            AsignadoDetRegistro.CODIGO_ACTIVIDAD == codigo_actividad
        ).order_by(desc(AsignadoDetRegistro.FECHA_REGISTRO)).all()

    def delete_actividad(self, actividad: Actividad) -> None:
        self.db.delete(actividad)
        self.db.commit()
