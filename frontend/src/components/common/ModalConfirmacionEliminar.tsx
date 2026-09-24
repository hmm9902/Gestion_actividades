import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

export interface ModalConfirmacionEliminarProps {
  abierto: boolean;
  titulo?: string;
  mensaje: string;
  detalle?: string | React.ReactNode;
  textoConfirmar?: string;
  textoCancelar?: string;
  cargando?: boolean;
  onConfirmar: () => void;
  onCerrar: () => void;
}

export const ModalConfirmacionEliminar: React.FC<ModalConfirmacionEliminarProps> = ({
  abierto,
  titulo = 'Confirmar Eliminación',
  mensaje,
  detalle,
  textoConfirmar = 'Eliminar Definitivamente',
  textoCancelar = 'Cancelar',
  cargando = false,
  onConfirmar,
  onCerrar,
}) => {
  if (!abierto) return null;

  return (
    <div
      className="modal-overlay"
      onClick={cargando ? undefined : onCerrar}
      style={{
        zIndex: 1100,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        padding: '16px',
      }}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: 'var(--color-superficie)',
          border: '1px solid var(--color-borde)',
          borderRadius: 'var(--radio-lg)',
          boxShadow: 'var(--sombra-modal)',
          overflow: 'hidden',
          animation: 'fadeIn 0.18s ease-out',
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
            backgroundColor: 'var(--color-superficie)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Trash2 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-texto-principal)', margin: 0 }}>
                {titulo}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-texto-terciario)' }}>
                Acción destructiva irreversible
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn-cerrar-modal"
            onClick={onCerrar}
            disabled={cargando}
            title="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-texto-principal)', lineHeight: '1.5', margin: 0 }}>
            {mensaje}
          </p>

          {detalle && (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--color-fondo)',
                border: '1px solid var(--color-borde)',
                borderRadius: 'var(--radio-md)',
                fontSize: '0.825rem',
                color: 'var(--color-texto-secundario)',
                borderLeft: '4px solid #EF4444',
              }}
            >
              {detalle}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderRadius: 'var(--radio-md)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: '#D97706',
              fontSize: '0.775rem',
              fontWeight: 500,
            }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
            <span>Esta operación no se puede deshacer. Los datos serán removidos permanentemente.</span>
          </div>
        </div>

        {/* Pie / Acciones */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: 'var(--color-superficie-hover)',
            borderTop: '1px solid var(--color-borde)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            className="btn btn-secundario"
            onClick={onCerrar}
            disabled={cargando}
            style={{ minWidth: '95px' }}
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            className="btn btn-peligro"
            onClick={onConfirmar}
            disabled={cargando}
            style={{
              minWidth: '150px',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.35)',
            }}
          >
            <Trash2 size={16} />
            {cargando ? 'Eliminando...' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
};
