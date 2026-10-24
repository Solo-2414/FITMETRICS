---
description: "Make Admin Attendance Analysis fully real (Manila time, live KPIs, weekday and plan breakdowns, filterable check-in log)."
agent: 'agent'
---
# Task 3 of 6: Attendance Analysis

Files: `frontend/src/pages/admin/AdminAttendanceAnalysis.jsx` (+ .module.css), `backend/src/routes/attendance.js`
(`GET /attendance/analysis`), SQL views `attendance_daily_summary`, `attendance_peak_analysis`,
`membership_type_distribution`, tables `attendance`, `walk_in_visits`, `memberships`, `membership_plans`, `profiles`.

## Current state (verified in the code)
- The endpoint returns `totalCheckIns`, `activeInGym`, `hourly` (8 buckets, 6 AM to 8 PM), `records`, `peak`,
  `planAnalysis`, `daily`. The page only uses `totalCheckIns`, `activeInGym` and `hourly`.
- Static in the page: "+12% vs yesterday", "Target: 70", "Busiest Time of Day", "Most Active Day: Mon & Wed",
  "Peak Window 5:30 PM - 7:30 PM", the weekday bars, the plan breakdown, every row of the check-in table, the
  filter buttons and the select, and the chart highlight `value === 28`.
- `records` only has ids (no member name, plan or staff name). Walk-in rows use `walk_in_visit_id`.
- TIME BUG: `dayStart()` uses UTC and `getHours()` uses server time, so "today" and the hour buckets are wrong for
  Manila (UTC+8). The views use `check_in_at::date` / `extract(hour ...)` in UTC. Check-ins at 6:00-7:59 AM Manila
  count as yesterday. Hours before 6 AM and after 10 PM are silently dropped.
- IMPORTANT: `frontend/src/pages/clerk/ClerkAttendance.jsx` ALSO calls `/attendance/analysis` and uses
  `totalCheckIns`, `activeInGym` and `records[].{id, member_id, check_in_at, check_out_at, method}`.
  Keep those fields working (additive changes only), or update that page too and re-test it.

## Do
1. Create `backend/src/lib/time.js` if it does not exist: helpers for Manila day/week/month ranges
   (return UTC ISO start/end), `manilaDateString(date)`, `addDays`, and hour-of-day in Manila. Manila has no DST
   so a fixed +8h offset is fine. Use it in the attendance routes.
2. Migration (next number): recreate `attendance_daily_summary` and `attendance_peak_analysis` with
   `timezone('Asia/Manila', check_in_at)` for the date, weekday and hour. Keep column names, order and types
   identical (Reports reads `attendance_daily_summary.attendance_date`). Keep grants revoked from anon/authenticated.
   Add `daily_visit_target integer not null default 70` to `gym_settings` (the "Target: 70" card) and note that
   Settings can expose it later.
3. Extend `GET /attendance/analysis` (admin and clerk) with query params `range=today|7d|30d|custom`, `from`, `to`
   (YYYY-MM-DD, Manila), `plan` (plan id or `all`), `page`, `limit` (max 50). Respond with the existing fields plus:
   `kpis` { totalCheckIns, previousPeriodTotal, changePct (null if previous is 0), activeInGym, target,
   busiestHourLabel, busiestWindowLabel (best 2-hour window), mostActiveWeekdays (top 2) },
   `hourly` buckets for the whole day with an "Other hours" bucket so nothing is dropped,
   `weekday` [{ weekday, visits, pctOfMax }], `byPlan` [{ plan, visits, pct }], and a paginated `records` list
   with `member_name` (or walk-in guest name), `plan_name`, `recorded_by_name`, times, method, status and `total`.
   Aggregate in SQL (view/RPC or grouped queries). Do not load thousands of rows into JS to count them.
4. Frontend: bind every KPI, the chart (highlight the real peak bar), the weekday bars, the plan breakdown and the
   check-in table to the response. Make the Today / 7 days / 30 days buttons and the plan select work, add
   pagination to the table, and show loading, error and empty states. If the previous period is 0, show "no data"
   instead of a fake percentage. Remove every hard-coded number.

## Don't
- Don't change the layout or class names. Don't add chart libraries.
- Don't break ClerkAttendance.

## Done when
- A check-in at 06:30 Manila time counts for today; one at 23:30 appears in "Other hours".
- Switching ranges changes every number and the table; the numbers match a manual count from `attendance`.
- ClerkAttendance still shows its totals and list.
- Frontend build + lint pass; backend files pass `node --check`.
