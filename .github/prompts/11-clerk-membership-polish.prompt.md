---
description: "Polish the clerk Membership page after task 10: one workspace layout (selectors left, sticky payment summary right), better plan and coach cards, member quick-pick, aligned table with clear actions and pagination. No functions removed."
agent: 'agent'
---
# Task 11: Membership page polish (layout, cards, renewal panel, table)

Task 10 works; this task is visual and usability polish only. Do NOT remove or change any behavior from task 10 (QR Ph renewals, 5-minute QR, one Cancel,
simulate button in dev, no membership before payment, cash tendered/change, required-information modal with scrolling, shared green toast, server-side member list).
Stay inside the site's design pattern (dark navy cards, existing CSS variables, same card/button style as Member Registration and Member Information, Font Awesome, Bootstrap grid).
Only `ClerkMembership.*` and files under `components/clerk/membership/` may change; shared components get additions only. Commit after each step and run the build.

## What I see on the page now (from screenshots) and what must improve
1. The page shows plans and coaches TWICE: big reference cards at the top, and again as tiles/dropdown inside the renewal panel. It is long, repetitive, and the top cards are not obviously clickable.
2. Coach cards show "+₱0.00" and the same generic note ("External coach contact; communicate through the provided external platform") on every card; avatars are inconsistent ("A" vs "CM");
   the coach row leaves a large empty area on the right, and nothing says the card can be selected.
3. In the renewal panel: tiny step labels, member search and plan tiles are misaligned (uneven 2+1 grid, empty space under the search), coach is a plain dropdown, the Cash/QR Ph buttons are thin pills with no icons
   (the registration page has proper buttons), the cash field has no peso prefix, Change is plain text, and the bottom row (rule text, total, button) has no breakdown, so the clerk cannot see what will be charged.
4. The table: the email is not aligned under the member name, the Remind button looks disabled, columns are widely spaced, no relative expiry text, all coach cells are "-", zero-count chips (Expiring 0, Upcoming 0) look as active as the others,
   the search box sits alone at the top right, and I cannot see pagination.

## New layout (one workspace, no duplicates)
Header (title, description, muted summary) -> **Renewal workspace** -> **Member memberships** table.

### Renewal workspace (two columns on >= 1200 px, stacked below)
Left column (about 8/12) = the selectors, in numbered step cards with a clear title, a one-line hint and a check icon when complete:
- **1 Member**
  - the search combobox (full width, same height as other controls),
  - under it a "Needs renewal" quick-pick row: up to 5 members who are Expired or Expiring soon (avatar, name, status dot, relative expiry), one click selects them; hidden when none,
  - once selected, the field is replaced by a member card: avatar, name, member code, status badge, current plan, expiry (friendly date + relative text), queued plan if any, and a "Change" link; student flag shown as a small pill.
- **2 Plan**: the nice big plan cards from the current top row, now THE selectors (remove the duplicate top row and the duplicate tiles). Auto-fit grid (`repeat(auto-fit, minmax(220px, 1fr))`) so cards fill the row evenly;
  each card: name, duration pill, price (student price shown as the price with a small "Student rate" pill when the selected member is a student, otherwise the "Student ₱750" pill), per-day hint (for example "about ₱33 per day"),
  a radio indicator, a clear selected state (primary border + check badge), hover and focus states, equal heights. No plan selected by default.
- **3 Coach (optional)**: coach cards in the same style, auto-fit grid, first card "No coach" (default). Each coach card: consistent avatar (initials from the name, same size/color rule), display name, price line,
  note (max 2 lines, clamp; hide the note if it equals the generic boilerplate text), contact link icon when `external_contact_url` exists, selected state. Price line rules: amount > 0 -> "+₱500 add-on"; amount = 0 or missing -> "No extra fee" (never "+₱0.00").
  If a coach has no price set, show a small muted "Price not set" hint only to staff (do not block).
Right column (about 4/12) = **Summary & Payment** card, sticky (`position: sticky; top` below the header) on desktop, in the same style as the registration page's "Payment & Digital Receipt" card:
- selected member mini-row (avatar, name, status) or "No member selected" placeholder,
- itemized lines: plan, coach add-on, student discount, total (large, primary color), updating from the server quote with a subtle loading state, ignoring stale responses,
- the rule line as a small info box with an icon ("Starts today" / "Starts after the current plan ends on Nov 16, 2026", Manila dates),
- **Payment method** buttons identical in style to the registration page buttons (icon + label, equal width, active state): Cash and QR Ph,
- Cash: `₱` prefixed amount input, quick amount buttons (Exact, ₱500, ₱1,000, ₱2,000; hide those below the total), a green "Change" box that updates live, and a red "Short by ₱X" message,
- the action button: "Process renewal" (cash) / "Generate QR Ph" (QR). Keep the gray-but-clickable gate; clicking while incomplete opens the "required information" modal and scrolls to and highlights the missing step card (red outline + inline message),
- while a QR is waiting, the card's body is replaced by the QR panel (countdown, one Cancel, simulate in dev) and the left selectors are locked (dimmed, not interactive) with a small note.
- Success: green toast (shared), the workspace resets (no plan, no coach, member cleared), the table refreshes and highlights the renewed member's row for about 3 seconds.
Add a short "How renewals work" tooltip/info icon on the rule line; no long paragraphs on the page.

### Member memberships table
- Toolbar in one row: search (left, flexible, same clear x/spinner behavior as Member Information), status chips with counts (dim and non-clickable-looking only when the count is 0 but keep them usable), plan filter select, sort select
  (Needs attention first [default: Expired, Expiring, Upcoming, Active by soonest expiry], Name A-Z, Expiry soonest, Newest joined).
- Rows: one member block (avatar left; name and email stacked and left-aligned together in the same column, ellipsis on overflow), current plan (+ queued plan as a small "Next: Weekly Pass from Nov 20" line),
  coach as a small chip or "No coach" muted, expiry date plus relative line colored by urgency, status badge, actions.
- Actions: "Renew" (small primary outlined button with icon) and "Remind" as a clearly enabled secondary icon+label button; disabled only with a tooltip reason ("No email on file", "Reminder already sent recently", "No active plan to remind about").
  Both same height; on narrow widths collapse into a kebab menu.
- Sticky header, row hover, subtle dividers, comfortable density, friendly dates with ISO in the tooltip, skeleton shaped like the table, empty state ("No members match" + Clear), error state with retry.
- Footer: "Showing 1-10 of 12 members", page-size select (10/25/50), compact pager with ellipsis (same component as Member Information if it exists: reuse `MembersPagination`).
- Under 992 px: stacked member cards with the same info and actions; no horizontal page scroll at 390 px.

## Implementation rules
- Split into components: `RenewalWorkspace`, `MemberPicker`, `NeedsRenewalPicks`, `PlanCard`, `CoachCard`, `RenewalSummary`, `RenewalPayment`, `MembershipTable`, `MembershipRow`, `MembershipCard` (mobile). Share `MemberAvatar`, `StatusBadge`,
  `formatFriendlyDate`, `relativeExpiry` helpers with Member Information (extract into `frontend/src/lib/memberDisplay.js`, then have Member Information import them without changing its look).
- Quick-pick data comes from the existing `/clerk/members` endpoint with `status=expired` and `status=expiring` (limit 5 each, merged); no new backend unless a field is missing.
- If the coach price is stored in a field other than `addon_amount`/`monthly_price`, handle it, and do not change the database.
- Accessibility: all cards are real radio inputs (or `role="radio"` with arrow-key support) with labels; visible focus; selected state is not color-only; modals trap focus.
- CSS: new classes in `ClerkMembership.module.css` only; use variables; no hard-coded light colors; responsive at 1920, 1366, 768 and 390 px.

## Don't
- Don't touch other clerk pages' markup or CSS, backend payment logic, or API response shapes. Don't re-add GCash/Maya. Don't add dependencies.

## Done when
- The page has no duplicated plan/coach sections; plan and coach cards are the selectors and clearly show selection.
- Coach cards never show "+₱0.00"; generic notes are not repeated; the grid fills the row evenly.
- The right summary card is sticky, itemized, and shows live change; the payment buttons match the registration page's style.
- The table is aligned, defaults to "needs attention first", zero-count chips are visibly dimmed, actions are clear, pagination works, and mobile cards work at 390 px.
- A full manual run passes: pick an expired member from the quick-pick, choose a plan and coach, pay cash with change; pay by QR Ph (simulate in dev) and cancel another; the toast appears and the row highlights.
- Frontend build and lint for changed files pass, the CSS diff of other pages is empty, the offline backend test script still passes, `/design-freeze` and `/verify-before-done` are run.
