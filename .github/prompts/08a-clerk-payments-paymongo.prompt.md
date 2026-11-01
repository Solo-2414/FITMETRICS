---
description: "Clerk payments: connect GCash/Maya to PayMongo everywhere (Payments, Member Registration, Membership renewal), stop new payments from overwriting an existing plan, remove the Online/Card option, fix payment bugs."
agent: 'agent'
---
# Task 8a of 8d: Clerk payments + PayMongo + membership stacking

Do this task FIRST. Tasks 8b-8d reuse the payment flow built here.

Files: `frontend/src/pages/clerk/ClerkPayments.jsx`, `ClerkMemberRegistration.jsx`, `ClerkMembership.jsx` (+ .module.css),
`backend/src/routes/clerk.js`, `backend/src/routes/paymongo.js`, `backend/src/services/membership.js`,
tables `payments`, `memberships`, `walk_in_visits`, `promos`, `coaches`, `gym_settings.payment_modes`.

## Current state (verified in the code)
- PayMongo already exists, but ONLY as `POST /payments/online` (used by the member billing page and by the "online" button in
  ClerkPayments). It stores `method: 'other'`, allows `['card','gcash','paymaya','grab_pay']`, and only accepts plans with
  `account_eligible = true` (so the Session plan can never use it).
- `POST /clerk/payments`, `POST /clerk/register` and `POST /clerk/memberships` accept `payment_method` = cash | gcash | maya and
  mark the payment `paid` immediately. Nothing is sent to PayMongo, so GCash/Maya are only labels. A clerk can "collect" an
  e-wallet payment that never happened.
- ClerkPayments has three method buttons: GCash, Maya, and "Online / Card" (`paymentMethod === "online"`). Remove "Online / Card".
- `createMembershipAndPayment()` (services/membership.js) ALWAYS inserts a new `memberships` row with `status: 'active'`, even when
  the new `start_date` is in the future (it starts the day after the current end date). Every reader then treats it as the current
  plan: `GET /clerk/members` takes "latest by created_at" as the member's membership, attendance checks use
  `status = active AND end_date >= today` and ignore `start_date`, and the UI shows the newest plan. That is why a new payment on a
  member with an ongoing plan looks like it overwrote the plan. Reproduce this first, then fix it at the root.
- `/clerk/register` trusts `coach_addon_amount` from the browser (the page hard-codes 500) and ignores student price rules,
  promos and `gross_amount`/`discount`. `/clerk/memberships` ignores student price and promos.
- `activatePaymentMembership()` (used after PayMongo confirms payment) creates the membership but drops `coach_id` and the coach
  add-on, and cannot handle walk-in (Session) payments.
- Promo `usage_count` is incremented when checkout is created, not when it is paid.
- Webhook (`/api/paymongo/webhook`) and `POST /payments/:id/sync` already exist and must keep working.

## Business rules (use these; state any assumption)
1. Cash is the only instant method. It is recorded as `paid` right away, as today.
2. GCash and Maya ALWAYS go through PayMongo Checkout. The payment is `pending` until PayMongo confirms it (webhook, or the
   `/payments/:id/sync` fallback). No membership/visit becomes active before that.
3. Store the real method: `cash`, `gcash` or `maya` (never `other`). If the `payments.method` column or enum does not allow them,
   add them in the migration. PayMongo `payment_method_types` must be exactly `['gcash']` or `['paymaya']`: verify the current
   names in the official PayMongo Checkout Sessions docs, not from memory. No card, no grab_pay for the clerk flow.
4. A new payment on a member who already has an active or upcoming plan NEVER edits or replaces the existing membership row.
   It creates a QUEUED membership that starts the day after the last end date (same plan = extend, different plan = queued next).
   The current plan keeps its dates and status until it ends.
5. Pricing is always computed on the server with `priceFor()`/`getPromo()` (student price, promo, coach add-on from the `coaches`
   table). Never trust amount, discount or coach amount from the request body.

## Database (next numbered migration; check the highest number first)
- `memberships`: add a way to tell current from queued. Preferred: keep `status` values as they are and treat
  `start_date <= today(Manila) <= end_date` as current and `start_date > today` as queued, but add a view or helper
  (`current_membership(member_id)`) and an index on `(member_id, start_date)`. Only add a new status value if the existing
  enum/CHECK allows it safely.
- `payments`: add nullable `coach_id uuid references coaches(id)`, `coach_addon_amount numeric(12,2) default 0`,
  `checkout_url text`, `failure_reason` if missing, and make sure `method` accepts `cash | gcash | maya`.
- Backfill: existing rows with `method = 'other'` and `provider = 'paymongo'` stay as they are (do not guess).
- RLS on any new table; do not run the SQL, tell me the file to run. Run `supabase-migration-review` on it.

## Backend
- One shared function `startClerkPayment({ kind, memberId|guest, plan, isStudent, promoCode, coachId, method, actorId })` in
  services/membership.js (or a new services/payments.js) used by ALL three routes. `cash` -> existing paid flow;
  `gcash|maya` -> insert a `pending` payment with the real method, `coach_id`, `coach_addon_amount`, create the PayMongo
  checkout session (line items: plan, plus a separate "Coach add-on" line when present, amount in centavos), save
  `provider_checkout_id` and `checkout_url`, return `{ payment, checkout_url, pricing }`.
- `POST /clerk/payments`, `POST /clerk/register`, `POST /clerk/memberships` call it. Remove the `account_eligible` restriction
  for staff-initiated PayMongo payments (Session must work), keep it for member self-service.
- `/clerk/register` with gcash/maya: create the member account and details first, create the pending payment, and activate the
  membership only when paid. If the PayMongo session cannot be created, roll back exactly as the cash flow does today.
  Registration must not create duplicate accounts if the clerk retries.
- Extend `activatePaymentMembership()` to read `coach_id`/`coach_addon_amount` from the payment, to create the queued-membership
  dates from rule 4, and to activate a `walk_in_visits` row for Session payments. It must be idempotent (webhook + sync can both
  fire). Increment `promos.usage_count` here, when the payment becomes `paid`, not at checkout creation.
- `GET /clerk/payments` supports `from`, `to` (Manila dates), `status`, `method`, `search`, `page`, `limit`, returns
  `{ rows, total, totals }` (totals = paid sum, cash sum, e-wallet sum, pending count) and no longer caps silently at 100.
- Pending/expired/failed handling: `POST /clerk/payments/:id/cancel` (pending only, audit logged), and a status refresh endpoint
  that reuses `/payments/:id/sync`.
- Validate every body field, write `audit_log` for every create/cancel/resend, never log keys.
- If `PAYMONGO_SECRET_KEY` is missing return a clear 503 message ("PayMongo is not configured"), and the UI disables GCash/Maya
  with that reason. Cash keeps working.

## Frontend
- ClerkPayments: remove "Online / Card" and every `paymentMethod === "online"` branch. Methods: Cash, GCash, Maya (respect
  `gym_settings.payment_modes`). For GCash/Maya after "Record Payment": show a "Waiting for payment" panel with the checkout
  link as a QR code (use the existing `qrcode` package) plus "Open checkout" and "Cancel payment" buttons, and poll the
  `sync` endpoint every 3-5 s (stop on paid/failed/expired/cancel or when leaving the page). Show success only after `paid`.
- Payment table: real method badge, status badge (paid, pending, failed, expired, cancelled), receipt number, resend receipt on the
  row you click (not "latest transaction of the selected member"), date filter, method filter, status filter, search, pagination,
  loading/error/empty states. Fix the other bugs you find (stale selected member after save, double submit, amounts not
  formatted as pesos, wrong totals, state not reset after success). List every bug you fixed.
- ClerkMemberRegistration and ClerkMembership (renewal counter): same Cash/GCash/Maya buttons and the same waiting panel
  (extract ONE shared component, e.g. `components/clerk/PaymentWaitPanel.jsx`). Send `coach_id` only; remove the hard-coded 500.
  Show the server-calculated price (call a `POST /clerk/payments/quote` endpoint or reuse `priceFor` through a small quote route)
  so the number on screen is the number charged.
- Wherever a member's plan is shown, show the CURRENT plan and, if present, a "Queued: <plan> starts <date>" line.

## Don't
- Don't change the layout or class names; add only what is listed. Don't touch admin pages or the member billing page behavior
  (member self-service payment must keep working; it shares `payments/online`, `payments/:id/sync` and the webhook).
- Don't mark an e-wallet payment paid from the browser. Don't open or print `.env`.

## Done when
- Cash payment: instant, receipt email queued. GCash/Maya (PayMongo test mode): pending -> paid via webhook or sync, then the
  membership/visit appears; closing the tab and paying later still activates it once.
- A member with an ongoing Monthly plan who pays Weekly keeps the Monthly row untouched, gets a queued Weekly, and the
  Payments/Membership/Member Information pages show both correctly. Attendance uses only the current plan.
- No "Online / Card" anywhere in the clerk UI. Coach add-on amount cannot be forged from the browser.
- Double-clicking Record Payment never creates two payments. Promo usage increments once per paid payment.
- Frontend build + lint pass; backend `node --check` passes; run `/supabase-migration-review` and `/verify-before-done`.
