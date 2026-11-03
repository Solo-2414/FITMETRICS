---
description: "Rebuild clerk Attendance (function + design) and add mobile-number QR check-in for members, with a downloadable PNG QR station, live floor, log, check-out, and anti-abuse protections."
agent: 'agent'
---
# Task 14: Attendance rebuild + mobile-number QR check-in + downloadable QR

Same branch as earlier tasks; lettered steps A-I, commit after each, build and tests after each. I allow a visual redesign of `ClerkAttendance.*`,
but it stays in the site's design language (dark navy cards, existing variables, Font Awesome, Bootstrap grid, shared toast / `ClerkModal` / `useConfirm` / `InlineError`,
step cards and sticky side card pattern from Registration, Membership and Payments). Other pages keep their look (`design-freeze`).
Do not report done until step I is green and pasted. If something is unfinished, say so first.

## What exists today (verified in the code)
- `ClerkAttendance.jsx` (442 lines) loads EVERY member with `GET /clerk/members` plus `GET /attendance/analysis?date=`; there are no server-side live-floor, log, search or pagination endpoints for the desk. Check-out is a button inside the table.
- `POST /clerk/attendance` checks a member in (method `manual`). `GET /clerk/attendance/qr` returns a rotating signed token (60 s) used by `MemberCheckIn` at `/member/check-in`, which REQUIRES a full member login (`POST /attendance/qr-checkin`).
- `services/attendance.js` `checkInMember` is the shared rule engine (current active membership by Manila dates, one open check-in at a time, staff notification).
- `attendance.method` is a Postgres ENUM (`member_id, manual, qr, walk_in`), so a new method needs `ALTER TYPE ... ADD VALUE`.
- Dependencies available: `express-rate-limit` (backend), `qrcode` (frontend). The API already has a global limiter of 120 requests/minute.

## What I want
1. The clerk can check members in at the desk (fast, search by name/mobile/code/email) and check them out, see who is on the floor, and see the day's log.
2. A **gym QR code** the clerk can generate and **download as PNG** (and print). A member scans it with their phone, lands on a simple page, **enters only their mobile number**, confirms, taps **Check in**, and the attendance is recorded in the system AND in that member's own account history.
   The mobile-number step is only for checking in; it is not a login and gives access to nothing else.

## Security and privacy rules for phone-only check-in (mandatory)
A phone number is not a secret, so the design must limit abuse:
- The public page only works with a valid QR code token (random, hashed in the database, revocable, optional expiry). Without a valid token nothing is looked up.
- Two-step flow: (1) lookup by number shows only first name + last initial, plan name and valid-until, and a short-lived signed confirm token (2 minutes, bound to the member and the QR code);
  (2) the member taps Check in to send the confirm token. A stranger who types someone else's number sees only "Mae N." and must still confirm.
- Never return full name, phone, email, member code or history to the public. Never reveal whether an expired/suspended account exists beyond the specific, minimal message below.
- Rate limits: per IP (for example 20 requests / 10 min), per phone number hash (5 / 10 min), per QR code, with a clear 429 message and `Retry-After`. Log attempts (hashed phone and IP) in `checkin_attempts`, delete rows older than 30 days in the nightly job.
- One open check-in per member (already enforced); duplicate scans within seconds are idempotent ("already checked in").
- Record `device_id` (random id kept in the member's browser), `ip_hash`, `user_agent` on each QR check-in. If one device checks in 3 or more DIFFERENT members within 24 hours, notify staff ("Possible shared-device check-ins") and mark those rows `flagged`.
- A setting `gym_settings.checkin_phone_enabled` (default true) lets the admin/clerk turn phone check-in off instantly; revoking a QR code stops it immediately.
- In your final reply add a short note for the owner: phone-only check-in is convenient but weaker than a login; stronger options later are a PIN, a one-time SMS code, or requiring the clerk to approve unusual cases.

## Step A: migration(s) (idempotent; enum change in its own file because a new enum value cannot be used in the same transaction)
- File 1: `alter type public.attendance_method add value if not exists 'qr_phone';` (nothing else).
- File 2:
  - `checkin_qr_codes`: `id`, `label`, `token_hash` (unique, SHA-256 of the raw token; the raw token exists only in the QR URL and is shown once at creation), `expires_at null`, `revoked_at null`, `created_by`, `created_at`, `last_used_at`, `scan_count`. RLS on, backend only.
  - `profiles.phone_normalized` (generated or trigger-maintained: digits only, `+63`/`63` -> `09...`, 10-digit `9...` -> `09...`) with an index; report existing duplicates (a query in the migration comments or a script) because a duplicate number must NOT check anyone in ("see the front desk").
  - `attendance`: add `device_id text`, `ip_hash text`, `user_agent text`, `source_qr_id uuid references checkin_qr_codes(id)`, `flagged boolean default false`, `checked_out_via text`.
  - `checkin_attempts` (`id`, `qr_id`, `phone_hash`, `ip_hash`, `outcome`, `created_at`) with an index on `created_at`.
  - `gym_settings.checkin_phone_enabled boolean not null default true`.
- Update the offline fake database (enum values, new tables/columns, unique token_hash) so tests enforce them.

## Step B: public check-in API (no login; `routes/publicCheckin.js`, mounted before auth, strict limiter)
- `GET /public/checkin/station?t=<token>` -> `{ valid, gym_name, phone_checkin_enabled }` (never errors with details; invalid/expired/revoked -> `{ valid:false, reason:'invalid'|'expired'|'revoked' }`).
- `POST /public/checkin/lookup { t, phone, device_id }` -> normalizes the phone, finds exactly one member by `phone_normalized`, evaluates state with the shared membership-state helper (Manila dates), returns one of:
  `ready` (display_name "Mae N.", plan name, valid_until, confirm_token, action `check_in`), `already_in` (checked in at 3:42 PM, confirm_token, action `check_out`),
  `expired` (ended Oct 30, "please renew at the front desk"), `not_started` (queued plan starts Nov 17), `suspended` ("please see the front desk"), `not_found` (same generic wording as multiple accounts: "We couldn't find an active membership for this number. Please see the front desk."), `maintenance`.
  Day-pass guests: if the number matches a walk-in visit that is `active` and valid today, return `ready` for that visit (check-in / check-out for re-entry the same day).
- `POST /public/checkin/confirm { confirm_token, device_id }` -> verifies the signed token (member, qr id, expiry, single use), calls `checkInMember({ memberId, method: 'qr_phone', ... })` (or the walk-in equivalent, or check-out), stores device/ip/user-agent, audit-logs, notifies staff only once per check-in (no notification spam),
  returns `{ status:'checked_in', time, plan_name, valid_until }` or `{ status:'checked_out', duration_minutes }`.
- Every public error uses friendly messages (never database wording). Add CORS only for the app origin. Add `PUBLIC_APP_URL` (used to build the QR URL) and `CHECKIN_CONFIRM_SECRET` to `.env.example`.

## Step C: clerk attendance API (requireAuth + clerk/admin)
- `GET /clerk/attendance/live` -> people currently inside (member or walk-in, name, code, plan, method, check_in_at, flagged), capacity from settings.
- `GET /clerk/attendance/log?date&method&state&search&page&limit` -> paged log (time in/out, duration, method, recorded by / source QR label, flagged) with totals.
- `GET /clerk/attendance/stats?date` -> on floor now, check-ins today, QR check-ins, desk check-ins, peak hour, flagged count.
- `GET /clerk/members/lookup?q=` -> up to 8 matches by name, mobile, member code or email with a computed status (active/expiring/expired/no plan/suspended) for the Fast Check-in box (no full member list download).
- `POST /clerk/attendance` (exists; keep, method `manual`), `POST /clerk/attendance/:id/check-out` (sets `check_out_at`, `checked_out_via`), `POST /clerk/attendance/check-out-all` (confirm in the UI; audit-logged).
- QR codes: `GET /clerk/attendance/qr-codes`, `POST /clerk/attendance/qr-codes { label, valid_for: 'day'|'7d'|'30d'|'until_revoked' }` (returns the raw token and URL ONCE), `POST /clerk/attendance/qr-codes/:id/revoke`. The old rotating `GET /clerk/attendance/qr` stays for the logged-in member flow and the live-screen mode.
- Method labels (`Desk`, `QR (logged in)`, `QR (mobile number)`, `Day pass`) come from one helper shared by the clerk page, member attendance page, dashboard and admin analysis; update them all (`attendanceMethod.js`).

## Step D: public member page `/check-in` (mobile first, no login, no app layout)
Route in `App.jsx` outside protected routes. Uses the brand look (dark, gym name/logo from settings, large touch targets, 390 px first, fast, no scrolling needed).
1. **Enter your mobile number**: big numeric input shown as `0917 123 4567`, accepts +63/63/9 formats, inline validation, "Remember this number on this phone" checkbox (stored in localStorage, prefilled next time), button "Continue".
2. **Confirm**: "Hi Mae N.!", plan name, valid until, big **Check in** button (or **Check out** if already in), "Not you?" link that goes back.
3. **Done**: animated check, time, plan, "Enjoy your workout" (or duration after check-out); the page does not auto-submit again on refresh.
States: invalid/expired/revoked QR ("This QR code is no longer valid. Ask the front desk for the current code."), too many attempts, number not found, expired plan, queued plan, suspended, maintenance, offline, server error with retry. Errors are inline cards plus the shared toast. Accessible (labels, focus order, `aria-live`).
The attendance then shows in the member's own account (`/member/attendance`) with the method label "QR (mobile number)". The existing logged-in `/member/check-in` keeps working (if a logged-in member opens `/check-in`, offer one tap).

## Step E: clerk Attendance page redesign
- Header: title, date picker chip, live stat tiles (On floor now with capacity bar, Check-ins today, QR vs desk split, Flagged), auto-refresh every 10 s while the tab is visible with a quiet "Updated 10:42 AM" label; a toast when a QR check-in arrives ("Mae N. checked in via QR").
- Left: **Fast Check-in** card: search box (autofocus, keyboard first, `/` focuses, Enter picks the first result, accepts a scanned member code), results list in the dark theme (avatar, name, code, status badge, plan, expiry, relative text), selecting shows a member card with a big **Check in** button; expired/suspended/no plan are blocked with a clear reason and a "Renew" shortcut (`/clerk/membership?member=<id>`); already inside shows **Check out** instead. Success toast, search clears and refocuses.
- **On the floor now**: cards or rows with name, Desk/QR/Day-pass badge, flagged icon, time in, live "inside for 42 min" timer, **Check out** (with `useConfirm` only for check-out all). Empty state when nobody is in.
- **Today's log**: filters (method chips, state In/Out, search), paged table, columns time in, time out, duration, member, method, recorded by or QR label, flagged; mobile cards under 992 px.
- **QR station** card (see step F).
- Skeletons shaped like the final layout, `InlineError` for failed loads, no raw errors, no `alert()`/`confirm()`.

## Step F: QR station (generate, download PNG, print, live screen)
- Tabs: **Printable QR** and **Live screen QR**.
- **Printable QR**: label ("Front door"), validity select (Today / 7 days / 30 days / Until revoked, default Until revoked), **Generate QR code**. On success show the QR large, the link, and buttons:
  **Download QR (PNG)** (the QR only, 1024 x 1024, white quiet zone), **Download poster (PNG)** (1080 x 1350 canvas: gym name, "Scan to check in", the QR, 3 short steps "1 Scan, 2 Enter your mobile number, 3 Tap Check in", small URL text; dark brand colors but QR on white), **Copy link**, **Print**. Generate in the browser with the `qrcode` package and a canvas; file names like `fitmetrics-checkin-front-door.png`.
  The raw token is only available right after creation; the list below shows existing codes (label, status Active/Expired/Revoked, created, expires, scans, last used) with **Revoke**. To download again later, offer "Generate a new QR" (old one revoked on confirm) because tokens are stored hashed.
- **Live screen QR**: the existing rotating token for a second screen, full-screen button, countdown, auto-refresh; works for the logged-in flow. Explain in one line how it differs.
- A "Test the page" button opens `/check-in?t=...` in a new tab. Show a visible warning if `PUBLIC_APP_URL` points to `localhost` ("Phones cannot open this address. Set PUBLIC_APP_URL to your public site or LAN address").

## Step G: abuse protection checks
Implement and test: rate limiting (IP, phone hash, QR), device flagging rule, QR revoke/expiry, confirm-token single use and expiry, identical generic response for not-found vs duplicate-number, `checkin_phone_enabled` off switch, maintenance mode.

## Step H: cleanup and consistency
- Update dashboard "recent attendance", member attendance page and admin analysis to show the new method labels and walk-in rows. Remove dead code from the old attendance page (the full member download).
- Nightly job: delete `checkin_attempts` older than 30 days; complete walk-in visits after `valid_until` (existing).

## Step I: tests and verification (paste output)
Extend `backend/scripts/test-registration-flow.mjs` (fake database must enforce the enum, unique token hash and unknown-column rejection) with a new section, or add `backend/scripts/test-checkin-flow.mjs`:
- station valid / expired / revoked / unknown token; QR with `valid_for: day` expires;
- lookup: ready, already_in, expired, not_started (queued), suspended, not_found, duplicate phone -> generic not_found, walk-in day pass same day, maintenance;
- confirm: creates exactly one attendance row with method `qr_phone`, `source_qr_id`, device/ip/user-agent; confirm token single use, expires after 2 minutes, bound to member and QR; second confirm is idempotent;
- check-out via public flow sets `check_out_at` and `checked_out_via`; clerk check-out and check-out-all;
- rate limits return 429; device with 3 different members in 24 h flags rows and notifies staff once;
- public responses never contain full name, phone, email or member code (assert on the JSON);
- `GET /clerk/members/lookup` finds by name, mobile, code, email and returns status;
- member attendance endpoint returns the row with the correct method label.
Also: `node --check` for changed backend files, frontend build, `node scripts/check-toast-migration.mjs` = 0, `node scripts/check-postgrest-embeds.mjs`, lint on changed files (prove "pre-existing" errors on the base commit).
Browser check (state what you could not test): generate a QR, download both PNGs and open them, scan with a phone on the same network (or open the link), run the 3 steps, see it on the clerk page within 10 s and in the member's account; revoke the QR and confirm the page rejects it; desktop and 390 px screenshots.
Final reply: a table of A-I with Done / Partly / Not done and evidence.

## Don't
- No full login from the public page; no personal data in public responses; no raw tokens in the database or logs; no hard-coded `localhost` URLs inside QR codes; no `alert()`/`confirm()`; no new dependencies beyond what is installed.
