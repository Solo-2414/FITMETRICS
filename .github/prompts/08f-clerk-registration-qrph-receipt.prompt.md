---
description: "Clerk Member Registration: block existing members, verify plan selection, QR Ph digital payment (PayMongo), no membership before payment succeeds, formal receipt email, and cash tendered auto-change."
agent: 'agent'
---
# Task 8f: Member Registration rework (QR Ph, no unpaid memberships, receipt, cash change)

Run after 8a-8e. This task REPLACES the registration parts of `08a` and `08c` where they conflict (GCash/Maya buttons on the
registration page, payment waiting panel). Keep everything else from those tasks.

Files: `frontend/src/pages/clerk/ClerkMemberRegistration.jsx` (+ .module.css), `frontend/src/components/clerk/PaymentWaitPanel.jsx`
(or whatever 8a named it), `backend/src/routes/clerk.js` (`POST /clerk/register`), `backend/src/routes/paymongo.js`,
`backend/src/services/membership.js`, `backend/src/services/mailer.js`, `backend/src/services/emailQueue.js`,
`backend/src/services/gymSettings.js` (or wherever `getGymSettings` lives), a NEW numbered migration.

## Current state (verified in the code)
- `POST /clerk/register` goes straight to `supabaseAdmin.auth.admin.createUser()` and only relies on the auth error string for a duplicate
  email. There is no check of `profiles.email`, phone or username, no friendly message, and no way to jump to the existing member.
- The Session plan is selectable on the registration page and goes down a walk-in branch that still demands an email and password.
  Walk-ins are handled by the Session Pass flow (task 8e), not registration.
- The submit handler reads fields by position (`inputs[0]` ... `inputs[5]`, `selects[0]`), so adding or reordering any input
  silently breaks the data sent. The default plan is hard-coded `"monthly"`.
- Payment methods are Cash / GCash / Maya. The e-wallet branch calls PayMongo Checkout Sessions (a hosted redirect page). The page ignores
  `checkout_url` and shows "Member account, membership, and payment were created successfully" right after the request, even though
  the payment is still `pending`. The account is created BEFORE payment, and a failed payment deletes the user only if
  the checkout call itself throws; an unpaid/expired/cancelled payment leaves an orphan account.
- Cash Tendered is an uncontrolled `<input>` with no state, and Change is the static text `₱0`. The "Reference Number" field is
  unused. The tendered amount is never sent to the server.
- The receipt email (`emailType: 'receipt'` in mailer.js) is a short plain paragraph, not the announcement layout.
- The "Send Digital Receipt" checkbox is not read by the code, and the helper text says it sends credentials (the password).

## 1. Existing member check (no duplicate registration)
- Backend: a helper `findExistingMember({ email, phone, username })` that checks `profiles` and Supabase auth (normalized: trim,
  lowercase email; phone digits-only compare for PH formats like 09xx, +639xx, 639xx). `POST /clerk/register` calls it BEFORE
  creating anything and returns `409 { code: 'MEMBER_EXISTS', field, member: { id, full_name, member_code, status } }`
  with a clear message. Also map the Supabase "already registered" auth error and unique-constraint errors to the same 409
  (race condition between two clerks).
- Add `GET /clerk/members/exists?email=&phone=` (clerk/admin only, rate limited) for live checking, returning only
  `{ exists, field, member: { id, full_name, member_code, status } }` (no other personal data).
- Frontend: check on blur/debounce (400 ms) of email and phone, show an inline warning under the field ("Already registered as
  NAME (FM-XXXX)"), disable "Complete Registration", and show two actions: "View member" (`/clerk/members?search=<code>`) and
  "Renew / change plan" (`/clerk/membership?member=<id>`). The server still enforces it if the browser check is skipped.
- A previous unpaid registration (see section 4) does not count as existing: it is shown as "Pending registration: resume payment".

## 2. Form and plan selection audit (fix everything you find)
- Convert the form to controlled React state (one `form` object), no positional reads, with inline validation: full name,
  valid email, PH mobile number, password rules (same as the sign-up page), gender required list, emergency contact name + number.
  Trim and normalize before sending. Disable all inputs and the submit button while saving; guard against double submit.
- Plans: load from `/clerk/plans`, list only membership plans that accounts can have (no Session plan here; send walk-ins to the
  Session Pass link from task 8e with a short hint), select the first available plan instead of hard-coded `"monthly"`,
  show plan name, duration, price and the student price only when the plan has one. The Student toggle only appears for plans that
  have a student price and recalculates the total. Coach assistant uses the server-side price (task 8c). Show one summary:
  plan, student discount, coach add-on, total due. If a plan or coach disappears (draft from yesterday), clear that selection.
- The local draft (localStorage) must NEVER store the password or payment details. Verify what `saveDraft` stores and remove anything sensitive.
- Remove the unused Reference Number input. Remove the helper text that says credentials are sent.
- After a successful registration reset the form, scroll to the top and show the result card (see section 5).

## 3. Digital payment: QR Ph through PayMongo
Replace the GCash and Maya buttons on this page with ONE digital option: "QR Ph (GCash, Maya, bank apps)". Cash stays.
Official flow (verify every field name against the current docs at https://developers.paymongo.com/docs/qr-ph-api before coding; do not
rely on memory): create a Payment Intent with `payment_method_allowed: ['qrph']`, create a Payment Method `type: 'qrph'`
(optionally `expiry_seconds`, allowed range 60-9000, default 30 min; use 900), attach it to the intent; the response has status
`awaiting_next_action` and `next_action.code.image_url` (base64 PNG) which is the QR. All three calls are made on the SERVER with the secret
key; the browser only receives the image and the payment id.

Backend:
- `createQrphPayment({ payment, amount, description, metadata })` in `routes/paymongo.js` (or a new `services/paymongoQrph.js`):
  amount in centavos (integer), currency PHP, `metadata.payment_id`, description "FITMETRICS membership - PLAN NAME". Save
  `provider = 'paymongo'`, `provider_intent_id`, `qr_expires_at`; do not log keys; do not store the base64 image in a list-able column
  (return it in the response, and expose a `GET /clerk/payments/:id/qr` that re-fetches it from PayMongo for resume).
- `payments.method` accepts `qrph` (migration; keep old gcash/maya/cash rows untouched). `gym_settings.payment_modes` accepts `qrph`
  and the Settings page offers it. Every report that splits cash vs digital (dashboard totals from 8e, payments page, admin reports)
  must count `qrph` as digital, not as "other".
- Confirmation: handle the webhook events `payment.paid`, `payment.failed` and `qrph.expired` (the signature check already exists; keep it),
  and keep `GET /clerk/payments/:id/status` (re-queries PayMongo, same code path as the webhook) as the polling fallback.
  Before activating, verify the paid amount equals the expected centavos and the intent id matches, otherwise mark
  `review_required` and notify staff. Idempotent: webhook and polling can both fire, and the same event can be delivered twice.
- Never lose money: if `payment.paid` arrives after the local QR has expired or after the clerk cancelled, still record it as
  paid, activate, and notify staff with the audit log line.
- Dev only, guarded by `NODE_ENV !== 'production'` and admin role: an endpoint that simulates a successful webhook for a payment so
  the flow can be tested without moving money. Disabled in production.
- Return clear errors: 503 "QR Ph is not enabled for this PayMongo account" when the account is not activated.

Frontend (shared `PaymentWaitPanel`, now QR-aware):
- After "Generate QR Ph" show: the QR image, the exact amount, plan, a countdown to expiry, status chip (Waiting for payment /
  Paid / Expired / Failed / Cancelled), "Cancel payment" and "Generate new QR". Poll the status every 3 s (stop on terminal state, on
  unmount, and when the tab is hidden for long). On Paid: success state, receipt info, "Register another member".
- Use the same panel and the same endpoints from `ClerkPayments` and `ClerkMembership` (replace their digital buttons too) so the three screens
  do not drift. Keep Cash behavior unchanged.

IMPORTANT testing note (put it in a comment at the top of the QR service and in your final report): PayMongo's docs say QR Ph needs
account activation and that QR Ph codes generated with TEST keys are LIVE QR Ph codes, so do not actually pay a test-mode QR with a
real banking app unless you intend to move real money. Use the dev-only simulate endpoint above instead.

## 4. No membership (and no usable account) until payment succeeds
- Cash: one atomic server operation, unchanged (account + membership + paid payment, rollback on failure).
- QR Ph: `POST /clerk/register` creates the account in a DISABLED state (cannot log in: use the auth ban or a
  `profiles.status = 'pending_payment'` plus the login check; inspect the allowed statuses first), creates `member_details`, and a `pending`
  payment with the registration snapshot (never the password). It does NOT create a `memberships` row. The clerk UI shows the QR.
- On `paid`: enable the account, create the membership (queued rules from 8a apply), set `payments.membership_id`, notify staff, queue the receipt
  and welcome emails (section 5). All in one idempotent function.
- On cancelled, failed or expired (and no later paid event): remove the disabled account and `member_details`, keep the payment row as
  history (set `member_id` null if the foreign key requires it and keep the registration snapshot so the receipt log still has a name),
  and free the email for a new registration. Run this cleanup on the status endpoint and in a scheduled job (the project already has
  one for emails; reuse it) for anything pending longer than the QR expiry plus a grace period.
- Reloading the page or a second clerk registering the same email while a payment is pending returns the existing pending registration
  with "Resume payment" (re-fetch the QR), not a duplicate.
- The UI must never say "registered successfully" until the status is `paid`.

## 5. Receipt email (formal) and welcome email
Sent only after status is `paid`, queued once (`dedupeKey: payment:<id>:receipt`), honoring the "Send digital receipt" checkbox
(stored on the payment so the status/webhook path knows). Use the SAME HTML shell as the announcement email (extract the shared layout if
8c has not already: logo, gym name, accent bar, pill label, footer) with the pill "Payment receipt".

Because I (the assistant) cannot confirm Philippine tax-receipt rules for your gym, make everything configurable and honest:
- New `gym_settings` fields (migration): `business_legal_name`, `business_address`, `business_tin`, `vat_status` (`vat` | `non_vat` |
  `unregistered`), `receipt_series_prefix`, `bir_permit_note` (free text, optional), `receipt_footer_note`, `support_email`, `support_phone`.
  Add them to the admin Settings page in a "Business & receipts" card (admin only; clerk cannot edit). Do not invent values.
- Title logic: if TIN and legal name are configured the header says "OFFICIAL PAYMENT RECEIPT" (still showing the note "Valid only if
  issued under the registered BIR receipting system"); otherwise "PAYMENT RECEIPT - ACKNOWLEDGMENT OF PAYMENT". Never print a TIN or
  permit number that is not configured. Add a short comment in the code telling the owner to confirm the receipt requirements with their
  accountant or BIR before relying on emailed receipts as official receipts.
- Receipt number: unique, sequential per year/series from a database sequence or counter row (not `random`/timestamp), format like
  `FM-2026-000123`, assigned once when the payment becomes paid, never reused.
- Contents: business legal name, address, TIN and VAT status when configured; receipt number; date and time in Asia/Manila;
  "Received from" (member name, member code, email); itemized table (plan name and period start - end date, coach add-on,
  subtotal, student/promo discount, VAT breakdown only when `vat_status = 'vat'` (VATable sales, VAT 12%, total), grand total in PHP with
  the amount in words); payment method label (Cash / QR Ph), reference (PayMongo payment id or last 6 characters, never secrets),
  cash tendered and change for cash payments; "Received by" (clerk display name); status PAID; refund/terms note from settings;
  support contact; a line "This is a system-generated receipt."
- Everything HTML-escaped, with a plain-text version, mobile friendly tables, and the amounts formatted `₱1,234.00`.
- Add an in-app "Print / Download receipt" (`GET /clerk/payments/:id/receipt` returning a print-friendly HTML page) and a "Resend receipt" button on the
  payments table row, using the same renderer so email and print match.
- Welcome email (separate, same shell): login link, member code, membership plan and expiry. NEVER include the password in any email;
  tell the member to use the password the front desk set, with a "Forgot password" link. Update the checkbox text accordingly
  ("Send receipt and welcome email").
- If the email provider fails, the payment and membership stay valid; the failure is logged and visible in the email queue, not shown as a payment error.

## 6. Cash tendered and change
- Controlled `cashTendered` state; `change = max(0, tendered - totalDue)` computed live and rounded to centavos; show `₱0.00` until a
  valid number is typed.
- If tendered < total, show "Short by ₱X.XX" in red and disable "Complete Registration". Quick buttons: "Exact", "₱500", "₱1,000",
  "₱2,000" (hide ones below the total). Number input with `min=0`, `step=0.01`, `inputMode=decimal`, no negative or scientific
  notation; reset when the payment method, plan, coach or student toggle changes.
- Send `cash_tendered` to the server; the server validates `>= total`, computes `change_given` itself, stores both
  (`payments.cash_tendered`, `payments.change_given`, in the migration) and prints them on the receipt. Never trust a client-sent change.
- Switching to QR Ph hides the cash block and clears these values.

## Don't
- Don't create a membership, send a "paid" receipt, or enable login before the payment is confirmed paid.
- Don't email or log passwords or API keys. Don't store card/wallet details. Don't open or print `.env`.
- Don't touch the member self-service payment flow beyond what shares the webhook; keep it working.

## Done when
- Registering with an email or phone that already exists is blocked in the UI and by the server with a clear message and links.
- Every plan selection works (price, student price, coach add-on, summary total equals the charged amount); no Session plan on this page.
- Choosing QR Ph shows a scannable dynamic QR with countdown; after (simulated) payment the page flips to Paid, the account is enabled,
  the membership appears, and a formal receipt email is queued once; cancelling or letting it expire leaves no membership, no
  usable account and frees the email for retry.
- Cash: typing the tendered amount updates the change instantly, short amounts block submission, and the receipt shows tendered and change.
- Receipt and welcome emails use the announcement layout, contain the fields above, and never contain the password.
- Frontend build + lint pass; backend `node --check` passes; run `/supabase-migration-review` (new columns, enum value, settings
  fields, receipt sequence, cleanup) and `/verify-before-done`.
