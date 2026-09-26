from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.schemas import TicketCreate, TicketUpdate, TicketResponse
from app.repositories.ticket_repo import TicketRepository
from app.repositories.auditoria_repo import AuditoriaRepository
from app.api.deps import require_roles

router = APIRouter()

@router.get("", response_model=List[TicketResponse])
def listar_tickets(
    tipo: Optional[str] = None,
    ticket: Optional[str] = None,
    descripcion: Optional[str] = None,
    proyecto: Optional[str] = None,
    aplicativo: Optional[str] = None,
    estado: Optional[str] = None,
    ambiente: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = TicketRepository(db)
    return repo.list_tickets(
        tipo=tipo,
        ticket=ticket,
        descripcion=descripcion,
        proyecto=proyecto,
        aplicativo=aplicativo,
        estado=estado,
        ambiente=ambiente,
        search=search
    )

@router.get("/{ticket_id}", response_model=TicketResponse)
def obtener_ticket(
    ticket_id: int,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = TicketRepository(db)
    item = repo.get_ticket(ticket_id)
    if not item:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    return item

@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def crear_ticket(
    data: TicketCreate,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = TicketRepository(db)
    auditoria_repo = AuditoriaRepository(db)

    if not data.ticket or not str(data.ticket).strip():
        raise HTTPException(status_code=400, detail="El código o número de Ticket es obligatorio")

    item = repo.create_ticket(data.model_dump())

    auditoria_repo.registrar(
        registro_usuario=current_user["registro_cod"],
        accion="CREAR_TICKET",
        entidad="TICKETS",
        entidad_id=str(item.TICKET_ID),
        datos_nuevos={
            "ticket": item.TICKET,
            "tipo": item.TIPO,
            "descripcion": item.DESCRIPCION,
            "proyecto": item.PROYECTO,
            "aplicativo": item.APLICATIVO,
            "estado": item.ESTADO,
            "ambiente": item.AMBIENTE
        }
    )

    return item

@router.put("/{ticket_id}", response_model=TicketResponse)
def actualizar_ticket(
    ticket_id: int,
    data: TicketUpdate,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = TicketRepository(db)
    auditoria_repo = AuditoriaRepository(db)

    ticket_existente = repo.get_ticket(ticket_id)
    if not ticket_existente:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    datos_anteriores = {
        "ticket": ticket_existente.TICKET,
        "tipo": ticket_existente.TIPO,
        "descripcion": ticket_existente.DESCRIPCION,
        "proyecto": ticket_existente.PROYECTO,
        "aplicativo": ticket_existente.APLICATIVO,
        "estado": ticket_existente.ESTADO,
        "ambiente": ticket_existente.AMBIENTE
    }

    try:
        item = repo.update_ticket(ticket_id, data.model_dump(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    auditoria_repo.registrar(
        registro_usuario=current_user["registro_cod"],
        accion="ACTUALIZAR_TICKET",
        entidad="TICKETS",
        entidad_id=str(item.TICKET_ID),
        datos_anteriores=datos_anteriores,
        datos_nuevos={
            "ticket": item.TICKET,
            "tipo": item.TIPO,
            "descripcion": item.DESCRIPCION,
            "proyecto": item.PROYECTO,
            "aplicativo": item.APLICATIVO,
            "estado": item.ESTADO,
            "ambiente": item.AMBIENTE
        }
    )

    return item

@router.delete("/{ticket_id}", status_code=status.HTTP_200_OK)
def eliminar_ticket(
    ticket_id: int,
    current_user: dict = Depends(require_roles(["ADMIN", "SWE"])),
    db: Session = Depends(get_db)
):
    repo = TicketRepository(db)
    auditoria_repo = AuditoriaRepository(db)

    ticket_existente = repo.get_ticket(ticket_id)
    if not ticket_existente:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    datos_anteriores = {
        "ticket": ticket_existente.TICKET,
        "tipo": ticket_existente.TIPO,
        "descripcion": ticket_existente.DESCRIPCION,
        "proyecto": ticket_existente.PROYECTO,
        "aplicativo": ticket_existente.APLICATIVO,
        "estado": ticket_existente.ESTADO
    }

    exito = repo.delete_ticket(ticket_id)
    if not exito:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    auditoria_repo.registrar(
        registro_usuario=current_user["registro_cod"],
        accion="ELIMINAR_TICKET",
        entidad="TICKETS",
        entidad_id=str(ticket_id),
        datos_anteriores=datos_anteriores
    )

    return {"detail": "Ticket eliminado correctamente", "ticket_id": ticket_id}
