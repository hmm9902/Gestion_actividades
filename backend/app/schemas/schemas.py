from datetime import datetime, date
from typing import Optional, List, Any, Literal
from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator

EstadoProyectoLiteral = Literal["Activo", "standBy", "Entregado"]
EstadoAplicacionLiteral = Literal["Activo", "Inactivo"]
TipoAmbienteLiteral = Literal["A", "D", "H"]
EstadoPaseLiteral = Literal[
    "REGISTRADO", "UAT_SOLICITADO", "UAT_DESPLEGADO", "QA_CERTIFICADO",
    "PRD_SOLICITADO", "PRD_EJECUTADO", "RECHAZADO", "ANULADO"
]
TipoTicketLiteral = Literal["Incident", "Request", "OC"]
AmbienteTicketLiteral = Literal["UAT", "PRD"]
EstadoTicketLiteral = Literal[
    "ABIERTO", "ASIGNADO", "ANULADO", "RECHAZADO",
    "DEVUELTO", "EN_PROCESO", "SOLUCIONADO"
]
ESTADOS_TICKET_TERMINALES = {"SOLUCIONADO", "ANULADO", "RECHAZADO"}


# --- Auth ---
class LoginRequest(BaseModel):
    registro: str
    password: str

class CambioPasswordRequest(BaseModel):
    password_actual: str
    password_nuevo: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: "UsuarioMeResponse"

class UsuarioMeResponse(BaseModel):
    registro: str
    correo: str
    nombres_completos: str
    fecha_expiracion: Optional[date] = None
    perfil: str
    domain_empresa: str
    empresa: str
    estado: str
    debe_cambiar_password: bool
    alerta_expiracion: Optional[str] = None
    alerta_expiracion_dias: Optional[int] = None
    alerta_retirada: bool = False

# --- Perfiles ---
class PerfilResponse(BaseModel):
    perfil_id: int
    descripcion: str
    fecha_registro: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Registros ---
class RegistroCreate(BaseModel):
    dni: str
    nombres: str
    registro: str
    correo: EmailStr
    fecha_expiracion: Optional[date] = None
    perfil: str
    empresa: str = "FCD"
    domain_empresa: str = "EMPRESA"
    password_domain: Optional[str] = None  # Solo se recibe en backend si se configura
    estado: str = "ACTIVO"
    password_inicial: Optional[str] = None  # Si se desea crear también el usuario

class RegistroUpdate(BaseModel):
    dni: Optional[str] = None
    nombres: Optional[str] = None
    correo: Optional[EmailStr] = None
    fecha_expiracion: Optional[date] = None
    perfil: Optional[str] = None
    empresa: Optional[str] = None
    domain_empresa: Optional[str] = None
    password_domain: Optional[str] = None
    estado: Optional[str] = None

class RegistroResponse(BaseModel):
    # CRÍTICO: PASSWORD_DOMAIN nunca se incluye aquí
    registro_id: int
    dni: str
    nombres: str
    registro: str
    correo: str
    fecha_registro: datetime
    fecha_expiracion: Optional[date] = None
    perfil: str
    empresa: str
    domain_empresa: str
    estado: str

    model_config = ConfigDict(from_attributes=True)

# --- Usuarios ---
class UsuarioCreate(BaseModel):
    registro: str
    password: str
    estado: str = "ACTIVO"

class UsuarioUpdate(BaseModel):
    estado: Optional[str] = None
    password: Optional[str] = None
    debe_cambiar_password: Optional[bool] = None

class UsuarioResponse(BaseModel):
    usuario_id: int
    registro: str
    fecha_registro: datetime
    estado: str
    debe_cambiar_password: bool
    nombres: Optional[str] = None
    perfil: Optional[str] = None
    correo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# --- Grupos ---
class MiembroGrupoResponse(BaseModel):
    codigo_grupo_det: int
    codigo_grupo: str
    registro: str
    nombres: Optional[str] = None
    perfil: Optional[str] = None
    correo: Optional[str] = None
    estado: str
    fecha_registro: datetime

    model_config = ConfigDict(from_attributes=True)

class GrupoCreate(BaseModel):
    codigo_grupo: str
    nombre_grupo: str
    registro_principal: str  # REGLA: solo SWE
    miembros: Optional[List[str]] = []

class GrupoUpdate(BaseModel):
    codigo_grupo: Optional[str] = None
    nombre_grupo: Optional[str] = None
    registro_principal: Optional[str] = None
    estado_grupo: Optional[str] = None

class GrupoResponse(BaseModel):
    codigo_grupo: str
    nombre_grupo: str
    registro_principal: str
    nombre_principal: Optional[str] = None
    estado_grupo: str
    fecha_registro: datetime
    total_miembros: int = 0
    miembros: List[MiembroGrupoResponse] = []

    model_config = ConfigDict(from_attributes=True)

class AgregarMiembroRequest(BaseModel):
    registro: str

# --- Proyectos ---
class ProyectoCreate(BaseModel):
    nombre_proyecto: str
    descripcion_proyecto: Optional[str] = None
    equipo_solicitante: Optional[str] = None
    fecha_registro: Optional[date] = None
    posibles_impedimentos: Optional[str] = None
    fecha_dead_line: Optional[date] = None
    estado: EstadoProyectoLiteral = "Activo"

class ProyectoUpdate(BaseModel):
    nombre_proyecto: Optional[str] = None
    descripcion_proyecto: Optional[str] = None
    equipo_solicitante: Optional[str] = None
    fecha_registro: Optional[date] = None
    posibles_impedimentos: Optional[str] = None
    fecha_dead_line: Optional[date] = None
    estado: Optional[EstadoProyectoLiteral] = None

class ProyectoResponse(BaseModel):
    proyecto_id: int
    nombre_proyecto: str
    descripcion_proyecto: Optional[str] = None
    equipo_solicitante: Optional[str] = None
    posibles_impedimentos: Optional[str] = None
    fecha_dead_line: Optional[date] = None
    fecha_registro: datetime
    estado: str

    model_config = ConfigDict(from_attributes=True)

# --- Aplicaciones ---
class AplicacionCreate(BaseModel):
    nombre_aplicacion: str
    siglas: Optional[str] = None
    lider_tecno: Optional[str] = None
    po_contacto: Optional[str] = None
    scrum_datos: Optional[str] = None
    descripcion_actividad: Optional[str] = None
    estado: EstadoAplicacionLiteral = "Activo"
    fecha_registro: Optional[date] = None

class AplicacionUpdate(BaseModel):
    nombre_aplicacion: Optional[str] = None
    siglas: Optional[str] = None
    lider_tecno: Optional[str] = None
    po_contacto: Optional[str] = None
    scrum_datos: Optional[str] = None
    descripcion_actividad: Optional[str] = None
    estado: Optional[EstadoAplicacionLiteral] = None
    fecha_registro: Optional[date] = None

class AplicacionResponse(BaseModel):
    aplicacion_id: int
    nombre_aplicacion: str
    siglas: Optional[str] = None
    lider_tecno: Optional[str] = None
    po_contacto: Optional[str] = None
    scrum_datos: Optional[str] = None
    descripcion_actividad: Optional[str] = None
    estado: str
    fecha_registro: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Pases IBK ---
class PaseCreate(BaseModel):
    tipo_ambiente: TipoAmbienteLiteral = "D"
    proyecto: Optional[str] = None
    app: Optional[str] = None
    fecha_registro_srt: Optional[date] = None
    fecha_solicitado_uat: Optional[date] = None
    fecha_desplegado_uat: Optional[date] = None
    estado_srt: EstadoPaseLiteral = "REGISTRADO"
    codigo_srt: Optional[str] = None
    titulo: str
    conformes_prd: Optional[str] = None
    qa: Optional[str] = None
    fecha_certificacion: Optional[date] = None
    fecha_registro_oc: Optional[date] = None
    fecha_hora_pase_prd: Optional[datetime] = None
    oc: Optional[str] = None
    stado_oc: Optional[str] = None
    estado_oc: Optional[str] = None
    operador_pase: Optional[str] = None
    dev: Optional[str] = None
    sustento_valor_negocio: Optional[str] = None
    usuario_final_aprobacion: Optional[str] = None
    q_sp_prd: Optional[str] = None
    responsable_owner_proyecto: Optional[str] = None
    motivo_estado: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def normalizar_stado_oc(cls, values: Any) -> Any:
        if isinstance(values, dict):
            if values.get('estado_oc') is not None and not values.get('stado_oc'):
                values['stado_oc'] = values['estado_oc']
            elif values.get('stado_oc') is not None and not values.get('estado_oc'):
                values['estado_oc'] = values['stado_oc']
        return values

class PaseUpdate(BaseModel):
    tipo_ambiente: Optional[TipoAmbienteLiteral] = None
    proyecto: Optional[str] = None
    app: Optional[str] = None
    fecha_registro_srt: Optional[date] = None
    fecha_solicitado_uat: Optional[date] = None
    fecha_desplegado_uat: Optional[date] = None
    estado_srt: Optional[EstadoPaseLiteral] = None
    codigo_srt: Optional[str] = None
    titulo: Optional[str] = None
    conformes_prd: Optional[str] = None
    qa: Optional[str] = None
    fecha_certificacion: Optional[date] = None
    fecha_registro_oc: Optional[date] = None
    fecha_hora_pase_prd: Optional[datetime] = None
    oc: Optional[str] = None
    stado_oc: Optional[str] = None
    estado_oc: Optional[str] = None
    operador_pase: Optional[str] = None
    dev: Optional[str] = None
    sustento_valor_negocio: Optional[str] = None
    usuario_final_aprobacion: Optional[str] = None
    q_sp_prd: Optional[str] = None
    responsable_owner_proyecto: Optional[str] = None
    motivo_estado: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def normalizar_stado_oc(cls, values: Any) -> Any:
        if isinstance(values, dict):
            if values.get('estado_oc') is not None and not values.get('stado_oc'):
                values['stado_oc'] = values['estado_oc']
            elif values.get('stado_oc') is not None and not values.get('estado_oc'):
                values['estado_oc'] = values['stado_oc']
        return values

class PaseResponse(BaseModel):
    pase_id: int
    tipo_ambiente: str
    proyecto: Optional[str] = None
    app: Optional[str] = None
    fecha_registro_srt: Optional[date] = None
    fecha_solicitado_uat: Optional[date] = None
    fecha_desplegado_uat: Optional[date] = None
    estado_srt: str
    codigo_srt: Optional[str] = None
    titulo: str
    conformes_prd: Optional[str] = None
    qa: Optional[str] = None
    fecha_certificacion: Optional[date] = None
    fecha_registro_oc: Optional[date] = None
    fecha_hora_pase_prd: Optional[datetime] = None
    oc: Optional[str] = None
    stado_oc: Optional[str] = None
    estado_oc: Optional[str] = None
    operador_pase: Optional[str] = None
    dev: Optional[str] = None
    sustento_valor_negocio: Optional[str] = None
    usuario_final_aprobacion: Optional[str] = None
    q_sp_prd: Optional[str] = None
    responsable_owner_proyecto: Optional[str] = None
    motivo_estado: Optional[str] = None
    fecha_registro: datetime
    fecha_actualizacion: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# --- Actividades ---
class ActividadCreate(BaseModel):
    codigo_actividad: str
    tipo_actividad: str = "Tarea"  # Tarea / Deuda Tecnica / HU_Negocio
    solicitado_por: Optional[str] = None
    srt_rational: Optional[str] = None
    titulo: str
    nombre_proyecto: Optional[str] = None
    orden_cambio: Optional[str] = None
    descripcion: Optional[str] = None
    impedimentos: Optional[str] = None
    areas_afectadas: Optional[str] = None
    sprint: Optional[str] = "1"
    q_trabajo: Optional[str] = "1"
    codigo_grupo: Optional[str] = None
    asignado_registro: Optional[str] = None
    swe_encargado: Optional[str] = None  # Si es SWE quien crea, defaults to him

class ActividadUpdate(BaseModel):
    tipo_actividad: Optional[str] = None
    solicitado_por: Optional[str] = None
    srt_rational: Optional[str] = None
    titulo: Optional[str] = None
    nombre_proyecto: Optional[str] = None
    orden_cambio: Optional[str] = None
    descripcion: Optional[str] = None
    impedimentos: Optional[str] = None
    areas_afectadas: Optional[str] = None
    sprint: Optional[str] = None
    q_trabajo: Optional[str] = None
    codigo_grupo: Optional[str] = None
    swe_encargado: Optional[str] = None

class CambioEstadoRequest(BaseModel):
    nuevo_estado: str
    motivo: str  # REGLA: Obligatorio en todo cambio de estado

class CambioAsignacionRequest(BaseModel):
    nuevo_asignado: str  # REGLA: Debe pertenecer al grupo activo

class PosicionUpdateRequest(BaseModel):
    nueva_posicion: int

class AsignadoHistorialResponse(BaseModel):
    asignado_id: int
    codigo_actividad: str
    asignado: str
    nombres: Optional[str] = None
    estado: str
    fecha_registro: datetime

    model_config = ConfigDict(from_attributes=True)

class EstadoHistorialResponse(BaseModel):
    estado_det_id: int
    codigo_actividad: str
    estado: str
    motivo: str
    fecha_cambio_estado: datetime
    registro_cambio: str
    nombres_cambio: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SeguimientoCreate(BaseModel):
    comentario: str

class SeguimientoResponse(BaseModel):
    seguimiento_id: int
    codigo_actividad: str
    fecha_registro: datetime
    registro: str
    nombres_usuario: Optional[str] = None
    comentario: str

    model_config = ConfigDict(from_attributes=True)

class ActividadResponse(BaseModel):
    actividad_id: int
    codigo_actividad: str
    tipo_actividad: str
    solicitado_por: Optional[str] = None
    srt_rational: Optional[str] = None
    titulo: str
    nombre_proyecto: Optional[str] = None
    orden_cambio: Optional[str] = None
    descripcion: Optional[str] = None
    impedimentos: Optional[str] = None
    areas_afectadas: Optional[str] = None
    sprint: Optional[str] = None
    q_trabajo: Optional[str] = None
    codigo_grupo: Optional[str] = None
    nombre_grupo: Optional[str] = None
    asignado_registro: Optional[str] = None
    nombre_asignado: Optional[str] = None
    swe_encargado: str
    nombre_swe: Optional[str] = None
    estado: str
    posicion: int
    fecha_registro: datetime
    fecha_actualizacion: datetime

    model_config = ConfigDict(from_attributes=True)

class ActividadDetalleResponse(ActividadResponse):
    historial_asignaciones: List[AsignadoHistorialResponse] = []
    historial_estados: List[EstadoHistorialResponse] = []
    seguimientos: List[SeguimientoResponse] = []

# --- Auditoria ---
class AuditoriaResponse(BaseModel):
    auditoria_id: int
    fecha: datetime
    registro_usuario: str
    accion: str
    entidad: str
    entidad_id: Optional[str] = None
    datos_anteriores: Optional[str] = None
    datos_nuevos: Optional[str] = None
    ip: Optional[str] = None
    user_agent: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# --- Tickets ---
class TicketCreate(BaseModel):
    tipo: TipoTicketLiteral = "Incident"
    fecha_registro: Optional[datetime] = None
    aplicativo: Optional[str] = None
    proyecto: Optional[str] = None
    ambiente: Optional[AmbienteTicketLiteral] = None
    ticket: str
    descripcion: Optional[str] = None
    fecha_atencion: Optional[datetime] = None
    ibm_asignado: Optional[str] = None
    cel_contacto: Optional[str] = None
    estado: EstadoTicketLiteral = "ABIERTO"
    comentario: Optional[str] = None

class TicketUpdate(BaseModel):
    tipo: Optional[TipoTicketLiteral] = None
    fecha_registro: Optional[datetime] = None
    aplicativo: Optional[str] = None
    proyecto: Optional[str] = None
    ambiente: Optional[AmbienteTicketLiteral] = None
    ticket: Optional[str] = None
    descripcion: Optional[str] = None
    fecha_atencion: Optional[datetime] = None
    ibm_asignado: Optional[str] = None
    cel_contacto: Optional[str] = None
    estado: Optional[EstadoTicketLiteral] = None
    comentario: Optional[str] = None

class TicketResponse(BaseModel):
    ticket_id: int
    tipo: str
    fecha_registro: Optional[datetime] = None
    aplicativo: Optional[str] = None
    proyecto: Optional[str] = None
    ambiente: Optional[str] = None
    ticket: str
    descripcion: Optional[str] = None
    fecha_atencion: Optional[datetime] = None
    ibm_asignado: Optional[str] = None
    cel_contacto: Optional[str] = None
    estado: str
    comentario: Optional[str] = None
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# --- Incidentes ---
AmbienteIncidenteLiteral = Literal["UAT", "PRD"]
RutaCriticaLiteral = Literal["SI", "NO"]

class IncidenteCreate(BaseModel):
    atendido_por: Optional[str] = None
    aplicativo: Optional[str] = None
    ruta_critica: Optional[str] = "NO"
    job: str
    fecha_cancelacion: Optional[date] = None
    server: Optional[str] = None
    ruta: Optional[str] = None
    dtsx: Optional[str] = None
    aplicar: Optional[str] = None
    hora_cancelacion: Optional[str] = None
    descripcion_error: Optional[str] = None
    solucion: Optional[str] = None
    fecha_hora_solucion: Optional[datetime] = None
    ambiente: str = "PRD"

class IncidenteUpdate(BaseModel):
    atendido_por: Optional[str] = None
    aplicativo: Optional[str] = None
    ruta_critica: Optional[str] = None
    job: Optional[str] = None
    fecha_cancelacion: Optional[date] = None
    server: Optional[str] = None
    ruta: Optional[str] = None
    dtsx: Optional[str] = None
    aplicar: Optional[str] = None
    hora_cancelacion: Optional[str] = None
    descripcion_error: Optional[str] = None
    solucion: Optional[str] = None
    fecha_hora_solucion: Optional[datetime] = None
    ambiente: Optional[str] = None

class IncidenteResponse(BaseModel):
    incidente_id: int
    atendido_por: Optional[str] = None
    aplicativo: Optional[str] = None
    ruta_critica: Optional[str] = None
    job: str
    fecha_cancelacion: Optional[date] = None
    server: Optional[str] = None
    ruta: Optional[str] = None
    dtsx: Optional[str] = None
    aplicar: Optional[str] = None
    hora_cancelacion: Optional[str] = None
    descripcion_error: Optional[str] = None
    solucion: Optional[str] = None
    fecha_hora_solucion: Optional[datetime] = None
    ambiente: str
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
