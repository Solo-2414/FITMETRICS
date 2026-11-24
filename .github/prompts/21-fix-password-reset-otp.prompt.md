---
description: "Fix forgot-password: a 6-digit OTP must actually arrive by email and work. Backend-owned OTP sent through the existing Brevo/Mailjet queue."
agent: 'agent'
---
# Task 21: Fix the password-reset OTP

Use `toast-feedback`, `design-freeze`, `supabase-migration-review` and `verify-before-done`.

## What I found (verify each point yourself, do not trust me)
- `frontend/src/pages/ForgotPassword.jsx` calls `supabase.auth.resetPasswordForEmail()` and then `supabase.auth.verifyOtp({ type: "recovery" })`.
  Supabase sends a magic LINK by default; a code is sent only if the dashboard "Reset Password" template uses `{{ .Token }}` (SETUP.md step 5).
  Supabase's own mailer is also heavily rate-limited, and SETUP.md says Supabase Auth email does NOT go through our Brevo/Mailjet queue.
- The backend already has the `password_otp` email type (`services/mailer.js` renderEmail, `services/emailQueue.js` TRANSACTIONAL_TYPES),
  but nothing enqueues it (grep to confirm). `member_check_in_codes` (migration 033) already stores hashed one-time codes with attempts and expiry: copy that pattern.
- The page shows errors as red inline text (`setError`), not the global toast.

## Step 0: reproduce first
Start from the symptom: request a code, say exactly what arrives (nothing / link / code / delay) and which error appears. If you cannot run the
app, say so and list the most likely causes in order. Do not skip to the rewrite without writing this down.

## Build (backend owns the OTP, Supabase Auth only stores the new password)
1. Migration (next number): `password_reset_codes` (id, user_id, code_hash, expires_at, attempts, used_at, created_at, request_ip_hash). RLS on, no grants to anon/authenticated.
   Idempotent. Run `supabase-migration-review` on it.
2. Routes under `/api/auth` with path-prefixed guards only (they are public, so each has its own `express-rate-limit`):
   - `POST /password-reset/request {email}`: always answers the same generic success (no account enumeration, same timing). If the account exists and is active,
     create a 6-digit code with `crypto.randomInt`, store a salted HMAC/hash (never the code), expiry 10 min, invalidate older codes, enqueue `password_otp` through `emailQueue`.
     Limits: per email and per IP, 60 s resend cooldown enforced on the SERVER.
   - `POST /password-reset/verify {email, code}`: constant-time compare, max 5 attempts, then lock that code. Returns a short-lived signed reset token (single use, 10 min).
   - `POST /password-reset/confirm {email, resetToken, newPassword}`: validate password rules (same rules the UI shows: 8+ chars and a number or symbol), set it with the Supabase admin API,
     mark code used, revoke existing sessions, write `audit_log` (no secrets), send a "your password was changed" email.
3. `mailer.js` `password_otp` template: check it shows the code big, the expiry, "ignore this if it was not you", uses the branded shell and escapes everything. Fix only what is wrong.
4. Frontend `ForgotPassword.jsx`: edit in place, keep markup and class names. Replace the Supabase calls with `api()` helpers in `lib/api.js`. Remove `setError` banners:
   action results use `toast` / `toastError`; invalid code shows a field-level message under the OTP boxes. Add: paste-6-digits-into-the-boxes, auto-submit on the 6th digit,
   a resend button that shows the server's cooldown, disabled state while busy, and a friendly "code expired, request a new one".
5. Do not change `Login.jsx` behavior except its remaining `alert-warning` banner if it is an action result.

## Tests (no network, scripts in `backend/scripts/`)
`test-password-reset.mjs`: generic response for unknown email; wrong code 5 times locks; expired code rejected; a used code cannot be reused; resend cooldown;
raw code never appears in DB rows, logs or responses.

## Don't
Don't edit `.env`. Don't send the OTP from the browser. Don't leave the Supabase "Reset Password" template as a dependency: say in the final reply that it is no longer used.
Final reply: the cause you confirmed, the migration to run, manual test steps (real inbox, wrong code, expired code, resend spam, two tabs).
