from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.repositories.actividad_repo import ActividadRepository
from app.repositories.grupo_repo import GrupoRepository
from app.repositories.usuario_repo import UsuarioRepository
from app.repositories.auditoria_repo import AuditoriaRepository
from app.schemas.schemas import ActividadCreate, ActividadUpdate, CambioEstadoRequest, CambioAsignacionRequest

ESTADOS_VALIDOS = [
    "registrado",
    "desarrollo",
    "certificacion",
    "Finalizado",
    "GESTION_PRD",
    "EN_PRD",
    "impedimento"
]

class ActividadService:
    def __init__(self, db: Session):
        self.db = db
        self.actividad_repo = ActividadRepository(db)
        self.grupo_repo = GrupoRepository(db)
        self.usuario_repo = UsuarioRepository(db)
        self.auditoria_repo = AuditoriaRepository(db)

    def crear_actividad(self, data: ActividadCreate, usuario_registro: str, usuario_perfil: str) -> dict:
        # REGLA 1: Solo ADMIN y SWE pueden crear actividades
        if usuario_perfil not in ["ADMIN", "SWE"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo perfiles ADMIN y SWE tienen autorización para crear actividades"
            )

        # Validar código único
        if self.actividad_repo.get_actividad(data.codigo_actividad):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe una actividad con el código {data.codigo_actividad}"
            )

        # REGLA 2: SWE_ENCARGADO por defecto = creador cuando es SWE
        swe_encargado = data.swe_encargado
        if usuario_perfil == "SWE" and not swe_encargado:
            swe_encargado = usuario_registro
        elif not swe_encargado:
            swe_encargado = usuario_registro

        # Validar que SWE encargado exista
        swe_info = self.usuario_repo.get_registro(swe_encargado)
        if not swe_info:
            raise HTTPException(status_code=400, detail="El SWE encargado especificado no existe")

        # REGLA 3: ASIGNADO_REGISTRO debe pertenecer al grupo activo si se especifica grupo
        if data.codigo_grupo and data.asignado_registro:
            grupo = self.grupo_repo.get_grupo(data.codigo_grupo)
            if not grupo:
                raise HTTPException(status_code=400, detail="El grupo especificado no existe")
            miembro = self.grupo_repo.get_miembro(data.codigo_grupo, data.asignado_registro)
            if not miembro or miembro.ESTADO != "ACTIVO":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El asignado {data.asignado_registro} no pertenece a los miembros activos del grupo {data.codigo_grupo}"
                )

        actividad_dict = {
            "CODIGO_ACTIVIDAD": data.codigo_actividad,
            "TIPO_ACTIVIDAD": data.tipo_actividad,
            "SOLICITADO_POR": data.solicitado_por,
            "SRT_RATIONAL": data.srt_rational,
            "TITULO": data.titulo,
            "NOMBRE_PROYECTO": data.nombre_proyecto.strip() if data.nombre_proyecto else None,
            "ORDEN_CAMBIO": data.orden_cambio,
            "DESCRIPCION": data.descripcion,
            "IMPEDIMENTOS": data.impedimentos,
            "AREAS_AFECTADAS": data.areas_afectadas,
            "SPRINT": data.sprint or "1",
            "Q_TRABAJO": data.q_trabajo or "1",
            "CODIGO_GRUPO": data.codigo_grupo,
            "ASIGNADO_REGISTRO": data.asignado_registro,
            "SWE_ENCARGADO": swe_encargado,
            "ESTADO": "registrado",
            "POSICION": 0
        }

        actividad = self.actividad_repo.create_actividad(actividad_dict, creador_registro=usuario_registro)

        self.auditoria_repo.registrar(
            registro_usuario=usuario_registro,
            accion="CREAR_ACTIVIDAD",
            entidad="ACTIVIDADES",
            entidad_id=actividad.CODIGO_ACTIVIDAD,
            datos_nuevos={"codigo": actividad.CODIGO_ACTIVIDAD, "titulo": actividad.TITULO, "asignado": actividad.ASIGNADO_REGISTRO}
        )

        return self.get_actividad_response(actividad.CODIGO_ACTIVIDAD)

    def actualizar_actividad(self, codigo_actividad: str, data: ActividadUpdate, usuario_registro: str, usuario_perfil: str) -> dict:
        actividad = self.actividad_repo.get_actividad(codigo_actividad)
        if not actividad:
            raise HTTPException(status_code=404, detail="Actividad no encontrada")

        if usuario_perfil not in ["ADMIN", "SWE"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo ADMIN y SWE pueden modificar la información general de la actividad"
            )

        update_dict = {}
        for campo, val in data.model_dump(exclude_unset=True).items():
            if val is not None:
                update_dict[campo.upper()] = val

        self.actividad_repo.update_actividad(actividad, update_dict)

        self.auditoria_repo.registrar(
            registro_usuario=usuario_registro,
            accion="ACTUALIZAR_ACTIVIDAD",
            entidad="ACTIVIDADES",
            entidad_id=codigo_actividad,
            datos_nuevos=update_dict
        )

        return self.get_actividad_response(codigo_actividad)

    def cambiar_estado(self, codigo_actividad: str, data: CambioEstadoRequest, usuario_registro: str) -> dict:
        actividad = self.actividad_repo.get_actividad(codigo_actividad)
        if not actividad:
            raise HTTPException(status_code=404, detail="Actividad no encontrada")

        # REGLA: Si la actividad ya está en estado Finalizado, ya no podrá cambiar de estado (bloqueado para todos los perfiles)
        if actividad.ESTADO and actividad.ESTADO.lower() == "finalizado":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La actividad ya se encuentra en estado Finalizado y no puede cambiar de estado."
            )

        # REGLA: Motivo obligatorio al cambiar estado
        if not data.motivo or not data.motivo.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El motivo del cambio de estado es estrictamente obligatorio"
            )

        if data.nuevo_estado not in ESTADOS_VALIDOS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Estado '{data.nuevo_estado}' inválido. Válidos: {', '.join(ESTADOS_VALIDOS)}"
            )

        estado_anterior = actividad.ESTADO
        if estado_anterior == data.nuevo_estado:
            return self.get_actividad_response(codigo_actividad)

        self.actividad_repo.add_historial_estado(
            codigo_actividad=codigo_actividad,
            nuevo_estado=data.nuevo_estado,
            motivo=data.motivo.strip(),
            registro_cambio=usuario_registro
        )

        self.auditoria_repo.registrar(
            registro_usuario=usuario_registro,
            accion="CAMBIO_ESTADO_ACTIVIDAD",
            entidad="ACTIVIDADES",
            entidad_id=codigo_actividad,
            datos_anteriores={"estado": estado_anterior},
            datos_nuevos={"estado": data.nuevo_estado, "motivo": data.motivo.strip()}
        )

        return self.get_actividad_response(codigo_actividad)

    def cambiar_asignacion(self, codigo_actividad: str, data: CambioAsignacionRequest, usuario_registro: str, usuario_perfil: str) -> dict:
        actividad = self.actividad_repo.get_actividad(codigo_actividad)
        if not actividad:
            raise HTTPException(status_code=404, detail="Actividad no encontrada")

        # REGLA: Validar perfil para asignar
        if usuario_perfil not in ["ADMIN", "SWE"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo ADMIN y SWE pueden reasignar actividades"
            )

        # REGLA: El nuevo asignado debe pertenecer al grupo activo
        nuevo_asig = self.usuario_repo.get_registro(data.nuevo_asignado)
        if not nuevo_asig or nuevo_asig.ESTADO != "ACTIVO":
            raise HTTPException(status_code=400, detail="El usuario a asignar no existe o está inactivo")

        if actividad.CODIGO_GRUPO:
            miembro = self.grupo_repo.get_miembro(actividad.CODIGO_GRUPO, data.nuevo_asignado)
            if not miembro or miembro.ESTADO != "ACTIVO":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El usuario {data.nuevo_asignado} no pertenece a los miembros activos del grupo {actividad.CODIGO_GRUPO}"
                )

        asig_anterior = actividad.ASIGNADO_REGISTRO
        self.actividad_repo.add_historial_asignado(codigo_actividad, data.nuevo_asignado)

        self.auditoria_repo.registrar(
            registro_usuario=usuario_registro,
            accion="CAMBIO_ASIGNACION_ACTIVIDAD",
            entidad="ACTIVIDADES",
            entidad_id=codigo_actividad,
            datos_anteriores={"asignado": asig_anterior},
            datos_nuevos={"asignado": data.nuevo_asignado}
        )

        return self.get_actividad_response(codigo_actividad)

    def agregar_seguimiento(self, codigo_actividad: str, comentario: str, usuario_registro: str) -> dict:
        actividad = self.actividad_repo.get_actividad(codigo_actividad)
        if not actividad:
            raise HTTPException(status_code=404, detail="Actividad no encontrada")

        if not comentario or not comentario.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El comentario de seguimiento no puede estar vacío"
            )

        seguimiento = self.actividad_repo.add_seguimiento(
            codigo_actividad=codigo_actividad,
            registro=usuario_registro,
            comentario=comentario.strip()
        )

        self.auditoria_repo.registrar(
            registro_usuario=usuario_registro,
            accion="AGREGAR_SEGUIMIENTO",
            entidad="SEGUIMIENTO",
            entidad_id=str(seguimiento.SEGUIMIENTO_ID),
            datos_nuevos={"codigo_actividad": codigo_actividad, "comentario": comentario.strip()[:80]}
        )

        reg_info = self.usuario_repo.get_registro(usuario_registro)
        return {
            "seguimiento_id": seguimiento.SEGUIMIENTO_ID,
            "codigo_actividad": seguimiento.CODIGO_ACTIVIDAD,
            "fecha_registro": seguimiento.FECHA_REGISTRO,
            "registro": seguimiento.REGISTRO,
            "nombres_usuario": reg_info.NOMBRES if reg_info else usuario_registro,
            "comentario": seguimiento.COMENTARIO
        }

    def actualizar_posicion(self, codigo_actividad: str, nueva_posicion: int, usuario_registro: str):
        actividad = self.actividad_repo.update_posicion(codigo_actividad, nueva_posicion)
        if not actividad:
            raise HTTPException(status_code=404, detail="Actividad no encontrada")
        return {"status": "ok", "posicion": actividad.POSICION}

    def get_actividad_response(self, codigo_actividad: str, incluir_detalle: bool = False) -> dict:
        actividad = self.actividad_repo.get_actividad(codigo_actividad)
        if not actividad:
            raise HTTPException(status_code=404, detail="Actividad no encontrada")

        asignado_info = self.usuario_repo.get_registro(actividad.ASIGNADO_REGISTRO) if actividad.ASIGNADO_REGISTRO else None
        swe_info = self.usuario_repo.get_registro(actividad.SWE_ENCARGADO)
        grupo_info = self.grupo_repo.get_grupo(actividad.CODIGO_GRUPO) if actividad.CODIGO_GRUPO else None

        res = {
            "actividad_id": actividad.ACTIVIDAD_ID,
            "codigo_actividad": actividad.CODIGO_ACTIVIDAD,
            "tipo_actividad": actividad.TIPO_ACTIVIDAD,
            "solicitado_por": actividad.SOLICITADO_POR,
            "srt_rational": actividad.SRT_RATIONAL,
            "titulo": actividad.TITULO,
            "nombre_proyecto": actividad.NOMBRE_PROYECTO,
            "orden_cambio": actividad.ORDEN_CAMBIO,
            "descripcion": actividad.DESCRIPCION,
            "impedimentos": actividad.IMPEDIMENTOS,
            "areas_afectadas": actividad.AREAS_AFECTADAS,
            "sprint": actividad.SPRINT,
            "q_trabajo": actividad.Q_TRABAJO,
            "codigo_grupo": actividad.CODIGO_GRUPO,
            "nombre_grupo": grupo_info.NOMBRE_GRUPO if grupo_info else None,
            "asignado_registro": actividad.ASIGNADO_REGISTRO,
            "nombre_asignado": asignado_info.NOMBRES if asignado_info else None,
            "swe_encargado": actividad.SWE_ENCARGADO,
            "nombre_swe": swe_info.NOMBRES if swe_info else None,
            "estado": actividad.ESTADO,
            "posicion": actividad.POSICION,
            "fecha_registro": actividad.FECHA_REGISTRO,
            "fecha_actualizacion": actividad.FECHA_ACTUALIZACION
        }

        if incluir_detalle:
            hist_estados = self.actividad_repo.list_historial_estados(codigo_actividad)
            hist_asig = self.actividad_repo.list_historial_asignaciones(codigo_actividad)
            segs = self.actividad_repo.list_seguimientos(codigo_actividad)

            estados_list = []
            for h in hist_estados:
                u = self.usuario_repo.get_registro(h.REGISTRO_CAMBIO)
                estados_list.append({
                    "estado_det_id": h.ESTADO_DET_ID,
                    "codigo_actividad": h.CODIGO_ACTIVIDAD,
                    "estado": h.ESTADO,
                    "motivo": h.MOTIVO,
                    "fecha_cambio_estado": h.FECHA_CAMBIO_ESTADO,
                    "registro_cambio": h.REGISTRO_CAMBIO,
                    "nombres_cambio": u.NOMBRES if u else h.REGISTRO_CAMBIO
                })

            asig_list = []
            for a in hist_asig:
                u = self.usuario_repo.get_registro(a.ASIGNADO)
                asig_list.append({
                    "asignado_id": a.ASIGNADO_ID,
                    "codigo_actividad": a.CODIGO_ACTIVIDAD,
                    "asignado": a.ASIGNADO,
                    "nombres": u.NOMBRES if u else a.ASIGNADO,
                    "estado": a.ESTADO,
                    "fecha_registro": a.FECHA_REGISTRO
                })

            seg_list = []
            for s in segs:
                u = self.usuario_repo.get_registro(s.REGISTRO)
                seg_list.append({
                    "seguimiento_id": s.SEGUIMIENTO_ID,
                    "codigo_actividad": s.CODIGO_ACTIVIDAD,
                    "fecha_registro": s.FECHA_REGISTRO,
                    "registro": s.REGISTRO,
                    "nombres_usuario": u.NOMBRES if u else s.REGISTRO,
                    "comentario": s.COMENTARIO
                })

            res["historial_estados"] = estados_list
            res["historial_asignaciones"] = asig_list
            res["seguimientos"] = seg_list

        return res

    def listar_actividades(
        self,
        codigo_grupo: Optional[str] = None,
        asignado_registro: Optional[str] = None,
        sprint: Optional[str] = None,
        q_trabajo: Optional[str] = None,
        tipo_actividad: Optional[str] = None,
        estado: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[dict]:
        acts = self.actividad_repo.list_actividades(
            codigo_grupo=codigo_grupo,
            asignado_registro=asignado_registro,
            sprint=sprint,
            q_trabajo=q_trabajo,
            tipo_actividad=tipo_actividad,
            estado=estado,
            search=search
        )
        return [self.get_actividad_response(a.CODIGO_ACTIVIDAD, incluir_detalle=False) for a in acts]
