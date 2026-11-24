---
description: "Amendment to task 14: replace SMS-style verification with free options (trusted device + email code, clerk device reset), make the rotating screen QR the default, and forbid design changes outside the attendance scope."
agent: 'agent'
---
# Task 14b: Free verification for phone check-in + design isolation

Apply on top of task 14 (`14-clerk-attendance-rebuild-phone-qr.prompt.md`). No SMS provider and no paid API may be used.
Two problems to fix: (1) a phone number alone is weak proof of identity; (2) task 14 changed the look of OTHER pages. Both are handled here.

## Part 1: Design isolation (do this first)
Task 14 may only change the look of: `ClerkAttendance.*`, the new public check-in page (`PublicCheckIn.*`), and new files created for this feature.
It broke other pages (wrapped top-bar user name, stretched "Fast Check-in" / "Clear form" / "Register New Member" buttons, a broken Member Information toolbar, cramped Membership cards).
- Do NOT edit `index.css`, `App.css`, `styles/*`, any `*Layout.module.css`, or any CSS module of another page. New styles go in `ClerkAttendance.module.css`, `PublicCheckIn.module.css` or new `*.module.css` files.
  Shared components (`ClerkModal`, `ClerkToast`, `InlineError`, `ConfirmProvider`, payment components) may only get OPTIONAL props whose default keeps the old look.
- Never add global element selectors (`button`, `input`, `a`, `h1`...), `!important` on shared classes, or changes to Bootstrap variables.
- Restore: I will run `node scripts/check-design-scope.mjs --baseline <my backup folder> --allow ClerkAttendance,PublicCheckIn,checkin --restore` to put the other pages' CSS back from my last good backup.
  If the restore removes a class that your new code needed, move that class into one of your allowed files instead of touching shared CSS.
- Add `frontend/scripts/check-design-scope.mjs` (I am providing it). At the end of this task run it with `--baseline <backup folder path I give you>` and paste the output. It must print `No out-of-scope style changes.`
  Also run `git diff --stat` on `frontend/src/index.css frontend/src/App.css frontend/src/components` and explain every line that changed.
- Take screenshots of Dashboard, Member Registration, Member Information, Membership, Payments, Notifications and Settings at 1920 and 1366 px and confirm they look the same as before (top bar user name on one line, buttons at their normal width).

## Part 2: Free ways to verify the member (replace the SMS idea)
Default security mode `device_email_code`; keep `phone_only` as an admin-selectable setting (`gym_settings.checkin_security_mode`: `phone_only` | `device_email_code`).

### Rotating screen QR as the default for display
The live-screen rotating QR (valid about 2 minutes) proves the person is at the gym. In the clerk QR station make **Live screen QR** the first tab and the recommended option; the printable QR keeps working but its default validity is "Today" and the UI says
"A printed QR can be photographed and shared. Trusted-device verification protects against that."

### Trusted device + email code (free)
- New table `member_check_in_devices`: `id`, `member_id`, `device_hash` (SHA-256 of a random secret), `label` (browser/OS from the user agent), `created_at`, `last_used_at`, `expires_at` (90 days, sliding), `revoked_at`. RLS on, backend only. Max 3 active devices per member (the oldest is revoked when a 4th is added).
- Flow on `/check-in`:
  1. Member enters the mobile number. The page sends the number plus its saved `device_id` and `device_secret` (stored in localStorage) if it has them.
  2. If the device is trusted for that member -> straight to the confirm step (name + Check in), as in task 14.
  3. Otherwise the server answers `needs_verification` with the masked email (`m***@gmail.com`) and nothing else. The member taps **Email me a code**.
  4. `POST /public/checkin/send-code` sends a 6-digit code to the member's email on file. Rules: code stored only as an HMAC hash, expires in 10 minutes, max 5 wrong attempts then it is invalidated, max 3 codes per member per hour, max 5 per IP per hour, constant-time comparison.
  5. `POST /public/checkin/verify-code` checks the code; on success the server creates the trusted device (returns a new `device_secret` once), then returns the normal confirm token.
  6. From then on this phone only needs the number (until it expires or is revoked).
- If the member has no email, the email cannot be sent, or the code attempts are exhausted -> state `needs_clerk`: "Please see the front desk to check in." (the clerk can check them in at the desk as usual).
- Day-pass guests (walk-ins) do not need a code: they are already checked in at the desk and the same-day re-entry stays phone-only, but still limited by the rate limits and flags from task 14.
- Email: new email type `checkin_code` (add it to the `email_log.email_type` CHECK constraint in the migration; remember the earlier "welcome" failure). Same announcement-style shell, pill "Check-in code", the code large, "expires in 10 minutes", "If you didn't request this, ignore this email." Send immediately (not through the slow queue), but still log it in `email_log`; fail friendly if the daily email capacity is reached.
- Never log or return the code or the email address in full.

### Manage devices
- Member: in their profile page add a small "Check-in devices" list (label, last used, Remove). Reuse the page's existing card style (additions only).
- Clerk: on the member's row/card in Attendance or Member Information, an action "Reset check-in devices" (confirm dialog, audit-logged) for a lost phone.

### Optional extra signals (soft only, never block alone)
- Record whether the request came from the gym's public IP if the admin sets `gym_settings.gym_public_ip` (shown as "On gym Wi-Fi" in the clerk log); do not require it.
- Keep the flagging rule from task 14 (3 different members from one device in 24 h).

## Tests (extend the check-in tests; paste output)
- Unknown device -> `needs_verification` with masked email only; code email is sent; correct code creates a trusted device; wrong code 5 times invalidates; expired code rejected; codes are single use; rate limits return 429.
- Trusted device skips the code; a different phone with the same number needs the code; revoked/expired device needs the code again; 4th device revokes the oldest.
- A device trusted for member A does not work for member B.
- Responses never contain the code, the full email, full name, member code or phone.
- Member without email -> `needs_clerk`.
- `email_log` insert for `checkin_code` passes the type constraint in the fake database.
- Existing task 14 tests still pass; `node scripts/check-design-scope.mjs ...` prints no violations.

## Done when
The security mode works as described, the clerk can reset a member's devices, the live screen QR is the recommended default, other pages look exactly as before, and the final reply has the A-I table from task 14 plus these two parts, each marked Done / Partly / Not done with evidence.

## Part 3: root cause of the broken designs and a permanent guard (added after investigation)
The other pages broke because `frontend/src/pages/CheckIn.module.css` contained bare element selectors (`h1`, `label`, `input:not([type="checkbox"])`, `button`, `button:disabled`).
CSS Modules only scope class and id names; bare element selectors become GLOBAL rules, and `App.jsx` imports the page eagerly, so every `button` in the app became full width, blue and padded.
`ClerkPayments.module.css` also had bare `table`, `th`, `td` rules (fixed by scoping them under `.tableWrap`).
- Every selector in a `*.module.css` file must contain a class or id (for example `.card button`). Never write bare element selectors, `*`, `body`, `html`, or `:global(...)` in module files.
- Add `frontend/scripts/check-css-module-scope.mjs` (provided) and run `node scripts/check-css-module-scope.mjs` after every frontend task. It must print `No global-leaking selectors in CSS modules.` Paste the output in the final reply.
- Prefer lazy-loading rarely used pages (`React.lazy` for `/check-in`) only if it does not change behavior; scoping is still mandatory.
