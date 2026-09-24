from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.schemas import AuditoriaResponse
from app.repositories.auditoria_repo import AuditoriaRepository
from app.api.deps import require_roles

router = APIRouter()

@router.get("", response_model=List[AuditoriaResponse])
def listar_auditoria(
    entidad: Optional[str] = None,
    registro_usuario: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    current_user: dict = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db)
):
    repo = AuditoriaRepository(db)
    return repo.list_auditorias(entidad=entidad, registro_usuario=registro_usuario, limit=limit, skip=skip)
