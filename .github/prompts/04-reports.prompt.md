---
description: "Make Admin Reports real: live KPIs, filters, CSV/PDF export, download audit, PayMongo-aware revenue."
agent: 'agent'
---
# Task 4 of 6: Reports

Files: `frontend/src/pages/admin/AdminReports.jsx` (+ .module.css), `backend/src/routes/admin.js`
(`GET/POST /admin/reports`), tables `reports`, `payments`, `memberships`, `membership_plans`, `attendance`,
`walk_in_visits`, `promos`, views `revenue_daily_summary`, `attendance_daily_summary`, `membership_type_distribution`.

## Current state (verified in the code)
- The page has one "Generate" button and a list loaded from `/admin/reports`. KPI card 1 sums saved reports.
  The other KPI cards (₱42,150 cash, ₱26,300 online, "GCash Express QR #0917", 1,420 attendance, "52 visits/day",
  "Peak 5:30-8:00 PM"), the four export cards (Monthly Sales Summary, Daily Cash & GCash Collection Log, Member
  Attendance Summary, Expired & Inactive Members List with fake counts), the "Last synchronized" badge and the
  "Recent Downloads & Audits" table are all static. Download PDF / Excel-CSV buttons have no handlers. The month,
  plan and shift selects are never sent.
- `payments` now has `gross_amount`, `discount`, `plan_id`, `promo_id`, `provider`, `provider_payment_id`,
  `paid_at`, `walk_in_visit_id`, and statuses paid/voided/pending/failed/expired/refunded. PayMongo online
  payments are written by `backend/src/routes/paymongo.js`. Read that file so the report logic matches it.
- No shift data exists. Define shift from the hour of `paid_at` / `check_in_at` in Manila:
  morning 06:00-13:59, evening 14:00-21:59 (matches the page options). Document this in the UI helper text.

## Do
1. Use `backend/src/lib/time.js` (Manila helpers; create it if missing) for every date boundary.
2. Migration (next number): table `report_downloads` (report_type, period_start, period_end, filters jsonb, format
   csv|pdf, generated_by, created_at) with RLS (admin only, backend-only access). Add a view or RPC for revenue
   by plan and by payment method if it keeps queries simple.
3. `GET /admin/reports/summary?start&end&plan&shift` (admin): returns
   - revenue: total net (paid only), previous-period total and % change, cash total + share + count, online
     (gcash/maya/bank_transfer) total + share + count, discounts given, voided/refunded totals;
   - PayMongo reconciliation from OUR table only: counts and amounts of paid / pending / failed / expired /
     refunded online payments, and any paid online payment missing `provider_payment_id`;
   - sales by plan: { plan, sold, amount } plus walk-in sessions;
   - attendance: total visits, average per day, peak 2-hour window;
   - members: expired in the last 7 days, expiring within 48 hours, inactive.
   Aggregate in SQL; only `status = 'paid'` counts as revenue.
4. Exports: `GET /admin/reports/export?type=sales|collections|attendance|members&format=csv|pdf&start&end&plan&shift`.
   CSV: UTF-8 BOM, proper quoting, numbers unformatted, cells starting with `= + - @` prefixed with `'`.
   PDF: use a small server-side library (pdfkit or pdfmake; add the dependency and tell me), simple tables, gym
   name + period + generated-by + generated-at header, peso formatting. Each export inserts a `report_downloads`
   row and an audit_log row. Types map to the four cards:
   sales = Monthly Sales Summary; collections = Daily Cash & GCash Collection Log (one row per day and method);
   attendance = Member Attendance Summary; members = Expired & Inactive Members List (name, plan, expiry, phone, email).
5. Keep `POST /admin/reports` but validate input, store only filters + summary (not raw rows) and return
   `generated_by_name`. `GET /admin/reports` returns the recent download log joined with names (for the
   "Recent Downloads & Audits" table).
6. Frontend: month select built from the last 12 months; plan select from `/membership-plans` plus "Walk-ins";
   shift select; "Generate" refreshes the KPIs. Bind all four KPI cards, the four export-card counts (e.g.
   "Monthly VIP Passes (n sold)"), and the downloads table to real data. Wire the PDF and CSV buttons with a
   blob-download helper in `frontend/src/lib/api.js` (api() does not handle blobs; it must still send the auth
   header). "Last synchronized" shows the real time of the last data load. Remove all fake values.

## Don't
- Don't call the PayMongo API or use its secret key here. Report only from our own tables.
- Don't count voided, refunded or pending payments as revenue.
- Don't change the layout or class names.

## Done when
- KPI numbers equal a manual SUM over `payments` for the same period, plan and shift filters.
- A daily/weekly/monthly period produces matching CSV and PDF files that open correctly in Excel/PDF readers.
- Every download appears in "Recent Downloads & Audits" with the right user and time.
- Frontend build + lint pass; backend files pass `node --check`.
