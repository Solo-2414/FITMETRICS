---
description: "Clerk member pages: visible optional-coach section, real status, server-side filters + pagination + dynamic counts, announcement-style info email, working quick counter renewal, remove coach add-on boxes."
agent: 'agent'
---
# Task 8c of 8d: Member Registration + Member Information + Membership

Prerequisite: task 8a is done (shared payment flow, current vs queued membership).

Files: `frontend/src/pages/clerk/ClerkMemberRegistration.jsx`, `ClerkMemberInformation.jsx`, `ClerkMembership.jsx`
(+ their .module.css), `backend/src/routes/clerk.js`, `backend/src/services/mailer.js` (`renderEmail`),
`backend/src/services/emailQueue.js`.

## Current state (verified in the code)
### Member Registration
- The optional coach section is a toggle (`coachToggleBox`) with the amount hard-coded to 500 in the request. It is hard to notice and
  gives no feedback when on/off. Coaches come from `GET /clerk/coaches` (use real names and add-on amounts).
- Payment buttons are handled in task 8a; do not redo them, just make sure the summary shows the final server-quoted price.

### Member Information
- Header filter buttons are static: `All (184)` is a typed number, the other buttons and the `<select>` filterSelect do nothing.
- The footer says `Showing 1-5 of 184 members` (static text). A line above says `Filtered: {members.length} displayed`.
  `GET /clerk/members` returns every member in one response (no pagination, no server filters).
- The status cell shows `membership.status || "inactive"` from the LATEST membership row only (so a queued or expired row can
  make an active member look inactive, and `profiles.status` suspended/inactive is ignored). It also holds the "Send info email"
  button inline.
- "Send info email" calls `POST /clerk/members/:id/information-email` and queues `information_overview`. The announcement email
  (`renderEmail('announcement', ...)` in mailer.js) uses the dark branded layout (logo, gym name, accent bar, pill label, footer);
  `information_overview` uses a different, plainer template. The button also gives no visible success/failure feedback.

### Membership
- The Quick Counter Renewal form (member select, plan select, coach select, summary) is not reliable: it calls `/clerk/memberships`,
  which ignores student price and promos, always marks it paid, and its summary total is computed in the browser.
- Plan rate cards render one extra card per coach (`COACH ADD-ON`, line ~107) and the table rows contain hard-coded
  "Coach Analyn" / "Coach Mark" cells plus static sample rows (lines ~460-550). Remove the coach add-on boxes/cards.

## Member Registration (do this)
- Make the optional coach assistant obvious: a titled section "Coach assistant (optional)" with a clear switch labelled
  Off/On, a short description of what it adds, the coach list as selectable cards (name, specialty if present, add-on price from the
  database), an "Added: +₱X" badge, a highlighted border when selected, and the line item appears in the price summary.
  Selecting a coach turns the switch on; switching off clears the coach. Keyboard accessible, mobile friendly.
- Replace the hard-coded 500 with the selected coach's price (server calculates; the browser sends only `coach_id`).
- Validate required fields inline (name, email, password rules, plan), disable Register while saving, reset the form after success,
  and never show fake plans/prices while loading (see `07c`).

## Member Information (do this)
- Backend: `GET /clerk/members` accepts `search`, `status`, `plan`, `coach`, `joined_from`, `joined_to`, `expiring_in` (days),
  `student` (true/false), `sort` (name, joined, expiry, status), `order`, `page`, `limit` (max 50) and returns
  `{ rows, total, page, limit, counts }`. `counts` = all, active, expiring (within `gym_settings.expiry_reminder_days`), expired,
  no-membership, suspended, computed over the whole table (not just the current page). Use real SQL filtering/pagination
  (a view or RPC if joins are needed; if you add a view, revoke direct access and read it only from the backend).
  Keep the existing array response working for any other caller: search for every caller first
  (`ClerkPayments`, `ClerkMembership`, `ClerkAttendance`, `ClerkDashboard` also call `/clerk/members`). Either keep the old shape
  when no `page` param is sent, or update every caller in the same change.
- Derived status computed on the server, using Asia/Manila dates and the CURRENT membership from task 8a:
  `Active`, `Expiring` (active and ends within the reminder days), `Expired`, `Upcoming` (only a queued plan), `No plan`,
  and `Suspended`/`Inactive` when `profiles.status` says so (account status wins). One badge, correct colors, a tooltip with the
  expiry date. The same helper is reused by the filter and the counts so they never disagree.
- Frontend: make the filter buttons real and show real counts (`All (N)`, Active, Expiring, Expired). Add: plan select, coach select,
  student toggle, joined-date range, sort, and a "Clear filters" button. Search is debounced (300 ms) and keeps old rows dimmed with
  `fm-refreshing` while loading. Filters are kept in the URL query so refresh/back works. Footer `Showing X-Y of TOTAL members` is
  computed from the response, with working Previous/Next and page numbers; remove the static text and the old "Filtered: N displayed"
  line (or make it real). Empty state: "No members match these filters" + Clear filters.
- Move "Send info email" out of the status cell into an actions column/menu. After clicking: confirm dialog showing the recipient
  email, button shows Sending..., then a success toast "Info email queued" or the real error. Disable it when the member has no
  email. Prevent spam: the server enforces a per-member cooldown (e.g. 1 per 10 minutes) with a clear message.
- Info email format: render `information_overview` with the SAME shell as the announcement email: logo, gym name, top accent bar,
  pill label "Member information", heading, a clean two-column details block (member name, member ID/code, current plan, expiry date,
  phone, queued plan if any), a button to the member portal, and the same footer. Factor the shared HTML shell in mailer.js into one
  helper used by both templates so they cannot drift. HTML-escape every value (names, phone, plan) and include a plain-text version.
  Do not change the other email types' behavior.

## Membership page (do this)
- Quick Counter Renewal: preselect the member from `?member=<id>`; show the member's current plan and expiry; plan select shows server
  prices (student price if the member is a student); coach select is optional; the summary uses the server quote from task 8a;
  payment buttons are Cash/GCash/Maya using the shared wait panel from task 8a; the button is disabled until member + plan + method
  are valid; on success refresh the table and show "Renewed. New end date: DATE" (queued plans say "starts DATE").
- Renewal rules: renewing a still-active plan extends/queues after the current end date (never overwrites); an expired member starts
  today. Show this rule as one line under the summary so the clerk knows what will happen.
- Remove the coach add-on boxes (`COACH ADD-ON` cards) and all hard-coded coach/sample rows. Keep the "Assigned coach" column but
  fill it from real data (`memberships.coach_id` -> coach display name, or "-").
- The members/memberships table uses the same server-side search/filter/pagination/derived status as Member Information
  (reuse the same hook/helper), with real "Quick action" buttons (Renew, Send reminder) that work.

## Don't
- Don't change layouts or class names beyond what is listed; add new classes only for the coach cards, filter row and pagination.
- Don't expose other members' data beyond what these pages already show. Don't send any email without an explicit clerk click.

## Done when
- Coach assistant is impossible to miss, shows the real price, and the charged amount matches the summary.
- Member Information counts, filters, search, sort and "Showing X-Y of N" all agree with the database; changing a filter keeps the
  page responsive; status badge is correct for active, expiring, expired, queued, no-plan, suspended members.
- The info email looks like the announcement email and contains the right details; clicking the button gives clear feedback.
- Quick Counter Renewal works for cash and e-wallet, the summary equals the charge, no coach add-on boxes remain.
- Frontend build + lint pass; backend `node --check` passes; run `/verify-before-done`.
