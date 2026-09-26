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

export type EstadoAplicacion = 'Activo' | 'Inactivo';

export interface Aplicacion {
  aplicacion_id: number;
  nombre_aplicacion: string;
  siglas?: string | null;
  lider_tecno?: string | null;
  po_contacto?: string | null;
  scrum_datos?: string | null;
  descripcion_actividad?: string | null;
  estado: EstadoAplicacion;
  fecha_registro: string;
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

export type TipoAmbiente = 'A' | 'D' | 'H';

export type EstadoSRT =
  | 'REGISTRADO'
  | 'UAT_SOLICITADO'
  | 'UAT_DESPLEGADO'
  | 'QA_CERTIFICADO'
  | 'PRD_SOLICITADO'
  | 'PRD_EJECUTADO'
  | 'RECHAZADO'
  | 'ANULADO';

export interface Pase {
  pase_id: number;
  tipo_ambiente: TipoAmbiente;
  proyecto?: string | null;
  app?: string | null;
  fecha_registro_srt?: string | null;
  fecha_solicitado_uat?: string | null;
  fecha_desplegado_uat?: string | null;
  estado_srt: EstadoSRT;
  codigo_srt?: string | null;
  titulo: string;
  conformes_prd?: string | null;
  qa?: string | null;
  fecha_certificacion?: string | null;
  fecha_registro_oc?: string | null;
  fecha_hora_pase_prd?: string | null;
  oc?: string | null;
  stado_oc?: string | null;
  estado_oc?: string | null;
  operador_pase?: string | null;
  dev?: string | null;
  sustento_valor_negocio?: string | null;
  usuario_final_aprobacion?: string | null;
  q_sp_prd?: string | null;
  responsable_owner_proyecto?: string | null;
  motivo_estado?: string | null;
  fecha_registro: string;
  fecha_actualizacion?: string | null;
}

export type TipoTicket = 'Incident' | 'Request' | 'OC';

export type AmbienteTicket = 'UAT' | 'PRD';

export type EstadoTicket =
  | 'ABIERTO'
  | 'ASIGNADO'
  | 'ANULADO'
  | 'RECHAZADO'
  | 'DEVUELTO'
  | 'EN_PROCESO'
  | 'SOLUCIONADO';

export interface Ticket {
  ticket_id: number;
  tipo: TipoTicket;
  fecha_registro?: string | null;
  aplicativo?: string | null;
  proyecto?: string | null;
  ambiente?: AmbienteTicket | null;
  ticket: string;
  descripcion?: string | null;
  fecha_atencion?: string | null;
  ibm_asignado?: string | null;
  cel_contacto?: string | null;
  estado: EstadoTicket;
  comentario?: string | null;
  fecha_creacion: string;
  fecha_actualizacion?: string | null;
}

export type AmbienteIncidente = 'UAT' | 'PRD';
export type RutaCriticaIncidente = 'SI' | 'NO';

export interface Incidente {
  incidente_id: number;
  atendido_por?: string | null;
  aplicativo?: string | null;
  ruta_critica?: RutaCriticaIncidente | string | null;
  job: string;
  fecha_cancelacion?: string | null;
  server?: string | null;
  ruta?: string | null;
  dtsx?: string | null;
  aplicar?: string | null;
  hora_cancelacion?: string | null;
  descripcion_error?: string | null;
  solucion?: string | null;
  fecha_hora_solucion?: string | null;
  ambiente: AmbienteIncidente | string;
  fecha_creacion: string;
  fecha_actualizacion?: string | null;
}

