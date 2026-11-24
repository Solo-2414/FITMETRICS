---
description: "Make Admin Settings & Maintenance fully functional (save, maintenance mode enforcement, honest backups)."
agent: 'agent'
---
# Task 2 of 6: Settings & Maintenance

Files: `frontend/src/pages/admin/AdminSettings.jsx` (+ .module.css), `backend/src/routes/admin.js`
(GET/PATCH `/admin/settings`, `/admin/maintenance/backups`), table `gym_settings`, table `maintenance_backups`.

## Current state (verified in the code)
- The header "Save Settings" / "Discard Changes" buttons sit OUTSIDE the `<form ref={formRef} onSubmit={save}>`
  and have no `form=` attribute, so Save does nothing.
- Gym info and operating hours fields load and save through `defaultValue` + `name`.
- These controls have no `name` and hard-coded defaults, so they never load or save: "Default Expiration
  Reminder" select (1/3/7 days, hard-coded `defaultValue="3"`), "Preferred Payment Modes" checkboxes,
  "Allow Member Registrations" and "Display Live Floor Capacity" toggles, the maintenance toggle, the
  maintenance message textarea and the "Schedule Maintenance" datetime.
- `gym_settings` has no columns for payment modes, allow-registrations, live-capacity or a maintenance start time.
- `maintenance_enabled` is stored but enforced nowhere. `POST /admin/maintenance/backups` only inserts a
  `requested` row; nothing performs a backup. "Storage 24%", "14.4 GB of 60 GB", "99.9% Uptime",
  "Today at 2:00 AM" and "Version 2.4.1-local" are fake.
- `emailJobs.js` already reads `gym_settings.expiry_reminder_days`; keep that working.

## Database (next numbered migration)
- Add to `gym_settings`: `payment_modes jsonb` (default all current modes enabled; read the page for the exact list),
  `allow_member_registrations boolean default true`, `show_live_capacity boolean default true`,
  `maintenance_starts_at timestamptz null`.
- Add an RPC `get_database_size_bytes()` (SQL, security definer, `pg_database_size(current_database())`),
  executable by service_role only.
- Extend `maintenance_backups` only if you need a `summary jsonb` column for table row counts.

## Backend
- Rewrite validation for `PATCH /admin/settings`: whitelist fields; `gym_name` 1-100 chars; `email` valid
  format or empty; `phone` max 30; times as `HH:MM` and close > open; `expiry_reminder_days` integer 1-30;
  `payment_modes` array of known payment_method values with at least one enabled;
  `maintenance_message` max 300 chars; booleans must be real booleans. Return 400 with a clear message.
  Write an audit_log row containing only the changed keys (old -> new).
- Public endpoint `GET /api/public/status` (no auth, rate limited, no secrets):
  `{ maintenance: boolean, message, startsAt, gymName }`. Maintenance is active when
  `maintenance_enabled` OR (`maintenance_starts_at` is set and <= now). Cache settings in memory for 30s
  and clear the cache when settings are saved.
- Enforce maintenance: members get HTTP 503 `{ maintenance: true, message }` on all `/member/*` and
  `/attendance/me` calls. Admins and clerks are never blocked (assumption: the front desk keeps working).
  Login still works for staff; members get a clear maintenance message at login.
- Wire the other settings where they actually take effect and report any you could not wire:
  disabled payment modes are rejected by the clerk payment/registration endpoints;
  `allow_member_registrations=false` makes `/clerk/register` return a clear 403-style message;
  `show_live_capacity` is exposed so the member dashboard can hide the live count.
- `GET /admin/system-info` (admin): `{ version (from backend/package.json), databaseSizeBytes,
  databaseLimitBytes (env DB_PLAN_LIMIT_MB, default 500; add it to .env.example), lastBackup (latest completed row) }`.
- Backups, made honest: replace "Backup Database Now" with a data export. `POST /admin/maintenance/backups`
  builds a ZIP of CSV files for a whitelist of tables (profiles, member_details, memberships,
  membership_plans, payments, attendance, walk_in_visits, announcements, notifications, promos,
  gym_settings, audit_log). It streams the ZIP to the admin as a download, records a
  `maintenance_backups` row (status completed/failed, row counts, finished time) and writes an audit_log row.
  Never export auth tables, password hashes, or email_log payloads. Rate limit to 3 per hour.
  Prefix CSV cells starting with `= + - @` with a single quote (CSV injection). Add the BOM so Excel reads UTF-8.

## Frontend
- Fix the Save/Discard buttons (give the form an `id` and use `form="..."`, or move them). Discard resets to the
  last loaded values. Show saving state and success/error messages.
- Give every control a `name` / controlled state and load initial values from the API. Convert checkboxes to
  booleans (unchecked boxes are missing from FormData).
- Maintenance card: toggle + message + optional schedule, with a clear "currently active/scheduled" status.
  Turning maintenance off also clears `maintenance_starts_at`.
- Member side: when the API returns 503 maintenance (or `/public/status` says so), show a maintenance screen
  with the message instead of a broken page; show a small banner on the login page.
- Replace the fake backup/storage block with real data: last export time, database size vs limit (labelled with
  the real limit), recent export rows, and a "Download data export" button (add a blob-download helper to
  `frontend/src/lib/api.js`). Remove the fake uptime figure. Show the real version.
- Label the export honestly (it is a data export, not a full database backup) and add one line saying the
  Supabase project's own backups depend on the plan.

## Done when
- Clicking Save persists every field; refreshing the page shows the saved values.
- With maintenance on, a member session gets the maintenance screen and an admin still works; turning it off restores access.
- A disabled payment mode is rejected by the clerk payment endpoint.
- The export downloads a ZIP with one CSV per table and no sensitive columns.
- Frontend build + lint pass; backend files pass `node --check`.
