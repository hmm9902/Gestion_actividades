from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.entities import Ticket
from app.schemas.schemas import ESTADOS_TICKET_TERMINALES

class TicketRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_ticket(self, ticket_id: int) -> Optional[Ticket]:
        return self.db.query(Ticket).filter(Ticket.TICKET_ID == ticket_id).first()

    def get_ticket_by_code(self, ticket_code: str) -> Optional[Ticket]:
        if not ticket_code:
            return None
        return self.db.query(Ticket).filter(Ticket.TICKET.ilike(ticket_code.strip())).first()

    def list_tickets(
        self,
        tipo: Optional[str] = None,
        ticket: Optional[str] = None,
        descripcion: Optional[str] = None,
        proyecto: Optional[str] = None,
        aplicativo: Optional[str] = None,
        estado: Optional[str] = None,
        ambiente: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Ticket]:
        query = self.db.query(Ticket)

        if tipo and tipo.strip():
            query = query.filter(Ticket.TIPO.ilike(tipo.strip()))

        if ticket and ticket.strip():
            query = query.filter(Ticket.TICKET.ilike(f"%{ticket.strip()}%"))

        if descripcion and descripcion.strip():
            query = query.filter(Ticket.DESCRIPCION.ilike(f"%{descripcion.strip()}%"))

        if proyecto and proyecto.strip():
            query = query.filter(Ticket.PROYECTO.ilike(f"%{proyecto.strip()}%"))

        if aplicativo and aplicativo.strip():
            query = query.filter(Ticket.APLICATIVO.ilike(f"%{aplicativo.strip()}%"))

        if estado and estado.strip():
            query = query.filter(Ticket.ESTADO.ilike(estado.strip()))

        if ambiente and ambiente.strip():
            query = query.filter(Ticket.AMBIENTE.ilike(ambiente.strip()))

        if search and search.strip():
            s = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Ticket.TICKET.ilike(s),
                    Ticket.DESCRIPCION.ilike(s),
                    Ticket.TIPO.ilike(s),
                    Ticket.PROYECTO.ilike(s),
                    Ticket.APLICATIVO.ilike(s),
                    Ticket.AMBIENTE.ilike(s),
                    Ticket.IBM_ASIGNADO.ilike(s),
                    Ticket.CEL_CONTACTO.ilike(s),
                    Ticket.COMENTARIO.ilike(s),
                    Ticket.ESTADO.ilike(s)
                )
            )

        return query.order_by(Ticket.TICKET_ID.desc()).all()

    def create_ticket(self, data: dict) -> Ticket:
        nuevo_ticket = Ticket(
            TIPO=data.get("tipo", "Incident"),
            FECHA_REGISTRO=data.get("fecha_registro"),
            APLICATIVO=data.get("aplicativo"),
            PROYECTO=data.get("proyecto"),
            AMBIENTE=data.get("ambiente"),
            TICKET=data.get("ticket"),
            DESCRIPCION=data.get("descripcion"),
            FECHA_ATENCION=data.get("fecha_atencion"),
            IBM_ASIGNADO=data.get("ibm_asignado"),
            CEL_CONTACTO=data.get("cel_contacto"),
            ESTADO=data.get("estado", "ABIERTO"),
            COMENTARIO=data.get("comentario"),
            FECHA_CREACION=datetime.now(),
            FECHA_ACTUALIZACION=datetime.now()
        )
        self.db.add(nuevo_ticket)
        self.db.commit()
        self.db.refresh(nuevo_ticket)
        return nuevo_ticket

    def update_ticket(self, ticket_id: int, data: dict) -> Ticket:
        ticket_obj = self.get_ticket(ticket_id)
        if not ticket_obj:
            raise ValueError("Ticket no encontrado")

        # Regla de negocio: cuando esté en estado (SOLUCIONADO/ANULADO Y RECHAZADO) ya no podrá cambiar de estado
        nuevo_estado = data.get("estado")
        if (
            ticket_obj.ESTADO in ESTADOS_TICKET_TERMINALES
            and nuevo_estado is not None
            and nuevo_estado.strip().upper() != ticket_obj.ESTADO.strip().upper()
        ):
            raise ValueError(
                f"El ticket se encuentra en estado terminal '{ticket_obj.ESTADO}' y ya no puede cambiar de estado."
            )

        campos_map = {
            "tipo": "TIPO",
            "fecha_registro": "FECHA_REGISTRO",
            "aplicativo": "APLICATIVO",
            "proyecto": "PROYECTO",
            "ambiente": "AMBIENTE",
            "ticket": "TICKET",
            "descripcion": "DESCRIPCION",
            "fecha_atencion": "FECHA_ATENCION",
            "ibm_asignado": "IBM_ASIGNADO",
            "cel_contacto": "CEL_CONTACTO",
            "estado": "ESTADO",
            "comentario": "COMENTARIO",
        }

        for k, col in campos_map.items():
            if k in data and data[k] is not None:
                setattr(ticket_obj, col, data[k])

        ticket_obj.FECHA_ACTUALIZACION = datetime.now()
        self.db.commit()
        self.db.refresh(ticket_obj)
        return ticket_obj

    def delete_ticket(self, ticket_id: int) -> bool:
        ticket_obj = self.get_ticket(ticket_id)
        if not ticket_obj:
            return False
        self.db.delete(ticket_obj)
        self.db.commit()
        return True
