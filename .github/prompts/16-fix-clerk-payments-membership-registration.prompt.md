---
description: "Fix Clerk Payments, Membership and Registration bugs: date filters, QR countdown, payment defaults, stuck error banners, duplicate registrations, wrong-member renewals, promo/coach holes."
agent: 'agent'
---
# Task 16: Clerk Payments, Membership and Registration fixes

Use `design-freeze` and `verify-before-done`. Behavior only; keep markup and class names.

## Payments (`ClerkPayments.jsx`, `GET /clerk/payments`)
1. **Date presets are wrong.** `last-7` sends `from=to=today` and `this-month` sends `from=to=the 1st`. Compute `from` and `to` per preset in Asia/Manila: today/today, yesterday/yesterday, today-6/today, first-of-month/today. Put the helper in `frontend/src/lib` (reuse `today()` logic) and test it.
2. **"Total today" label** shows `paymentRows.totals.paid` which follows the filters. Rename it to follow the filter ("Total for this period") OR fetch the real today total from `/clerk/dashboard`. Use the label that matches the data.
3. **Default payment method.** Server validator and the Settings dropdown accept `cash|gcash|maya`, the Payments page only recognises `"qrph"` and reads a JSON-quoted localStorage value raw. Change the allowed values to `cash|qrph` (backend validator, Settings options, default object), migrate stored `gcash/maya` to `cash` when reading, and initialise from `preferences.defaultPaymentMethod` (not localStorage).
4. **QR countdown.** Use `pendingPayment.expires_at` (via `normalizeQrPayment`) and a 1-second clock like `ClerkMembership.jsx`, not a fixed 300 decremented by 3 per poll. Stop polling when the status is `needs_review`, `cancelled`, `expired` or `failed`.
5. **Pending QR safety.** Switching Walk-in/Member currently wipes the form and drops the pending QR without cancelling it. Ask with `useConfirm`; if confirmed, cancel the payment first. While a QR is pending, disable the submit button and show the QR panel at the top. Wrap `onCancel` and `onSimulate` in try/catch with toasts and a busy state.
6. **Pagination and loading.** Use the `total` the API already returns for "Page X of Y"; disable Next at the last page. Do not refetch plans/members/dashboard/drawer on every filter keystroke: split `loadPayments` into (a) one-time data (plans, drawer) and (b) the transactions query, debounce search 300 ms, cancel stale requests, and dim the table with `fm-refreshing` instead of replacing it.
7. **Status colours.** Add distinct styles for `cancelled`, `expired`, `failed`, `needs_review` (new classes in `ClerkPayments.module.css` only).
8. **Cash drawer strip.** Remove the duplicate form here or make it match the Dashboard modal: required fields, no empty-as-zero, saving state, hide "Record Starting Float" when a session exists, show "Closed" state. Prefer one shared `useCashDrawer()` hook used by Dashboard and Payments.
9. **Member payment holes.** Step 3 "Coach" is a static placeholder: add the same coach selection as `ClerkMembership.jsx` (reuse `/clerk/coaches` and `/clerk/payments/quote`) or remove the step. Promo code: call a `POST /clerk/promos/validate` endpoint (create it, read-only against the promo tables from migration 009; ask me before any migration) and show the discounted total and an inline error for an invalid code. Do not show "Applied at checkout" for unvalidated codes.
10. **Receipt.** "View receipt" should call the existing `GET /clerk/payments/:id/receipt` and show a printable receipt panel (`window.print()` with a print stylesheet scoped to that panel). Scroll the receipt panel into view when a row is selected.
11. Remove the double validation display (inline `InlineError` plus the modal) so only one shows.

## Membership (`ClerkMembership.jsx`)
1. The page-level `error` replaces the whole table (`error ? tableError : table`) and is never cleared, so one failed quote kills the table forever. Use separate state: `tableError` (only from table loads, cleared on every successful load) and toasts for quote/search errors.
2. `updateFilters` fires a request per keystroke. Debounce search 300 ms and ignore out-of-order responses.
3. While `payment` (pending QR) exists, disable the table Renew buttons (`chooseFromTable`) so the selected member cannot change under a pending payment.
4. `relativeExpiry` uses `new Date()` and flips to "expired 1 day ago" after noon on the last day. Compare Manila dates (reuse `dateValue()` from `ClerkMemberInformation.jsx`; move the helper to `frontend/src/lib/dates.js` and use it in both).
5. `member.membership.derived_status` is used for the rule text; keep it but fall back to `status_label`.
6. Disable the submit button while `quoteLoading`; show a spinner on Remind buttons and prevent double clicks; make the mobile card Remind button use the same disabled rule as the desktop row.
7. Add the missing `suspended` status tab, as in Member Information.

## Registration (`ClerkMemberRegistration.jsx`)
1. `submit()` must return early when `payment` exists (the button is only `aria-disabled`). Also set a real `disabled` while saving.
2. "Generate new QR" (`onGenerate`) must cancel the old intent on the server before clearing it, otherwise the same email/phone returns REGISTRATION_PENDING.
3. The quote effect sends `coach_id: ""` when the coach box is ticked but no coach is chosen; send `null` until a coach is selected. Add a cancelled flag so old quotes cannot overwrite newer ones.
4. The plan card keyboard handler must do the same as the click handler (clear errors, reset cash) and `preventDefault()` on Space.
5. Persist `selectedPlan` in the draft or stop persisting the rest; never keep PII drafts longer than the tab session (already sessionStorage: keep).
6. After success, `scrollTo({ top: 0 })` and move focus to the success alert.
7. Polling errors: stop after 3 consecutive failures and show one message instead of a banner every 3 seconds.
8. Product question (answer in your final notes, do not change): clerks currently choose the member's password. Recommend sending a set-password email instead.

## Done when
Last 7 days / This month show correct ranges, default method works, QR countdown matches the expiry, no double registration, Renew buttons lock during a pending QR, and a failed quote no longer hides the Membership table. Run `verify-before-done`.
