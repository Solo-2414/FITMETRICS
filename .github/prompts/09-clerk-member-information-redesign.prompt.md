---
description: "Redesign the clerk Member Information page (search, filters, date range, table, actions, pagination, states) so it is clean and modern, keeping every existing function."
agent: 'agent'
---
# Task 9: Redesign `Member Information` (clerk)

This page IS allowed to change visually. I asked for a full visual improvement. Everything else in the app keeps its current look
(`design-freeze` still applies to every other page and to shared components: only add, never alter existing rules).
Keep the site's identity: dark navy surfaces, the existing CSS variables (`--primary-color`, `--secondary-background-color`,
`--card-stroke-color`, heading font), cyan/blue primary, Font Awesome icons, Bootstrap grid utilities. No new UI library.

Files: `frontend/src/pages/clerk/ClerkMemberInformation.jsx` (+ `.module.css`, rewrite allowed), new small components under
`frontend/src/components/clerk/members/`, a shared `frontend/src/components/clerk/ClerkModal.jsx` (extract from the 08j modal without changing how
the registration page looks), `backend/src/routes/clerk.js` only if a listed backend change is needed.

## What is wrong today (from the code and screenshot)
- The whole page is one 76-line component with very long one-line JSX; the toolbar puts 11 controls in two uneven rows with the same
  look for everything (status buttons, three selects, two date inputs, sort, Clear), so nothing has priority.
- The search box is a narrow box on the left of the toolbar, a different height than the controls beside it, and the placeholder is only "Search members".
- The date filter is two native `mm/dd/yyyy` inputs with no visible labels, so it is unclear they mean "joined between" and it is awkward to type.
- The table is plain: no avatars, the date columns show raw `2026-10-18`, status is colored text only, "Send info email" repeats as a large outline button on every row,
  and expiry gives no sense of urgency.
- Sending an info email uses `window.confirm` (a browser popup) and the result appears as a plain Bootstrap alert at the top.
- Footer pagination uses default Bootstrap buttons and shows every page number.

## Functions that MUST keep working (write this list in your reply and tick each at the end)
1. Search (server-side, debounced, resets to page 1).
2. Status tabs with live server counts: All, Active, Expiring, Expired.
3. Filters: plan, coach, student/non-student, joined-from and joined-to dates, sort (name, newest joined, soonest expiry, status), Clear filters.
4. All filters, sort and page stay in the URL query string and are restored on refresh/back; same query parameter names as today.
5. Server-side pagination with "Showing X-Y of N members" computed from the response.
6. "Send info email" per member: needs an email, confirm first, shows "Sending...", success/error message, cooldown errors from the server are shown.
7. "Register New Member" button, skeleton on first load, dimmed rows (`fm-refreshing`) on refetch, error and empty states.
8. Derived status labels (Active, Expiring, Expired, Upcoming, No plan, Suspended) exactly as the API returns them.

## New design
### Header
Title and description as today. "Register New Member" stays top right (primary outline). Below it, a one-line summary of the current result
("12 members · 10 active · 0 expiring · 1 expired") from `counts`, small and muted.

### Toolbar (one card, two rows, clear hierarchy)
Row 1: a large, full-flexible **search field** (same height as the other controls, search icon on the left, spinner while loading, an "x" button that clears it,
Esc clears, `/` focuses it; placeholder "Search by name, email, phone or member code"; make sure the server also matches member code and phone, extend
`GET /clerk/members` if it does not) + **Sort** dropdown (label "Sort by", same four options) + **Filters** button (opens the filter panel, shows a count badge of active filters).
Row 2: **status tabs as a segmented control** (All, Active, Expiring, Expired, and also Upcoming / No plan / Suspended when their count is above 0),
each with a small colored dot and the count; the active tab is clearly filled; horizontally scrollable on small screens.

### Filters panel (popover on desktop, bottom sheet on mobile)
Contains: Plan, Coach, Member type (All / Students / Non-students) as clean selects with visible labels, and the **Joined date** control (below). Buttons "Apply" (or apply live)
and "Reset". Closes on outside click and Esc; focus is trapped.

### Joined date filter (replaces the two confusing inputs)
One control labeled "Joined": preset chips "Any time", "Today", "Last 7 days", "Last 30 days", "This month", "Custom". Custom shows two clearly labeled date fields ("From", "To")
side by side; "To" cannot be earlier than "From" (inline message); dates display in a friendly format ("Oct 1, 2026") in the chip and results line; keep sending
`joined_from` and `joined_to` as `YYYY-MM-DD` to the API (Asia/Manila days). Presets compute those two values on the client.

### Active filter chips
Below the toolbar, show each active filter as a removable chip ("Plan: Monthly Regular  x", "Joined: Oct 1 - Oct 31, 2026  x", "Students  x", "Search: dan  x") and a "Clear all" link
(replaces the old "Clear filters" button; the same reset function). Hidden when nothing is active.

### Table
- Member: round avatar with initials (color derived from the name, status-tinted ring), name, and email in muted text; "No email" in a subtle warning color.
- Contact: phone formatted consistently (`0967 676 6767`); show the member code beneath in small muted text when available; "-" when empty.
- Plan & coach: plan name; coach as a small chip with a user icon, "No coach" muted. "No plan" as a muted pill.
- Joined: friendly date (`Oct 18, 2026`), full ISO in the title tooltip.
- Expiration: friendly date plus a relative line ("in 18 days", "today", "expired 3 days ago"), colored: normal, amber when within the reminder window, red when expired. Tooltip with the ISO date.
- Status: pill badge with a dot (Active green, Expiring amber, Expired red, Upcoming blue, No plan gray, Suspended red outline).
- Actions: icon buttons with tooltips and `aria-label`: "Send info email" (envelope; disabled with a tooltip "No email on file" when missing) and "Renew membership"
  (links to `/clerk/membership?member=<id>`). On narrow tables put them in a small kebab menu. No full-width text buttons per row.
- Sticky header row, subtle row hover, comfortable row height, header labels in small uppercase muted text, no heavy borders.
- Below 992 px the table becomes stacked member cards (name, status badge, plan, expiry, actions); verify at 390 px, no horizontal scrolling of the page.

### Feedback
- Replace `window.confirm` with the shared dark modal: "Send member information?" showing recipient name and email, buttons "Cancel" and "Send email". Esc/overlay closes.
- Success and error messages as toasts (top right, dark themed, auto-dismiss after 4 s, error stays until closed) instead of the Bootstrap alerts. Reuse an existing toast/notice
  pattern in the project if one exists; otherwise add a tiny shared `ClerkToast`.
- Empty state: icon, "No members match these filters", short hint, and a "Clear filters" button. Error state: message and "Try again". Skeleton matches the new table/card layout.

### Footer
Left: "Showing 1-10 of 12 members" (`aria-live="polite"`). Right: a page-size select (10 / 25 / 50, sent as `limit`, kept in the URL) and a compact pager:
Previous, page numbers with ellipsis (first, current +- 1, last), Next, styled like the site's buttons.

## Implementation rules
- Split the page into small components: `MembersToolbar`, `StatusTabs`, `FiltersPanel`, `JoinedFilter`, `ActiveFilterChips`, `MembersTable`, `MemberRow` (and `MemberCard` for mobile),
  `MembersPagination`, with the data hook `useMemberList(filters)` that owns fetching, debounce, abort of stale requests (ignore out-of-date responses), and URL sync.
  Keep each file readable (no 400-character one-liners).
- Debounce search 300 ms; never fire a request per keystroke; keep the previous rows visible (dimmed) while refetching.
- CSS: new module classes only for this page; do not edit global CSS or other pages' modules. Use CSS variables so it matches the rest of the clerk UI.
- Accessibility: visible focus rings, labels for every control, color is never the only status signal (dot + text), contrast meets WCAG AA, keyboard-operable menus and modals.
- The 08j `RegistrationModal` becomes `ClerkModal`; update the registration page to import it with identical appearance (check the CSS diff of the registration module is added lines only).

## Don't
- Don't remove or rename any API parameter, do not change what the endpoints return for existing callers, and do not touch other clerk pages' behavior.
- Don't add new dependencies. Don't load the entire member list to filter in the browser.

## Done when
- Everything in "Functions that MUST keep working" is verified (tick list in the final reply, with how you checked each).
- At 1920, 1366 and 390 px the page looks tidy and balanced: search is the clear primary control, filters are tucked into one panel, the date filter is understandable,
  rows are scannable, nothing overflows.
- Typing in search sends one request after the pause; changing any filter or page keeps the URL in sync and survives refresh.
- Frontend build and lint for the changed files pass, backend `node --check` passes for any changed file, and `/verify-before-done` is run.
