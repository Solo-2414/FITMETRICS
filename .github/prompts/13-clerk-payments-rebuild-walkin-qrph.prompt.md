---
description: "Rebuild the clerk Payments page: QR Ph + cash for members and 1-day walk-in sessions, a walk-in customer log for the owner, and a single source of truth so a new payment never looks like it overwrote the member's plan."
agent: 'agent'
---
# Task 13: Payments page rebuild (QR Ph, 1-day walk-in session, customer log, no plan "overwrite")

Same branch as earlier tasks. Lettered steps A-H, commit after each, run the build and the offline tests after each. Use `design-freeze` for everything outside
`ClerkPayments.*`. The Payments page itself may be improved visually, but it must stay in the pattern of the Membership and Registration pages
(step cards on the left, sticky "Summary & Payment" card on the right, dark cards, existing variables, the shared toast, `ClerkModal`, `useConfirm`).
Do not claim done until the tests in step H are green and pasted.

## What is wrong today (verified in the code)
1. **The "plan overwrite" is a display problem, and I found the cause.** A paid renewal creates a NEW queued membership row (it does not edit the old one), which is correct.
   But several readers pick the membership with the LATEST `end_date` as "the member's plan", so the queued plan appears as the current one:
   `routes/member.js` (two queries, `order('end_date' desc).limit(1)`), `routes/admin.js` (roster, around line 190, "latestMembership" map, and the queries near lines 309, 400, 432),
   `routes/users.js` (member detail, around line 120). Only attendance check-in and the clerk roster use proper date-bounded logic.
2. Member **cash** payments from this page cannot succeed: the page never sends `cash_tendered`, and `createMembershipAndPayment` requires it, so it throws "Cash tendered must cover the total amount due."
3. **QR Ph does not exist here.** `startClerkPayment` throws for `qrph`; the page still offers GCash and Maya through PayMongo Checkout links that open in a new tab; session e-wallet payments are rejected.
4. **Walk-in sessions are barely recorded.** A cash walk-in stores only `guest_name`/`guest_phone` on `walk_in_visits` and a payment with NO receipt number, no cash tendered/change, no email receipt,
   no customer record, and no attendance. The owner has no customer log, repeat guests are not recognized, and the page has no validation.
5. The page duplicates the renewal logic that already exists on the Membership page (different endpoint, different rules), and "Resend receipt" uses "the latest transaction of the selected member" instead of the row you click.

## Step A: one source of truth for "current plan"
- Migration + shared helper: a SQL view `member_membership_state` (or an RPC) and a backend helper `getMembershipState(memberId | memberIds[])` returning
  `{ current, queued: [..sorted by start_date], last_expired }` using Asia/Manila dates: current = `status = 'active' AND start_date <= today <= end_date`; queued = `status = 'active' AND start_date > today`.
- Replace every "latest end_date" reader with it: `member.js` (both places), `admin.js` (roster and the other listed queries; reports that count active members use current only), `users.js` member detail, clerk roster.
  Return `membership` (current) and `next_membership` (first queued) separately; UIs show "Next: Weekly Pass starts Nov 17" and never present the queued plan as current.
  Search for any other `.from('memberships')` read (`grep -rn "from('memberships')" backend/src`) and justify each one you leave unchanged.
- Rule (assert in a test): a payment NEVER updates or deletes an existing membership row; it only inserts a new one (start = day after the latest end date, or today when there is no current/queued plan).

## Step B: walk-in data model (migration 0NN)
- `walk_in_customers`: `id`, `customer_code` (`WI-2026-000123`, sequential from a DB sequence/counter), `full_name`, `phone_normalized` (unique when not null), `email_normalized` (unique when not null),
  `is_student`, `notes`, `first_visit_at`, `last_visit_at`, `visit_count`, `created_at`. RLS enabled; backend-only like other staff tables.
- `walk_in_visits`: add `customer_id uuid references walk_in_customers`, `guest_email`, `is_student`, `notes`, `valid_until timestamptz` (end of that Manila day), `payment_id`, `checked_in_at`.
  Existing rows stay valid (backfill customers from existing guest name/phone best-effort in the migration; rows with neither stay as-is).
- Receipts for walk-ins use the same receipt number sequence and renderer (title "Day Pass Receipt").
- A scheduled job completes visits after `valid_until` (existing 00:05 job or a new one): `status = 'completed'`.
- Update the offline fake database and the payments constraint emulation for the new tables and for `payments_subject_check` (member XOR walk-in, with the registration exception from migration 024).

## Step C: walk-in flow (backend), same safety rules as registration
Staging so nothing is saved before payment: reuse `registration_intents` with a new `kind` column (`'registration' | 'walkin'`; add it in the migration) and the same encrypted-form pattern
(`REGISTRATION_ENC_KEY`), expiry (5 minutes), `finalizeIntent` (conditional `pending -> processing`, amount and intent-id checks, `needs_review`, paid-after-cancel handling), and dev simulate flag.
- `POST /clerk/walkins/validate`: name 2-80 chars, PH mobile (11 digits after normalization) REQUIRED, email optional and valid, plan = the Session plan (server picks it; the client cannot choose another), student flag only if the plan has a student price.
  Duplicate logic: (a) phone/email matches a registered MEMBER with an ACTIVE or queued plan -> `409 MEMBER_HAS_ACTIVE_PLAN` with member summary (UI offers "Use member payment" and, only after a confirm dialog, "Continue as walk-in");
  matches a member without an active plan -> `200` with `{ member_match }` so the UI can suggest registering/renewing but allow continuing; (b) matches an existing walk-in customer -> `200` with `{ returning: { customer_code, visit_count, last_visit_at } }` and the visit reuses that customer.
- `POST /clerk/walkins/cash`: validates (incl. tendered >= total, server computes change), then ONE atomic server function creates customer (upsert by phone/email), visit (`active`, `valid_until` end of today Manila),
  PAID payment (receipt number, tendered, change, `walk_in_visit_id`), attendance check-in (`walk_in_visit_id`, method `manual`) unless the clerk unticked "Check in now", audit log, and queues the receipt email ONLY if an email was given. Failure at any step leaves nothing behind.
- `POST /clerk/walkins/qrph` (create staged intent + PayMongo QR, 5-minute expiry, return the shared QR contract `{ payment_id/intent_id, qr_image_url, expires_at, amount_total, simulation_enabled }`),
  `GET /clerk/walkins/qrph/:id/status`, `POST /clerk/walkins/qrph/:id/cancel` (immediate), dev-only `.../simulate-paid`, webhook routing by `provider_intent_id` to the same `finalizeIntent`. On paid: same creation as cash with method `qrph` and the PayMongo payment id as reference.
  One pending walk-in QR per phone number (resume instead of error, like the renewal flow).
- Emails for walk-ins use the shared announcement-shell receipt renderer (itemized, date/time, "Valid today until 11:59 PM", method, reference, received by, business details when configured).

## Step D: member payment flow (no duplicated logic)
- Extract the Membership page's renewal form and payment panel into shared components (`components/clerk/payments/MemberPaymentForm`, `PaymentSummaryCard`, `QrPaymentPanel`) and use them on BOTH pages, with the same endpoints
  (`POST /clerk/payments/quote`, `POST /clerk/memberships` for cash and QR Ph, `GET /clerk/payments/:id/status`, cancel, simulate). Same rules: no membership before payment, queued after the current plan, resume pending QR, immediate cancel.
- `POST /clerk/payments` (the old combined route): remove its Checkout-based GCash/Maya branches. Keep only what other callers still need; grep every caller first. After the page is migrated, delete the dead code or return `410` with a clear message.
- Remove GCash and Maya from the clerk UI everywhere (Cash and QR Ph only; honor `gym_settings.payment_modes`).
- Show clearly what a payment will do for the selected member: "Current: Monthly Regular until Nov 16" and "This payment starts Nov 17 (queued)". Never present it as a replacement.

## Step E: Payments page UI
Keep: title and date chip, Daily Cash Drawer Summary (relabel "GCASH / MAYA TODAY" to "QR Ph / digital today" and make every figure come from `paid_at`-based server totals; keep Record Starting Float and End of Day Review working).
- Mode switch (segmented control): **Walk-in session** | **Member payment**. Keep `?mode=walkin|member` in the URL; with no mode, ask which one (current behavior).
- **Walk-in session** (left step cards + sticky right summary, like Registration):
  1. Customer: Full name*, Mobile*, Email (optional, helper "for the receipt"), Student toggle (only if a student price exists), Notes (optional), checkbox "Check in now" (default on), small privacy line "Used for gym records and receipts."
     Live duplicate/returning checks on blur (debounced): returning-customer chip ("Returning: 3 visits, last Oct 28"), member-match window via `ClerkModal` (View member / Use member payment / Continue as walk-in).
  2. Day pass: the Session plan card (price, "Valid today until 11:59 PM"); no plan choice needed.
  3. Right card: itemized total (promo code field kept, validated by the server), Cash / QR Ph buttons (registration-style), cash tendered with live change, "Record walk-in" / "Generate QR Ph" button with the gray-but-clickable gate and required-information modal (scroll and focus on the missing field), QR panel with 5-minute timer, ONE Cancel, simulate button in dev. Success toast with the receipt number and a "New walk-in" button; the form resets.
- **Member payment**: the shared member payment form from step D.
- **Transactions** (below): server-side paging with filters (date range preset chips, method, status, type Member/Walk-in), search (name, phone, email, receipt number), columns: time, customer (member name with member code, or walk-in name + `WI-` code and a "Walk-in" badge), plan, amount, method, status badge, receipt no,
  actions per ROW: View/print receipt (`GET /clerk/payments/:id/receipt` HTML page), Resend receipt (to the member's email or the walk-in's email; disabled with a tooltip when none), Cancel (pending QR only). Cancelled/failed/expired/needs_review statuses visible and filterable.
- Replace the "Email dispatch preview" card with a real receipt preview of the selected transaction (rendered by the same renderer the email uses). Never display a receipt number before a payment is paid.
- Loading, empty and error states in the existing style; shared toast for results; `InlineError` for failed loads; mobile layout at 390 px.

## Step F: owner's walk-in customer log (admin side)
- Admin page "Walk-in Customers" (add to the admin sidebar, read-only): summary cards (customers, visits this month, revenue from day passes), table (customer code, name, phone, email, visits, last visit, total spent), row opens a drawer/panel with that customer's visits (date, plan, amount, method, receipt number, received by),
  search, date range, pagination, and "Export CSV" (admin only, audit-logged). Endpoints: `GET /admin/walk-ins`, `GET /admin/walk-ins/:id`, `GET /admin/walk-ins/export.csv`.
- Reports that already join `walk_in_visits` keep working; include walk-in revenue in them without double counting.
- Add a one-line note for the owner in your final reply: personal data is being collected, so they should keep it limited to what's needed and secure (this is a reminder, not legal advice).

## Step G: attendance and floor
- A walk-in check-in appears in Attendance/Dashboard live lists with a "Walk-in" badge and name, counts toward floor capacity, and can be checked out like a member (verify the existing attendance endpoints support `walk_in_visit_id`; wire what is missing, minimal).
- Day passes stop being valid after `valid_until` (no re-entry on another day without a new payment).

## Step H: tests (extend `backend/scripts/test-registration-flow.mjs`; all PASS, paste the output)
Membership state: after paying Weekly while Monthly is active, `getMembershipState` returns current Monthly and queued [Weekly]; `member.js`, `admin.js` roster and `users.js` payloads show current Monthly with `next_membership` Weekly; the original membership row is byte-identical before and after the payment; attendance check-in uses current.
Walk-in cash: one customer + one visit + one paid payment with receipt number, tendered/change stored, attendance row, receipt email only when an email was given; failure injected at the payment step leaves no customer/visit; returning phone reuses the customer and increments `visit_count`; duplicate customers are impossible (unique phone); member with an active plan -> `MEMBER_HAS_ACTIVE_PLAN`.
Walk-in QR: start creates only an intent (no customer/visit/payment); cancel wipes the blob and creates nothing; simulate/webhook paid creates everything once and twice-delivered events create nothing twice; wrong amount -> `needs_review`; paid after cancel -> `needs_review` + staff notification; one pending QR per phone (resume).
Member payment: cash with tendered works; QR start creates only a pending payment; the old combined route no longer accepts GCash/Maya; no membership row exists before paid.
Fake database: enforce `payments_subject_check`, the assign-once payments trigger (migration NNN_payments_assign_once), `email_log` type check, unique phone/email on customers, and reject unknown columns.

## Don't
- No membership, customer, visit or payment row before a QR payment is confirmed. No GCash/Maya in the clerk UI. No hard-coded plans or prices. No `alert()`/`confirm()`.
- Don't edit or delete an existing membership row from a payment path. Don't send passwords or personal data in logs or emails beyond the receipt. Don't touch registration behavior except shared helpers.

## Done when
- Paying a different plan for a member with an ongoing plan leaves the ongoing plan visible as current everywhere (clerk, member, admin, reports) and shows the new plan as "Next".
- A walk-in can pay by cash or QR Ph; the customer, visit, payment, receipt number and check-in are saved only after payment succeeds, the owner sees them in the Walk-in Customers page, returning guests are recognized, and the CSV export works.
- The Payments page has no GCash/Maya, shows per-row receipt actions, and its cash drawer figures match the Dashboard.
- Tests pass (pasted), frontend build passes, lint passes for changed files (prove any "pre-existing" error on the base commit), `/design-freeze` for other pages and `/verify-before-done` are run, and the final reply lists anything not finished instead of calling it complete.
