---
description: "Switch the Reports exports to the new designed PDF (A4, header, footer) and real Excel (.xlsx) builders in backend/src/lib/reports."
agent: 'agent'
---
# Task 4b: Redesign the report exports (PDF + Excel)

The module `backend/src/lib/reports/` (index.js, format.js, pdfReport.js, xlsxReport.js, csvReport.js, fonts/, README.md)
is already added and tested. Read its README.md first. Do NOT rewrite it. Only fix a real bug in it, and tell me if you do.

## Problems with the current exports
- PDF: the peso sign prints as "±", a raw UTC timestamp ("2026-10-25T08:13:57.964Z") appears in the header, and the table is plain
  text rows separated by `|` characters. There is no real header/footer or page numbers.
- Excel: the export is a CSV, so dates show as `########` and columns are too narrow. There are no column widths or formats.

## Do
1. Find the current export code (route + helpers for PDF/CSV generation in `backend/src`) and the Download buttons in
   `frontend/src/pages/admin/AdminReports.jsx`. Check which PDF library is used. Run `npm install pdfkit exceljs` in /backend.
   If a different PDF library was used only for reports, remove it from package.json.
2. Replace ALL PDF and CSV generation in the export route with `buildReportPdf`, `buildReportXlsx`, `buildReportCsv`.
   Build one `spec` per report type (title, period, generatedBy, summary cards, columns, rows, totals):
   - sales: columns Plan(text), Sold(int), Gross(money), Discounts(money), Net(money), Share(percent, fraction); totals row;
     summary: Net revenue, Memberships sold, Discounts given.
   - collections: Date(date), Method(text; show friendly names: Cash, GCash, Maya, Bank transfer), Transactions(int), Paid(money),
     Voided(money), Refunded(money); totals row; summary: Total collected, Cash, Online, Transactions.
   - attendance: Date(date), Member(text), Plan(text), Check-in(time), Check-out(time), Method(text, friendly), Hours(number);
     summary: Total visits, Average per day.
   - members: Member(text), Plan(text), Expired on(date), Phone(text), Email(text).
   Use `gymName` from `gym_settings.gym_name`, `period` from `formatPeriod(start, end)` ('YYYY-MM-DD' Manila dates), and
   `generatedBy` = the logged-in admin's full name (fall back to "FITMETRICS" if missing; never an id or email).
   Pass raw Date/ISO values and numbers; never pre-format them and never print UTC strings.
3. Formats: `format=pdf` -> application/pdf; `format=xlsx` -> application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;
   keep `format=csv` working in the API (text/csv; charset=utf-8). Set `Content-Disposition: attachment` with
   `reportFileName(...)` (for example fitmetrics-collections-2026-10.pdf). Keep the existing report_downloads / audit_log writes,
   and record `xlsx` as a format (update the CHECK constraint with a new migration only if it blocks 'xlsx').
4. Frontend: the "Excel / CSV" button must request `format=xlsx` and be labelled "Download Excel (.xlsx)". Keep the PDF button.
   Keep using the blob-download helper in `frontend/src/lib/api.js`; the downloaded file name must come from the server header.
5. Add `"preview:reports": "node scripts/preview-reports.mjs"` to backend/package.json (the script is already in backend/scripts)
   and add `backend/tmp/` to .gitignore. Run it once and report where the files were written.

## Don't
- Don't change the report data logic or the numbers; only the file generation.
- Don't add other PDF/Excel libraries. Don't touch unrelated files.
- Don't print or log any secret.

## Done when
- The PDF is A4 with a header on every page, a footer with "Page X of Y", a styled table, the peso sign printing correctly,
  and no UTC timestamp anywhere.
- The .xlsx opens in Excel with real dates (no ########), money formatted as ₱, a frozen header row and filters.
- Frontend build + lint pass; backend files pass `node --check`.
- Run /verify-before-done and report what you ran versus only read.
