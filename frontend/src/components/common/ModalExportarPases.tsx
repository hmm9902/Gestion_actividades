import React, { useState, useMemo } from 'react';
import { X, Filter, CheckCircle2, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Pase } from '../../types';
import { OfficeExcelIcon } from './OfficeExcelIcon';
import { useNotificacion } from '../../context/NotificacionContext';

interface ModalExportarPasesProps {
  pases: Pase[];
  onCerrar: () => void;
}

const ESTADOS_PASE: { id: string; label: string }[] = [
  { id: '', label: 'Todos los estados' },
  { id: 'REGISTRADO', label: 'REGISTRADO' },
  { id: 'UAT_SOLICITADO', label: 'UAT_SOLICITADO' },
  { id: 'UAT_DESPLEGADO', label: 'UAT_DESPLEGADO' },
  { id: 'QA_CERTIFICADO', label: 'QA_CERTIFICADO' },
  { id: 'PRD_SOLICITADO', label: 'PRD_SOLICITADO' },
  { id: 'PRD_EJECUTADO', label: 'PRD_EJECUTADO' },
  { id: 'RECHAZADO', label: 'RECHAZADO' },
  { id: 'ANULADO', label: 'ANULADO' },
];

const AMBIENTES: { id: string; label: string }[] = [
  { id: '', label: 'Todos los ambientes' },
  { id: 'A', label: 'A - APIC_IFX' },
  { id: 'D', label: 'D - DISTRIBUIDO' },
  { id: 'H', label: 'H - HOST' },
];

export const ModalExportarPases: React.FC<ModalExportarPasesProps> = ({
  pases,
  onCerrar,
}) => {
  const { exito, error: notifyError } = useNotificacion();

  // Estados de filtros para exportación
  const [estadoFiltro, setEstadoFiltro] = useState<string>('');
  const [ambienteFiltro, setAmbienteFiltro] = useState<string>('');
  const [proyectoFiltro, setProyectoFiltro] = useState<string>('');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [exportando, setExportando] = useState<boolean>(false);

  // Proyectos disponibles en la lista de pases
  const proyectosDisponibles = useMemo(() => {
    const s = new Set<string>();
    pases.forEach(p => {
      if (p.proyecto?.trim()) s.add(p.proyecto.trim());
    });
    return Array.from(s).sort();
  }, [pases]);

  // Pases filtrados para exportación
  const pasesFiltrados = useMemo(() => {
    return pases.filter(p => {
      if (estadoFiltro && p.estado_srt !== estadoFiltro) return false;
      if (ambienteFiltro && p.tipo_ambiente !== ambienteFiltro) return false;
      if (proyectoFiltro && p.proyecto?.trim().toLowerCase() !== proyectoFiltro.trim().toLowerCase()) return false;
      if (fechaInicio || fechaFin) {
        if (!p.fecha_registro_srt) return false;
        const f = p.fecha_registro_srt.slice(0, 10);
        if (fechaInicio && f < fechaInicio) return false;
        if (fechaFin && f > fechaFin) return false;
      }
      return true;
    });
  }, [pases, estadoFiltro, ambienteFiltro, proyectoFiltro, fechaInicio, fechaFin]);

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
    setAmbienteFiltro('');
    setProyectoFiltro('');
    setFechaInicio('');
    setFechaFin('');
  };

  const formatearFechaStr = (f?: string | null) => {
    if (!f) return '';
    try {
      const clean = f.split('T')[0];
      const [y, m, d] = clean.split('-');
      if (y && m && d) return `${d}/${m}/${y}`;
      return f;
    } catch {
      return f || '';
    }
  };

  const formatearFechaHoraStr = (f?: string | null) => {
    if (!f) return '';
    try {
      const d = new Date(f);
      if (isNaN(d.getTime())) return f;
      const day = String(d.getDate()).padStart(2, '0');
      const mon = String(d.getMonth() + 1).padStart(2, '0');
      const yr = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${mon}/${yr} ${hh}:${mm}`;
    } catch {
      return f || '';
    }
  };

  const handleExportar = () => {
    if (pasesFiltrados.length === 0) {
      notifyError('No existen registros de pases que coincidan con los filtros seleccionados.');
      return;
    }

    try {
      setExportando(true);

      const filas = pasesFiltrados.map(p => ({
        'TIPO_AMBIENTE': p.tipo_ambiente,
        'PROYECTO': p.proyecto || '',
        'APP': p.app || '',
        'Fecha_Registro_srt': formatearFechaStr(p.fecha_registro_srt),
        'Fecha_Solicitado_UAT': formatearFechaStr(p.fecha_solicitado_uat),
        'Fecha_Desplegado_uat': formatearFechaStr(p.fecha_desplegado_uat),
        'ESTADO SRT': p.estado_srt,
        'CODIGO_SRT': p.codigo_srt || '',
        'TITULO': p.titulo || '',
        'Conformes_PRD': p.conformes_prd || '',
        'QA': p.qa || '',
        'Fecha Certificacion': formatearFechaStr(p.fecha_certificacion),
        'Fecha \nRegISTRO_OC': formatearFechaStr(p.fecha_registro_oc),
        'Fecha_Hora_Pase_PRD': formatearFechaHoraStr(p.fecha_hora_pase_prd),
        'OC': p.oc || '',
        'STADO OC': p.stado_oc || '',
        'Operador Pase': p.operador_pase || '',
        'DEV': p.dev || '',
        'Sustento_VALOR_NEGOCIO': p.sustento_valor_negocio || '',
        'usuario final APROBACION': p.usuario_final_aprobacion || '',
        'Q-SP- PRD': p.q_sp_prd || '',
        'RESPONSABLE-OWNER-PROYECTO': p.responsable_owner_proyecto || '',
        'MOTIVO_ESTADO': p.motivo_estado || ''
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(filas);

      // Autoancho de columnas
      const colWidths = Object.keys(filas[0] || {}).map(k => ({
        wch: Math.max(k.length, 14)
      }));
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'PASES2026');

      const fechaDescarga = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `PASES_IBK_${fechaDescarga}.xlsx`);

      exito(`Se han exportado ${pasesFiltrados.length} pases correctamente a Excel.`);
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
      onClick={onCerrar}
    >
      <div
        style={{
          backgroundColor: 'var(--color-superficie)',
          border: '1px solid var(--color-borde)',
          borderRadius: 'var(--radio-lg)',
          width: '100%',
          maxWidth: '560px',
          boxShadow: 'var(--sombra-xl)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-borde)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-superficie-hover)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radio-md)',
                background: 'rgba(16, 124, 65, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#107C41',
              }}
            >
              <OfficeExcelIcon size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--color-texto-principal)' }}>
                Exportar Catálogo de Pases a Excel
              </h3>
              <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--color-texto-secundario)' }}>
                Filtre y genere el reporte oficial con formato PASES2026 (.xlsx)
              </p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            style={{
              padding: '6px',
              borderRadius: 'var(--radio-sm)',
              color: 'var(--color-texto-terciario)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filtro por Estado */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
              Estado del Pase (SRT)
            </label>
            <select
              className="form-select"
              value={estadoFiltro}
              onChange={e => setEstadoFiltro(e.target.value)}
              style={{ width: '100%' }}
            >
              {ESTADOS_PASE.map(est => (
                <option key={est.id} value={est.id}>
                  {est.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Tipo de Ambiente */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
              Tipo de Ambiente
            </label>
            <select
              className="form-select"
              value={ambienteFiltro}
              onChange={e => setAmbienteFiltro(e.target.value)}
              style={{ width: '100%' }}
            >
              {AMBIENTES.map(amb => (
                <option key={amb.id} value={amb.id}>
                  {amb.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Proyecto */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
              Proyecto
            </label>
            <select
              className="form-select"
              value={proyectoFiltro}
              onChange={e => setProyectoFiltro(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">Todos los proyectos ({proyectosDisponibles.length})</option>
              {proyectosDisponibles.map(proy => (
                <option key={proy} value={proy}>
                  {proy}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Rango de Fecha Registro SRT */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Fecha Registro SRT (Rango)
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => aplicarAtajoFecha('hoy')}
                  style={{
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                    borderRadius: 'var(--radio-sm)',
                    background: 'var(--color-superficie-hover)',
                    border: '1px solid var(--color-borde)',
                    cursor: 'pointer',
                  }}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => aplicarAtajoFecha('ultimos7')}
                  style={{
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                    borderRadius: 'var(--radio-sm)',
                    background: 'var(--color-superficie-hover)',
                    border: '1px solid var(--color-borde)',
                    cursor: 'pointer',
                  }}
                >
                  7 días
                </button>
                <button
                  type="button"
                  onClick={() => aplicarAtajoFecha('esteMes')}
                  style={{
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                    borderRadius: 'var(--radio-sm)',
                    background: 'var(--color-superficie-hover)',
                    border: '1px solid var(--color-borde)',
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
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                      borderRadius: 'var(--radio-sm)',
                      background: 'transparent',
                      color: 'var(--color-error)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Borrar
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-texto-terciario)', display: 'block', marginBottom: '2px' }}>
                  Desde:
                </span>
                <input
                  type="date"
                  className="form-input"
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-texto-terciario)', display: 'block', marginBottom: '2px' }}>
                  Hasta:
                </span>
                <input
                  type="date"
                  className="form-input"
                  value={fechaFin}
                  onChange={e => setFechaFin(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>
            </div>
          </div>

          {/* Resumen del reporte a exportar */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radio-md)',
              backgroundColor: pasesFiltrados.length > 0 ? 'rgba(16, 124, 65, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${pasesFiltrados.length > 0 ? 'rgba(16, 124, 65, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color={pasesFiltrados.length > 0 ? '#107C41' : '#EF4444'} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-texto-principal)' }}>
                {pasesFiltrados.length} {pasesFiltrados.length === 1 ? 'pase seleccionado' : 'pases seleccionados'}
              </span>
            </div>
            {(estadoFiltro || ambienteFiltro || proyectoFiltro || fechaInicio || fechaFin) && (
              <button
                type="button"
                onClick={reiniciarFiltros}
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-primario)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 600,
                }}
              >
                <RotateCcw size={12} />
                Reiniciar
              </button>
            )}
          </div>
        </div>

        {/* Pie de modal */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--color-borde)',
            background: 'var(--color-superficie-hover)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button type="button" className="btn btn-secundario" onClick={onCerrar}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primario"
            onClick={handleExportar}
            disabled={exportando || pasesFiltrados.length === 0}
            style={{
              backgroundColor: '#107C41',
              borderColor: '#107C41',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <OfficeExcelIcon size={18} />
            <span>{exportando ? 'Generando...' : 'Descargar Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
