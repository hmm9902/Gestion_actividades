from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.schemas import PerfilResponse
from app.repositories.usuario_repo import UsuarioRepository
from app.api.deps import get_current_user_and_registro

router = APIRouter()

@router.get("", response_model=List[PerfilResponse])
def listar_perfiles(
    current_user: dict = Depends(get_current_user_and_registro),
    db: Session = Depends(get_db)
):
    repo = UsuarioRepository(db)
    return repo.list_perfiles()
