import { toDate, toManilaWallClock } from './format.js';

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => { const m = toManilaWallClock(d); return `${m.getUTCFullYear()}-${pad(m.getUTCMonth() + 1)}-${pad(m.getUTCDate())}`; };
const isoTime = (d) => { const m = toManilaWallClock(d); return `${pad(m.getUTCHours())}:${pad(m.getUTCMinutes())}`; };

function cell(col, v) {
  if (v === null || v === undefined || v === '') return '';
  let s;
  if (col.type === 'date') { const d = toDate(v); s = d ? isoDate(d) : ''; }
  else if (col.type === 'datetime') { const d = toDate(v); s = d ? `${isoDate(d)} ${isoTime(d)}` : ''; }
  else if (col.type === 'time') { const d = toDate(v); s = d ? isoTime(d) : ''; }
  else if (col.type === 'money') s = Number(v).toFixed(2);
  else s = String(v);
  // Spreadsheet formula injection: a text cell must not start with = + - @
  if (!['money', 'int', 'number', 'percent'].includes(col.type) && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Plain CSV (UTF-8 with BOM so Excel reads accents and the peso sign). Local dates, no UTC timestamps. */
export function buildReportCsv(spec) {
  const { columns, rows = [], totals = null } = spec;
  const lines = [columns.map((c) => cell({ type: 'text' }, c.label)).join(',')];
  rows.forEach((row) => lines.push(columns.map((c) => cell(c, row[c.key])).join(',')));
  if (totals) {
    lines.push(columns.map((c, i) => (totals.values?.[c.key] !== undefined ? cell(c, totals.values[c.key]) : i === 0 ? (totals.label || 'Total') : '')).join(','));
  }
  return Buffer.from(`\uFEFF${lines.join('\r\n')}\r\n`, 'utf8');
}
