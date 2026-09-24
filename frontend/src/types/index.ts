export type PerfilTipo = 'ADMIN' | 'SWE' | 'DESARROLLADOR' | 'QA' | 'INTEGRADOR';

export type EstadoActividad = 
  | 'registrado'
  | 'desarrollo'
  | 'certificacion'
  | 'Finalizado'
  | 'GESTION_PRD'
  | 'EN_PRD'
  | 'impedimento';

export type TipoActividad = 'Tarea' | 'Deuda Tecnica' | 'HU_Negocio' | 'TAREA' | 'HU_NEGOCIO';

export type TemaTipo = 'normal' | 'dark' | 'dracula';

export interface UsuarioMe {
  registro: string;
  correo: string;
  nombres_completos: string;
  fecha_expiracion?: string | null;
  perfil: PerfilTipo;
  domain_empresa: string;
  empresa: string;
  estado: string;
  debe_cambiar_password: boolean;
  alerta_expiracion?: string | null;
  alerta_expiracion_dias?: number | null;
  alerta_retirada: boolean;
}

export interface HistorialEstado {
  estado_det_id: number;
  codigo_actividad: string;
  estado: EstadoActividad;
  motivo: string;
  fecha_cambio_estado: string;
  registro_cambio: string;
  nombres_cambio?: string;
}

export interface HistorialAsignado {
  asignado_id: number;
  codigo_actividad: string;
  asignado: string;
  nombres?: string;
  estado: string;
  fecha_registro: string;
}

export interface Seguimiento {
  seguimiento_id: number;
  codigo_actividad: string;
  fecha_registro: string;
  registro: string;
  nombres_usuario?: string;
  comentario: string;
}

export interface Actividad {
  actividad_id: number;
  codigo_actividad: string;
  tipo_actividad: TipoActividad;
  solicitado_por?: string | null;
  srt_rational?: string | null;
  titulo: string;
  nombre_proyecto?: string | null;
  orden_cambio?: string | null;
  descripcion?: string | null;
  impedimentos?: string | null;
  areas_afectadas?: string | null;
  sprint?: string | null;
  q_trabajo?: string | null;
  codigo_grupo?: string | null;
  nombre_grupo?: string | null;
  asignado_registro?: string | null;
  nombre_asignado?: string | null;
  swe_encargado: string;
  nombre_swe?: string | null;
  estado: EstadoActividad;
  posicion: number;
  fecha_registro: string;
  fecha_actualizacion: string;
}

export type EstadoProyecto = 'Activo' | 'standBy' | 'Entregado';

export interface Proyecto {
  proyecto_id: number;
  nombre_proyecto: string;
  descripcion_proyecto?: string | null;
  equipo_solicitante: string;
  fecha_registro: string;
  posibles_impedimentos?: string | null;
  fecha_dead_line?: string | null;
  estado: EstadoProyecto;
  creado_por?: string | null;
  fecha_actualizacion?: string | null;
}

export interface ActividadDetalle extends Actividad {
  historial_estados: HistorialEstado[];
  historial_asignaciones: HistorialAsignado[];
  seguimientos: Seguimiento[];
}

export interface MiembroGrupo {
  codigo_grupo_det: number;
  codigo_grupo: string;
  registro: string;
  nombres?: string;
  perfil?: string;
  correo?: string;
  estado: string;
  fecha_registro: string;
}

export interface Grupo {
  codigo_grupo: string;
  nombre_grupo: string;
  registro_principal: string;
  nombre_principal?: string;
  estado_grupo: string;
  fecha_registro: string;
  total_miembros: number;
  miembros: MiembroGrupo[];
}

export interface RegistroColaborador {
  registro_id: number;
  dni: string;
  nombres: string;
  registro: string;
  correo: string;
  fecha_registro: string;
  fecha_expiracion?: string | null;
  perfil: string;
  empresa: string;
  domain_empresa: string;
  estado: string;
}

export interface UsuarioSistema {
  usuario_id: number;
  registro: string;
  fecha_registro: string;
  estado: string;
  debe_cambiar_password: boolean;
  nombres?: string;
  perfil?: string;
  correo?: string;
}

export interface AuditoriaEvento {
  auditoria_id: number;
  fecha: string;
  registro_usuario: string;
  accion: string;
  entidad: string;
  entidad_id?: string | null;
  datos_anteriores?: string | null;
  datos_nuevos?: string | null;
  ip?: string | null;
  user_agent?: string | null;
}
