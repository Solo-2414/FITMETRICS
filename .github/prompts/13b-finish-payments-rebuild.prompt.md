---
description: "Finish the Payments rebuild: walk-in QR Ph finalization, receipts and emails, shared member payment components, transactions filters/pagination, admin walk-in log, attendance, and real tests."
agent: 'agent'
---
# Task 13b: Finish task 13 (only the foundation was delivered)

Task 13 changed `ClerkPayments.jsx`, the membership-state helper and readers, and migration 030. Its report lists the following as unfinished, and I found more gaps by comparing the
report with the task list. This task is NOT done until every item below is done, the new tests exist and pass, and the checks at the end pass. Do not report partial work as done:
if something is not finished, say so at the top of your final reply.

Use `design-freeze` for every page except `ClerkPayments.*` and the new admin walk-in page. Same branch; commit after each lettered step; build after each step.

## Gaps to close (verify each against the code first, then fix)
**A. Tests were not extended.** The report says "Offline backend tests: PASS" but `backend/scripts/test-registration-flow.mjs` is not in the changed-file list, so those tests do not exercise the new walk-in/membership-state code.
Add the scenarios listed in task 13 step H to that script (membership state, walk-in cash, walk-in QR, member payment, fake database enforcing `payments_subject_check`, the assign-once payments trigger, `email_log` type check,
unique customer phone/email, unknown columns). Paste the full output. Do this FIRST so every later step is tested as it is built.

**B. Walk-in QR Ph is incomplete.** Finish the whole path: `POST /clerk/walkins/validate`, `/cash`, `/qrph`, `GET /clerk/walkins/qrph/:id/status`, `POST .../cancel`, dev-only `.../simulate-paid`, and webhook routing by `provider_intent_id`
(add the `kind` column handling in `registration_intents` if migration 030 did not). On paid, ONE idempotent `finalizeIntent` creates customer (upsert by normalized phone/email), visit, PAID payment (receipt number, reference), attendance check-in
(unless "Check in now" is off), audit log, and queues the receipt email when an email exists. Wrong amount -> `needs_review`; paid after cancel/expiry -> `needs_review` + staff notification; double delivery creates nothing twice.
Until this is complete and tested, the walk-in QR button must be hidden or disabled with the text "QR Ph walk-in coming soon" so nothing half-working can be triggered by a clerk. No pending rows may be left behind by a failed or cancelled attempt.

**C. Receipt rendering and email.** One renderer (announcement shell) for member and walk-in receipts: itemized, date/time Manila, plan and period (member) or "Valid today until 11:59 PM" (day pass), method and reference, tendered/change for cash,
received by, business details when configured, "Day Pass Receipt" title for walk-ins; plain-text version; subject not HTML-escaped. `GET /clerk/payments/:id/receipt` returns a print-friendly HTML page using the same renderer.
`POST /clerk/payments/:id/resend-receipt` resends the row you clicked (member email or walk-in email; clear error when none). Walk-in cash receipts get a receipt number, `cash_tendered` and `change_given`.
Replace the "Email dispatch preview" card with a real preview of the selected transaction; never show a receipt number for an unpaid payment.

**D. Shared member payment components (task 13 step D) were not done.** Extract `MemberPaymentForm`, `PaymentSummaryCard` and `QrPaymentPanel` from the Membership page and use them on both pages with the same endpoints.
Remove the old Checkout-based GCash/Maya branches from `POST /clerk/payments` after grepping callers, and remove GCash/Maya from every clerk UI. Member cash payments from the Payments page must work (send `cash_tendered`) and QR Ph member payments must use the same flow as renewals.
Show "Current: <plan> until <date>" and "This payment starts <date> (queued)" before paying.

**E. Transactions table: filters and pagination are incomplete.** Server-side paging; filters for date range (preset chips), method, status (paid, pending, failed, expired, cancelled, needs_review), type (Member/Walk-in); search by name, phone, email, receipt number;
per-row actions: View/print receipt, Resend receipt, Cancel pending QR; walk-in rows show name, `WI-` code and a "Walk-in" badge. Totals above the table must match the cash drawer figures. States: loading skeleton, empty, `InlineError`.

**F. Admin Walk-in Customers page is missing** (no admin files were changed). Build it as specified in task 13 step F: sidebar link, summary cards, searchable and paged table, customer drawer with visit history, CSV export (admin only, audit-logged),
endpoints `GET /admin/walk-ins`, `GET /admin/walk-ins/:id`, `GET /admin/walk-ins/export.csv`. Walk-in revenue appears in existing admin reports without double counting.

**G. Attendance for walk-ins.** Verify and wire: walk-in check-in appears in clerk Attendance and the Dashboard floor count with a "Walk-in" badge, can be checked out, and a day pass is not valid after `valid_until` (the job that completes visits is in place and tested).

**H. Verify the membership-state fix end to end.** Show proof (test output plus the SQL or API response) that after paying Weekly while Monthly is active: clerk roster, member dashboard/membership endpoints, admin roster, admin member detail and reports all show current = Monthly and next = Weekly, and the original Monthly row is unchanged.
Also grep `from('memberships')` again and list every remaining read with a one-line justification.

## Final verification (paste all of it)
- `node scripts/test-registration-flow.mjs` all PASS with the new scenarios named in the output.
- `node --check` for changed backend files, frontend build, `node scripts/check-toast-migration.mjs` still `0`.
- Full lint: prove the `AuthContext.jsx` error is pre-existing by running lint on the base commit, and list any warnings/errors in files you changed.
- A browser check (start the dev server; if it cannot start, say exactly why and what you tried): member cash payment, walk-in cash, walk-in QR with the simulate button (dev flag), cancel, resend receipt, admin Walk-in Customers page and CSV, desktop and 390 px.
- A table in the final reply: each of A-H with Done / Partly / Not done and the evidence.

## Don't
- No rows before a QR payment is confirmed; no edits to existing membership rows from payment code; no raw database errors in the UI; no `alert()`/`confirm()`; no new dependencies.
