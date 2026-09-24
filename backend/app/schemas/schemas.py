from datetime import datetime, date
from typing import Optional, List, Any, Literal
from pydantic import BaseModel, EmailStr, Field, ConfigDict

EstadoProyectoLiteral = Literal["Activo", "standBy", "Entregado"]


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
