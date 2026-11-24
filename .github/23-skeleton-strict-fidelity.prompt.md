---
description: "Find and migrate every remaining old-style error/info message to the global toast, including the ones the checker script does not detect."
agent: 'agent'
---
# Task 22: Finish the toast migration for real

Use `toast-feedback` and `verify-before-done`. The checker currently prints 6 spots (Login, MemberBilling x3, MemberProfile, MemberWorkoutPlans), but it only matches
Bootstrap `alert alert-*`, `alert()` and `window.confirm`. A broader grep for `role="alert"`, `text-danger`, `#f87171` and `setError(` finds candidates in about 25 files
(ForgotPassword, CheckIn, ClerkMemberRegistration, ClerkAttendance, AdminVideoTutorials, AdminAnnouncements, AdminMembershipPlans, AdminSettings, AdminReports, ...).
Many will be legitimate inline field errors. Your job is to sort them, not to blindly convert them.

## Steps
1. Run the checker and paste the starting count. Run the broader grep from the `toast-feedback` skill and save the hits to a table.
2. Triage every hit: convert / keep as field validation / `InlineError` / persistent banner with `toast-allow`. Show me the table BEFORE editing (one message), then continue without waiting.
3. Upgrade `frontend/scripts/check-toast-migration.mjs` (dependency-free) to also catch the patterns the broad grep found, with a `field-error: <reason>` allow marker for real field validation.
   Run it: it must print 0 at the end with only justified allow lines.
4. Migrate portal by portal (public, member, clerk, admin), one commit each, running the checker and `npm run build` after each.
   - `MemberBilling` pending-payments notice is persistent: keep with `toast-allow` or use an `InlineError`-style notice, explain which.
   - `MemberProfile` save result becomes a toast. `MemberWorkoutPlans` success banner becomes a toast.
   - Any `window.confirm`/`alert` left becomes `useConfirm()`.
5. No page may render its own toast markup. No error may be reported twice. Remove state that only fed old banners.
6. Do not touch logic, API shapes, layouts or CSS rules of the pages (use `design-freeze`).

## Verify and paste
Checker output, `node scripts/test-toast-reducer.mjs`, build, lint on changed files, and a manual table per portal: one success, one failure, backend stopped, expired session,
two different errors in a row (stacked, not overlapping).
