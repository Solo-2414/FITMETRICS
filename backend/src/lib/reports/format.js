// Shared formatting for PDF / Excel / CSV reports. Everything is shown in Asia/Manila time.
export const TZ = 'Asia/Manila';
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8, no daylight saving

const pesoFmt = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const dateFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: 'short', day: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true });
const dateTimeFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
});
const monthDayFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric' });

export const NUMERIC_TYPES = ['money', 'int', 'number', 'percent'];
export const isNumericType = (t) => NUMERIC_TYPES.includes(t);

/** Accepts a Date, an ISO timestamp, or a plain 'YYYY-MM-DD' (treated as a Manila calendar day). */
export function toDate(v) {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00+08:00`);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** A Date whose UTC clock shows Manila wall-clock time, so Excel displays the right time. */
export const toManilaWallClock = (d) => new Date(d.getTime() + MANILA_OFFSET_MS);

export const formatPeso = (n) => (n === null || n === undefined || n === '' ? '—' : pesoFmt.format(Number(n)));
export const formatInt = (n) => (n === null || n === undefined || n === '' ? '—' : Number(n).toLocaleString('en-US'));
export const formatNumber = (n, digits = 1) =>
  n === null || n === undefined || n === '' ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const formatPercent = (n, digits = 1) =>
  n === null || n === undefined || n === '' ? '—' : `${(Number(n) * 100).toFixed(digits)}%`; // n is a fraction (0.25 = 25%)
export const formatDate = (v) => { const d = toDate(v); return d ? dateFmt.format(d) : '—'; };
export const formatTime = (v) => { const d = toDate(v); return d ? timeFmt.format(d) : '—'; };
export const formatDateTime = (v) => { const d = toDate(v); return d ? dateTimeFmt.format(d) : '—'; };

/** "Oct 1 – Oct 31, 2026" (or a single day). Inputs: 'YYYY-MM-DD'. */
export function formatPeriod(start, end) {
  const s = toDate(start), e = toDate(end);
  if (!s || !e) return '';
  if (formatDate(s) === formatDate(e)) return formatDate(s);
  const sameYear = dateFmt.format(s).slice(-4) === dateFmt.format(e).slice(-4);
  return sameYear ? `${monthDayFmt.format(s)} – ${formatDate(e)}` : `${formatDate(s)} – ${formatDate(e)}`;
}

export function formatValue(type, v) {
  switch (type) {
    case 'money': return formatPeso(v);
    case 'int': return formatInt(v);
    case 'number': return formatNumber(v);
    case 'percent': return formatPercent(v);
    case 'date': return formatDate(v);
    case 'time': return formatTime(v);
    case 'datetime': return formatDateTime(v);
    default: return v === null || v === undefined || v === '' ? '—' : String(v);
  }
}

/** Friendly file name: fitmetrics-sales-summary-2026-10.pdf */
export const reportFileName = (slug, suffix, ext) =>
  `fitmetrics-${slug}${suffix ? `-${suffix}` : ''}.${ext}`.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
