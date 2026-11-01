---
description: "Redesign the clerk Payments page UI (permission granted) and fix the leftover visible bugs: errors, white inputs, stale paid state, duplicated cash drawer, mode layout."
agent: 'agent'
---
# Task 13c: Payments page redesign + visible bugs

I give permission to change the look of `ClerkPayments.*` (and the shared payment components under `components/clerk/payments/`). Keep the site's design language
(dark navy cards, existing variables, Font Awesome, the layout pattern of Member Registration and Membership: step cards on the left, a sticky "Summary & Payment" card on the right,
shared toast, `InlineError`, `ClerkModal`, `useConfirm`). Other pages stay unchanged (`design-freeze`). Same branch; commit per step; build after each step.

## Bugs visible in my screenshots (reproduce each, then fix at the root)
1. The page shows "Something went wrong on our side." in a banner and the top bar says "Floor: ... Active Members". Cause already found: PostgREST error `PGRST201`
   (payments and walk_in_visits now have TWO foreign keys, so un-hinted embeds are ambiguous). The embeds were patched with `!payments_walk_in_visit_id_fkey`
   and `backend/scripts/check-postgrest-embeds.mjs` guards it; keep the guard passing (`node scripts/check-postgrest-embeds.mjs`) and add it to your final checks.
   Also make sure a failed load never leaves the top bar showing "..." forever (show "-" with a retry) and uses `InlineError`, not a wide plain banner.
2. The same "Daily Cash Drawer Summary" card and a heading ("Record member payment" / "Walk-in session pass") are rendered ABOVE the form and the heading sits outside any card, crowding the mode switch. Rebuild the header area (see layout).
3. In the transactions panel the search box and the three selects are WHITE (unstyled) on the dark theme, and the table header is cramped ("TIME MEMBER ITEM AMOUNT METHOD" with no room). Style them like the Member Information toolbar controls.
4. The right card shows "Paid · Receipt Sent to Email" and "Resend Receipt Email" while no payment exists (₱0.00, no selection). Status chips and receipt actions only exist for a real, selected transaction; otherwise show a neutral empty state ("Select a transaction to preview its receipt").
5. "Record New Payment" says "POS Terminal Active" (decorative), "Total Payable Amount ₱0.00" appears before any plan is chosen, and there is no step structure or validation. Replace with the new layout below.
6. Cash Tendered / Change look different from the Registration and Membership pages. Use the shared `PaymentSummaryCard` so all three pages behave and look the same.

## New layout
**Header:** title "Payments", the date chip, and a segmented control **Walk-in session | Member payment** (keeps `?mode=` in the URL). A compact cash-drawer strip (one row of 5 small stat tiles: Starting float, Cash today, QR Ph / digital today, Total today, Expected in drawer; plus "Record Starting Float" and "End of Day Review" buttons) shown ONCE, collapsible on small screens. No duplicate headings.

**Workspace (>= 1200 px: 8/4 columns; stacked below):**
- Left, numbered step cards with check icons:
  - Walk-in mode: 1 Customer (Full name*, Mobile*, Email optional, Student toggle if available, Notes, "Check in now" switch; returning-customer chip; member-match modal), 2 Day pass (the Session plan card with price and "Valid today until 11:59 PM"; promo code field here), done.
  - Member mode: 1 Member (the shared searchable picker with "Needs renewal" quick picks and the member card showing current plan and any queued plan), 2 Plan (plan cards, nothing preselected, promo code), 3 Coach (optional cards).
- Right: sticky **Summary & Payment** card (the shared component): itemized lines, total, the "Starts today / Starts after Nov 16" or "Valid today" info line, Cash / QR Ph buttons, cash tendered with ₱ prefix, quick amounts and live change, the "Send receipt" checkbox (member email, or guest email when given), the gray-but-clickable action button with the required-information modal and scroll/focus on the missing step, and the QR panel (5-minute countdown, ONE Cancel, "Generate new QR" at expiry, simulate button in dev).
  Button labels: "Record walk-in" / "Record payment" (cash), "Generate QR Ph" (QR).

**Transactions (full width below):** toolbar in one row like Member Information (search with clear button, date preset chips Today / Yesterday / Last 7 days / This month / Custom, method, status, type), result count, table with clear columns (Time, Customer with avatar and "Walk-in WI-… " or member code badge, Plan, Amount, Method, Status badge, Receipt no, Actions), per-row actions (View receipt, Resend receipt, Cancel pending QR), server-side pagination with page size, stacked cards under 992 px. The selected row opens the real receipt preview in a side panel/drawer (rendered by the same renderer as the email); nothing is previewed when nothing is selected.
All loading states are skeletons shaped like the final layout; failed loads use `InlineError` with retry; results use toasts.

## Behavior checks (do them in the browser and report)
- Both modes load without errors; no "Something went wrong"; top bar floor count shows a number.
- Walk-in cash: record, receipt number appears, customer/visit/attendance created, row appears in the table with a Walk-in badge, receipt preview opens.
- Walk-in QR with the simulate button (dev flag): QR with 5-minute timer, Cancel returns instantly and creates nothing, simulate creates everything once.
- Member payment while the member has an ongoing plan: the ongoing plan stays current, the new one shows as "Next" on this page, the Membership page and Member Information.
- Filters, search, pagination, resend receipt per row, cancel pending QR.
- 1920, 1366 and 390 px screenshots; no horizontal page scroll; keyboard and focus work.

## Don't
- No GCash/Maya, no `alert()`/`confirm()`, no raw database errors in the UI, no hard-coded plans/prices, no changes to registration or membership behavior except the shared components.

## Done when
`node scripts/check-postgrest-embeds.mjs`, `node scripts/test-registration-flow.mjs`, `node scripts/check-toast-migration.mjs` all pass (paste output), the frontend build passes, changed-file lint passes, and the final reply lists each bug above as Fixed / Not fixed with evidence (screenshots or test output).
