---
description: "Clerk Membership page: better looks and function, coach cards back, renewal wizard with Cash/QR Ph (no membership until paid), shared success toast, full member memberships table."
agent: 'agent'
---
# Task 10: Membership page (look + function), coach cards, QR Ph renewals, success toast

This page may change visually (I asked for it), but it must stay inside the site's design pattern: dark navy cards, existing CSS variables,
the same card style as the plan rate cards, Font Awesome icons, Bootstrap grid utilities, no new UI library. Other pages keep their look
(`design-freeze` applies to every file except `ClerkMembership.*`; shared components may only get additions).
Same branch as earlier tasks. Commit after each lettered step (A-G) and check each before moving on.

Files: `frontend/src/pages/clerk/ClerkMembership.jsx` (+ `.module.css`, rewrite allowed), new small components under
`frontend/src/components/clerk/membership/`, `frontend/src/components/clerk/ClerkToast.jsx` (+ shared CSS module),
`frontend/src/components/clerk/PaymentWaitPanel.jsx`, `ClerkModal.jsx`, `backend/src/routes/clerk.js` (`/clerk/memberships`, payments QR routes),
`backend/src/routes/paymongo.js` (webhook), `backend/src/services/membership.js`, `backend/scripts/test-registration-flow.mjs`.

## What is wrong today (verified in the code)
1. Renewals with GCash/Maya still use the old PayMongo Checkout link flow. After the request the page only says "Payment link created. Complete payment to activate the renewal."
   and never shows or opens the link, so the clerk cannot finish the payment. Registration already uses QR Ph (5-minute QR, cancel, simulate button); renewals must match.
2. The member dropdown loads only the first 50 members (`/clerk/members?page=1&limit=50`), so members beyond that cannot be renewed.
3. The "Member memberships" table filters to Active/Expiring only, so an EXPIRED member (the main renewal case) never appears; it has no search, filters or pagination,
   and dates are raw ISO strings.
4. The renewal rule text compares dates with `new Date().toISOString()` (UTC) instead of Asia/Manila, so it can be wrong around midnight.
5. The quote request can return out of order (stale price), and nothing clears the quote when the plan is cleared.
6. Feedback is a Bootstrap alert at the top of the page. The Member Information page already has the dark success toast (green check circle) I like;
   Membership must use that same toast. Also the toast text there says "Heads up — the information email was sent."; change it to plain wording,
   for example "Information email sent to NAME." / "Information email queued for NAME." / error text unchanged.
7. The coach add-on cards I had removed earlier (they were hard-coded Coach Analyn / Coach Mark rows) must come back, this time from real data.

## Layout (top to bottom)
1. Header: title, description, and a muted one-line summary ("12 members · 10 active · 0 expiring · 1 expired") from the members `counts`.
2. **Membership plans** row: the existing rate cards, polished (consistent height, price large, duration pill, "Student ₱750" pill when a student price exists,
   description). Clicking a plan card pre-selects it in the renewal panel below (and scrolls to it). Real data from `/clerk/plans`.
3. **Coaches** row (restored): cards from `GET /clerk/coaches` (real active coaches only; never hard-coded): initials avatar, display name, add-on price "+₱X",
   short notes (2 lines max), and a small contact link if `external_contact_url` exists. Same card style as the plan cards. Clicking a coach card selects/unselects
   that coach for the renewal below (selected state with the primary border and a check badge). Empty state "No active coaches" (hide the row's cards, keep the heading).
4. **Quick Counter Renewal** panel (details below).
5. **Member memberships** table (details below).

## Quick Counter Renewal (rebuild as a guided panel)
- Section 1, Member: a searchable combobox, NOT a plain select. It queries `GET /clerk/members?search=...&limit=8` (debounced 300 ms, cancel stale requests), matches name,
  email, phone and member code, shows avatar, name, member code, and a status badge with expiry. `?member=<id>` preselects (fetch that one member by id if it is not in the first results).
  Shows the member's current plan, expiry, and any queued plan under the field once selected.
- Section 2, Plan: selectable plan cards/radio tiles (same look as the registration plan cards). No plan is preselected on load or after a successful renewal. Student price applies
  automatically from the member's student flag and is explained ("Student rate applied").
- Section 3, Coach (optional): the same coach cards in a compact row, kept in sync with the Coaches row above; "No coach" is the default and can be re-chosen.
- Section 4, Payment: two buttons like the registration page: Cash and QR Ph (remove GCash and Maya for renewals; honor `gym_settings.payment_modes`, mapping `qrph`).
  Cash shows Cash Tendered, quick amounts (Exact, 500, 1,000), live Change and "Short by" (same logic as registration). Total comes only from the server quote
  (`POST /clerk/payments/quote`, ignore out-of-date responses, clear it when the plan is cleared).
- Summary card: member, plan, coach add-on, student discount, TOTAL, and the rule line using Manila dates: "Starts today" for expired/no plan, "Starts after the current plan ends on Nov 16, 2026"
  when queued. Never overwrites an existing membership (rules from task 8a stay).
- Button: "Process renewal" (cash) / "Generate QR Ph" (QR). Same gate as registration: it looks gray while anything is missing but stays clickable; clicking it opens the
  `ClerkModal` "Please complete the required information" listing each missing item (member, plan, tendered amount) with clickable rows that scroll to and focus that section,
  and the missing section shows an inline error in the site's style (red outline + small message). Never starts a payment when anything is invalid. No `alert()`, no browser validation bubbles.

## QR Ph renewals (backend + frontend)
- `POST /clerk/memberships` with `payment_method: 'cash'` keeps today's atomic paid flow (plus tendered/change validation on the server and on the receipt).
- With `payment_method: 'qrph'`: validate, then create a `pending` payment for the existing member (member row already exists, so no staging table is needed) and a PayMongo
  QR Ph payment using the same service as registration (5 minutes, `QRPH_EXPIRY_SECONDS`). Return `{ payment_id, qr_image_url, expires_at, amount_total, simulation_enabled }`.
  NO membership row is created until the payment is paid. Refuse a second pending QR for the same member ("A QR payment for this member is waiting. Resume or cancel it.", with resume data).
- Confirmation: the webhook (`payment.paid`, `payment.failed`, `qrph.expired`) matches `payments.provider_intent_id`, and `GET /clerk/payments/:id/status` re-queries PayMongo as the polling fallback;
  both call one idempotent `activatePaymentMembership` (conditional `pending -> paid`, verify amount and intent id, create/queue the membership with coach, increment promo usage once, assign receipt number,
  queue the receipt email once). Wrong amount or paid-after-cancel -> `needs_review` + staff notification + audit log, never silently ignored.
- Cancel: `POST /clerk/payments/:id/cancel` (exists) must cancel immediately, call PayMongo's cancel if the API supports it, and never create a membership. The UI returns to the form instantly with the choices kept.
- Dev only: `POST /clerk/payments/:id/simulate-paid`, same flags as registration (`NODE_ENV !== 'production'` and `ALLOW_PAYMENT_SIMULATION=true`, clerk or admin), runs the same activation code.
- UI: use the same QR panel as registration (extract/share `PaymentWaitPanel`; show countdown, ONE Cancel button, "Generate new QR" at expiry, Simulate button only in dev). While the QR is shown, lock the form fields.
  On paid: success toast "Renewal paid. Active until Dec 9, 2026 · Receipt FM-2026-000019", clear the form, refresh the table, and highlight the updated row for a few seconds.
- Receipt email uses the full receipt renderer from task 08i (announcement shell, itemized, period start-end, method, reference, received by). Renewals do not send the welcome email.
- Wire the same QR Ph option into `ClerkPayments.jsx` where it still offers GCash/Maya (swap only the digital button and the waiting panel; do not restyle that page).
- Remove the old Checkout-session code path for clerk-initiated renewals/payments once nothing uses it (keep the member self-service billing flow untouched).

## Shared success toast
- Move the toast look from `ClerkMemberInformation.module.css` into a shared `ClerkToast.module.css` (identical appearance: dark `#0f172a` panel, border, green check circle, close x, top right under the header, auto-dismiss 4 s, errors stay until closed)
  and have `ClerkToast` use it by default, with the old `className` props still accepted so Member Information looks exactly the same. Add `role="status"`/`aria-live="polite"` for success and `role="alert"` for errors.
- Use it for every Membership message: renewal paid, renewal queued, cash recorded, QR cancelled, reminder sent, errors. Delete the Bootstrap alert blocks from this page.

## Member memberships table (rebuild)
- Source: `GET /clerk/members` with server filters/pagination (reuse the member list hook and helpers from the Member Information redesign if they exist; otherwise create `useMemberList` and share it).
- Toolbar: search, status chips (All, Active, Expiring, Expired, Upcoming, No plan) with counts, plan filter. Show EXPIRED and NO-PLAN members (they are the ones who need renewals).
- Columns: member (avatar, name, email), current plan, coach chip, expiry with relative text ("in 15 days", "expired 3 days ago") colored by urgency, queued plan if any, status badge, actions.
- Actions: "Renew" (selects the member in the panel, scrolls to it, focuses the plan section, brief highlight) and "Send reminder" (existing `POST /clerk/members/:id/expiry-reminder`, with the toast and the server cooldown message).
- Friendly dates (`Nov 16, 2026`), skeleton shaped like the table, empty and error states, pagination with page size, stacked cards under 992 px. Keep the page usable at 390 px with no horizontal page scroll.

## Tests
Extend `backend/scripts/test-registration-flow.mjs` (make the fake database reject unknown columns and any value outside the `email_log.email_type` list) with: renewal QR start creates only a pending payment
(no membership); cancel -> cancelled, no membership; simulate/webhook paid -> exactly one membership (current or queued per rule), one paid payment with receipt number, one receipt email, coach and promo handled once;
double delivery creates nothing twice; wrong amount -> `needs_review`; second pending QR for the same member refused; cash tendered below total rejected; the renewal queue rule when the member still has an active plan.
All PASS before you report done.

## Don't
- No membership before payment succeeds (cash counts as paid when the clerk confirms it). No hard-coded coaches, plans or prices. No `alert()`/`confirm()`.
- Don't touch the registration page, dashboard, or admin/member pages. Don't add dependencies. Don't change API fields other callers use.

## Done when
- Plans and coach cards render from real data in the site's style; clicking a card selects it in the renewal panel; coach selection stays in sync.
- A member beyond the first 50 can be found and renewed; expired members appear in the table and can be renewed in one click.
- Cash renewal works with live change. QR Ph renewal shows the QR with a 5-minute timer, one Cancel that returns instantly, and (dev only) the Simulate button; paying activates or queues the membership once and emails the receipt.
- All Membership feedback uses the green-check toast; Member Information's toast looks unchanged apart from the plain wording.
- `node scripts/test-registration-flow.mjs` all PASS (paste the output), frontend build passes, CSS diff of other pages is empty, `/design-freeze` and `/verify-before-done` run.
