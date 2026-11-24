---
description: "Member Registration: rebuild the FUNCTION only (design frozen). Friendly validation, duplicate-member window, payment gate modal, no plan preselected, QR Ph with short timer and instant cancel, nothing saved until paid, receipt + welcome email."
agent: 'agent'
---
# Task 8h: Rebuild the Member Registration function (design is final)

Use the `design-freeze` skill. The current UI is approved: do NOT change layout, colors, spacing, class names, card titles or icons
of `ClerkMemberRegistration`. The only visual additions allowed are the ones listed below (inline error text, a plan-section error
banner, two modals, a gray button state, text tweaks). New UI must reuse the clerk modal look already used in `ClerkLayout`
(Fast Check-in modal) or the Dashboard cash-drawer modal, and the page's existing alert/input classes.

This task REPLACES the registration logic from `08f` (section 4: disabled accounts) and the "unpaid account cleanup" added after it.
The earlier design created the account BEFORE payment and then tried to delete it. That is the reason it keeps breaking
(constraint errors, leftover accounts, duplicate payments). Delete that approach completely.

Files: `frontend/src/pages/clerk/ClerkMemberRegistration.jsx` (+ .module.css, append-only), a new
`frontend/src/lib/registrationRules.js`, `frontend/src/components/clerk/PaymentWaitPanel.jsx` (registration use only),
`backend/src/routes/clerk.js` (`/clerk/register*`), `backend/src/routes/paymongo.js`, `backend/src/services/membership.js`,
a NEW `backend/src/services/registration.js`, `backend/src/services/mailer.js`, `backend/src/jobs/emailJobs.js`,
`backend/scripts/test-registration-flow.mjs`, a new numbered migration.

## Work in small checkpoints (this avoids another broken loop)
1. `git checkout -b registration-rebuild` and commit after every numbered step below. Do not start a step until the previous one passes its check.
2. Step order: (A) backend + migration, (B) backend test script green, (C) form validation + duplicate window, (D) plan section + payment gate +
   gray button, (E) QR Ph panel + timer + cancel, (F) emails, (G) cleanup script + final QA.
3. After each step run: `npm run build` (frontend), `node --check` on changed backend files, and the test script when it applies.
   If a check fails, fix it before moving on. Never leave the app in a broken state between steps.

## The requirements (exactly what I asked for)

### RED: the registration form
- Every field validates in a user-friendly way, the way professional apps do it: inline message directly under the field, red border,
  small error icon, `aria-invalid` + `aria-describedby`, `noValidate` on the form (no browser bubbles, no `alert()`).
  Validate on blur (after the field was touched) and on submit; the message disappears as soon as the value becomes valid.
  Messages say what to do ("Enter a valid email, for example name@example.com"), not what is wrong ("Invalid").
- Rules (one source of truth in `registrationRules.js`, mirrored by the backend validator; the server decides):
  full name 2-80 chars (letters, spaces, `.` `-` `'`); email valid, trimmed, lowercased, max 254; mobile and emergency number are PH
  mobile numbers (`09XXXXXXXXX` or `+639XXXXXXXXX`, exactly 11 digits after normalization; your sample "0932131321312" must be rejected);
  password at least 8 characters with a letter and a number; gender required; emergency contact name required.
  Show a quiet password rule hint under the field only while it is invalid.
- Existing member: when the email or mobile number already belongs to a member (check on blur, debounced, and again on submit; server
  enforces it), open a MODAL "Member already registered": say which detail matched (email or mobile), show the existing member's name,
  member code and current status, and give two buttons: "View member" (opens `/clerk/members` filtered to that member) and "Edit details"
  (closes the window and focuses the conflicting field with the inline error "This email is already registered").
  A duplicate NEVER reaches the payment step: the button stays gated, no QR is generated, nothing is saved.
- Also detect "this email/mobile has a registration waiting for payment right now" (see staging below) and say so in the same window
  ("A registration for this person is waiting for payment, expires in mm:ss") with a "Resume" option for the clerk who started it.

### GREEN: membership plans
- No plan is selected when the page opens, after "Clear form", after a successful registration, and when a stored draft is restored
  (drafts must never restore a plan). The payment card shows a neutral "No plan selected" row and `₱0.00` until a plan is picked.
- The student-rate checkbox only appears/applies after a plan with a student price is selected.
- If the clerk presses the payment button without a plan: smooth-scroll to the Membership Plan Selection card and show an inline error
  banner INSIDE that card (use the card's existing alert style in its danger variant, with an icon and the text
  "Please choose a membership plan to continue"), plus a red outline on the plan cards. The error clears the moment a plan is selected.

### ORANGE: payment card
- Payment is never started unless every required item is valid. If not, show a MODAL "Please complete the required information"
  that lists every problem (each item is clickable: closes the modal, scrolls to that field/section, focuses it). Primary button
  "Review form" does the same for the first problem. No QR is generated and nothing is sent to the server except the validation call.
- Cash: keep the live Cash Tendered and Change; tendered must be at least the total. Payment is confirmed by the clerk, so cash creates
  the member in one server-side atomic action when the button is pressed.
- QR Ph: the QR expiry is 5 minutes (`QRPH_EXPIRY_SECONDS`, default 300, minimum 60, set as `expiry_seconds` when creating the payment method;
  PayMongo starts the timer when the method is attached). The panel shows a countdown from the server's `expires_at`. At zero it shows "QR expired" with "Generate new QR".
- QR Ph has exactly ONE Cancel button, inside the QR panel. Clicking it cancels IMMEDIATELY: no confirm dialog, the UI returns to the
  filled-in form at once, and the server cancels the attempt in the background (retry on failure). Check the official PayMongo API
  reference for a cancel-payment-intent endpoint; if it exists, call it so the QR cannot be paid. If it does not exist for QR Ph, the local
  cancel still stands, the short expiry limits the risk, and a payment that still arrives is handled by the "paid after cancel" rule below.
- NOTHING about the member is saved to the database before payment succeeds. See "Nothing saved until paid" below.
- After the payment succeeds (cash or QR Ph) a receipt is emailed to the member in the announcement email format (see Emails).

### BLUE: the payment button
- While anything required is missing or invalid, the button looks gray (use `aria-disabled="true"` and a gray style, NOT the `disabled`
  attribute) but stays clickable. Clicking it runs the gate: opens the "complete the required information" modal and, when the modal is
  closed, scrolls to and focuses the first problem (plan problems scroll to the plan card with its inline banner).
- When everything is valid the button returns to its normal blue style. Labels stay as they are today: "Complete Registration & Send Email"
  for cash, "Generate QR Ph & Register" for QR Ph. While saving: spinner + disabled, never a double submit.
- Remove the Cancel button from the action panel. The only Cancel is the one inside the QR panel.

## Nothing saved until paid (architecture)
Cash and QR Ph both end in one server function `completeRegistration(intent)` that creates, together, the auth user (enabled), profile,
member details, membership (current/queued rules from task 8a), and the PAID payment with its receipt number.
No member row, auth user, membership or payment row exists before that moment. Remove the old disabled-account flow, the
`registration_snapshot` usage, `abandonPendingRegistration`, and the unpaid-account sweeper; replace them as below.

- New table `registration_intents` (migration, RLS enabled, no policies, backend-only): `id`, `status`
  (`pending | processing | paid | cancelled | expired | failed | needs_review`), `email_normalized`, `phone_normalized`, `plan_id`,
  `is_student`, `coach_id`, `amount_total`, `method`, `form_encrypted text` (the whole form including the password, encrypted with
  AES-256-GCM using `REGISTRATION_ENC_KEY` from `.env`; add it to `.env.example`; if missing, QR Ph registration returns a clear 503),
  `provider_intent_id`, `expires_at`, `created_by`, `created_at`, `completed_at`, `member_id` (filled after paid), `send_receipt`.
  Unique partial index so only one pending intent exists per `email_normalized` and per `phone_normalized`.
- The password is only ever stored encrypted inside that row, for at most the QR lifetime. On paid, cancelled, expired or failed,
  set `form_encrypted = null` in the same update (keep the non-personal columns for history).
- QR Ph start: validate (same validator, includes the duplicate check against profiles/auth AND other pending intents) -> create the
  intent row -> create the PayMongo intent/method/attach on the server -> store `provider_intent_id`, `expires_at` -> return the QR image,
  amount, `expires_at` and `intent_id`. If PayMongo fails, delete the intent row and return a clear error.
- Confirmation: webhook (`payment.paid`, `payment.failed`, `qrph.expired`) and `GET /clerk/register/qrph/:id/status` (polling fallback that
  re-queries PayMongo) both go through `finalizeIntent`. It first moves `pending -> processing` with a conditional update (so webhook and polling
  cannot both run it), verifies the paid amount equals `amount_total` and the intent id matches, decrypts the form, runs the duplicate check
  one more time, calls `completeRegistration`, sets `paid`. Any failure after money was received sets `needs_review`, notifies staff and
  writes an audit log (never silently ignore a paid payment). If auth user creation succeeds but a later step fails, delete that auth user (compensate).
- Paid after cancel/expiry: record it, set `needs_review`, notify staff ("refund in PayMongo or register the member again"), audit log.
- Cancel: `POST /clerk/register/qrph/:id/cancel` -> conditional update `pending -> cancelled`, wipe `form_encrypted`, call PayMongo cancel if
  available. Idempotent (cancelling twice is fine). Expired intents: a job every minute marks `pending` rows past `expires_at` as `expired` and wipes
  the blob (this replaces the old sweeper in `emailJobs.js`).
- Endpoints (adapt names to the project style): `POST /clerk/register/validate`, `POST /clerk/register/cash`, `POST /clerk/register/qrph`,
  `GET /clerk/register/qrph/:id/status`, `POST /clerk/register/qrph/:id/cancel`, dev-only `POST /clerk/register/qrph/:id/simulate-paid`
  (blocked in production, admin only, goes through the same `finalizeIntent`). Remove the old `/clerk/register` handler.
  All validate with the shared validator, require clerk/admin, rate-limit, and write `audit_log`.
- Duplicate-check errors return `409 { code: 'MEMBER_EXISTS', field, member: { id, full_name, member_code, status } }` or
  `409 { code: 'REGISTRATION_PENDING', field, expires_at }`; validation errors return `422 { errors: [{ field, message }] }`.
  The frontend maps these to the inline errors and the modals above.

## Emails (cash and QR Ph, sent only after the payment is confirmed paid)
- Use the SAME shell as the announcement email (logo, gym name, accent bar, pill label "Payment receipt", footer). Queue with
  `dedupeKey: payment:<id>:receipt` after the database work is committed; an email failure never undoes the registration.
- Receipt contents (all HTML-escaped, plain-text version included, Asia/Manila time): receipt number (`FM-YYYY-######` from the existing
  sequence), date and time paid, business legal name / address / TIN / VAT status from `gym_settings` when configured (never print
  unset values; title "OFFICIAL PAYMENT RECEIPT" only when legal name and TIN exist, otherwise "PAYMENT RECEIPT - ACKNOWLEDGMENT OF PAYMENT"),
  received from (name, member code, email), itemized table (plan and period start - end, coach add-on, subtotal, student/promo discount,
  VAT breakdown only if VAT-registered, total in PHP), payment method label (Cash / QR Ph) and reference (PayMongo payment id tail),
  cash tendered and change for cash, received by (clerk name), status PAID, footer note and support contact.
  The subject is plain text (do not HTML-escape the subject).
- Welcome email (same shell, pill "Welcome"): login link, member code, plan and expiry. NEVER include the password.
- Respect the "Send receipt and welcome email" checkbox (stored on the intent/payment).
- Text-only edits allowed on the page: helper under Email -> "Used to send your receipt and welcome email."; helper under the checkbox ->
  "Sends the payment receipt and a welcome email." (the old text promised credentials in the email).

## Success state
Inside the Payment & Digital Receipt card: "Payment received", receipt number, buttons "View member" and "Register another member".
The form resets (plan unselected, cash/QR cleared, draft removed).

## Don't
- No account, profile, member details, membership or payment row before payment is confirmed (cash counts as confirmed on submit).
- No password in any email, log, response, or unencrypted column. No `alert()`. No new page layout. No change to other clerk pages.
- Do not keep two registration code paths. Delete the old one.

## Tests (must be green before you say done)
Update `backend/scripts/test-registration-flow.mjs` (offline: in-memory database + local fake SMTP; I already wrote the harness for the old
design, keep its fake database/SMTP parts) to cover at least:
1. duplicate email -> 409, nothing inserted (including no staging row for cash); duplicate mobile -> 409; duplicate against a pending intent -> 409 REGISTRATION_PENDING.
2. invalid input -> 422 with per-field errors (13-digit mobile, weak password, missing gender, no plan).
3. QR start creates only a `registration_intents` row (assert: no profile, no auth user, no membership, no payment).
4. QR cancel -> status cancelled, `form_encrypted` null, still no profile/auth/membership/payment; cancelling again is a no-op.
5. QR expiry job -> expired and wiped; a fresh intent is untouched.
6. simulate paid -> exactly one profile, auth user (enabled), membership, paid payment with receipt number, receipt email and welcome email queued once; running finalize twice (webhook + polling) creates nothing twice.
7. wrong paid amount -> `needs_review`, no member created, staff notified. Paid after cancel -> `needs_review`, staff notified.
8. cash success -> all rows created atomically; cash tendered below total -> rejected; failure halfway -> no leftover auth user.
9. queue worker delivers the receipt over SMTP; assert the delivered mail contains receipt number, date, plan and period, amount, method, "Received by", PAID, and does not contain the password.
Also add the checks in the final reply: frontend build, lint, `/design-freeze`, `/verify-before-done`.

## One-time cleanup script
`backend/scripts/cleanup-unpaid-registrations.mjs`: lists auth users/profiles created by earlier registration attempts that have no membership and whose payment
is pending/cancelled/expired/failed (use the old `registration_snapshot`), prints them, and deletes them only with `--yes`. Run it once on my test data.

## Manual QA checklist (put it in the final reply with pass/fail)
Empty submit -> modal + scroll to first problem; every field error message; duplicate email/mobile window and "View member"; no plan -> plan banner;
button gray until valid; cash change math; QR generated with 5-minute countdown; Cancel returns to form instantly and Supabase shows no new rows;
simulate-paid creates everything once and the receipt arrives; refresh during QR resumes or cleanly ends; expired QR -> "Generate new QR".

## Done when
All of the above is true, the test script passes, the page looks identical to the approved design apart from the listed additions, and the final reply says
"Design unchanged: yes/no" with the git diff proof for the CSS file.
