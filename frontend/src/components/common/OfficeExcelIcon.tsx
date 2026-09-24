import React from 'react';

interface OfficeExcelIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Icono representativo de Microsoft Office Excel
 * Con los colores y diseño oficial (verde corporativo #107C41, cuadrícula y X distintiva).
 */
export const OfficeExcelIcon: React.FC<OfficeExcelIconProps> = ({
  size = 20,
  className = '',
  style = {},
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="Microsoft Office Excel"
    >
      {/* Base de la hoja / Cuadrícula posterior */}
      <rect x="7" y="3" width="21" height="26" rx="2.5" fill="#107C41" />
      {/* Sombra y pliegue superior */}
      <rect x="7" y="3" width="21" height="13" rx="2" fill="#185C37" fillOpacity="0.25" />
      {/* Cuadrícula de celdas */}
      <path
        d="M17 8H25M17 12H25M17 16H25M17 20H25M17 24H25M21 8V24"
        stroke="#E1DFDD"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />
      {/* Bloque frontal elevado con la 'X' de Excel */}
      <rect
        x="3"
        y="7"
        width="14"
        height="18"
        rx="2"
        fill="#107C41"
        stroke="#21A366"
        strokeWidth="0.8"
      />
      {/* Letra X icónica de Excel */}
      <path
        d="M6.2 11.5L9.6 16L6 20.5H8.2L10.3 17.5L12.4 20.5H14.5L11 16L14.3 11.5H12.2L10.3 14.4L8.4 11.5H6.2Z"
        fill="#FFFFFF"
      />
    </svg>
  );
};
