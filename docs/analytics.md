# FITMETRICS analytics definitions

All dashboard numbers originate from SQL views. AI services may summarize or
explain these values, but must not invent or recalculate them.

## KPI definitions

- **Total Members:** profiles with role `member`.
- **Active Members:** member profiles with status `active`.
- **New Members:** member profiles created during the current calendar month.
- **Expiring Memberships:** active memberships ending from today through the next
  14 calendar days.
- **Monthly Revenue:** paid payment amounts created during the current calendar
  month. Voided, failed, expired, and refunded payments are excluded.
- **Average Visits per Member:** current-month attendance rows divided by the
  number of distinct members attending during the month.
- **Renewal Rate:** current-month active/renewed memberships divided by the sum
  of current-month active/renewed memberships and memberships that ended during
  the previous month.
- **Retention Rate:** distinct active members with at least one current-month
  visit divided by all active members.
- **Attendance Trend Score:** current-month visits compared with the previous
  month, converted to a 0–100 score by adding 50 percentage points and clamping.
- **Revenue Growth Score:** current-month revenue compared with the previous
  month, converted to a 0–100 score by adding 50 percentage points and clamping.
- **Active-Member Growth Score:** current-month new members divided by active
  members, expressed as a percentage and clamped to 0–100.
- **Gym Business Health Score:** 30% renewal rate, 25% retention rate, 20%
  attendance trend score, 15% revenue growth score, and 10% active-member
  growth score. The result is clamped to 0–100.

## Chart views

- `revenue_trend`: daily paid revenue and transaction count.
- `membership_growth_trend`: daily cumulative and new memberships for the last
  12 months.
- `attendance_peak_analysis`: visits by ISO weekday and hour.
- `membership_type_distribution`: memberships grouped by active plan.
- `retention_trend`: monthly started and retained memberships.

Forecasts in `prediction_snapshots` are estimates produced by explainable
backend methods. Each record includes a method version and confidence note.
