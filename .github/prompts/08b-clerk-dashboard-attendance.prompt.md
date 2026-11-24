---
description: "Clerk Dashboard and Attendance: skeleton bug, check-in method values, quick desk actions, Fast Check-in styling, and a working Member QR Station (generate QR, member scans, auto check-in)."
agent: 'agent'
---
# Task 8b of 8d: Clerk Dashboard + Attendance + QR check-in

Prerequisite: task 8a is done (payments flow) because the Quick Desk Actions open payment/registration screens.

Files: `frontend/src/pages/clerk/ClerkDashboard.jsx`, `ClerkAttendance.jsx` (+ .module.css), `frontend/src/App.jsx`,
a NEW member page `frontend/src/pages/member/MemberCheckIn.jsx`, `backend/src/routes/clerk.js`,
`backend/src/routes/attendance.js`, `backend/src/routes/member.js`, table `attendance`.

## Current state (verified in the code)
- ClerkDashboard fetches `Promise.all([api("/clerk/dashboard"), api("/clerk/plans")])`, so the whole page waits for the slower call,
  and it renders skeleton blocks (`loading && <SkeletonKpiCards/>`, `loading && <SkeletonTable/>`) next to real sections. Reproduce
  the exact glitch (skeleton staying, flashing, or showing together with data) before fixing it.
- The Quick Desk Actions bar (`quickActionsBar`) uses `navigate()` to `/clerk/payments?plan=session`, `/clerk/attendance`,
  `/clerk/register`, `/clerk/payments`. Check that each destination really reads/handles what is passed (for example the
  `?plan=session` query is probably ignored by ClerkPayments) and that each button does what its label says.
- "Renew Membership" in the expiring list navigates to `/clerk/membership` without telling it which member.
- ClerkAttendance Fast Check-in sends `method: "member_id"` to `POST /clerk/attendance`. The dashboard and the attendance log show
  `record.method` as raw text. The attendance `method` column should describe HOW the check-in happened.
- The "Member QR Code Station" only draws a QR of the selected member's `member_code` (client-side, `qrcode` package) with a Print
  button. Nothing scans or processes it. The card text says members scan a "Gym Entrance QR Code", which does not exist.
- The Fast Check-in search results/dropdown render with a white background (the search results look wrong on the dark theme).
- Backend `POST /clerk/attendance` already rejects expired members and duplicate open check-ins; keep that.

## Dashboard
- Load each region independently (dashboard stats, plans, expiring list) with its own loading flag so fast data appears first;
  never hold the whole page on `/clerk/plans` (load plans only where they are used). Follow `07b` skeleton rules; no skeleton and
  real data for the same region at the same time; add error + "Try again".
- Make every Quick Desk Action work: "Session Pass" opens Payments with the Session plan already selected (make ClerkPayments read
  `?plan=`), "Check-in" opens Attendance with the search focused, "Register" opens registration, "Record Payment" opens Payments.
  "Renew Membership" opens `/clerk/membership?member=<id>` and ClerkMembership must preselect that member (task 8c wires the
  receiving side; add the query param here and a note in your final report).
- Recent attendance "method" column shows a friendly label and icon per value: manual (desk icon, "Desk"), qr (qr icon, "QR scan"),
  and any existing legacy value (`member_id`, etc.) mapped to "Desk". Put the label mapping in one shared helper
  (e.g. `frontend/src/lib/attendanceMethod.js`) and reuse it on both pages.

## Attendance: method values
- Check the `attendance.method` column (type/CHECK) in `supabase/schema.sql` and the migrations. Allowed values after this task:
  `manual` (clerk checked the member in), `qr` (member scanned the gym QR), plus keep any value that already exists in old rows.
  If a CHECK needs changing, add it to the next numbered migration (idempotent, never edit an applied migration) and tell me to run it.
- `POST /clerk/attendance`: default and only clerk-allowed method is `manual`; validate against an allow-list; the member id and
  `recorded_by` always come from the server/session, never the client. Change the frontend call to send `manual`.
- The log table and the member's own attendance page (`MemberAttendance.jsx`, `/attendance/me`) must render both values.

## Attendance: Fast Check-in design
- Fix the white search box/dropdown: dark surface, readable text, hover/active/focus states, keyboard navigation (arrows + Enter),
  no layout jump, empty state "No member found", and the selected member card shows plan, expiry and a clear Active/Expired badge.
  Only change colors/spacing through the existing CSS module; keep the markup and class names.
- Add a code field that accepts a typed or scanner-entered `member_code` (hardware QR scanners type the text + Enter) and checks
  that member in as `manual`.

## Attendance: Member QR Code Station (the real feature)
Goal: the clerk screen shows a QR; a member scans it with their phone; they are checked in automatically.

Flow:
1. Station: `GET /clerk/attendance/qr` returns `{ token, url, expires_at }`. The QR encodes `url` =
   `${CLIENT_URL}/member/check-in?t=<token>`. The token is a signed, short-lived value (HMAC-SHA256 over a rotating time window,
   about 60 seconds; accept the current and previous window so a scan right at rotation still works). The station auto-refreshes the QR
   before expiry with a visible countdown, a "Full screen" button for a tablet/monitor, and a Print button only if a static code is
   explicitly chosen (a printed code cannot rotate; do not offer a printable permanent token).
   The signing secret is `CHECKIN_QR_SECRET` in backend env: add it to `backend/.env.example` with a note. If it is missing, fall back
   to deriving from an existing server secret ONLY if one already exists, otherwise return a clear 503 and show it on the station.
2. Member: new route `/member/check-in` (member role only, add it to App.jsx and the ProtectedRoute rules). If the member is not
   logged in, send them to Login and return them to this URL afterward (keep `t`). The page calls `POST /attendance/qr-checkin`
   with `{ token }` automatically on load, with a loading, success ("Checked in at 3:42 PM, plan X, valid until DATE"), and error state
   (expired plan, already checked in, invalid/expired QR, maintenance mode). Style it with the member pages' existing look.
3. Backend `POST /attendance/qr-checkin` (requireAuth + requireRole('member')): verify the signature and window, find the member's
   CURRENT membership (`status active`, `start_date <= today <= end_date` in Asia/Manila), reject expired/queued-only/suspended
   accounts, reject if an open check-in exists, insert `attendance` with `method: 'qr'`, `recorded_by: null`, notify staff, write an
   audit_log row, rate-limit per member (for example 1 request per 10 s). Reuse one shared function with `POST /clerk/attendance`
   so both paths apply the same rules.
4. The clerk Attendance page shows the new check-in within a few seconds (poll the live list every 10 s while the tab is visible)
   with a small "just checked in" highlight. Keep the checkout button working.
5. Keep the existing per-member QR (member_code) as "Member ID QR" for a clerk to scan with a handheld scanner; label the two
   clearly: "Gym Entrance QR (members scan this)" vs "Member ID QR".

## Don't
- Don't allow check-in with a QR for another person's account (the member id comes from the login session, never from the QR).
- Don't make the QR contain a member id, email or any personal data. Don't store the secret in the frontend.
- Don't redesign the pages; style fixes only where listed.

## Done when
- Dashboard shows no skeleton/flash glitches, every quick action lands on a working, preselected screen.
- Clerk check-ins are saved as `manual`; QR check-ins as `qr`; both are labeled correctly on the dashboard, clerk log and member page.
- Scanning the station QR on a phone (logged in as a member with an active plan) checks that member in once, a second scan shows
  "already checked in", an expired member is refused, and a QR older than ~2 minutes is refused.
- The Fast Check-in search is readable on the dark theme. Frontend build + lint pass; backend `node --check` passes;
  run `/supabase-migration-review` (if a migration was added) and `/verify-before-done`.
