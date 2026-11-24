---
description: "One global toast system for the whole app (admin, clerk, member, login): single provider, stacked non-overlapping toasts, friendly API errors, replace page alert banners and browser popups."
agent: 'agent'
---
# Task 12: Global toast system (whole app)

Goal: every success, error, warning and info message in the app that is the RESULT OF AN ACTION appears as the same dark toast box (the green-check / red-exclamation one used on Member Information),
rendered by ONE provider, stacked so they never overlap, with friendly error text. Page layouts do not change except that the old banners disappear.
Same branch as earlier tasks; commit after each lettered step and run the build after each step.

## Current state (verified)
- A toast exists only in `components/clerk/ClerkToast.jsx`, used by Member Information (and the Membership page); each page renders its own copy and passes its own CSS classes.
  That is how a page ended up showing two overlapping error boxes for one error.
- 27 page/components still show Bootstrap `alert alert-danger/success` banners at the top of the page: member pages (Billing, Profile, CheckIn, Videos, Notifications, Membership, Dashboard, Attendance),
  clerk pages (Settings, Payments, Registration, Attendance, Notifications, Dashboard, ClerkLayout), admin pages (Settings, Videos, Reports, Predictive, Plans, Manage Users, Dashboard, Churn, Attendance, Announcements) and `Login.jsx`.
- Browser popups still exist: `alert()` in `MemberAttendance.jsx`, `window.confirm()` in `AdminAnnouncements.jsx` (2), `AdminVideoTutorials.jsx`, `ClerkPayments.jsx`.
- Users sometimes see raw database errors in the UI (for example "JSON object requested, multiple (or no) rows returned" or constraint names). Those must never reach the screen.

## Step A: the toast system
Create `frontend/src/components/ui/toast/`: `ToastProvider.jsx`, `useToast.js`, `toastReducer.js`, `Toast.module.css`.
- Mount `<ToastProvider>` once in `App.jsx`, inside `AuthProvider` and outside `Routes`, so it works on every page including Login, Forgot Password and the landing page.
  Pages NEVER render toast markup; they only call the hook.
- API: `const toast = useToast();` then `toast.success(message, options)`, `toast.error(...)`, `toast.warning(...)`, `toast.info(...)`, `toast.dismiss(id)`, `toast.clear()`.
  Options: `{ title, id, duration, action: { label, onClick }, dedupeKey }`. Also export `toastError(err)` which turns any thrown error into a friendly message (see Step B).
- Behavior:
  - one fixed container (top right, below the header; on phones full width with 12 px margins and below the status bar), toasts stacked in a column with a gap, newest at the bottom, max 3 visible, extra ones queued;
  - the container is above sticky headers, cards and modals (z-index higher than the modal overlay);
  - dedupe: the same type + message within 2 seconds shows once (a repeat count badge "x2" is optional);
  - success auto-dismisses after 4 s, info 5 s, warning 6 s, error stays until closed (an error may pass `duration`); hover or keyboard focus pauses the timer; close button on every toast;
  - optional action button inside a toast (for example "Retry", "View member", "Undo");
  - enter/exit animation (fade + slide), disabled when `prefers-reduced-motion`;
  - accessibility: container is an `aria-live` region; success/info use `role="status"` (polite), warning/error use `role="alert"` (assertive); close buttons have labels; focus is never stolen.
- Look: reuse exactly the Member Information toast style (dark panel, thin border, colored icon circle: green check, red exclamation, amber warning, blue info, readable at AA contrast, long text wraps inside the box, max width about 420 px).
  Use CSS variables so it also looks right inside the admin and member layouts; verify in each portal and on the public pages (if a public page is light themed, use a surface that stays readable there).
- Put the logic in a pure reducer (`toastReducer.js`: add, dedupe, cap and queue, dismiss, expire) and add `frontend/scripts/test-toast-reducer.mjs` (plain `node:assert`, no new dependency) covering dedupe, the 3-visible cap with queue promotion, auto-dismiss rules by type, and dismissal. Run it and paste the output.
- Keep `components/clerk/ClerkToast.jsx` working as a thin wrapper around the new provider during migration; delete it at Step F.

## Step B: friendly errors (frontend + backend)
- `frontend/src/lib/api.js`: keep returning the thrown `Error`, add `error.status`, `error.code` and `error.requestId` when present. Add `getFriendlyError(err)`:
  network failure -> "Can't reach the server. Check your connection and try again."; 401 -> "Your session expired. Please sign in again." (and let the existing auth logic redirect);
  403 -> "You don't have permission to do that."; 404 -> "We couldn't find that record."; 409 -> use the server message; 422 -> the server message or the first field error; 429 -> "Too many attempts. Please wait a moment.";
  5xx -> "Something went wrong on our side. Please try again." Server messages that are already plain sentences are kept as they are.
- Backend: find the central Express error handler (`server.js` or a middleware). Map known database/PostgREST errors to safe messages and keep the raw error only in the server log:
  `PGRST116` -> "We couldn't find exactly one matching record."; `23505` -> "That value already exists."; `23503` -> "This record is linked to other data and can't be changed.";
  `23514`/`23502` -> "That change isn't allowed."; trigger exceptions -> a short plain sentence; unknown -> "Something went wrong on our side." with `status 500`.
  Return `{ error: message, code }`; in non-production add `debug: original message` so I can still diagnose. Never send SQL, table, constraint or column names in production.
- Add an offline test script (`backend/scripts/test-error-mapper.mjs`) for the mapper with one case per code above.

## Step C, D, E: migrate every portal (one commit per portal)
Rules for deciding what becomes a toast:
| Message kind | Where it goes |
|---|---|
| Result of an action (saved, deleted, sent, paid, failed) | toast |
| Field validation | stays inline under the field (unchanged) |
| A page or section failed to load | stays an inline error state with a "Try again" button (and no toast) |
| Needs a decision (delete, send to everyone) | confirm dialog (Step G) |
| Persistent status (maintenance banner, plan expiry notice) | stays a banner |
- Clerk: Dashboard, Registration, Member Information, Membership, Payments, Attendance, Notifications, Settings, `ClerkLayout`, plus the QR/payment panels.
- Admin: Dashboard, Manage Users, Membership Plans, Announcements, Reports, Attendance Analysis, Churn, Predictive Analytics, Video Tutorials, Settings.
- Member: Dashboard, Membership, Billing, Attendance (replace its `alert()`), Check-in, Notifications, Profile, Video Tutorials; Public: Login, Forgot Password.
- For each page: remove the `alert alert-*` blocks for action results and the local `error/success` state that only fed them, call `toast.*` instead, and use `toastError(err)` in `catch`.
  Do not change anything else on the page (layout, other components, logic). If removing a banner changes spacing, keep the page tidy but do not redesign.
- Make sure each error is reported ONCE: a child component either handles an error or rethrows it to the page, never both.
- Where a toast is useful, add the action button (for example "Try again" for a failed save, "View receipt" after a payment).

## Step F: cleanup
Delete `ClerkToast.jsx` and the per-page toast CSS (`.toast`, `.toastError`) once nothing imports them; check there are no leftovers with
`grep -rn "alert alert-" frontend/src` (only the persistent banners from the table may remain, and list them in your reply),
`grep -rn "ClerkToast" frontend/src` (none), `grep -rn "window.alert\|window.confirm" frontend/src` (none after Step G).

## Step G: confirm dialogs (replace the browser popups)
Add `useConfirm()` (promise based, in the same folder) rendering the existing `ClerkModal` look (or a shared `ConfirmDialog` with the same appearance for admin/member): title, message, confirm and cancel buttons, a danger style for delete.
Replace the `window.confirm` calls in `AdminAnnouncements` (send and delete), `AdminVideoTutorials` (delete) and `ClerkPayments` (record payment prompt). Esc and overlay click cancel; focus is trapped and restored.

## Don't
- Don't change layouts, routes, API shapes, or business logic. Don't add dependencies (no react-toastify, etc.). Don't swallow errors: every failed action must produce a toast or an inline state.
- Don't show raw server or database text to users. Don't render a toast anywhere except the provider.

## Done when
- One `ToastProvider` exists; opening any page and triggering a failure shows ONE stacked toast, and two quick different failures show two stacked boxes without overlapping.
- The same toast style appears in the admin, clerk, member and public pages; messages are friendly; raw database wording never appears.
- `node frontend/scripts/test-toast-reducer.mjs` and `node backend/scripts/test-error-mapper.mjs` pass (paste output), frontend build passes, lint passes for changed files, backend `node --check` passes.
- Manual check list in the final reply, one line per portal: trigger a success and an error (disconnect the backend for the network error, submit invalid data for a 422, use an expired session for a 401), and say what appeared.
- Every earlier feature still works (registration, QR payments, renewals, member list, announcements).
