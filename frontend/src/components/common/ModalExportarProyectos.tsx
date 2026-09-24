import React, { useState, useMemo } from 'react';
import { X, Calendar, Filter, Users, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Proyecto, EstadoProyecto } from '../../types';
import { OfficeExcelIcon } from './OfficeExcelIcon';
import { useNotificacion } from '../../context/NotificacionContext';

interface ModalExportarProyectosProps {
  proyectos: Proyecto[];
  onCerrar: () => void;
}

const ESTADOS_PROYECTO: { id: string; label: string }[] = [
  { id: '', label: 'Todos los estados' },
  { id: 'Activo', label: 'Activo' },
  { id: 'standBy', label: 'En Espera (standBy)' },
  { id: 'Entregado', label: 'Entregado' },
];

export const ModalExportarProyectos: React.FC<ModalExportarProyectosProps> = ({
  proyectos,
  onCerrar,
}) => {
  const { exito, error: notifyError } = useNotificacion();

  // Estados de filtros
  const [estadoFiltro, setEstadoFiltro] = useState<string>('');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [equipoFiltro, setEquipoFiltro] = useState<string>('');
  const [exportando, setExportando] = useState<boolean>(false);

  // Lista única de equipos solicitantes
  const equiposDisponibles = useMemo(() => {
    const setEquipos = new Set<string>();
    proyectos.forEach(p => {
      if (p.equipo_solicitante?.trim()) {
        setEquipos.add(p.equipo_solicitante.trim());
      }
    });
    return Array.from(setEquipos).sort();
  }, [proyectos]);

  // Filtrado reactivo de proyectos
  const proyectosFiltrados = useMemo(() => {
    return proyectos.filter(p => {
      // 1. Filtro por Estado
      if (estadoFiltro && p.estado !== estadoFiltro) {
        return false;
      }

      // 2. Filtro por Equipo Solicitante
      if (equipoFiltro && p.equipo_solicitante?.trim().toLowerCase() !== equipoFiltro.trim().toLowerCase()) {
        return false;
      }

      // 3. Filtro por Rango Fecha de Registro
      if (fechaInicio || fechaFin) {
        if (!p.fecha_registro) return false;
        const regDate = p.fecha_registro.slice(0, 10);
        if (fechaInicio && regDate < fechaInicio) {
          return false;
        }
        if (fechaFin && regDate > fechaFin) {
          return false;
        }
      }

      return true;
    });
  }, [proyectos, estadoFiltro, equipoFiltro, fechaInicio, fechaFin]);

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
    setEstadoFiltro('');
    setFechaInicio('');
    setFechaFin('');
    setEquipoFiltro('');
  };

  const hayFiltrosActivos = Boolean(estadoFiltro || fechaInicio || fechaFin || equipoFiltro);

  const formatearFechaExcel = (fechaStr?: string | null): string => {
    if (!fechaStr) return '';
    try {
      const d = new Date(fechaStr);
      if (isNaN(d.getTime())) return fechaStr;
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return fechaStr;
    }
  };

  const ejecutarExportacion = () => {
    if (proyectosFiltrados.length === 0) {
      notifyError('No existen proyectos que coincidan con los filtros seleccionados.');
      return;
    }

    try {
      setExportando(true);

      const filasExcel = proyectosFiltrados.map((p, index) => ({
        'N°': index + 1,
        'ID Proyecto': p.proyecto_id,
        'Nombre del Proyecto': p.nombre_proyecto,
        'Estado': p.estado,
        'Equipo Solicitante': p.equipo_solicitante || '',
        'Fecha de Registro': formatearFechaExcel(p.fecha_registro),
        'Fecha Dead Line': formatearFechaExcel(p.fecha_dead_line),
        'Descripción': p.descripcion_proyecto || '',
        'Posibles Impedimentos': p.posibles_impedimentos || '',
        'Creado Por': p.creado_por || '',
        'Fecha de Actualización': formatearFechaExcel(p.fecha_actualizacion),
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(filasExcel);

      ws['!cols'] = [
        { wch: 6 },  // N°
        { wch: 14 }, // ID Proyecto
        { wch: 40 }, // Nombre del Proyecto
        { wch: 16 }, // Estado
        { wch: 25 }, // Equipo Solicitante
        { wch: 20 }, // Fecha de Registro
        { wch: 20 }, // Fecha Dead Line
        { wch: 45 }, // Descripción
        { wch: 35 }, // Posibles Impedimentos
        { wch: 18 }, // Creado Por
        { wch: 20 }, // Fecha de Actualización
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Proyectos');

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
      const nombreArchivo = `Reporte_Proyectos_${timestamp}.xlsx`;

      XLSX.writeFile(wb, nombreArchivo);

      exito(`Reporte exportado exitosamente: ${proyectosFiltrados.length} proyectos en formato .xlsx`);
      onCerrar();
    } catch (err: any) {
      console.error('Error al exportar proyectos a Excel:', err);
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
        {/* Cabecera con branding Office Excel */}
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
                }}
              >
                Exportar Proyectos a Excel
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-texto-secundario)', margin: 0, marginTop: '2px' }}>
                Filtre las iniciativas y proyectos para descargar en formato compatible .xlsx
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

        {/* Formulario de Filtros */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto' }}>

          {/* Filtro: Por Estado */}
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
              {ESTADOS_PROYECTO.map(est => (
                <option key={est.id} value={est.id}>
                  {est.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro: Por Rango Fecha de Registro (Inicio y Fin) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <Calendar size={15} style={{ color: 'var(--color-primario)' }} />
                <span>Por Rango Fecha de Registro:</span>
              </label>

              {/* Atajos de fecha */}
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

          {/* Filtro: Por Equipo Solicitante */}
          {equiposDisponibles.length > 0 && (
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={15} style={{ color: 'var(--color-primario)' }} />
                <span>Por Equipo Solicitante:</span>
              </label>
              <select
                className="form-select"
                value={equipoFiltro}
                onChange={e => setEquipoFiltro(e.target.value)}
                style={{ fontSize: '0.9rem' }}
              >
                <option value="">Todos los equipos solicitantes</option>
                {equiposDisponibles.map(eq => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Conteo dinámico de resultados */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radio-md)',
              backgroundColor: proyectosFiltrados.length > 0 ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${proyectosFiltrados.length > 0 ? '#BBF7D0' : '#FECACA'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {proyectosFiltrados.length > 0 ? (
                <CheckCircle2 size={18} style={{ color: '#16A34A', flexShrink: 0 }} />
              ) : (
                <AlertCircle size={18} style={{ color: '#DC2626', flexShrink: 0 }} />
              )}
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: proyectosFiltrados.length > 0 ? '#15803D' : '#991B1B',
                }}
              >
                {proyectosFiltrados.length > 0
                  ? `Se exportarán ${proyectosFiltrados.length} de ${proyectos.length} proyectos.`
                  : 'Ningún proyecto coincide con los filtros especificados.'}
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
                title="Restablecer filtros"
              >
                <RotateCcw size={12} />
                Restablecer
              </button>
            )}
          </div>

        </div>

        {/* Pie: Botón Exportar con icono de Office Excel */}
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
            disabled={proyectosFiltrados.length === 0 || exportando}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '9px 20px',
              borderRadius: 'var(--radio-md)',
              backgroundColor: '#107C41',
              color: '#FFFFFF',
              border: '1px solid #0D6535',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: proyectosFiltrados.length === 0 || exportando ? 'not-allowed' : 'pointer',
              opacity: proyectosFiltrados.length === 0 || exportando ? 0.6 : 1,
              boxShadow: '0 2px 8px rgba(16, 124, 65, 0.3)',
              transition: 'all var(--transicion-rapida)',
            }}
            onMouseEnter={e => {
              if (proyectosFiltrados.length > 0 && !exportando) {
                e.currentTarget.style.backgroundColor = '#0E6B37';
              }
            }}
            onMouseLeave={e => {
              if (proyectosFiltrados.length > 0 && !exportando) {
                e.currentTarget.style.backgroundColor = '#107C41';
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
