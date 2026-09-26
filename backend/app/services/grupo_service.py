from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.repositories.grupo_repo import GrupoRepository
from app.repositories.usuario_repo import UsuarioRepository
from app.repositories.auditoria_repo import AuditoriaRepository
from app.schemas.schemas import GrupoCreate, GrupoUpdate

class GrupoService:
    def __init__(self, db: Session):
        self.db = db
        self.grupo_repo = GrupoRepository(db)
        self.usuario_repo = UsuarioRepository(db)
        self.auditoria_repo = AuditoriaRepository(db)

    def crear_grupo(self, data: GrupoCreate, usuario_actual_registro: str) -> dict:
        existente = self.grupo_repo.get_grupo(data.codigo_grupo)
        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un grupo con el código {data.codigo_grupo}"
            )

        # REGLA CRÍTICA: REGISTRO_PRINCIPAL solo puede tener perfil SWE
        principal = self.usuario_repo.get_registro(data.registro_principal)
        if not principal:
            raise HTTPException(status_code=400, detail="El registro principal no existe")
        if principal.PERFIL != "SWE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El REGISTRO_PRINCIPAL del grupo debe tener forzosamente el perfil SWE"
            )
        if principal.ESTADO != "ACTIVO":
            raise HTTPException(status_code=400, detail="El registro principal está inactivo")

        grupo = self.grupo_repo.create_grupo(
            codigo_grupo=data.codigo_grupo,
            nombre_grupo=data.nombre_grupo,
            registro_principal=data.registro_principal
        )

        # Asignar miembros si se enviaron
        if data.miembros:
            for reg in data.miembros:
                reg_info = self.usuario_repo.get_registro(reg)
                if reg_info and reg_info.ESTADO == "ACTIVO":
                    self.grupo_repo.add_miembro(grupo.CODIGO_GRUPO, reg)

        self.auditoria_repo.registrar(
            registro_usuario=usuario_actual_registro,
            accion="CREAR_GRUPO",
            entidad="ASIGNACION_GRUPOS",
            entidad_id=grupo.CODIGO_GRUPO,
            datos_nuevos={"codigo": grupo.CODIGO_GRUPO, "nombre": grupo.NOMBRE_GRUPO, "principal": grupo.REGISTRO_PRINCIPAL}
        )
        return self.get_grupo_detalle(grupo.CODIGO_GRUPO)

    def actualizar_grupo(self, codigo_grupo: str, data: GrupoUpdate, usuario_actual_registro: str) -> dict:
        grupo = self.grupo_repo.get_grupo(codigo_grupo)
        if not grupo:
            raise HTTPException(status_code=404, detail="Grupo no encontrado")

        datos_anteriores = {
            "codigo": grupo.CODIGO_GRUPO,
            "nombre": grupo.NOMBRE_GRUPO,
            "principal": grupo.REGISTRO_PRINCIPAL,
            "estado": grupo.ESTADO_GRUPO
        }

        # 1. Validación y cambio de CODIGO_GRUPO si se envió uno nuevo
        cambio_codigo = False
        nuevo_codigo = None
        if data.codigo_grupo is not None:
            candidato = data.codigo_grupo.strip().upper()
            if not candidato:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El código del grupo no puede estar vacío"
                )
            if len(candidato) > 50:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El código del grupo no puede exceder 50 caracteres"
                )
            if candidato != grupo.CODIGO_GRUPO:
                existente = self.grupo_repo.get_grupo(candidato)
                if existente:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Ya existe un grupo con el código '{candidato}'. No se puede repetir el código."
                    )
                cambio_codigo = True
                nuevo_codigo = candidato

        # 2. Si se desea cambiar el principal, validar que sea SWE y activo (SOLO 1 LÍDER PRINCIPAL)
        if data.registro_principal and data.registro_principal != grupo.REGISTRO_PRINCIPAL:
            principal = self.usuario_repo.get_registro(data.registro_principal)
            if not principal:
                raise HTTPException(status_code=400, detail="El nuevo registro principal no existe")
            if principal.PERFIL != "SWE":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El REGISTRO_PRINCIPAL debe tener perfil SWE"
                )
            if principal.ESTADO != "ACTIVO":
                raise HTTPException(status_code=400, detail="El registro principal está inactivo")

        # 3. REGLA CRÍTICA: No permitir inactivar un grupo si existen actividades EN_PRD o Finalizado
        if data.estado_grupo == "INACTIVO" and grupo.ESTADO_GRUPO == "ACTIVO":
            if self.grupo_repo.has_active_or_finished_activities(codigo_grupo):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No se puede inactivar el grupo porque tiene actividades en estado EN_PRD o Finalizado"
                )

        # 4. Si cambió el código del grupo, migrarlo con relaciones en cascada
        if cambio_codigo and nuevo_codigo:
            grupo = self.grupo_repo.update_codigo_grupo(antiguo_codigo=codigo_grupo, nuevo_codigo=nuevo_codigo)
            codigo_grupo = nuevo_codigo

        # 5. Asegurar que el líder (nuevo o existente) sea miembro activo del grupo
        if data.registro_principal and data.registro_principal != grupo.REGISTRO_PRINCIPAL:
            self.grupo_repo.add_miembro(codigo_grupo, data.registro_principal)

        # 6. Actualizar otros campos si fueron enviados
        update_dict = {}
        if data.nombre_grupo is not None:
            nombre = data.nombre_grupo.strip()
            if not nombre:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El título o nombre del grupo no puede estar vacío"
                )
            if len(nombre) > 150:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El título del grupo no puede exceder 150 caracteres"
                )
            update_dict["NOMBRE_GRUPO"] = nombre
        if data.registro_principal is not None:
            update_dict["REGISTRO_PRINCIPAL"] = data.registro_principal
        if data.estado_grupo is not None:
            update_dict["ESTADO_GRUPO"] = data.estado_grupo

        if update_dict:
            self.grupo_repo.update_grupo(grupo, update_dict)

        datos_nuevos = dict(update_dict)
        if cambio_codigo:
            datos_nuevos["CODIGO_GRUPO"] = codigo_grupo

        self.auditoria_repo.registrar(
            registro_usuario=usuario_actual_registro,
            accion="ACTUALIZAR_GRUPO",
            entidad="ASIGNACION_GRUPOS",
            entidad_id=codigo_grupo,
            datos_anteriores=datos_anteriores,
            datos_nuevos=datos_nuevos
        )
        return self.get_grupo_detalle(codigo_grupo)

    def agregar_miembro(self, codigo_grupo: str, registro: str, usuario_actual_registro: str):
        grupo = self.grupo_repo.get_grupo(codigo_grupo)
        if not grupo:
            raise HTTPException(status_code=404, detail="Grupo no encontrado")

        # REGLA: Solo registros activos pueden ser asignados
        reg_info = self.usuario_repo.get_registro(registro)
        if not reg_info:
            raise HTTPException(status_code=400, detail="El registro no existe")
        if reg_info.ESTADO != "ACTIVO":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solo registros activos pueden ser asignados al grupo"
            )

        miembro = self.grupo_repo.add_miembro(codigo_grupo, registro)
        self.auditoria_repo.registrar(
            registro_usuario=usuario_actual_registro,
            accion="AGREGAR_MIEMBRO_GRUPO",
            entidad="ASIGNACION_DET_GRUPOS",
            entidad_id=codigo_grupo,
            datos_nuevos={"codigo_grupo": codigo_grupo, "registro": registro}
        )
        return miembro

    def remover_miembro(self, codigo_grupo: str, registro: str, usuario_actual_registro: str):
        exito = self.grupo_repo.remove_miembro(codigo_grupo, registro)
        if not exito:
            raise HTTPException(status_code=404, detail="Miembro no encontrado en el grupo")

        self.auditoria_repo.registrar(
            registro_usuario=usuario_actual_registro,
            accion="REMOVER_MIEMBRO_GRUPO",
            entidad="ASIGNACION_DET_GRUPOS",
            entidad_id=codigo_grupo,
            datos_nuevos={"codigo_grupo": codigo_grupo, "registro": registro, "estado": "INACTIVO"}
        )
        return {"status": "ok"}

    def get_grupo_detalle(self, codigo_grupo: str) -> dict:
        grupo = self.grupo_repo.get_grupo(codigo_grupo)
        if not grupo:
            raise HTTPException(status_code=404, detail="Grupo no encontrado")

        principal = self.usuario_repo.get_registro(grupo.REGISTRO_PRINCIPAL)
        miembros_db = self.grupo_repo.list_miembros(codigo_grupo, solo_activos=True)
        miembros = []
        for m in miembros_db:
            r = self.usuario_repo.get_registro(m.REGISTRO)
            miembros.append({
                "codigo_grupo_det": m.CODIGO_GRUPO_DET,
                "codigo_grupo": m.CODIGO_GRUPO,
                "registro": m.REGISTRO,
                "nombres": r.NOMBRES if r else m.REGISTRO,
                "perfil": r.PERFIL if r else "",
                "correo": r.CORREO if r else "",
                "estado": m.ESTADO,
                "fecha_registro": m.FECHA_REGISTRO
            })

        return {
            "codigo_grupo": grupo.CODIGO_GRUPO,
            "nombre_grupo": grupo.NOMBRE_GRUPO,
            "registro_principal": grupo.REGISTRO_PRINCIPAL,
            "nombre_principal": principal.NOMBRES if principal else grupo.REGISTRO_PRINCIPAL,
            "estado_grupo": grupo.ESTADO_GRUPO,
            "fecha_registro": grupo.FECHA_REGISTRO,
            "total_miembros": len(miembros),
            "miembros": miembros
        }

    def listar_grupos(self, estado: Optional[str] = None) -> List[dict]:
        grupos = self.grupo_repo.list_grupos(estado)
        res = []
        for g in grupos:
            res.append(self.get_grupo_detalle(g.CODIGO_GRUPO))
        return res
