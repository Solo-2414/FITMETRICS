---
description: "Finish the registration rebuild: offline test script, PayMongo webhook finalization for registration intents, and the complete receipt and welcome email."
agent: 'agent'
---
# Task 8i: Finish what 08h left open

Use the `design-freeze` skill. Do not change the UI. Work on the branch from 08h, commit after each part, and
do not report "done" while any of the three parts below is missing. These were reported as not implemented:

1. the offline `backend/scripts/test-registration-flow.mjs`
2. full webhook finalization for registration intents
3. complete receipt detail coverage (plus the welcome email)

## Part 1: webhook finalization (do this first, the test depends on it)
Files: `backend/src/routes/paymongo.js`, `backend/src/services/registration.js`.
- `POST /paymongo/webhook` must look up `registration_intents` by `provider_intent_id` (payment intent id from the event) BEFORE the old
  `payments` lookup. If it matches an intent, handle it here and return; otherwise keep the old member-payment behavior unchanged.
- Events: `payment.paid` -> `finalizeIntent`; `payment.failed` -> status `failed`, wipe `form_encrypted`; `qrph.expired` -> status `expired`, wipe `form_encrypted`.
- Keep the existing signature verification and the `paymongo_webhook_events` log (store the event id first, mark `processed_at` or `processing_error`).
  A duplicate event id returns 200 without doing the work again. An unknown intent returns 200 and logs it (PayMongo must not retry forever).
- `finalizeIntent` must be the same function used by the polling status endpoint and the dev simulate endpoint: conditional `pending -> processing`,
  amount and intent-id check, decrypt, duplicate re-check, `completeRegistration`, `paid`; failures after money arrived -> `needs_review` + staff
  notification + audit log; paid after cancel/expired -> `needs_review` + staff notification. Return 500 only for genuinely retryable errors.
- Export the webhook handler logic as a function (for example `handlePaymongoEvent(event)`) so the test can call it without HTTP.

## Part 2: complete receipt and welcome email
Files: `backend/src/services/mailer.js`, `backend/src/services/registration.js` (and `membership.js` where receipts are queued).
- Receipt payload is built from the committed rows (payment, membership, plan, profile, gym settings, clerk name), not from request data.
- The receipt MUST show: receipt number, date and time paid (Asia/Manila), business legal name / address / TIN / VAT status only when configured,
  title "OFFICIAL PAYMENT RECEIPT" only when legal name and TIN exist (otherwise "PAYMENT RECEIPT - ACKNOWLEDGMENT OF PAYMENT"),
  received from (name, member code, email), plan with period start - end, coach add-on, subtotal, student/promo discount, VAT breakdown only if
  VAT-registered, total in PHP, payment method label (Cash / QR Ph) and reference, cash tendered and change for cash, received by (clerk name),
  status PAID, footer note, support contact. Plain-text version too. Everything HTML-escaped; the subject line is plain text (no HTML escaping).
- Same email shell as the announcement email. Queue with `dedupeKey: payment:<id>:receipt` after the data is committed; a failed email never undoes
  the registration; honor the "Send receipt and welcome email" checkbox.
- Welcome email (same shell, pill "Welcome"): login link, member code, plan, expiry. Never the password.
- Receipts for old member payments (renewals) use the same renderer so they also stop being the short version; keep their existing payload fields working.

## Part 3: offline test script
File: `backend/scripts/test-registration-flow.mjs`. If the repo copy is still the old-design version (it tests disabled accounts and
`abandonPendingRegistration`), rewrite the scenarios and keep its helpers: an in-memory database that replaces `supabaseAdmin`
(`from`, `rpc`, `auth.admin`) and a small fake SMTP server on 127.0.0.1:2525 (the helpers already exist in that file; extend the fake database
with whatever methods the new code needs, such as `upsert`, `neq`, `ilike`, `or`). No network, no real Supabase, no real email.
Run with `node scripts/test-registration-flow.mjs`; exit code 1 on any failure.

Scenarios (each must be a named test):
1. duplicate email -> 409 MEMBER_EXISTS, nothing inserted; duplicate mobile -> 409; duplicate of a pending intent -> 409 REGISTRATION_PENDING.
2. invalid input -> 422 with per-field errors: 13-digit mobile, weak password, missing gender, no plan, coach toggle on with no coach.
3. QR start creates only a `registration_intents` row (no profile, auth user, membership or payment); `form_encrypted` is not readable plaintext (the
   password string is not found in the stored row).
4. QR cancel: `cancelled`, blob wiped, still no member rows; cancel twice is a no-op; cancel while PayMongo cancel call fails still ends `cancelled`.
5. Expiry job: stale intent -> `expired` and wiped; fresh intent untouched.
6. Webhook `payment.paid` via `handlePaymongoEvent`: exactly one profile, enabled auth user, membership, paid payment with receipt number, one receipt email and one
   welcome email queued; the same event delivered twice, and webhook + polling together, create nothing twice.
7. Webhook with a wrong amount -> `needs_review`, no member, staff notified. Webhook `payment.paid` after cancel -> `needs_review`, staff notified.
   Webhook `payment.failed` and `qrph.expired` -> `failed`/`expired`, blob wiped. Unknown intent -> 200 and logged.
8. Cash success creates everything atomically; tendered below total rejected; forced failure on the membership step leaves no profile and no auth user.
9. Email delivery: run `processEmailQueue` and assert on the delivered SMTP messages: receipt contains receipt number, date and time, plan and period,
   subtotal/discount/total, method, reference, "Received by", PAID; for a cash payment also tendered and change; subject has no HTML entities; the
   password string appears in NO delivered email; welcome email has the member code and login link.
10. With legal name and TIN configured the title says OFFICIAL; without them it says ACKNOWLEDGMENT; unset business fields are never printed.

## Done when
`node scripts/test-registration-flow.mjs` prints all PASS (paste the output), `node --check` passes for every changed backend file, the frontend build and lint
pass, the CSS diff for `ClerkMemberRegistration.module.css` shows added lines only, and the final reply lists anything still not done instead of calling it complete.
