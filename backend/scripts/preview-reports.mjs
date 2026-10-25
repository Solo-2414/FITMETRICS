import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildReportPdf, buildReportXlsx, buildReportCsv, formatPeriod } from '../src/lib/reports/index.js';
const OUT = fileURLToPath(new URL('../tmp/report-previews/', import.meta.url)); // works on Windows too
mkdirSync(OUT, { recursive: true });
const base = { gymName: "Analyn's Fitness Gym", generatedBy: 'FITMETRICS Test Admin', generatedAt: new Date('2026-10-25T08:13:57.964Z') };
const period = formatPeriod('2026-10-01', '2026-10-31');

const names = ['Zhaider Mendoza', 'Michael Andre Tanza', 'John Dave Santos', 'José Ñoño dela Cruz-Villanueva Jr.', 'Elena Reyes', 'dsadasdas'];
const plans = ['Monthly Regular', 'Weekly Pass', 'Two Weeks', 'Monthly Student'];
const att = Array.from({ length: 70 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 9, 1 + (i % 25), 1 + (i % 12), (i * 7) % 60));
  return { date: d, member: names[i % names.length], plan: plans[i % plans.length], check_in: d, check_out: new Date(d.getTime() + 90 * 60000),
    method: ['front desk', 'qr', 'member self'][i % 3], duration_hours: 1.5 + (i % 3) * 0.25 };
});

const reports = {
  collections: { title: 'Daily Cash & GCash Collection Log', period,
    summary: [{ label: 'Total collected', value: 18420, type: 'money' }, { label: 'Cash', value: 11570, type: 'money' }, { label: 'GCash / online', value: 6850, type: 'money' }, { label: 'Transactions', value: 61, type: 'int' }],
    columns: [{ key: 'date', label: 'Date', type: 'date' }, { key: 'method', label: 'Method' }, { key: 'transactions', label: 'Transactions', type: 'int' },
      { key: 'paid', label: 'Paid', type: 'money' }, { key: 'voided', label: 'Voided', type: 'money' }, { key: 'refunded', label: 'Refunded', type: 'money' }],
    rows: Array.from({ length: 24 }, (_, i) => ({ date: `2026-10-${String(1 + Math.floor(i / 2)).padStart(2, '0')}`, method: i % 2 ? 'gcash' : 'cash',
      transactions: 2 + (i % 5), paid: 270 * (2 + (i % 5)), voided: i === 5 ? 270 : 0, refunded: i === 9 ? 540 : 0 })),
    totals: { label: 'Total', values: { transactions: 61, paid: 18420, voided: 270, refunded: 540 } } },
  sales: { title: 'Monthly Sales Summary', period,
    summary: [{ label: 'Net revenue', value: 18420, type: 'money' }, { label: 'Memberships sold', value: 61, type: 'int' }, { label: 'Discounts given', value: 1350, type: 'money' }],
    columns: [{ key: 'plan', label: 'Plan' }, { key: 'sold', label: 'Sold', type: 'int' }, { key: 'gross', label: 'Gross', type: 'money' }, { key: 'discount', label: 'Discounts', type: 'money' }, { key: 'net', label: 'Net', type: 'money' }, { key: 'share', label: 'Share', type: 'percent' }],
    rows: [{ plan: 'Monthly Regular', sold: 28, gross: 27720, discount: 540, net: 27180, share: 0.58 }, { plan: 'Weekly Pass', sold: 20, gross: 5400, discount: 0, net: 5400, share: 0.26 },
      { plan: 'Two Weeks', sold: 9, gross: 4860, discount: 270, net: 4590, share: 0.12 }, { plan: 'Session (walk-in)', sold: 4, gross: 360, discount: 0, net: 360, share: 0.04 }],
    totals: { label: 'Total', values: { sold: 61, gross: 38340, discount: 810, net: 37530, share: 1 } } },
  attendance: { title: 'Member Attendance Summary', period,
    summary: [{ label: 'Total visits', value: 70, type: 'int' }, { label: 'Average per day', value: 2.8, type: 'number' }],
    columns: [{ key: 'date', label: 'Date', type: 'date' }, { key: 'member', label: 'Member' }, { key: 'plan', label: 'Plan' }, { key: 'check_in', label: 'Check-in', type: 'time' },
      { key: 'check_out', label: 'Check-out', type: 'time' }, { key: 'method', label: 'Method' }, { key: 'duration_hours', label: 'Hours', type: 'number' }],
    rows: att },
  members: { title: 'Expired & Inactive Members', period: 'As of Oct 25, 2026',
    summary: [{ label: 'Expired (last 7 days)', value: 18, type: 'int' }, { label: 'Expiring in 48 hours', value: 14, type: 'int' }],
    columns: [{ key: 'name', label: 'Member' }, { key: 'plan', label: 'Plan' }, { key: 'expires', label: 'Expired on', type: 'date' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' }],
    rows: names.flatMap((n, i) => [0, 1, 2].map((k) => ({ name: n, plan: plans[(i + k) % 4], expires: `2026-10-${String(10 + i + k).padStart(2, '0')}`, phone: '0917 123 45' + (60 + i + k),
      email: `${n.split(' ')[0].toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}${k}.member.account@example-gym-email.com` }))) },
  empty: { title: 'Daily Cash & GCash Collection Log', period: 'Nov 1 – Nov 30, 2026', columns: [{ key: 'date', label: 'Date', type: 'date' }, { key: 'method', label: 'Method' }, { key: 'paid', label: 'Paid', type: 'money' }], rows: [] },
};
for (const [slug, r] of Object.entries(reports)) {
  const spec = { ...base, ...r };
  writeFileSync(`${OUT}${slug}.pdf`, await buildReportPdf(spec));
  writeFileSync(`${OUT}${slug}.xlsx`, await buildReportXlsx(spec));
  writeFileSync(`${OUT}${slug}.csv`, buildReportCsv(spec));
}
console.log('Sample reports written to', OUT);
