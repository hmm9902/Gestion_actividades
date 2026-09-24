import { EstadoActividad } from '../../types';

export interface ColumnaInfo {
  id: EstadoActividad;
  titulo: string;
  colorBorde: string;
  badgeClase: string;
}

export const COLUMNAS_KANBAN: ColumnaInfo[] = [
  { id: 'registrado', titulo: 'Registrado', colorBorde: 'var(--color-estado-registrado-borde)', badgeClase: 'badge-registrado' },
  { id: 'desarrollo', titulo: 'En Desarrollo', colorBorde: 'var(--color-estado-desarrollo-borde)', badgeClase: 'badge-desarrollo' },
  { id: 'certificacion', titulo: 'Certificación', colorBorde: 'var(--color-estado-certificacion-borde)', badgeClase: 'badge-certificacion' },
  { id: 'GESTION_PRD', titulo: 'Gestión PRD', colorBorde: 'var(--color-estado-gestion-prd-borde)', badgeClase: 'badge-gestion-prd' },
  { id: 'EN_PRD', titulo: 'En PRD', colorBorde: 'var(--color-estado-en-prd-borde)', badgeClase: 'badge-en-prd' },
  { id: 'impedimento', titulo: 'Impedimentos', colorBorde: 'var(--color-estado-impedimento-borde)', badgeClase: 'badge-impedimento' },
];
