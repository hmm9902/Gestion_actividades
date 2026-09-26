import React, { useState, useMemo } from 'react';
import { X, Filter, CheckCircle2, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Ticket } from '../../types';
import { OfficeExcelIcon } from './OfficeExcelIcon';
import { useNotificacion } from '../../context/NotificacionContext';
import { formatearFecha, formatearFechaHora } from '../../lib/dateUtils';

interface ModalExportarTicketsProps {
  tickets: Ticket[];
  onCerrar: () => void;
}

const TIPOS_TICKET: { id: string; label: string }[] = [
  { id: '', label: 'Todos los tipos' },
  { id: 'Incident', label: 'Incident' },
  { id: 'Request', label: 'Request' },
  { id: 'OC', label: 'OC' },
];

const ESTADOS_TICKET: { id: string; label: string }[] = [
  { id: '', label: 'Todos los estados' },
  { id: 'ABIERTO', label: 'ABIERTO' },
  { id: 'ASIGNADO', label: 'ASIGNADO' },
  { id: 'EN_PROCESO', label: 'EN_PROCESO' },
  { id: 'DEVUELTO', label: 'DEVUELTO' },
  { id: 'SOLUCIONADO', label: 'SOLUCIONADO' },
  { id: 'ANULADO', label: 'ANULADO' },
  { id: 'RECHAZADO', label: 'RECHAZADO' },
];

const AMBIENTES: { id: string; label: string }[] = [
  { id: '', label: 'Todos los ambientes' },
  { id: 'UAT', label: 'UAT' },
  { id: 'PRD', label: 'PRD' },
];

export const ModalExportarTickets: React.FC<ModalExportarTicketsProps> = ({
  tickets,
  onCerrar,
}) => {
  const { exito, error: notifyError } = useNotificacion();

  // Estados de filtros para exportación
  const [tipoFiltro, setTipoFiltro] = useState<string>('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('');
  const [ambienteFiltro, setAmbienteFiltro] = useState<string>('');
  const [proyectoFiltro, setProyectoFiltro] = useState<string>('');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [exportando, setExportando] = useState<boolean>(false);

  // Proyectos disponibles en la lista de tickets
  const proyectosDisponibles = useMemo(() => {
    const s = new Set<string>();
    tickets.forEach(t => {
      if (t.proyecto?.trim()) s.add(t.proyecto.trim());
    });
    return Array.from(s).sort();
  }, [tickets]);

  // Tickets filtrados para exportación
  const ticketsFiltrados = useMemo(() => {
    return tickets.filter(t => {
      if (tipoFiltro && t.tipo !== tipoFiltro) return false;
      if (estadoFiltro && t.estado !== estadoFiltro) return false;
      if (ambienteFiltro && t.ambiente !== ambienteFiltro) return false;
      if (proyectoFiltro && t.proyecto?.trim().toLowerCase() !== proyectoFiltro.trim().toLowerCase()) return false;
      if (fechaInicio || fechaFin) {
        if (!t.fecha_registro) return false;
        const f = t.fecha_registro.slice(0, 10);
        if (fechaInicio && f < fechaInicio) return false;
        if (fechaFin && f > fechaFin) return false;
      }
      return true;
    });
  }, [tickets, tipoFiltro, estadoFiltro, ambienteFiltro, proyectoFiltro, fechaInicio, fechaFin]);

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
    setTipoFiltro('');
    setEstadoFiltro('');
    setAmbienteFiltro('');
    setProyectoFiltro('');
    setFechaInicio('');
    setFechaFin('');
  };

  const handleExportar = () => {
    if (ticketsFiltrados.length === 0) {
      notifyError('No existen registros de tickets que coincidan con los filtros seleccionados.');
      return;
    }

    try {
      setExportando(true);

      const filas = ticketsFiltrados.map(t => ({
        'Tipo': t.tipo || '',
        'fecha_REGISTRO': t.fecha_registro ? formatearFecha(t.fecha_registro) : '',
        'APLICATIVO': t.aplicativo || '',
        'PROYECTO': t.proyecto || '',
        'AMBIENTE': t.ambiente || '',
        'Ticket': t.ticket || '',
        'Descripcion': t.descripcion || '',
        'FECHA_ATENCION': t.fecha_atencion ? formatearFecha(t.fecha_atencion) : '',
        'IBM \nASIGNADO': t.ibm_asignado || '',
        'Cel\nContacto': t.cel_contacto || '',
        'ESTADO ': t.estado || '',
        'Comentario': t.comentario || '',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(filas);

      // Autoancho de columnas
      const colWidths = Object.keys(filas[0] || {}).map(k => ({
        wch: Math.max(k.length, 14)
      }));
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Tickets');

      const fechaDescarga = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `GESTION_TICKETS_${fechaDescarga}.xlsx`);

      exito(`Se han exportado ${ticketsFiltrados.length} tickets correctamente a Excel.`);
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
        {/* Cabecera modal */}
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
            <OfficeExcelIcon size={24} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-texto-principal)' }}>
                Exportar Tickets a Excel
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-texto-terciario)' }}>
                Filtre los tickets a incluir en el archivo descargable
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-texto-terciario)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 'var(--radio-md)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo modal */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Resumen de coincidencias */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radio-md)',
              backgroundColor: ticketsFiltrados.length > 0 ? 'var(--color-primario-suave)' : '#FEE2E2',
              color: ticketsFiltrados.length > 0 ? 'var(--color-primario)' : '#991B1B',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} />
              <span>
                <strong>{ticketsFiltrados.length}</strong> de <strong>{tickets.length}</strong> tickets seleccionados
              </span>
            </div>
            {(tipoFiltro || estadoFiltro || ambienteFiltro || proyectoFiltro || fechaInicio || fechaFin) && (
              <button
                type="button"
                onClick={reiniciarFiltros}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <RotateCcw size={12} /> Limpiar filtros
              </button>
            )}
          </div>

          {/* Filtro: Tipo */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-texto-secundario)' }}>
              Tipo de Ticket
            </label>
            <select
              className="form-select"
              value={tipoFiltro}
              onChange={e => setTipoFiltro(e.target.value)}
              style={{ width: '100%' }}
            >
              {TIPOS_TICKET.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Filtro: Estado */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-texto-secundario)' }}>
              Estado del Ticket
            </label>
            <select
              className="form-select"
              value={estadoFiltro}
              onChange={e => setEstadoFiltro(e.target.value)}
              style={{ width: '100%' }}
            >
              {ESTADOS_TICKET.map(e => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
          </div>

          {/* Filtros: Ambiente y Proyecto */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-texto-secundario)' }}>
                Ambiente
              </label>
              <select
                className="form-select"
                value={ambienteFiltro}
                onChange={e => setAmbienteFiltro(e.target.value)}
                style={{ width: '100%' }}
              >
                {AMBIENTES.map(a => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-texto-secundario)' }}>
                Proyecto
              </label>
              <select
                className="form-select"
                value={proyectoFiltro}
                onChange={e => setProyectoFiltro(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">Todos los proyectos</option>
                {proyectosDisponibles.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Rango de Fechas de Registro */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-texto-secundario)' }}>
                Fecha de Registro (Rango)
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => aplicarAtajoFecha('hoy')}
                  style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: 'var(--radio-sm)', background: 'var(--color-superficie-hover)', border: '1px solid var(--color-borde)', cursor: 'pointer' }}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => aplicarAtajoFecha('ultimos7')}
                  style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: 'var(--radio-sm)', background: 'var(--color-superficie-hover)', border: '1px solid var(--color-borde)', cursor: 'pointer' }}
                >
                  7 días
                </button>
                <button
                  type="button"
                  onClick={() => aplicarAtajoFecha('esteMes')}
                  style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: 'var(--radio-sm)', background: 'var(--color-superficie-hover)', border: '1px solid var(--color-borde)', cursor: 'pointer' }}
                >
                  Este mes
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <input
                  type="date"
                  className="form-input"
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>
              <div>
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
        </div>

        {/* Pie modal */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--color-borde)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            backgroundColor: 'var(--color-superficie-hover)',
          }}
        >
          <button type="button" className="btn btn-secundario" onClick={onCerrar}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primario"
            onClick={handleExportar}
            disabled={exportando || ticketsFiltrados.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <OfficeExcelIcon size={18} />
            {exportando ? 'Generando Excel...' : `Exportar (${ticketsFiltrados.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};
