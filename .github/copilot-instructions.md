# FITMETRICS project rules (always apply)

## What this is
Gym management + member-retention system for ONE gym (Analyn's Fitness Gym, Philippines).
- Frontend: React + Vite in /frontend (CSS modules + Bootstrap classes, chart.js).
- Backend: Express (ESM) in /backend. Routes in backend/src/routes, services in backend/src/services,
  jobs in backend/src/jobs, middleware in backend/src/middleware.
- Database: Supabase Postgres + Supabase Auth. SQL migrations in /supabase/migrations.
- Roles: admin (owner), clerk (front desk), member. There is NO public sign-up.

## Security (never break these)
- The Supabase service-role key, PayMongo keys, SMTP password and any AI keys live ONLY in
  backend/.env. Never in /frontend, never in logs, never in API responses, never in chat.
- Never open, print, edit or commit any .env file.
- Every route uses requireAuth + requireRole. A router-level guard MUST have a path prefix:
  `router.use('/admin', requireAuth, requireRole('admin'))`. A path-less `router.use(guard)` on a
  router mounted at /api blocks unrelated routes. Never write one.
- Every table has RLS. Never grant anything to the anon role. Views are read only by the backend.
- Validate every request body (type, range, length, enum). Never trust role/ids from the client.
- Admin or staff actions that change data write a row to audit_log (who, action, entity, details).
  Never put passwords, tokens or secrets in audit details.
- Escape any user-provided text that is rendered into HTML or email.

## Time and money
- Store timestamps in UTC (timestamptz). The gym is in Asia/Manila (UTC+8, no daylight saving).
  Compute "today", day/week/month boundaries and hour-of-day in Asia/Manila, never in server or UTC time.
  Use backend/src/lib/time.js for this (create it if it does not exist yet).
- Money is numeric(12,2) in PHP pesos. Format with the peso sign in the UI.

## Frontend rules
- Edit pages IN PLACE. Keep the existing JSX markup and CSS-module class names. Do not rewrite a whole
  page, do not collapse code into one-liners, do not change the design.
- Call the backend only through api() in frontend/src/lib/api.js (add helpers there if needed).
- Replace static numbers/rows with real data. Every data view needs loading, error and empty states.
- Remove hard-coded fake values (counts, percentages, names, dates). If a number cannot be computed
  from real data, remove it or label it honestly. Do not invent data.
- Keep working pages working. Some pages share endpoints (e.g. ClerkAttendance and
  AdminAttendanceAnalysis both call /attendance/analysis): changes to a response shape must be additive
  or you must update every consumer in the same change. Search for all callers first.

## Database rules
- New SQL = the next numbered file in supabase/migrations (look at the highest number first).
  Idempotent (`if not exists`, `create or replace`). Never edit a migration that was already applied.
- Enable RLS on any new table, with policies using the existing helpers is_admin()/is_staff().
  Revoke direct access from anon/authenticated for backend-only tables and views.
- Do NOT run SQL yourself. Tell me the exact file to run in the Supabase SQL Editor.

## Workflow rules
- Do ONLY the task in the prompt. Do not refactor or "improve" unrelated files.
- Before editing, search the repo for existing helpers and for every caller of anything you change.
- After the work, run in /frontend: `npm run build` and `npm run lint`; in /backend: `node --check` on
  every file you touched (and `npm run check:guards` if it exists). Fix errors you caused.
- Verify third-party APIs (PayMongo, Gmail SMTP, YouTube/Vimeo) from their official docs, not memory.
- If a business rule is unclear, make the smallest safe assumption, state it, and continue.
  Never ask more than one clarifying question.
- Finish with: (1) files changed, (2) migration file to run, (3) manual test steps for me,
  (4) anything you could not finish or were unsure about. Be honest about what you ran vs only read.
