from datetime import date, datetime, timedelta
from app.db.session import SessionLocal
from app.models.entities import (
    Perfil, Registro, Usuario, AsignacionGrupo, AsignacionDetGrupo,
    Actividad, AsignadoDetRegistro, EstadoDetActividades, Seguimiento
)
from app.core.security import hash_password
from app.core.config import settings

def ensure_system_bootstrap(db=None):
    """
    Inicializa ÚNICAMENTE los elementos requeridos del sistema:
    1. Catálogo de roles/perfiles (ADMIN, SWE, DESARROLLADOR, QA, INTEGRADOR) si no existen.
    2. Cuenta inicial de ADMIN si no existe en la base de datos.
    
    REGLA FUNDAMENTAL:
    NUNCA inserta, sobreescribe ni restaura actividades, grupos ni datos demo.
    Cualquier cambio realizado en Turso o local permanece intacto sin restaurar nada.
    """
    close_on_finish = False
    if db is None:
        db = SessionLocal()
        close_on_finish = True
    try:
        # 1. Perfiles requeridos
        perfiles_nombres = ["ADMIN", "SWE", "DESARROLLADOR", "QA", "INTEGRADOR"]
        for nombre in perfiles_nombres:
            if not db.query(Perfil).filter(Perfil.DESCRIPCION == nombre).first():
                db.add(Perfil(DESCRIPCION=nombre))
        db.commit()

        # 2. Bootstrap ADMIN inicial si no existe
        admin_reg_cod = settings.BOOTSTRAP_ADMIN_USER.upper()
        admin_reg = db.query(Registro).filter(Registro.REGISTRO == admin_reg_cod).first()
        if not admin_reg:
            admin_reg = Registro(
                DNI="00000000",
                NOMBRES="ADMINISTRADOR DEL SISTEMA",
                REGISTRO=admin_reg_cod,
                CORREO="admin@fcd.com",
                PERFIL="ADMIN",
                EMPRESA="FCD",
                DOMAIN_EMPRESA="EMPRESA",
                ESTADO="ACTIVO",
                FECHA_REGISTRO=datetime.now()
            )
            db.add(admin_reg)
            db.commit()
            db.refresh(admin_reg)

        admin_user = db.query(Usuario).filter(Usuario.REGISTRO == admin_reg_cod).first()
        if not admin_user:
            admin_user = Usuario(
                REGISTRO=admin_reg_cod,
                PASSWORD=hash_password(settings.BOOTSTRAP_ADMIN_PASSWORD),
                DEBE_CAMBIAR_PASSWORD=True,
                ESTADO="ACTIVO",
                FECHA_REGISTRO=datetime.now()
            )
            db.add(admin_user)
            db.commit()
    finally:
        if close_on_finish:
            db.close()

def seed_data(db=None):
    """
    Función de seed completa para pruebas locales aisladas o tests unitarios.
    NO se ejecuta en el inicio de la aplicación en producción.
    """
    ensure_system_bootstrap(db)
    close_on_finish = False
    if db is None:
        db = SessionLocal()
        close_on_finish = True
    try:

        # 3. Datos de prueba: SWE y Desarrolladores
        colaboradores = [
            {
                "dni": "45678901",
                "nombres": "MAICOL MIRAMIRA",
                "registro": "XS454",
                "correo": "mmiramira@empresa.com",
                "perfil": "SWE",
                "fecha_expiracion": date.today() + timedelta(days=7),  # Activa alerta <= 10 días
                "password": "Password123*"
            },
            {
                "dni": "45678902",
                "nombres": "HENRY MIRAMIRA",
                "registro": "S38454",
                "correo": "hmiramira@empresa.com",
                "perfil": "SWE",
                "fecha_expiracion": date.today() + timedelta(days=90),
                "password": "Password123*"
            },
            {
                "dni": "71234567",
                "nombres": "PIERO YALAN",
                "registro": "X15400",
                "correo": "pyalan@empresa.com",
                "perfil": "DESARROLLADOR",
                "fecha_expiracion": date.today() + timedelta(days=90),
                "password": "Password123*"
            },
            {
                "dni": "12345678",
                "nombres": "CARLOS MENDOZA",
                "registro": "X89201",
                "correo": "cmendoza@empresa.com",
                "perfil": "QA",
                "fecha_expiracion": date.today() + timedelta(days=120),
                "password": "Password123*"
            },
            {
                "dni": "87654321",
                "nombres": "LUCIA VEGA",
                "registro": "X33012",
                "correo": "lvega@empresa.com",
                "perfil": "INTEGRADOR",
                "fecha_expiracion": date.today() + timedelta(days=180),
                "password": "Password123*"
            }
        ]

        for colab in colaboradores:
            reg = db.query(Registro).filter(Registro.REGISTRO == colab["registro"]).first()
            if not reg:
                reg = Registro(
                    DNI=colab["dni"],
                    NOMBRES=colab["nombres"],
                    REGISTRO=colab["registro"],
                    CORREO=colab["correo"],
                    PERFIL=colab["perfil"],
                    FECHA_EXPIRACION=colab["fecha_expiracion"],
                    EMPRESA="FCD",
                    DOMAIN_EMPRESA="EMPRESA",
                    ESTADO="ACTIVO",
                    FECHA_REGISTRO=datetime.now()
                )
                db.add(reg)
                db.commit()

            usr = db.query(Usuario).filter(Usuario.REGISTRO == colab["registro"]).first()
            if not usr:
                usr = Usuario(
                    REGISTRO=colab["registro"],
                    PASSWORD=hash_password(colab["password"]),
                    DEBE_CAMBIAR_PASSWORD=False,
                    ESTADO="ACTIVO",
                    FECHA_REGISTRO=datetime.now()
                )
                db.add(usr)
                db.commit()

        # 4. Grupo Squad
        grupo_cod = "SQUAD-ALPHA"
        grupo = db.query(AsignacionGrupo).filter(AsignacionGrupo.CODIGO_GRUPO == grupo_cod).first()
        if not grupo:
            grupo = AsignacionGrupo(
                CODIGO_GRUPO=grupo_cod,
                NOMBRE_GRUPO="Squad Canales Digitales",
                REGISTRO_PRINCIPAL="XS454",  # Perfil SWE
                ESTADO_GRUPO="ACTIVO",
                FECHA_REGISTRO=datetime.now()
            )
            db.add(grupo)
            db.commit()

            # Miembros
            for cod_reg in ["XS454", "X15400", "X89201", "X33012"]:
                if not db.query(AsignacionDetGrupo).filter(
                    AsignacionDetGrupo.CODIGO_GRUPO == grupo_cod,
                    AsignacionDetGrupo.REGISTRO == cod_reg
                ).first():
                    db.add(AsignacionDetGrupo(
                        CODIGO_GRUPO=grupo_cod,
                        REGISTRO=cod_reg,
                        ESTADO="ACTIVO",
                        FECHA_REGISTRO=datetime.now()
                    ))
            db.commit()

        # 5. Actividades de ejemplo
        actividades_demo = [
            {
                "codigo": "ACT-1001",
                "tipo": "HU_NEGOCIO",
                "titulo": "Implementar módulo de autenticación reforzada y tokens seguros",
                "solicitado_por": "Gerencia de Ciberseguridad",
                "srt_rational": "SRT-8821",
                "orden_cambio": "OC-4412",
                "descripcion": "Se requiere autenticar usuarios con Argon2/Bcrypt y aislar completamente PASSWORD_DOMAIN.",
                "sprint": "1",
                "q": "1",
                "grupo": "SQUAD-ALPHA",
                "asignado": "X15400",
                "swe": "XS454",
                "estado": "desarrollo",
                "posicion": 0
            },
            {
                "codigo": "ACT-1002",
                "tipo": "TAREA",
                "titulo": "Optimización y certificación de reportes de liquidación",
                "solicitado_por": "Operaciones Centrales",
                "srt_rational": "SRT-8825",
                "orden_cambio": "OC-4419",
                "descripcion": "Ejecutar pruebas integrales de performance en base de datos.",
                "sprint": "1",
                "q": "1",
                "grupo": "SQUAD-ALPHA",
                "asignado": "X89201",
                "swe": "XS454",
                "estado": "certificacion",
                "posicion": 0
            },
            {
                "codigo": "ACT-1003",
                "tipo": "TAREA",
                "titulo": "Preparación de pase a producción de microservicio de alertas",
                "solicitado_por": "Arquitectura Cloud",
                "srt_rational": "SRT-8900",
                "orden_cambio": "OC-4501",
                "descripcion": "Revisión final de configuración en Render y variables de entorno.",
                "sprint": "2",
                "q": "1",
                "grupo": "SQUAD-ALPHA",
                "asignado": "X33012",
                "swe": "XS454",
                "estado": "GESTION_PRD",
                "posicion": 0
            },
            {
                "codigo": "ACT-1004",
                "tipo": "TAREA",
                "titulo": "Desbloqueo de accesos de base de datos para auditoría",
                "solicitado_por": "Soporte Nivel 2",
                "srt_rational": "SRT-8710",
                "orden_cambio": "OC-4390",
                "descripcion": "Pendiente de habilitación de firewall en red corporativa.",
                "impedimentos": "Se necesita ticket de aprobación de red #9941.",
                "sprint": "1",
                "q": "1",
                "grupo": "SQUAD-ALPHA",
                "asignado": "X15400",
                "swe": "XS454",
                "estado": "impedimento",
                "posicion": 0
            },
            {
                "codigo": "ACT-1005",
                "tipo": "TAREA",
                "titulo": "Renovación y despliegue de certificados TLS en Render",
                "solicitado_por": "Infraestructura Cloud",
                "srt_rational": "SRT-8650",
                "orden_cambio": "OC-4350",
                "descripcion": "Certificados emitidos e instalados satisfactoriamente en ambiente productivo.",
                "sprint": "1",
                "q": "1",
                "grupo": "SQUAD-ALPHA",
                "asignado": "XS454",
                "swe": "XS454",
                "estado": "EN_PRD",
                "posicion": 0
            },
            {
                "codigo": "ACT-1006",
                "tipo": "HU_NEGOCIO",
                "titulo": "Diseño del tablero Kanban con soporte Drag & Drop estilo Trello",
                "solicitado_por": "Product Owner",
                "srt_rational": "SRT-9100",
                "orden_cambio": "OC-4600",
                "descripcion": "Interfaz interactiva con tres temas visuales y filtrado por personas del grupo.",
                "sprint": "2",
                "q": "1",
                "grupo": "SQUAD-ALPHA",
                "asignado": "X15400",
                "swe": "XS454",
                "estado": "registrado",
                "posicion": 0
            }
        ]

        for act_data in actividades_demo:
            if not db.query(Actividad).filter(Actividad.CODIGO_ACTIVIDAD == act_data["codigo"]).first():
                act = Actividad(
                    CODIGO_ACTIVIDAD=act_data["codigo"],
                    TIPO_ACTIVIDAD=act_data["tipo"],
                    TITULO=act_data["titulo"],
                    SOLICITADO_POR=act_data["solicitado_por"],
                    SRT_RATIONAL=act_data["srt_rational"],
                    ORDEN_CAMBIO=act_data["orden_cambio"],
                    DESCRIPCION=act_data["descripcion"],
                    IMPEDIMENTOS=act_data.get("impedimentos"),
                    SPRINT=act_data["sprint"],
                    Q_TRABAJO=act_data["q"],
                    CODIGO_GRUPO=act_data["grupo"],
                    ASIGNADO_REGISTRO=act_data["asignado"],
                    SWE_ENCARGADO=act_data["swe"],
                    ESTADO=act_data["estado"],
                    POSICION=act_data["posicion"],
                    FECHA_REGISTRO=datetime.now() - timedelta(days=2),
                    FECHA_ACTUALIZACION=datetime.now()
                )
                db.add(act)
                db.commit()

                # Historial de estado inicial
                db.add(EstadoDetActividades(
                    CODIGO_ACTIVIDAD=act.CODIGO_ACTIVIDAD,
                    ESTADO=act.ESTADO,
                    MOTIVO="Carga inicial en seed de datos",
                    FECHA_CAMBIO_ESTADO=datetime.now() - timedelta(days=2),
                    REGISTRO_CAMBIO=act.SWE_ENCARGADO
                ))

                # Historial de asignación inicial
                db.add(AsignadoDetRegistro(
                    CODIGO_ACTIVIDAD=act.CODIGO_ACTIVIDAD,
                    ASIGNADO=act.ASIGNADO_REGISTRO,
                    ESTADO="ACTIVO",
                    FECHA_REGISTRO=datetime.now() - timedelta(days=2)
                ))

                # Seguimiento inicial
                db.add(Seguimiento(
                    CODIGO_ACTIVIDAD=act.CODIGO_ACTIVIDAD,
                    FECHA_REGISTRO=datetime.now() - timedelta(days=1),
                    REGISTRO=act.SWE_ENCARGADO,
                    COMENTARIO="Actividad creada y priorizada para el sprint en curso."
                ))
                db.commit()

    finally:
        if close_on_finish:
            db.close()

if __name__ == "__main__":
    from app.db.session import engine, Base
    Base.metadata.create_all(bind=engine)
    seed_data()
    print("Seed completado exitosamente.")
