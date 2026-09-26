import React, { useState, useMemo } from 'react';
import { X, Filter, CheckCircle2, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Incidente } from '../../types';
import { OfficeExcelIcon } from './OfficeExcelIcon';
import { useNotificacion } from '../../context/NotificacionContext';
import { formatearFecha, formatearFechaHora } from '../../lib/dateUtils';

interface ModalExportarIncidentesProps {
  incidentes: Incidente[];
  onCerrar: () => void;
}

const AMBIENTES: { id: string; label: string }[] = [
  { id: '', label: 'Todos los ambientes' },
  { id: 'PRD', label: 'PRD' },
  { id: 'UAT', label: 'UAT' },
];

const RUTAS_CRITICAS: { id: string; label: string }[] = [
  { id: '', label: 'Todas las rutas' },
  { id: 'SI', label: 'SI' },
  { id: 'NO', label: 'NO' },
];

export const ModalExportarIncidentes: React.FC<ModalExportarIncidentesProps> = ({
  incidentes,
  onCerrar,
}) => {
  const { exito, error: notifyError } = useNotificacion();

  // Estados de filtros para exportación
  const [ambienteFiltro, setAmbienteFiltro] = useState<string>('');
  const [rutaCriticaFiltro, setRutaCriticaFiltro] = useState<string>('');
  const [aplicativoFiltro, setAplicativoFiltro] = useState<string>('');
  const [atendidoPorFiltro, setAtendidoPorFiltro] = useState<string>('');
  const [exportando, setExportando] = useState<boolean>(false);

  // Aplicativos disponibles
  const aplicativosDisponibles = useMemo(() => {
    const s = new Set<string>();
    incidentes.forEach(i => {
      if (i.aplicativo?.trim()) s.add(i.aplicativo.trim());
    });
    return Array.from(s).sort();
  }, [incidentes]);

  // Atendidos por disponibles
  const atendidosDisponibles = useMemo(() => {
    const s = new Set<string>();
    incidentes.forEach(i => {
      if (i.atendido_por?.trim()) s.add(i.atendido_por.trim());
    });
    return Array.from(s).sort();
  }, [incidentes]);

  // Incidentes filtrados para exportación
  const incidentesFiltrados = useMemo(() => {
    return incidentes.filter(i => {
      if (ambienteFiltro && i.ambiente !== ambienteFiltro) return false;
      if (rutaCriticaFiltro && (i.ruta_critica || 'NO') !== rutaCriticaFiltro) return false;
      if (aplicativoFiltro && i.aplicativo?.trim().toLowerCase() !== aplicativoFiltro.trim().toLowerCase()) return false;
      if (atendidoPorFiltro && i.atendido_por?.trim().toLowerCase() !== atendidoPorFiltro.trim().toLowerCase()) return false;
      return true;
    });
  }, [incidentes, ambienteFiltro, rutaCriticaFiltro, aplicativoFiltro, atendidoPorFiltro]);

  const reiniciarFiltros = () => {
    setAmbienteFiltro('');
    setRutaCriticaFiltro('');
    setAplicativoFiltro('');
    setAtendidoPorFiltro('');
  };

  const handleExportar = () => {
    if (incidentesFiltrados.length === 0) {
      notifyError('No existen registros de incidentes que coincidan con los filtros seleccionados.');
      return;
    }

    try {
      setExportando(true);

      const filas = incidentesFiltrados.map(i => ({
        'ATENDIDO_POR': i.atendido_por || '',
        'APLICACION': i.aplicativo || '',
        'RUTA_CRITICA': i.ruta_critica || 'NO',
        'JOB': i.job || '',
        'Fecha \nCancelacion': i.fecha_cancelacion ? formatearFecha(i.fecha_cancelacion) : '',
        'Server': i.server || '',
        'RUTA': i.ruta || '',
        'DTSX': i.dtsx || '',
        'APLICAR': i.aplicar || '',
        'Hora \nCANCELACION': i.hora_cancelacion || '',
        'Descripcion_ERROR': i.descripcion_error || '',
        'Solucion': i.solucion || '',
        'fecha_Hora_solucion': i.fecha_hora_solucion ? formatearFechaHora(i.fecha_hora_solucion) : '',
        'AMBIENTE': i.ambiente || 'PRD',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(filas);

      // Autoancho de columnas
      const colWidths = Object.keys(filas[0] || {}).map(k => ({
        wch: Math.max(k.length, 16)
      }));
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'JOB_DTSX');

      const fechaDescarga = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Detalle_JOBS_Incidentes_${fechaDescarga}.xlsx`);

      exito(`Se han exportado ${incidentesFiltrados.length} incidentes correctamente a Excel.`);
      onCerrar();
    } catch (err: any) {
      console.error(err);
      notifyError('Ocurrió un error al generar el archivo Excel: ' + (err.message || ''));
    } finally {
      setExportando(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-superficie)',
          borderRadius: 'var(--radio-lg)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          width: '100%',
          maxWidth: '560px',
          border: '1px solid var(--color-borde)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Cabecera del Modal */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-borde)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-superficie-hover)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radio-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(16, 124, 65, 0.12)',
              }}
            >
              <OfficeExcelIcon size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--color-texto-principal)' }}>
                Exportar Incidentes a Excel
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-texto-secundario)', margin: 0 }}>
                Genere un archivo .xlsx con formato oficial y fechas DD/MM/YYYY
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-texto-terciario)',
              padding: '4px',
              display: 'flex',
              borderRadius: 'var(--radio-sm)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Card resumen de resultados */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radio-md)',
              backgroundColor: 'var(--color-primario-suave)',
              border: '1px solid var(--color-borde)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} style={{ color: 'var(--color-primario)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-texto-principal)' }}>
                Registros a exportar:
              </span>
            </div>
            <span
              style={{
                fontSize: '1rem',
                fontWeight: 800,
                color: 'var(--color-primario)',
                backgroundColor: 'var(--color-superficie)',
                padding: '2px 10px',
                borderRadius: 'var(--radio-pildora)',
                border: '1px solid var(--color-borde)',
              }}
            >
              {incidentesFiltrados.length} de {incidentes.length}
            </span>
          </div>

          {/* Filtros de exportación */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-texto-secundario)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Filtros Opcionales
              </span>
              {(ambienteFiltro || rutaCriticaFiltro || aplicativoFiltro || atendidoPorFiltro) && (
                <button
                  type="button"
                  onClick={reiniciarFiltros}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    color: 'var(--color-primario)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  <RotateCcw size={12} />
                  Limpiar filtros
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                  Ambiente
                </label>
                <select
                  className="form-select"
                  style={{ fontSize: '0.8rem', width: '100%' }}
                  value={ambienteFiltro}
                  onChange={e => setAmbienteFiltro(e.target.value)}
                >
                  {AMBIENTES.map(a => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                  Ruta Crítica
                </label>
                <select
                  className="form-select"
                  style={{ fontSize: '0.8rem', width: '100%' }}
                  value={rutaCriticaFiltro}
                  onChange={e => setRutaCriticaFiltro(e.target.value)}
                >
                  {RUTAS_CRITICAS.map(rc => (
                    <option key={rc.id} value={rc.id}>{rc.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                  Aplicativo
                </label>
                <select
                  className="form-select"
                  style={{ fontSize: '0.8rem', width: '100%' }}
                  value={aplicativoFiltro}
                  onChange={e => setAplicativoFiltro(e.target.value)}
                >
                  <option value="">Todos los aplicativos</option>
                  {aplicativosDisponibles.map(app => (
                    <option key={app} value={app}>{app}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                  Atendido Por
                </label>
                <select
                  className="form-select"
                  style={{ fontSize: '0.8rem', width: '100%' }}
                  value={atendidoPorFiltro}
                  onChange={e => setAtendidoPorFiltro(e.target.value)}
                >
                  <option value="">Todos los colaboradores</option>
                  {atendidosDisponibles.map(at => (
                    <option key={at} value={at}>{at}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con botones de acción */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--color-borde)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            backgroundColor: 'var(--color-superficie-hover)',
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
            className="btn btn-primario"
            onClick={handleExportar}
            disabled={exportando || incidentesFiltrados.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#107C41',
              borderColor: '#107C41',
              color: '#FFFFFF',
              fontWeight: 600,
            }}
          >
            <OfficeExcelIcon size={18} />
            {exportando ? 'Generando Excel...' : `Descargar Excel (${incidentesFiltrados.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};
