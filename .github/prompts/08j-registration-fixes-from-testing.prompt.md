---
description: "Registration fixes found in manual testing: wrong-field duplicate message, modals that do not match the site, empty required-info list, missing plan error, dev 'simulate payment' button, success banner and leftover wording."
agent: 'agent'
---
# Task 8j: Fix what manual testing found in Member Registration

Use the `design-freeze` skill. Same branch as 08h/08i. Commit after each numbered fix. Do not change the approved page layout.

## Findings from my testing (with screenshots)
1. Duplicate window shows the WRONG reason. I was typing in the Email field (Mobile field still empty) and the window said
   "This phone is already registered." and named a staff account ("Michael Andre Tanza · No member code · active").
   An empty phone must never match anything, and the check must only report the field that was just entered.
2. Both modals ("Member already registered" and "Please complete the required information") look like a generic gray box with a default blue button.
   They must match the clerk UI (dark navy cards, the site's heading font, border colors, radius and buttons). "Edit details" looks disabled.
3. The "Please complete the required information" window opens EMPTY (no list of problems) and the Membership Plan card shows NO error banner or red outline
   when no plan is selected.
4. The "Payment received. Receipt FM-2026-000018" banner is a light green block that does not fit the dark theme.
5. Wording still wrong on the page: under the receipt checkbox it still says "Sends breakdown and credentials." (credentials must never be emailed).
6. I cannot test a QR Ph payment: there is no way to simulate a paid QR from the UI.
7. The browser autofill dropdown appears on the email field.

## Fix 1: duplicate check is field-scoped (frontend + backend)
- `POST /clerk/register/validate` accepts the fields to check (`{ field: 'email' | 'phone', value }` or the full form on submit). It checks ONLY non-empty,
  already-normalized values. An empty, null or invalid-format value is never compared (so `''` or `null` can never match an account with an empty phone).
  Phone matching compares normalized 11-digit numbers; email matching compares lowercase trimmed emails.
- The response says exactly which field matched. The modal text is built from that field: "This email is already registered." or
  "This mobile number is already registered." Typing in Email can only ever trigger an email message; typing in Mobile only a mobile message.
  On submit, check both and report each field that matched.
- Only members count for "View member". If the match is a staff/admin account, say "This email is used by a staff account and cannot be used for a member"
  (no member details shown, no View member button). Never show "No member code": for members always show their code; if a member has none, hide that part.
- Debounce 400 ms, cancel stale requests (ignore a response if the field value changed since), do not re-open the window while it is already open,
  do not re-check an unchanged value.
- Add offline tests to `backend/scripts/test-registration-flow.mjs`: empty phone does not match a profile with an empty phone; email-only check does not
  report phone; staff match gives the staff message; stale response is ignored (unit test the helper if it is extracted).

## Fix 2: modals match the site (both modals)
- Reuse the existing clerk modal look from `ClerkLayout` (Fast Check-in modal) or the Dashboard cash-drawer modal: same overlay, dark navy panel
  (`--secondary-background-color`), 1px `--card-stroke-color` border, same radius, heading font, header with an icon and close button, footer buttons
  using the page's own primary and secondary button classes (primary = the same cyan/blue as "Fast Check-in"; secondary = outlined like "Clear form").
  Extract one small shared `RegistrationModal` component so both modals look identical. Append-only CSS under `/* added for 8j */`.
- Member already registered: icon + title, one clear sentence, a small details row (name, member code, status badge using the existing status badge look),
  buttons "View member" (primary) and "Edit details" (secondary, enabled). Esc and overlay click close it; focus is trapped and returned; scroll locked.
- Required information: icon + title, short sentence, then a list of issues as rows (field label + message, warning icon), each row clickable; footer "Review form".
- Phones: modal fits 390 px wide, buttons stack.

## Fix 3: required-information list and plan error
- Find why the list is empty (likely the issues array is built after the modal opens, is cleared on state reset, or the map renders nothing). Fix at the root:
  the validator returns `[{ field, label, message }]`; the modal renders every item; add a test (React testing is not set up, so unit test the validator and
  the function that builds the list in plain JS).
- Plan error: when no plan is selected, show the inline error banner INSIDE the Membership Plan Selection card (existing alert style, danger variant, icon,
  "Please choose a membership plan to continue"), outline the plan cards in red, scroll the card into view with `scrollIntoView({ behavior: 'smooth', block: 'center' })`
  after the modal closes, and clear the error when a plan is picked. Also show the plan item in the required-information list.
- Verify by pressing the gray button with: an empty form; only a plan missing; only the email invalid; cash with tendered below total. Each case must list the right items.

## Fix 4: success banner
Replace the light green block with the page's dark-theme success alert style (green-tinted dark surface, green border, check icon), showing
"Payment received. Receipt FM-2026-000018" and, per 08h, buttons "View member" and "Register another member"; dismissible; it stays until dismissed
or a new registration starts. No hard-coded light colors.

## Fix 5: wording
- Under the checkbox: "Sends the payment receipt and a welcome email." Under Email: "Used to send your receipt and welcome email."
- Add `autoComplete="off"` to name, email and phone and `autoComplete="new-password"` to the password input so browsers do not suggest saved emails or passwords here.

## Fix 6: test button for QR payments (development only)
- Backend: keep `POST /clerk/register/qrph/:id/simulate-paid`, but allow clerk AND admin, and enable it only when `NODE_ENV !== 'production'` AND
  `ALLOW_PAYMENT_SIMULATION=true` in `.env` (add to `.env.example`, default false). It must run the exact same `finalizeIntent` as the webhook, with the intent's
  own amount and provider ids, and write an audit log line "simulated". In production it returns 404.
- Frontend: inside the QR panel only, a small ghost button "Simulate payment (test only)", rendered only when `import.meta.env.DEV` is true and the backend
  reports simulation enabled (add `simulation_enabled` to the QR start response). It calls the endpoint, then the normal polling shows Paid. It must never render in a production build.
- Tell me the exact steps to enable it (which env var, restart).

## Done when
- Typing only in Email can never produce a phone message; empty fields never match; staff matches show the staff message.
- Both modals look like the rest of the clerk UI at 1920 and 390 px; "Edit details" works.
- The required-information window lists every missing/invalid item; clicking an item scrolls to and focuses it; the plan error banner appears inside the plan card.
- The success alert matches the dark theme; wording fixed; no browser autofill dropdown on the email field.
- With `ALLOW_PAYMENT_SIMULATION=true`, the QR panel shows the test button; clicking it creates the member, membership, payment, receipt and emails exactly once.
- `node scripts/test-registration-flow.mjs` all PASS (paste output), frontend build passes, CSS diff is added lines only, `/design-freeze` and `/verify-before-done` run.
