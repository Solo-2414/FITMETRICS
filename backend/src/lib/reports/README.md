# Report builders (PDF / Excel / CSV)

One `spec` object produces all three formats, so the layout stays consistent.

```js
import { buildReportPdf, buildReportXlsx, buildReportCsv, formatPeriod, reportFileName } from '../lib/reports/index.js';

const spec = {
  gymName: "Analyn's Fitness Gym",          // from gym_settings.gym_name
  title: 'Daily Cash & GCash Collection Log',
  period: formatPeriod('2026-10-01', '2026-10-31'), // 'YYYY-MM-DD' in Manila time -> "Oct 1 – Oct 31, 2026"
  generatedBy: 'Daniel Reyes',              // the admin's NAME, not an id or email
  generatedAt: new Date(),
  summary: [{ label: 'Total collected', value: 18420, type: 'money' }],   // optional, max 4 cards in the PDF
  columns: [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'method', label: 'Method' },                                    // type defaults to 'text'
    { key: 'paid', label: 'Paid', type: 'money' },
  ],
  rows: [{ date: '2026-10-15', method: 'Cash', paid: 70 }],
  totals: { label: 'Total', values: { paid: 70 } },                       // optional
  // orientation: 'portrait' | 'landscape'  (default: landscape when more than 6 columns)
};

const pdf  = await buildReportPdf(spec);   // Buffer, A4, header + footer with "Page X of Y"
const xlsx = await buildReportXlsx(spec);  // Buffer, real dates/numbers, frozen header, filter, A4 print setup
const csv  = buildReportCsv(spec);         // Buffer (UTF-8 with BOM)
```

Column types: `text` (default), `int`, `money` (PHP), `number` (1 decimal), `percent` (give a FRACTION: 0.25 = 25%),
`date`, `time`, `datetime`.

Rules
- Pass raw Date objects, ISO timestamps or 'YYYY-MM-DD' strings for date/time columns. The builders convert to Asia/Manila.
  Never pre-format dates and never print UTC ("...Z") strings in a report.
- Pass numbers as numbers (never "₱1,200" strings).
- Text starting with `= + - @` is made safe automatically in CSV.
- Fonts live in `./fonts` (Inter, SIL OFL). They are needed so the peso sign and accented names print correctly. Commit them.
- Preview all sample layouts: `npm run preview:reports` (writes to `backend/tmp/report-previews/`, which should be git-ignored).
