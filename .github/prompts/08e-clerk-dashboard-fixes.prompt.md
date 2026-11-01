---
description: "Clerk Dashboard fixes: skeleton shown together with real data, Session Pass vs Record Member Payment doing the same thing, KPI overview, content hidden below the fold, and a Daily Cash Drawer that actually works."
agent: 'agent'
---
# Task 8e: Clerk Dashboard fixes (follow-up to 08b)

Run after 8a-8d. This task REPLACES the dashboard parts of `08b`. Do not redo the attendance/QR work.

Files: `frontend/src/pages/clerk/ClerkDashboard.jsx` (+ .module.css), `frontend/src/pages/clerk/ClerkPayments.jsx`,
`frontend/src/components/clerk/ClerkLayout.jsx` (header "Floor" chip), `frontend/src/hooks/useTerminalPreferences.js`,
`backend/src/routes/clerk.js` (`GET /clerk/dashboard`), a NEW migration for the cash drawer.

## Current state (verified in the code and the screenshot)
1. Skeleton bug: ClerkDashboard renders `{loading && <SkeletonKpiCards/>}` and then ALWAYS renders the real KPI row right
   after it (same for `{loading && <SkeletonTable/>...}` before the two-column panels). So while loading you see skeleton rows AND the
   real cards with "...", "₱..." and "Members" placeholders at the same time, which pushes everything down the page. This is also
   a main reason the page looks too tall.
2. Quick Desk Actions: "Session Pass" navigates to `/clerk/payments?plan=session` and "Record Member Payment" navigates to
   `/clerk/payments`. Both open the SAME screen with the same member search; the only difference is a plan preselected once at
   load. A session pass is a walk-in (guest name/phone, no account), a member payment is for a registered member. The screen
   does not make that difference.
3. Overview/KPIs: values come from one request, `GET /clerk/dashboard`, and show "..." until it returns. If it is slow or fails
   the cards stay on "..." (the error alert is easy to miss). Problems in the code:
   - Today's totals filter `payments.created_at`, not `paid_at`, so an e-wallet payment created yesterday and paid today is
     missed, and a payment created today but still pending/paid later is counted on the wrong day.
   - `eWalletCollected` is computed as `total - cash`, so any new method value is counted as e-wallet.
   - The "50 cap" and the progress bars use a hard-coded 50; the "Comfortable floor density" text and "Shift: Morning to Afternoon"
     badge are static text, not data.
   - "Open sessions", "Live status" and similar labels are decorative.
   - Nothing refreshes: numbers go stale until the clerk reloads the page.
   I could NOT reproduce a failing request from reading the code alone: the backend route looks valid. Reproduce it first
   (open DevTools > Network, check the status/time of `/clerk/dashboard`, and check the backend console) and report the real cause.
4. Layout: the Quick Desk Actions bar sits at the bottom edge of a 1080p screen and everything useful (check-ins, recent payments,
   Daily Cash Drawer, Expiring Soon) is below the fold with no hint that the page continues.
5. Daily Cash Drawer: the "Update Cash Drawer" button has NO `onClick`. The starting float comes from a per-clerk terminal
   preference (`preferences.openingFloat`), so it is the same number every day and for every shift; "Current cash in drawer" is
   `float + cashCollected` only, with no counted amount, no variance, no history, and no refunds/withdrawals. "Ready for count"
   is static text.

## Fix 1: loading states (no double rendering)
- Use one ternary per region: `{loading ? <Skeleton/> : <div className="fm-fade-in">...real content...</div>}`; never render
  both. Follow the `07b` rules (error message with "Try again" button, empty state instead of skeleton, no fake "..." values).
- Give each region its own loading flag so the KPI cards appear first, then the lists. Do not block the whole page on one request:
  split into `GET /clerk/dashboard` (KPIs), `GET /clerk/dashboard/activity` (recent check-ins + payments) and
  `GET /clerk/dashboard/expiring` OR keep one endpoint and run the independent Supabase queries in `Promise.all` on the server
  (they are currently sequential: recent payments, profiles, attendance, profiles, settings, expiring). Whichever you choose,
  keep the old `/clerk/dashboard` response shape working for every other caller (search: ClerkPayments and ClerkMembership also call it).
- Refresh the KPIs every 30 s while the tab is visible and after any action that changes them (use `fm-refreshing`, never a skeleton, on refetch).
  Show "Updated HH:MM" quietly in the page header.

## Fix 2: Session Pass vs Record Member Payment
- Two distinct modes on the Payments page, chosen by the query string and kept in sync with it:
  `/clerk/payments?mode=walkin` (Session Pass): the plan is locked to the Session plan, the member search is replaced by
  "Guest name" and "Phone" fields (at least one required), the student toggle is hidden, the title says "Walk-in session pass".
  `/clerk/payments?mode=member` (Record Member Payment): the Session plan is NOT listed, a registered member must be selected first,
  the title says "Record member payment".
  `/clerk/payments` with no mode shows a small two-option switch (Walk-in session / Member payment) at the top.
- Read the mode and any `plan`/`member` params reactively (`useSearchParams`), not once inside the data-load callback, so
  navigating between the two actions while already on the page works. Update the Dashboard buttons to the new URLs and give them
  different icons and labels ("Session Pass (walk-in)" and "Record Member Payment"); only one is highlighted, and highlight neither
  if the user is not on a related screen.
- After a successful walk-in payment show the receipt and a "New walk-in" button; the guest does not get an account.
  Use the payment flow from task 8a (cash instant, GCash/Maya through PayMongo); do not duplicate payment logic.

## Fix 3: Overview that works and is honest
- Server: compute "today" in Asia/Manila with `backend/src/lib/time.js`; totals use `paid_at` within today's Manila window and
  `status = 'paid'`; split totals by the real `method` (cash, gcash, maya) and return each; return `capacity` from
  `gym_settings` if a capacity setting exists (add a `floor_capacity` column in the migration with default 50 if not),
  and return `openSessions` as real data (today's open check-ins plus today's active walk-in visits) or remove the label.
- Frontend: floor density text and progress bars derive from `activeOnFloor / capacity` (Quiet, Comfortable, Busy, Full with
  thresholds you state); remove or replace the static "Shift: Morning to Afternoon" badge with the clerk's real login time today or
  just today's date; remove labels that are not backed by data. The header chip in ClerkLayout ("Floor: N Active Members" and the
  "50 cap" text) must use the same capacity value and the same number as the dashboard card.
- If the dashboard request fails or times out (8 s), show a clear inline error with "Try again" and keep the rest of the page usable.

## Fix 4: Layout so nothing important is hidden
- Make the top of the page fit a 1366x768 and 1920x1080 viewport without surprise: put Quick Desk Actions directly under the page
  title (above the KPIs) or make the KPI cards more compact (smaller padding, one supporting line instead of two), so the Quick
  Desk Actions AND the start of the "Today's check-ins" / "Daily Cash Drawer" panels are visible without scrolling at 1080p.
- Add a clear continuation cue where the fold falls: the next panel's header peeks above the bottom edge, plus a subtle
  gradient/"Scroll for more" affordance that disappears after the first scroll (no animation if `prefers-reduced-motion`).
- Keep the sidebar, topbar and class names; change spacing, order and a few new classes only. Check 1366, 1536, 1920 widths and a
  phone width (Quick Desk Actions stays horizontally scrollable with a visible edge fade).

## Fix 5: Daily Cash Drawer (make it real)
Database (next numbered migration, idempotent, RLS enabled, backend-only access like other staff tables, run `/supabase-migration-review`):
- `cash_drawer_sessions`: `id uuid`, `business_date date` (Manila) unique per open drawer, `opening_float numeric(12,2)`, `opened_by`,
  `opened_at`, `closing_counted numeric(12,2)`, `expected_cash numeric(12,2)`, `variance numeric(12,2)`, `closed_by`, `closed_at`,
  `note text`, `status text check (status in ('open','closed'))`.
- `cash_drawer_entries` (optional but recommended): cash in/out adjustments (`kind` in 'payout','refund','correction'),
  `amount`, `reason`, `created_by`, `created_at`, linked to the session, so withdrawals do not look like missing money.

Backend (requireAuth + requireRole admin/clerk, validated bodies, `audit_log` on every write, never trust the client for totals):
- `GET /clerk/cash-drawer/today` returns the open session (or null), cash sales since it opened (paid cash payments by `paid_at`),
  adjustments, and `expected_cash = opening_float + cash_sales + cash_in - cash_out`. The float stops being a per-clerk preference:
  keep `preferences.openingFloat` only as the suggested default when opening a drawer.
- `POST /clerk/cash-drawer/open` ({ opening_float }) one open drawer per business date; `POST /clerk/cash-drawer/adjust`;
  `POST /clerk/cash-drawer/close` ({ counted_cash, note }) computes variance on the server and closes it. Require a note when
  |variance| is not zero. Only admin can reopen a closed drawer.

Frontend:
- The "Update Cash Drawer" button opens a modal with three actions: Open drawer (opening float), Count / Close drawer
  (counted cash, live expected cash, variance in green/amber/red, required note), Add cash in/out. Disable the buttons while saving, show errors.
- The card shows the real states: "Drawer not opened" (with an Open button), "Open since 8:02 AM by NAME", expected cash, GCash/Maya
  total, last count and variance, and "Closed" with the final variance. Replace the static "Ready for count".
- Settings: the opening-float field remains only as a default suggestion and its helper text says so.

## Don't
- Don't change member, admin or attendance behavior. Don't send money data to the browser that the clerk's role cannot see.
- Don't invent numbers: if data is missing show "-" with a reason, never a fake figure.

## Done when
- Loading the dashboard shows ONE set of skeletons, replaced by the real cards; nothing shows "..." next to real data.
- Session Pass opens a walk-in screen (guest name/phone, session plan only); Record Member Payment opens the member screen
  (member required, no session plan); both work when clicked back and forth.
- KPI numbers match the Payments and Attendance pages for the same day (paid_at based), refresh without reloading, and failures
  show a retry message.
- At 1080p and 768p the Quick Desk Actions and the start of the next panels are visible, with a visible cue that more content follows.
- Daily Cash Drawer can be opened, adjusted and counted; variance is stored; "Update Cash Drawer" does something real;
  after a day change a new drawer must be opened.
- Frontend build + lint pass; backend `node --check` passes; run `/supabase-migration-review` and `/verify-before-done`.
