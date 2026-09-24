from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Date, Boolean, ForeignKey,
    UniqueConstraint, Index, CheckConstraint
)
from sqlalchemy.orm import relationship, synonym
from app.db.session import Base

class Perfil(Base):
    __tablename__ = "PERFIL"
    
    PERFIL_ID = Column(Integer, primary_key=True, autoincrement=True)
    DESCRIPCION = Column(String(50), unique=True, nullable=False, index=True)
    FECHA_REGISTRO = Column(DateTime, default=datetime.now, nullable=False)

    registros = relationship("Registro", back_populates="perfil_rel")

    perfil_id = synonym("PERFIL_ID")
    descripcion = synonym("DESCRIPCION")
    fecha_registro = synonym("FECHA_REGISTRO")

class Registro(Base):
    __tablename__ = "REGISTRO"
    
    REGISTRO_ID = Column(Integer, primary_key=True, autoincrement=True)
    DNI = Column(String(20), unique=True, nullable=False, index=True)
    NOMBRES = Column(String(150), nullable=False)
    REGISTRO = Column(String(50), unique=True, nullable=False, index=True)
    CORREO = Column(String(120), unique=True, nullable=False, index=True)
    FECHA_REGISTRO = Column(DateTime, default=datetime.now, nullable=False)
    FECHA_EXPIRACION = Column(Date, nullable=True)
    PERFIL = Column(String(50), ForeignKey("PERFIL.DESCRIPCION"), nullable=False)
    EMPRESA = Column(String(100), nullable=False, default="FCD")
    DOMAIN_EMPRESA = Column(String(100), nullable=False, default="EMPRESA")
    PASSWORD_DOMAIN = Column(String(255), nullable=True)  # CRÍTICO: sensible, nunca exponer
    ESTADO = Column(String(20), nullable=False, default="ACTIVO")

    perfil_rel = relationship("Perfil", back_populates="registros")
    usuario_rel = relationship("Usuario", back_populates="registro_rel", uselist=False)

    registro_id = synonym("REGISTRO_ID")
    dni = synonym("DNI")
    nombres = synonym("NOMBRES")
    registro = synonym("REGISTRO")
    correo = synonym("CORREO")
    fecha_registro = synonym("FECHA_REGISTRO")
    fecha_expiracion = synonym("FECHA_EXPIRACION")
    perfil = synonym("PERFIL")
    empresa = synonym("EMPRESA")
    domain_empresa = synonym("DOMAIN_EMPRESA")
    password_domain = synonym("PASSWORD_DOMAIN")
    estado = synonym("ESTADO")

class Usuario(Base):
    __tablename__ = "USUARIOS"
    
    USUARIO_ID = Column(Integer, primary_key=True, autoincrement=True)
    REGISTRO = Column(String(50), ForeignKey("REGISTRO.REGISTRO"), unique=True, nullable=False, index=True)
    PASSWORD = Column(String(255), nullable=False)
    FECHA_REGISTRO = Column(DateTime, default=datetime.now, nullable=False)
    ESTADO = Column(String(20), nullable=False, default="ACTIVO")
    DEBE_CAMBIAR_PASSWORD = Column(Boolean, default=False, nullable=False)

    registro_rel = relationship("Registro", back_populates="usuario_rel")

    usuario_id = synonym("USUARIO_ID")
    registro = synonym("REGISTRO")
    password = synonym("PASSWORD")
    fecha_registro = synonym("FECHA_REGISTRO")
    estado = synonym("ESTADO")
    debe_cambiar_password = synonym("DEBE_CAMBIAR_PASSWORD")

class AsignacionGrupo(Base):
    __tablename__ = "ASIGNACION_GRUPOS"
    
    CODIGO_GRUPO = Column(String(50), primary_key=True, index=True)
    NOMBRE_GRUPO = Column(String(150), nullable=False)
    REGISTRO_PRINCIPAL = Column(String(50), ForeignKey("REGISTRO.REGISTRO"), nullable=False)
    ESTADO_GRUPO = Column(String(20), nullable=False, default="ACTIVO")
    FECHA_REGISTRO = Column(DateTime, default=datetime.now, nullable=False)

    miembros = relationship("AsignacionDetGrupo", back_populates="grupo_rel", cascade="all, delete-orphan")
    actividades = relationship("Actividad", back_populates="grupo_rel")

    codigo_grupo = synonym("CODIGO_GRUPO")
    nombre_grupo = synonym("NOMBRE_GRUPO")
    registro_principal = synonym("REGISTRO_PRINCIPAL")
    estado_grupo = synonym("ESTADO_GRUPO")
    fecha_registro = synonym("FECHA_REGISTRO")

class AsignacionDetGrupo(Base):
    __tablename__ = "ASIGNACION_DET_GRUPOS"
    
    CODIGO_GRUPO_DET = Column(Integer, primary_key=True, autoincrement=True)
    CODIGO_GRUPO = Column(String(50), ForeignKey("ASIGNACION_GRUPOS.CODIGO_GRUPO"), nullable=False, index=True)
    REGISTRO = Column(String(50), ForeignKey("REGISTRO.REGISTRO"), nullable=False, index=True)
    FECHA_REGISTRO = Column(DateTime, default=datetime.now, nullable=False)
    ESTADO = Column(String(20), nullable=False, default="ACTIVO")

    grupo_rel = relationship("AsignacionGrupo", back_populates="miembros")
    registro_rel = relationship("Registro")

    codigo_grupo_det = synonym("CODIGO_GRUPO_DET")
    codigo_grupo = synonym("CODIGO_GRUPO")
    registro = synonym("REGISTRO")
    fecha_registro = synonym("FECHA_REGISTRO")
    estado = synonym("ESTADO")

    __table_args__ = (
        UniqueConstraint("CODIGO_GRUPO", "REGISTRO", name="uq_grupo_registro"),
    )

class Actividad(Base):
    __tablename__ = "ACTIVIDADES"
    
    ACTIVIDAD_ID = Column(Integer, primary_key=True, autoincrement=True)
    CODIGO_ACTIVIDAD = Column(String(50), unique=True, nullable=False, index=True)
    TIPO_ACTIVIDAD = Column(String(30), nullable=False, default="TAREA")  # TAREA / HU_NEGOCIO
    SOLICITADO_POR = Column(String(120), nullable=True)
    SRT_RATIONAL = Column(String(50), nullable=True)
    TITULO = Column(String(200), nullable=False)
    NOMBRE_PROYECTO = Column(String(150), nullable=True, index=True)
    ORDEN_CAMBIO = Column(String(50), nullable=True)
    DESCRIPCION = Column(Text, nullable=True)
    IMPEDIMENTOS = Column(Text, nullable=True)
    AREAS_AFECTADAS = Column(String(255), nullable=True)
    SPRINT = Column(String(20), nullable=True, default="1")
    Q_TRABAJO = Column(String(20), nullable=True, default="1")
    CODIGO_GRUPO = Column(String(50), ForeignKey("ASIGNACION_GRUPOS.CODIGO_GRUPO"), nullable=True, index=True)
    ASIGNADO_REGISTRO = Column(String(50), ForeignKey("REGISTRO.REGISTRO"), nullable=True, index=True)
    SWE_ENCARGADO = Column(String(50), ForeignKey("REGISTRO.REGISTRO"), nullable=False, index=True)
    ESTADO = Column(String(30), nullable=False, default="registrado")
    POSICION = Column(Integer, nullable=False, default=0)
    FECHA_REGISTRO = Column(DateTime, default=datetime.now, nullable=False)
    FECHA_ACTUALIZACION = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    grupo_rel = relationship("AsignacionGrupo", back_populates="actividades")
    asignado_rel = relationship("Registro", foreign_keys=[ASIGNADO_REGISTRO])
    swe_rel = relationship("Registro", foreign_keys=[SWE_ENCARGADO])
    historial_asignaciones = relationship("AsignadoDetRegistro", back_populates="actividad_rel", cascade="all, delete-orphan")
    historial_estados = relationship("EstadoDetActividades", back_populates="actividad_rel", cascade="all, delete-orphan")
    seguimientos = relationship("Seguimiento", back_populates="actividad_rel", cascade="all, delete-orphan")

    actividad_id = synonym("ACTIVIDAD_ID")
    codigo_actividad = synonym("CODIGO_ACTIVIDAD")
    tipo_actividad = synonym("TIPO_ACTIVIDAD")
    solicitado_por = synonym("SOLICITADO_POR")
    srt_rational = synonym("SRT_RATIONAL")
    titulo = synonym("TITULO")
    nombre_proyecto = synonym("NOMBRE_PROYECTO")
    orden_cambio = synonym("ORDEN_CAMBIO")
    descripcion = synonym("DESCRIPCION")
    impedimentos = synonym("IMPEDIMENTOS")
    areas_afectadas = synonym("AREAS_AFECTADAS")
    sprint = synonym("SPRINT")
    q_trabajo = synonym("Q_TRABAJO")
    codigo_grupo = synonym("CODIGO_GRUPO")
    asignado_registro = synonym("ASIGNADO_REGISTRO")
    swe_encargado = synonym("SWE_ENCARGADO")
    estado = synonym("ESTADO")
    posicion = synonym("POSICION")
    fecha_registro = synonym("FECHA_REGISTRO")
    fecha_actualizacion = synonym("FECHA_ACTUALIZACION")

class Proyecto(Base):
    __tablename__ = "PROYECTOS"

    PROYECTO_ID = Column(Integer, primary_key=True, autoincrement=True)
    NOMBRE_PROYECTO = Column(String(150), unique=True, nullable=False, index=True)
    DESCRIPCION_PROYECTO = Column(Text, nullable=True)
    EQUIPO_SOLICITANTE = Column(String(100), nullable=True)
    POSIBLES_IMPEDIMENTOS = Column(Text, nullable=True)
    FECHA_DEAD_LINE = Column(Date, nullable=True)
    FECHA_REGISTRO = Column(DateTime, default=datetime.now, nullable=False)
    ESTADO = Column(String(20), nullable=False, default="Activo")

    proyecto_id = synonym("PROYECTO_ID")
    nombre_proyecto = synonym("NOMBRE_PROYECTO")
    descripcion_proyecto = synonym("DESCRIPCION_PROYECTO")
    equipo_solicitante = synonym("EQUIPO_SOLICITANTE")
    posibles_impedimentos = synonym("POSIBLES_IMPEDIMENTOS")
    fecha_dead_line = synonym("FECHA_DEAD_LINE")
    fecha_registro = synonym("FECHA_REGISTRO")
    estado = synonym("ESTADO")

class AsignadoDetRegistro(Base):
    __tablename__ = "ASIGNADO_DET_REGISTRO"
    
    ASIGNADO_ID = Column(Integer, primary_key=True, autoincrement=True)
    CODIGO_ACTIVIDAD = Column(String(50), ForeignKey("ACTIVIDADES.CODIGO_ACTIVIDAD"), nullable=False, index=True)
    ASIGNADO = Column(String(50), ForeignKey("REGISTRO.REGISTRO"), nullable=False, index=True)
    ESTADO = Column(String(20), nullable=False, default="ACTIVO")
    FECHA_REGISTRO = Column(DateTime, default=datetime.now, nullable=False)

    actividad_rel = relationship("Actividad", back_populates="historial_asignaciones")
    asignado_rel = relationship("Registro")

    asignado_id = synonym("ASIGNADO_ID")
    codigo_actividad = synonym("CODIGO_ACTIVIDAD")
    asignado = synonym("ASIGNADO")
    estado = synonym("ESTADO")
    fecha_registro = synonym("FECHA_REGISTRO")

class EstadoDetActividades(Base):
    __tablename__ = "ESTADO_DET_ACTIVIDADES"
    
    ESTADO_DET_ID = Column(Integer, primary_key=True, autoincrement=True)
    CODIGO_ACTIVIDAD = Column(String(50), ForeignKey("ACTIVIDADES.CODIGO_ACTIVIDAD"), nullable=False, index=True)
    ESTADO = Column(String(30), nullable=False)
    MOTIVO = Column(Text, nullable=False)  # Obligatorio en todo cambio de estado
    FECHA_CAMBIO_ESTADO = Column(DateTime, default=datetime.now, nullable=False)
    REGISTRO_CAMBIO = Column(String(50), ForeignKey("REGISTRO.REGISTRO"), nullable=False)

    actividad_rel = relationship("Actividad", back_populates="historial_estados")
    usuario_cambio = relationship("Registro")

    estado_det_id = synonym("ESTADO_DET_ID")
    codigo_actividad = synonym("CODIGO_ACTIVIDAD")
    estado = synonym("ESTADO")
    motivo = synonym("MOTIVO")
    fecha_cambio_estado = synonym("FECHA_CAMBIO_ESTADO")
    registro_cambio = synonym("REGISTRO_CAMBIO")

class Seguimiento(Base):
    __tablename__ = "SEGUIMIENTO"
    
    SEGUIMIENTO_ID = Column(Integer, primary_key=True, autoincrement=True)
    CODIGO_ACTIVIDAD = Column(String(50), ForeignKey("ACTIVIDADES.CODIGO_ACTIVIDAD"), nullable=False, index=True)
    FECHA_REGISTRO = Column(DateTime, default=datetime.now, nullable=False)
    REGISTRO = Column(String(50), ForeignKey("REGISTRO.REGISTRO"), nullable=False)
    COMENTARIO = Column(Text, nullable=False)

    actividad_rel = relationship("Actividad", back_populates="seguimientos")
    usuario_rel = relationship("Registro")

    seguimiento_id = synonym("SEGUIMIENTO_ID")
    codigo_actividad = synonym("CODIGO_ACTIVIDAD")
    fecha_registro = synonym("FECHA_REGISTRO")
    registro = synonym("REGISTRO")
    comentario = synonym("COMENTARIO")

class Auditoria(Base):
    __tablename__ = "AUDITORIA"
    
    AUDITORIA_ID = Column(Integer, primary_key=True, autoincrement=True)
    FECHA = Column(DateTime, default=datetime.now, nullable=False, index=True)
    REGISTRO_USUARIO = Column(String(50), nullable=False, index=True)
    ACCION = Column(String(100), nullable=False)
    ENTIDAD = Column(String(50), nullable=False)
    ENTIDAD_ID = Column(String(50), nullable=True)
    DATOS_ANTERIORES = Column(Text, nullable=True)
    DATOS_NUEVOS = Column(Text, nullable=True)
    IP = Column(String(50), nullable=True)
    USER_AGENT = Column(String(255), nullable=True)

    auditoria_id = synonym("AUDITORIA_ID")
    fecha = synonym("FECHA")
    registro_usuario = synonym("REGISTRO_USUARIO")
    accion = synonym("ACCION")
    entidad = synonym("ENTIDAD")
    entidad_id = synonym("ENTIDAD_ID")
    datos_anteriores = synonym("DATOS_ANTERIORES")
    datos_nuevos = synonym("DATOS_NUEVOS")
    ip = synonym("IP")
    user_agent = synonym("USER_AGENT")

class AlertaRetirada(Base):
    __tablename__ = "ALERTAS_RETIRADAS"
    
    ALERTA_ID = Column(Integer, primary_key=True, autoincrement=True)
    REGISTRO = Column(String(50), ForeignKey("REGISTRO.REGISTRO"), nullable=False, index=True)
    FECHA_RETIRO = Column(DateTime, default=datetime.now, nullable=False)
    FECHA_EXPIRACION_ALERTA = Column(Date, nullable=False)

    alerta_id = synonym("ALERTA_ID")
    registro = synonym("REGISTRO")
    fecha_retiro = synonym("FECHA_RETIRO")
    fecha_expiracion_alerta = synonym("FECHA_EXPIRACION_ALERTA")
