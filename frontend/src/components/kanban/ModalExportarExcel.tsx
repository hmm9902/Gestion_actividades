import React, { useState, useMemo, useEffect } from 'react';
import { X, Calendar, User, Filter, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Actividad, Grupo, EstadoActividad } from '../../types';
import { OfficeExcelIcon } from '../common/OfficeExcelIcon';
import { useNotificacion } from '../../context/NotificacionContext';
import { apiRequest } from '../../lib/api';

interface ModalExportarExcelProps {
  actividades: Actividad[];
  grupos: Grupo[];
  onCerrar: () => void;
}

interface ColaboradorOpcion {
  registro: string;
  nombres: string;
}

const ESTADOS_DISPONIBLES: { id: string; label: string }[] = [
  { id: '', label: 'Todos los estados' },
  { id: 'registrado', label: 'Registrado' },
  { id: 'desarrollo', label: 'En Desarrollo' },
  { id: 'certificacion', label: 'En Certificación' },
  { id: 'impedimento', label: 'Impedimento' },
  { id: 'GESTION_PRD', label: 'Gestión PRD' },
  { id: 'EN_PRD', label: 'En Producción (PRD)' },
  { id: 'Finalizado', label: 'Finalizado' },
];

const MAPA_ESTADOS_NOMBRE: Record<string, string> = {
  registrado: 'Registrado',
  desarrollo: 'En Desarrollo',
  certificacion: 'En Certificación',
  impedimento: 'Impedimento',
  GESTION_PRD: 'Gestión PRD',
  EN_PRD: 'En Producción (PRD)',
  Finalizado: 'Finalizado',
  finalizado: 'Finalizado',
};

export const ModalExportarExcel: React.FC<ModalExportarExcelProps> = ({
  actividades,
  grupos,
  onCerrar,
}) => {
  const { exito, error: notifyError } = useNotificacion();

  // Estados de filtros
  const [asignadoFiltro, setAsignadoFiltro] = useState<string>('');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('');
  const [colaboradores, setColaboradores] = useState<ColaboradorOpcion[]>([]);
  const [exportando, setExportando] = useState<boolean>(false);

  // Obtener lista completa de colaboradores (a partir de grupos, actividades y API de registros)
  useEffect(() => {
    const mapaColaboradores = new Map<string, string>();

    // 1. A partir de los grupos y sus miembros
    grupos.forEach(g => {
      g.miembros?.forEach(m => {
        if (m.registro) {
          mapaColaboradores.set(m.registro.toUpperCase(), m.nombres || m.registro);
        }
      });
    });

    // 2. A partir de las actividades actuales
    actividades.forEach(a => {
      if (a.asignado_registro) {
        const reg = a.asignado_registro.toUpperCase();
        if (!mapaColaboradores.has(reg) || !mapaColaboradores.get(reg)) {
          mapaColaboradores.set(reg, a.nombre_asignado || reg);
        }
      }
    });

    // 3. Complementar desde la API de registros para asegurar catálogo completo
    apiRequest<any[]>('/registros')
      .then(regs => {
        regs.forEach(r => {
          if (r.registro) {
            mapaColaboradores.set(r.registro.toUpperCase(), r.nombres || r.registro);
          }
        });
        const lista: ColaboradorOpcion[] = Array.from(mapaColaboradores.entries()).map(([registro, nombres]) => ({
          registro,
          nombres,
        }));
        lista.sort((a, b) => a.nombres.localeCompare(b.nombres));
        setColaboradores(lista);
      })
      .catch(() => {
        const lista: ColaboradorOpcion[] = Array.from(mapaColaboradores.entries()).map(([registro, nombres]) => ({
          registro,
          nombres,
        }));
        lista.sort((a, b) => a.nombres.localeCompare(b.nombres));
        setColaboradores(lista);
      });
  }, [actividades, grupos]);

  // Filtrado reactivo en tiempo real
  const actividadesFiltradas = useMemo(() => {
    return actividades.filter(act => {
      // 1. Filtro por Asignado
      if (asignadoFiltro) {
        const actAsignado = (act.asignado_registro || '').toUpperCase();
        if (actAsignado !== asignadoFiltro.toUpperCase()) {
          return false;
        }
      }

      // 2. Filtro por Estado
      if (estadoFiltro) {
        if (act.estado.toLowerCase() !== estadoFiltro.toLowerCase()) {
          return false;
        }
      }

      // 3. Filtro por Rango de Fecha de Registro
      if (fechaInicio || fechaFin) {
        if (!act.fecha_registro) return false;
        const fechaActStr = act.fecha_registro.slice(0, 10); // YYYY-MM-DD
        if (fechaInicio && fechaActStr < fechaInicio) {
          return false;
        }
        if (fechaFin && fechaActStr > fechaFin) {
          return false;
        }
      }

      return true;
    });
  }, [actividades, asignadoFiltro, estadoFiltro, fechaInicio, fechaFin]);

  // Atajos de fecha rápida
  const aplicarAtajoFecha = (tipo: 'hoy' | 'ultimos7' | 'esteMes' | 'limpiar') => {
    const hoy = new Date();
    const formato = (d: Date) => d.toISOString().slice(0, 10);

    if (tipo === 'hoy') {
      const fechaStr = formato(hoy);
      setFechaInicio(fechaStr);
      setFechaFin(fechaStr);
    } else if (tipo === 'ultimos7') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setFechaInicio(formato(d));
      setFechaFin(formato(hoy));
    } else if (tipo === 'esteMes') {
      const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      setFechaInicio(formato(primerDia));
      setFechaFin(formato(hoy));
    } else if (tipo === 'limpiar') {
      setFechaInicio('');
      setFechaFin('');
    }
  };

  const reiniciarFiltros = () => {
    setAsignadoFiltro('');
    setFechaInicio('');
    setFechaFin('');
    setEstadoFiltro('');
  };

  const hayFiltrosActivos = Boolean(asignadoFiltro || fechaInicio || fechaFin || estadoFiltro);

  // Formato legible de fecha para celdas de Excel
  const formatearFechaExcel = (fechaStr?: string | null): string => {
    if (!fechaStr) return '';
    try {
      const d = new Date(fechaStr);
      if (isNaN(d.getTime())) return fechaStr;
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch {
      return fechaStr;
    }
  };

  // Función principal de exportación a Excel (.xlsx)
  const ejecutarExportacion = () => {
    if (actividadesFiltradas.length === 0) {
      notifyError('No existen actividades que coincidan con los filtros seleccionados.');
      return;
    }

    try {
      setExportando(true);

      // 1. Mapear los datos a columnas ordenadas y profesionales
      const filasExcel = actividadesFiltradas.map((act, index) => ({
        'N°': index + 1,
        'Código Actividad': act.codigo_actividad,
        'Título': act.titulo,
        'Estado': MAPA_ESTADOS_NOMBRE[act.estado] || act.estado,
        'Tipo de Actividad': act.tipo_actividad,
        'Proyecto': act.nombre_proyecto || 'Sin proyecto',
        'Grupo / Squad': act.nombre_grupo || act.codigo_grupo || 'Sin grupo',
        'Registro Asignado': act.asignado_registro || 'Sin asignar',
        'Nombre Asignado': act.nombre_asignado || 'Sin asignar',
        'Registro SWE': act.swe_encargado || '',
        'Nombre SWE': act.nombre_swe || '',
        'Sprint': act.sprint || '1',
        'Q de Trabajo': act.q_trabajo || '1',
        'Fecha de Registro': formatearFechaExcel(act.fecha_registro),
        'Fecha de Actualización': formatearFechaExcel(act.fecha_actualizacion),
        'Solicitado Por': act.solicitado_por || '',
        'SRT / Rational': act.srt_rational || '',
        'Orden de Cambio': act.orden_cambio || '',
        'Descripción': act.descripcion || '',
        'Impedimentos': act.impedimentos || '',
        'Áreas Afectadas': act.areas_afectadas || '',
      }));

      // 2. Crear libro de trabajo y hoja
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(filasExcel);

      // 3. Definir anchos de columna óptimos
      ws['!cols'] = [
        { wch: 6 },  // N°
        { wch: 18 }, // Código Actividad
        { wch: 45 }, // Título
        { wch: 22 }, // Estado
        { wch: 18 }, // Tipo de Actividad
        { wch: 28 }, // Proyecto
        { wch: 24 }, // Grupo / Squad
        { wch: 18 }, // Registro Asignado
        { wch: 30 }, // Nombre Asignado
        { wch: 16 }, // Registro SWE
        { wch: 28 }, // Nombre SWE
        { wch: 10 }, // Sprint
        { wch: 14 }, // Q de Trabajo
        { wch: 22 }, // Fecha de Registro
        { wch: 22 }, // Fecha de Actualización
        { wch: 22 }, // Solicitado Por
        { wch: 18 }, // SRT / Rational
        { wch: 18 }, // Orden de Cambio
        { wch: 50 }, // Descripción
        { wch: 35 }, // Impedimentos
        { wch: 30 }, // Áreas Afectadas
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Actividades');

      // 4. Nombre de archivo con fecha y hora
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
      const nombreArchivo = `Reporte_Actividades_${timestamp}.xlsx`;

      // 5. Descargar archivo .xlsx
      XLSX.writeFile(wb, nombreArchivo);

      exito(`Reporte exportado exitosamente: ${actividadesFiltradas.length} actividades en formato .xlsx`);
      onCerrar();
    } catch (err: any) {
      console.error('Error al exportar Excel:', err);
      notifyError('Ocurrió un error al generar el archivo Excel: ' + (err.message || 'Error desconocido'));
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '560px',
          borderRadius: 'var(--radio-lg)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Cabecera del Popup con branding de Office Excel */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-borde)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-superficie)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#E8F5E9',
                border: '1px solid #A5D6A7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(16, 124, 65, 0.15)',
              }}
            >
              <OfficeExcelIcon size={24} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--color-texto-principal)',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                Exportar Actividades a Excel
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-texto-secundario)', margin: 0, marginTop: '2px' }}>
                Filtre las actividades y genere un archivo compatible con Microsoft Excel (.xlsx)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="btn-cerrar-modal"
            title="Cerrar ventana"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-texto-terciario)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 'var(--radio-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo de Filtros */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto' }}>

          {/* Filtro 1: Por Asignado */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={15} style={{ color: 'var(--color-primario)' }} />
              <span>Por Asignado:</span>
            </label>
            <select
              className="form-select"
              value={asignadoFiltro}
              onChange={e => setAsignadoFiltro(e.target.value)}
              style={{ fontSize: '0.9rem' }}
            >
              <option value="">Todos los colaboradores</option>
              {colaboradores.map(c => (
                <option key={c.registro} value={c.registro}>
                  {c.registro} — {c.nombres}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro 2: Por Rango Fecha de Registro (Inicio y Fin) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <Calendar size={15} style={{ color: 'var(--color-primario)' }} />
                <span>Por Rango Fecha de Registro:</span>
              </label>

              {/* Atajos rápidos de fecha */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => aplicarAtajoFecha('hoy')}
                  style={{
                    fontSize: '0.725rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--color-fondo)',
                    color: 'var(--color-texto-secundario)',
                    cursor: 'pointer',
                  }}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => aplicarAtajoFecha('ultimos7')}
                  style={{
                    fontSize: '0.725rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--color-fondo)',
                    color: 'var(--color-texto-secundario)',
                    cursor: 'pointer',
                  }}
                >
                  7 días
                </button>
                <button
                  type="button"
                  onClick={() => aplicarAtajoFecha('esteMes')}
                  style={{
                    fontSize: '0.725rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--color-fondo)',
                    color: 'var(--color-texto-secundario)',
                    cursor: 'pointer',
                  }}
                >
                  Este mes
                </button>
                {(fechaInicio || fechaFin) && (
                  <button
                    type="button"
                    onClick={() => aplicarAtajoFecha('limpiar')}
                    style={{
                      fontSize: '0.725rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #FCA5A5',
                      backgroundColor: '#FEF2F2',
                      color: '#DC2626',
                      cursor: 'pointer',
                    }}
                    title="Limpiar fechas"
                  >
                    Borrar
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-texto-terciario)', display: 'block', marginBottom: '4px' }}>
                  Fecha Inicio:
                </span>
                <input
                  type="date"
                  className="form-input"
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-texto-terciario)', display: 'block', marginBottom: '4px' }}>
                  Fecha Fin:
                </span>
                <input
                  type="date"
                  className="form-input"
                  value={fechaFin}
                  min={fechaInicio || undefined}
                  onChange={e => setFechaFin(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {fechaInicio && fechaFin && fechaInicio > fechaFin && (
              <span style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '4px', display: 'block' }}>
                La fecha de inicio no puede ser posterior a la fecha fin.
              </span>
            )}
          </div>

          {/* Filtro 3: Por Estado */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={15} style={{ color: 'var(--color-primario)' }} />
              <span>Por Estado:</span>
            </label>
            <select
              className="form-select"
              value={estadoFiltro}
              onChange={e => setEstadoFiltro(e.target.value)}
              style={{ fontSize: '0.9rem' }}
            >
              {ESTADOS_DISPONIBLES.map(est => (
                <option key={est.id} value={est.id}>
                  {est.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tarjeta Informativa del conteo de resultados */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radio-md)',
              backgroundColor: actividadesFiltradas.length > 0 ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${actividadesFiltradas.length > 0 ? '#BBF7D0' : '#FECACA'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {actividadesFiltradas.length > 0 ? (
                <CheckCircle2 size={18} style={{ color: '#16A34A', flexShrink: 0 }} />
              ) : (
                <AlertCircle size={18} style={{ color: '#DC2626', flexShrink: 0 }} />
              )}
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: actividadesFiltradas.length > 0 ? '#15803D' : '#991B1B',
                }}
              >
                {actividadesFiltradas.length > 0
                  ? `Se exportarán ${actividadesFiltradas.length} de ${actividades.length} actividades.`
                  : 'Ninguna actividad coincide con los filtros especificados.'}
              </span>
            </div>

            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={reiniciarFiltros}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  color: 'var(--color-texto-secundario)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
                title="Restablecer todos los filtros"
              >
                <RotateCcw size={12} />
                Restablecer
              </button>
            )}
          </div>

        </div>

        {/* Pie del Popup: Botón Cancelar y Botón Exportar con icono de Office Excel */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--color-borde)',
            backgroundColor: 'var(--color-fondo)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            className="btn btn-secundario"
            onClick={onCerrar}
            disabled={exportando}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={ejecutarExportacion}
            disabled={actividadesFiltradas.length === 0 || exportando}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '9px 20px',
              borderRadius: 'var(--radio-md)',
              backgroundColor: '#107C41', // Verde corporativo de Microsoft Office Excel
              color: '#FFFFFF',
              border: '1px solid #0D6535',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: actividadesFiltradas.length === 0 || exportando ? 'not-allowed' : 'pointer',
              opacity: actividadesFiltradas.length === 0 || exportando ? 0.6 : 1,
              boxShadow: '0 2px 8px rgba(16, 124, 65, 0.3)',
              transition: 'all var(--transicion-rapida)',
            }}
            onMouseEnter={e => {
              if (actividadesFiltradas.length > 0 && !exportando) {
                e.currentTarget.style.backgroundColor = '#0E6B37';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 124, 65, 0.4)';
              }
            }}
            onMouseLeave={e => {
              if (actividadesFiltradas.length > 0 && !exportando) {
                e.currentTarget.style.backgroundColor = '#107C41';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 124, 65, 0.3)';
              }
            }}
          >
            <OfficeExcelIcon size={20} />
            <span>{exportando ? 'Generando Excel...' : 'Exportar'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
