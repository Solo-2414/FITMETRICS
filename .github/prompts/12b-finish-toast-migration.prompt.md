---
description: "Finish the global toast migration: every remaining page, inline load-error component, confirm dialogs, with an automated checker that must report zero."
agent: 'agent'
---
# Task 12b: Finish the toast migration (the first pass migrated only 4 pages)

Task 12 delivered the toast foundation and migrated Login, Member Attendance, Clerk Membership and Member Information only.
Everything else still uses old banners and browser popups. This task finishes the job and is NOT done until the checker below prints
`0 old-style feedback spot(s)`. Do not report partial completion as done.

## The checker (add it first)
Add `frontend/scripts/check-toast-migration.mjs` (I am providing the file; if it is missing, ask me for it, do not write a weaker one).
Run `node scripts/check-toast-migration.mjs` from `/frontend` before you start (paste the starting count), after each portal, and at the end.
It flags: Bootstrap `alert alert-*` banners, `window.alert`, bare `alert()`, `window.confirm`, any `ClerkToast` reference, and page-rendered toast markup.
A line may stay only if it has a comment `toast-allow: <reason>` on the same line or the line above, and only for genuinely persistent banners
(maintenance notice, plan-expiry notice). List every allowed line with its reason in your final reply.

## Rules (from task 12, repeated so nothing is skipped)
- Result of an action (saved, deleted, sent, paid, failed) -> `toast.success/error/warning/info`. In `catch` use `toastError(err)`.
- Field validation stays inline under the field.
- A page or section that FAILED TO LOAD must not stay a red Bootstrap banner: create one shared `InlineError` component
  (`components/ui/InlineError.jsx`: icon, friendly message from `getFriendlyError`, "Try again" button, same dark card look as the toast) and use it in place of the
  `{error && <div className="alert alert-danger">...}` blocks that show load failures, with the page's reload function as `onRetry`.
- Persistent status banners may stay (with `toast-allow`).
- Each error is reported once (a child handles it or rethrows it, never both). Remove the local `error/success/saved` state that only existed to feed a banner.
- Do not change layouts, logic, API shapes or routes. Do not add dependencies.

## Work list (one commit per portal; run the checker and the build after each)
1. Clerk: `ClerkDashboard`, `ClerkMemberRegistration`, `ClerkPayments` (3 spots, includes the record-payment prompt), `ClerkAttendance` (3 spots), `ClerkNotifications`, `ClerkSettings`,
   `components/clerk/ClerkLayout.jsx`, and any QR/payment panel components. Delete `components/clerk/ClerkToast.jsx` once nothing imports it.
2. Admin: `AdminDashboard`, `AdminManageUsers`, `AdminMembershipPlans`, `AdminAnnouncements` (3 spots), `AdminReports`, `AdminAttendanceAnalysis`, `AdminChurnAnalytics`,
   `AdminPredictiveAnalytics`, `AdminVideoTutorials` (2 spots), `AdminSettings` (2 spots).
3. Member: `MemberDashboard`, `MemberMembership`, `MemberBilling` (3 spots; the "pending payments" warning is persistent: keep it with `toast-allow` or turn it into an `InlineError`-style notice, your call, explain it),
   `MemberCheckIn` (the check-in result becomes a success/error toast AND keeps its big result card on the page), `MemberNotifications`, `MemberProfile` (save success becomes a toast), `MemberVideoTutorials`,
   remaining spot in `MemberAttendance`.
4. Public: `Login` (remaining spot), `ForgotPassword`, `LandingPage` if it shows messages.
5. Confirm dialogs: add `useConfirm()` (promise-based, in `components/ui/toast/` or `components/ui/`) rendering the same dark modal look as `ClerkModal`
   (title, message, confirm and cancel, danger style). Replace `window.confirm`/`alert` in `AdminAnnouncements` (send to members, delete draft), `AdminVideoTutorials` (delete),
   `ClerkPayments` (record payment prompt), `MemberAttendance` (popup blocked message becomes a warning toast). Esc and overlay click cancel; focus is trapped and restored; works in admin and member layouts.

## Verification you must run and paste
- `node scripts/check-toast-migration.mjs` -> `0 old-style feedback spot(s)` (or only the listed `toast-allow` lines, which are not counted).
- `node scripts/test-toast-reducer.mjs`, `node ../backend/scripts/test-error-mapper.mjs`, backend `node --check`, frontend build, lint on every changed file.
- Full lint: show the errors you call "pre-existing" by running lint on the original commit (`git stash` or a worktree of the base commit) and prove the same errors exist there; list any that are new.
- A manual table in the final reply, one row per portal (clerk, admin, member, public): trigger one success and one failure, and say what appeared. Include the network-down case (stop the backend, click an action),
  an expired-session case, and a double failure (two different errors quickly) to show two stacked boxes that do not overlap.

## Don't
- Don't leave any page rendering its own toast. Don't claim "migrated" for files the checker still flags. Don't touch payment, registration, QR or email logic.
