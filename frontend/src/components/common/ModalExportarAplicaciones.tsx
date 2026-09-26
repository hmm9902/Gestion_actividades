import React, { useState, useMemo } from 'react';
import { X, Calendar, Filter, Users, CheckCircle2, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Aplicacion } from '../../types';
import { OfficeExcelIcon } from './OfficeExcelIcon';
import { useNotificacion } from '../../context/NotificacionContext';

interface ModalExportarAplicacionesProps {
  aplicaciones: Aplicacion[];
  onCerrar: () => void;
}

const ESTADOS_APLICACION: { id: string; label: string }[] = [
  { id: '', label: 'Todos los estados' },
  { id: 'Activo', label: 'Activo' },
  { id: 'Inactivo', label: 'Inactivo' },
];

export const ModalExportarAplicaciones: React.FC<ModalExportarAplicacionesProps> = ({
  aplicaciones,
  onCerrar,
}) => {
  const { exito, error: notifyError } = useNotificacion();

  // Estados de filtros
  const [estadoFiltro, setEstadoFiltro] = useState<string>('');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [liderFiltro, setLiderFiltro] = useState<string>('');
  const [exportando, setExportando] = useState<boolean>(false);

  // Lista única de líderes técnicos
  const lideresDisponibles = useMemo(() => {
    const setLideres = new Set<string>();
    aplicaciones.forEach(a => {
      if (a.lider_tecno?.trim()) {
        setLideres.add(a.lider_tecno.trim());
      }
    });
    return Array.from(setLideres).sort();
  }, [aplicaciones]);

  // Filtrado reactivo de aplicaciones
  const aplicacionesFiltradas = useMemo(() => {
    return aplicaciones.filter(a => {
      // 1. Filtro por Estado
      if (estadoFiltro && a.estado !== estadoFiltro) {
        return false;
      }

      // 2. Filtro por Líder Técnico
      if (liderFiltro && a.lider_tecno?.trim().toLowerCase() !== liderFiltro.trim().toLowerCase()) {
        return false;
      }

      // 3. Filtro por Rango Fecha de Registro
      if (fechaInicio || fechaFin) {
        if (!a.fecha_registro) return false;
        const regDate = a.fecha_registro.slice(0, 10);
        if (fechaInicio && regDate < fechaInicio) {
          return false;
        }
        if (fechaFin && regDate > fechaFin) {
          return false;
        }
      }

      return true;
    });
  }, [aplicaciones, estadoFiltro, liderFiltro, fechaInicio, fechaFin]);

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
    setLiderFiltro('');
  };

  const hayFiltrosActivos = Boolean(estadoFiltro || fechaInicio || fechaFin || liderFiltro);

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
    if (aplicacionesFiltradas.length === 0) {
      notifyError('No existen aplicaciones que coincidan con los filtros seleccionados.');
      return;
    }

    try {
      setExportando(true);

      const filasExcel = aplicacionesFiltradas.map((a, index) => ({
        'N°': index + 1,
        'ID Aplicación': a.aplicacion_id,
        'Nombre de la Aplicación': a.nombre_aplicacion,
        'Siglas': a.siglas || '',
        'Líder Técnico': a.lider_tecno || '',
        'PO Contacto': a.po_contacto || '',
        'Scrum Datos': a.scrum_datos || '',
        'Descripción de Actividad': a.descripcion_actividad || '',
        'Estado': a.estado,
        'Fecha de Registro': formatearFechaExcel(a.fecha_registro),
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(filasExcel);

      ws['!cols'] = [
        { wch: 6 },  // N°
        { wch: 15 }, // ID Aplicación
        { wch: 40 }, // Nombre de la Aplicación
        { wch: 15 }, // Siglas
        { wch: 28 }, // Líder Técnico
        { wch: 28 }, // PO Contacto
        { wch: 28 }, // Scrum Datos
        { wch: 45 }, // Descripción de Actividad
        { wch: 14 }, // Estado
        { wch: 20 }, // Fecha de Registro
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Aplicaciones');

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
      const nombreArchivo = `Reporte_Aplicaciones_${timestamp}.xlsx`;

      XLSX.writeFile(wb, nombreArchivo);

      exito(`Reporte exportado exitosamente: ${aplicacionesFiltradas.length} aplicaciones en formato .xlsx`);
      onCerrar();
    } catch (err: any) {
      console.error('Error al exportar aplicaciones a Excel:', err);
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
            <OfficeExcelIcon size={24} />
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--color-texto-principal)' }}>
                Exportar Aplicaciones a Excel
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-texto-secundario)', margin: 0 }}>
                Configure los filtros para personalizar el reporte (.xlsx)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-texto-terciario)',
              padding: '6px',
              borderRadius: 'var(--radio-sm)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Filtro: Estado */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-texto-principal)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Filter size={14} color="var(--color-primario)" />
              Estado de Aplicación
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {ESTADOS_APLICACION.map(est => {
                const activo = estadoFiltro === est.id;
                return (
                  <button
                    key={est.id}
                    type="button"
                    onClick={() => setEstadoFiltro(est.id)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radio-md)',
                      fontSize: '0.8rem',
                      fontWeight: activo ? 700 : 500,
                      border: activo ? '2px solid #107C41' : '1px solid var(--color-borde)',
                      backgroundColor: activo ? 'rgba(16, 124, 65, 0.08)' : 'var(--color-superficie)',
                      color: activo ? '#107C41' : 'var(--color-texto-secundario)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    {activo && <CheckCircle2 size={13} color="#107C41" />}
                    <span>{est.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtro: Líder Técnico */}
          {lideresDisponibles.length > 0 && (
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-texto-principal)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Users size={14} color="var(--color-primario)" />
                Líder Técnico
              </label>
              <select
                className="form-select"
                value={liderFiltro}
                onChange={e => setLiderFiltro(e.target.value)}
                style={{ fontSize: '0.83rem', width: '100%' }}
              >
                <option value="">Todos los Líderes Técnicos ({lideresDisponibles.length})</option>
                {lideresDisponibles.map(lid => (
                  <option key={lid} value={lid}>{lid}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro: Rango de Fecha de Registro */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-texto-principal)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} color="var(--color-primario)" />
                Fecha de Registro
              </label>
              {/* Atajos rápidos */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => aplicarAtajoFecha('hoy')}
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 6px',
                    background: 'none',
                    border: '1px solid var(--color-borde)',
                    borderRadius: 'var(--radio-sm)',
                    cursor: 'pointer',
                    color: 'var(--color-texto-secundario)',
                  }}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => aplicarAtajoFecha('ultimos7')}
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 6px',
                    background: 'none',
                    border: '1px solid var(--color-borde)',
                    borderRadius: 'var(--radio-sm)',
                    cursor: 'pointer',
                    color: 'var(--color-texto-secundario)',
                  }}
                >
                  7 días
                </button>
                <button
                  type="button"
                  onClick={() => aplicarAtajoFecha('esteMes')}
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 6px',
                    background: 'none',
                    border: '1px solid var(--color-borde)',
                    borderRadius: 'var(--radio-sm)',
                    cursor: 'pointer',
                    color: 'var(--color-texto-secundario)',
                  }}
                >
                  Este mes
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '0.73rem', color: 'var(--color-texto-terciario)', display: 'block', marginBottom: '3px' }}>Desde</span>
                <input
                  type="date"
                  className="form-input"
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                  style={{ fontSize: '0.82rem' }}
                />
              </div>
              <div>
                <span style={{ fontSize: '0.73rem', color: 'var(--color-texto-terciario)', display: 'block', marginBottom: '3px' }}>Hasta</span>
                <input
                  type="date"
                  className="form-input"
                  value={fechaFin}
                  onChange={e => setFechaFin(e.target.value)}
                  style={{ fontSize: '0.82rem' }}
                />
              </div>
            </div>
          </div>

          {/* Resumen de Registros a Exportar */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--color-superficie-hover)',
              borderRadius: 'var(--radio-md)',
              border: '1px solid var(--color-borde)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '0.76rem', color: 'var(--color-texto-terciario)', display: 'block' }}>Total a exportar</span>
              <strong style={{ fontSize: '1.05rem', color: '#107C41' }}>
                {aplicacionesFiltradas.length} {aplicacionesFiltradas.length === 1 ? 'aplicación' : 'aplicaciones'}
              </strong>
              {aplicacionesFiltradas.length !== aplicaciones.length && (
                <span style={{ fontSize: '0.76rem', color: 'var(--color-texto-terciario)', marginLeft: '6px' }}>
                  (de {aplicaciones.length} en catálogo)
                </span>
              )}
            </div>

            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={reiniciarFiltros}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  background: 'none',
                  border: '1px dashed var(--color-borde)',
                  borderRadius: 'var(--radio-sm)',
                  cursor: 'pointer',
                  color: 'var(--color-texto-secundario)',
                }}
                title="Limpiar todos los filtros"
              >
                <RotateCcw size={12} />
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Pie de Acciones */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--color-borde)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            backgroundColor: 'var(--color-superficie)',
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
            disabled={exportando || aplicacionesFiltradas.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              backgroundColor: '#107C41',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radio-md)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: aplicacionesFiltradas.length === 0 ? 'not-allowed' : 'pointer',
              opacity: aplicacionesFiltradas.length === 0 ? 0.6 : 1,
              boxShadow: '0 2px 6px rgba(16, 124, 65, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <OfficeExcelIcon size={16} />
            <span>{exportando ? 'Generando...' : 'Descargar Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
