from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.entities import AsignacionGrupo, AsignacionDetGrupo, Actividad

class GrupoRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_grupo(self, codigo_grupo: str) -> Optional[AsignacionGrupo]:
        return self.db.query(AsignacionGrupo).filter(AsignacionGrupo.CODIGO_GRUPO == codigo_grupo).first()

    def list_grupos(self, estado: Optional[str] = None) -> List[AsignacionGrupo]:
        query = self.db.query(AsignacionGrupo)
        if estado:
            query = query.filter(AsignacionGrupo.ESTADO_GRUPO == estado)
        return query.order_by(AsignacionGrupo.CODIGO_GRUPO).all()

    def create_grupo(self, codigo_grupo: str, nombre_grupo: str, registro_principal: str) -> AsignacionGrupo:
        grupo = AsignacionGrupo(
            CODIGO_GRUPO=codigo_grupo,
            NOMBRE_GRUPO=nombre_grupo,
            REGISTRO_PRINCIPAL=registro_principal,
            ESTADO_GRUPO="ACTIVO",
            FECHA_REGISTRO=datetime.now()
        )
        self.db.add(grupo)
        self.db.commit()
        self.db.refresh(grupo)
        return grupo

    def update_grupo(self, grupo: AsignacionGrupo, data: dict) -> AsignacionGrupo:
        for k, v in data.items():
            if v is not None:
                setattr(grupo, k, v)
        self.db.commit()
        self.db.refresh(grupo)
        return grupo

    def update_codigo_grupo(self, antiguo_codigo: str, nuevo_codigo: str) -> AsignacionGrupo:
        grupo_antiguo = self.get_grupo(antiguo_codigo)
        if not grupo_antiguo:
            raise ValueError(f"Grupo con código {antiguo_codigo} no encontrado")

        # 1. Crear nuevo registro de grupo con nuevo código manteniendo sus atributos
        nuevo_grupo = AsignacionGrupo(
            CODIGO_GRUPO=nuevo_codigo,
            NOMBRE_GRUPO=grupo_antiguo.NOMBRE_GRUPO,
            REGISTRO_PRINCIPAL=grupo_antiguo.REGISTRO_PRINCIPAL,
            ESTADO_GRUPO=grupo_antiguo.ESTADO_GRUPO,
            FECHA_REGISTRO=grupo_antiguo.FECHA_REGISTRO
        )
        self.db.add(nuevo_grupo)
        self.db.flush()

        # 2. Migrar referencias en cascada en tablas hijas:
        # a) ASIGNACION_DET_GRUPOS
        self.db.query(AsignacionDetGrupo).filter(
            AsignacionDetGrupo.CODIGO_GRUPO == antiguo_codigo
        ).update({"CODIGO_GRUPO": nuevo_codigo}, synchronize_session=False)

        # b) ACTIVIDADES
        self.db.query(Actividad).filter(
            Actividad.CODIGO_GRUPO == antiguo_codigo
        ).update({"CODIGO_GRUPO": nuevo_codigo}, synchronize_session=False)

        # 3. Eliminar el registro anterior del grupo
        self.db.query(AsignacionGrupo).filter(
            AsignacionGrupo.CODIGO_GRUPO == antiguo_codigo
        ).delete(synchronize_session=False)

        self.db.commit()
        self.db.refresh(nuevo_grupo)
        return nuevo_grupo

    def get_miembro(self, codigo_grupo: str, registro: str) -> Optional[AsignacionDetGrupo]:
        return self.db.query(AsignacionDetGrupo).filter(
            AsignacionDetGrupo.CODIGO_GRUPO == codigo_grupo,
            AsignacionDetGrupo.REGISTRO == registro
        ).first()

    def list_miembros(self, codigo_grupo: str, solo_activos: bool = True) -> List[AsignacionDetGrupo]:
        query = self.db.query(AsignacionDetGrupo).filter(AsignacionDetGrupo.CODIGO_GRUPO == codigo_grupo)
        if solo_activos:
            query = query.filter(AsignacionDetGrupo.ESTADO == "ACTIVO")
        return query.all()

    def add_miembro(self, codigo_grupo: str, registro: str) -> AsignacionDetGrupo:
        existente = self.get_miembro(codigo_grupo, registro)
        if existente:
            existente.ESTADO = "ACTIVO"
            existente.FECHA_REGISTRO = datetime.now()
            self.db.commit()
            self.db.refresh(existente)
            return existente
        
        miembro = AsignacionDetGrupo(
            CODIGO_GRUPO=codigo_grupo,
            REGISTRO=registro,
            ESTADO="ACTIVO",
            FECHA_REGISTRO=datetime.now()
        )
        self.db.add(miembro)
        self.db.commit()
        self.db.refresh(miembro)
        return miembro

    def remove_miembro(self, codigo_grupo: str, registro: str) -> bool:
        miembro = self.get_miembro(codigo_grupo, registro)
        if miembro:
            miembro.ESTADO = "INACTIVO"
            self.db.commit()
            return True
        return False

    def has_active_or_finished_activities(self, codigo_grupo: str) -> bool:
        """
        REGLA DE NEGOCIO:
        No permitir inactivar un grupo si existen actividades EN_PRD o Finalizado relacionadas.
        """
        count = self.db.query(Actividad).filter(
            Actividad.CODIGO_GRUPO == codigo_grupo,
            Actividad.ESTADO.in_(["EN_PRD", "Finalizado"])
        ).count()
        return count > 0

    def delete_grupo(self, grupo: AsignacionGrupo) -> None:
        self.db.delete(grupo)
        self.db.commit()

