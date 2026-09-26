/**
 * Utilidades para formateo de fechas según estándar del proyecto:
 * - Fechas simples: DD/MM/YYYY
 * - Fechas con hora: DD/MM/YYYY HH:MM
 */

export function formatearFecha(fechaStr?: string | null): string {
  if (!fechaStr) return '-';
  const clean = String(fechaStr).trim();
  if (!clean) return '-';

  // Si ya viene como DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    return clean;
  }

  // Si viene en formato ISO o YYYY-MM-DD...
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }

  // Fallback con Date object
  try {
    const d = new Date(clean);
    if (isNaN(d.getTime())) return clean;
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    return `${dia}/${mes}/${anio}`;
  } catch {
    return clean;
  }
}

export function formatearFechaHora(fechaStr?: string | null): string {
  if (!fechaStr) return '-';
  const clean = String(fechaStr).trim();
  if (!clean) return '-';

  // Si viene con hora ISO YYYY-MM-DDTHH:mm o YYYY-MM-DD HH:mm
  const matchTime = clean.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (matchTime) {
    const [, y, m, d, hh, mm] = matchTime;
    return `${d}/${m}/${y} ${hh}:${mm}`;
  }

  // Si viene solo fecha YYYY-MM-DD
  const matchDate = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchDate) {
    const [, y, m, d] = matchDate;
    return `${d}/${m}/${y}`;
  }

  // Si ya viene como DD/MM/YYYY HH:MM
  if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(clean)) {
    return clean;
  }

  // Fallback
  try {
    const d = new Date(clean);
    if (isNaN(d.getTime())) return clean;
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${anio} ${hh}:${mm}`;
  } catch {
    return clean;
  }
}

/**
 * Convierte un string de fecha (ISO o Date) al valor adecuado para input type="date" (YYYY-MM-DD)
 */
export function fechaParaInputDate(fechaStr?: string | null): string {
  if (!fechaStr) return '';
  const clean = String(fechaStr).trim();
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  try {
    const d = new Date(clean);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

/**
 * Convierte un string de fecha al valor adecuado para input type="datetime-local" (YYYY-MM-DDTHH:mm)
 */
export function fechaParaInputDateTime(fechaStr?: string | null): string {
  if (!fechaStr) return '';
  const clean = String(fechaStr).trim();
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`;
  const matchDate = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchDate) return `${matchDate[1]}-${matchDate[2]}-${matchDate[3]}T00:00`;
  try {
    const d = new Date(clean);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}
