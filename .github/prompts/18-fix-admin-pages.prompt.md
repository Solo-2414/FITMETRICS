---
description: "Fix the Admin side: AdminLayout dead controls, Dashboard hard-coded values, Churn/Predictive actions, Manage Users, Membership Plans, Walk-in export, Settings timezone and missing feedback."
agent: 'agent'
---
# Task 18: Admin side fixes

Use `design-freeze` and `verify-before-done`. Replace fake values with real data or remove them.

## `AdminLayout.jsx`
1. Remove the hard-coded `San Jose · 5:48 PM`. Show the real Manila time (`Intl.DateTimeFormat` with `Asia/Manila`, updated each minute) and the gym name from settings.
2. "Gym Open" is always shown: compute Open/Closed from `gym_settings` opening hours (the clerk settings endpoint already returns them) and the Manila time.
3. "Fast Check-in" has no handler: either remove it from the admin top bar or reuse the clerk modal (task 15) behind the admin role (`/clerk` routes already allow admin).
4. Notification bell: no handler and a permanent red dot. Add `/admin/notifications/summary` (copy the clerk one, `user_id = req.user.id`) with a dropdown, or remove the bell. Hide the dot when unread is 0.
5. Show `profile.avatar_url` with the initials fallback. Add aria-labels to the menu toggle and close buttons.
6. Live gym count: stop calling the heavy `/attendance/analysis` for one number; use a light `GET /admin/live-count`. Show an error/retry state instead of "..." forever.
7. The AI assistant panel is only UI (input and send do nothing and there is no Gemini code in the repo). Hide the floating button behind `VITE_ENABLE_ASSISTANT=true` until the backend exists; do not ship a dead chat. (The chatbot backend is a separate task.)

## `AdminDashboard.jsx`
1. Line 291 contains a literal `\n` that renders as text. Remove it.
2. Replace "Today: Friday, October 24" with the real Manila date. Replace "Live desk log · 2m ago" with the real last-updated time from the data. Replace the static "Gym capacity comfortable (live capacity)" with a value from the live count and capacity. Make "6:00 AM - 9:00 PM" and the "3 days" labels come from settings (`expiry_reminder_days`, opening hours).
3. "View all N visits today" and "Send Email Reminder to All N Members" have no handler. Link the first to `/admin/attendance-analysis`; implement the second with `POST /admin/expiry-reminders/send-all` (reuse the clerk reminder + `enqueueEmail` dedupe, confirm dialog with the count, toast with sent/skipped/no-email counts). The list shows only 3 members while the button says all: show a "View all" expander.
4. Add a skeleton for the plan-distribution panel and a toast-free refresh indicator (`fm-refreshing`) with a 60 s visible-tab refresh.

## `AdminChurnAnalytics.jsx` / `AdminPredictiveAnalytics.jsx`
1. Churn chart: both datasets use `item.visits`. Use `returning_members` (add to the API if missing) for the first dataset or remove the second dataset.
2. Pagination buttons are dead and only 5 members are shown. Add server or client pagination (10 per page) with working Previous/Next.
3. "Save" on the default prompt only closes the editor. Persist it (`gym_settings.churn_reminder_message`, migration + validation, max 500 chars) and use it on the server when no body is sent.
4. Send reminder (both pages): success toast "Reminder queued for <name>", error toast, per-row sending state, disable for members without email, and show "Reminded <date>" after sending (dedupe is per day on the server).
5. Predictive: say clearly which numbers are statistical estimates and show the data window used; add an empty/low-data message when fewer than 14 days of attendance exist.

## `AdminManageUsers.jsx`
1. KPI cards count the FILTERED list and "Active Members" counts all members. Add `GET /users/summary` and show real totals (admins, clerks, members, active members).
2. Add pagination (25/page) and a request-id guard so stale responses cannot overwrite newer ones.
3. Toast on create/edit/delete, and clear inline errors. Reset `userDetails` when opening another user and show a skeleton in the View modal.
4. Use a shared accessible modal (Escape, backdrop, focus trap, `role="dialog"`) for Add/Edit/View/Delete; move `ClerkModal` to `components/ui/Modal` with the same API and reuse it.
5. Block the admin from changing their own role/status or deleting themselves (UI and `users.js`).
6. Add: edit name/phone, "Send password reset email" for staff/members, and password rules + show/hide on Add User.

## `AdminMembershipPlans.jsx`
1. Save errors are set on the page and are probably hidden behind the modal overlay: show them inside the modal.
2. "Edit Rates" opens `activePlans[0]`: replace with a plan picker or remove it. KPI cards "Session Walk-Ins" and "Monthly Roster" show text, not numbers: show counts (active members per plan) from `/admin/dashboard.planDistribution`.
3. Validate `student_price <= price`, `duration_days >= 1`, show toasts, dim inactive plans, and confirm before deactivating a plan that has active memberships.
4. Promos modal says "next phase" while the clerk side accepts promo codes. Build promo CRUD against the existing promo tables (`supabase/migrations/009_payment_discounts.sql`: read it first; ask before changing the schema): code, type percent/fixed, value, valid from/to, max uses, active; plus `POST /clerk/promos/validate` used by task 16.
5. Coaches: no admin UI exists although clerk screens depend on `coaches` (`addon_amount`, `external_contact_url`, `active`). Add a Coaches section (list, add, edit, deactivate) with the same card style.

## `AdminWalkInCustomers.jsx` + `admin.js`
1. In `backend/src/routes/admin.js` register `/admin/walk-ins/export.csv` BEFORE `/admin/walk-ins/:id`. Add a test that requests it.
2. Replace the `<a href="/api/...">` with a button that calls `downloadApi("/admin/walk-ins/export.csv")` and saves the blob (reuse the Reports download code), with a loading state and toast.
3. Add a request-id guard to `load`, a Close/Escape/backdrop for the detail drawer, a drawer skeleton, and fix the "Visits shown" KPI label.

## `AdminSettings.jsx`
1. The maintenance start/end fields convert with `toISOString().slice(0,16)` (UTC) for a `datetime-local` input: Manila times are shifted by 8 hours. Convert with the Asia/Manila offset both ways and test the round trip.
2. Show a toast on save, warn before leaving with unsaved changes, and confirm before enabling maintenance mode (explain that members will be locked out).

## Admin pages with no feedback
Add `useToast` to Dashboard, Churn, Predictive, Manage Users, Plans, Reports and Attendance Analysis and use it for every success and failure that currently has none. Run `node scripts/check-toast-migration.mjs` and fix what it reports.

## Done when
No hard-coded date/time/place remains in the admin layout or dashboard, every admin button does something, the CSV export downloads, and `verify-before-done` passes.
