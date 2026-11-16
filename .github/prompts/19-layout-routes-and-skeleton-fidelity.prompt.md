---
description: "Move Clerk/Admin layouts to layout routes so the sidebar and top bar stop remounting, add a shared clerk data provider, and make every skeleton match its real page."
agent: 'agent'
---
# Task 19: Layout routes, shared data and skeleton fidelity

Use `design-freeze` and `verify-before-done`. Visual result must be identical to today except that loading placeholders now match the pages.
Do this AFTER tasks 15-18 are merged.

## Part 1: Layout routes (removes flicker and duplicate requests)
Today every page renders `<ClerkLayout>` / `<AdminLayout>` itself, so the sidebar and top bar are destroyed and rebuilt on every navigation: the notification badge flashes to 0, the floor count to "-", and the layout re-fetches notifications, dashboard and preferences each time.
1. In `App.jsx` create `ClerkShell` and `AdminShell` that render the layout once with `<Outlet />`, and use them as the `element` of the role `ProtectedRoute` groups (nest the routes inside).
2. Remove the `<ClerkLayout>` / `<AdminLayout>` wrapper from every page and return the page content only (keep `<>...</>`). Pages that return early for loading must no longer wrap the skeleton in the layout.
3. Keep scroll-to-top on route change (`useLocation` effect in the shell) and focus the `<h1>` for screen readers.
4. Add `ErrorBoundary` around `<Outlet />` with a "Something went wrong. Reload page" card so a crash does not blank the sidebar.

## Part 2: One clerk data provider
Create `frontend/src/context/ClerkDataContext.jsx` mounted in `ClerkShell` and used by layout and pages:
- `useTerminalPreferences` once (currently each page and the layout fetch `/clerk/settings/preferences` separately).
- One poller for `/clerk/dashboard` (30 s, visible tab only, paused when offline) exposing `dashboard`, `refreshing`, `lastUpdated`, `error`, `reload`. `ClerkLayout` header, `ClerkDashboard` and `ClerkPayments` read from it (Payments currently calls `/clerk/dashboard` and `/clerk/cash-drawer/today` on every filter change).
- One notification summary poller (30 s) with the unread count; listens to `fitmetrics:notifications-changed` and `fitmetrics:attendance-changed`.
- Cash drawer state (`useCashDrawer`) shared by Dashboard and Payments.
Pages must not start their own interval for the same endpoints.

## Part 3: Skeletons that match the page
Skeleton = same grid, same card count, same heights as the real content (no layout jump). Use `SkeletonRegion`, keep `useMinimumLoading` (300 ms) and `Loadable`/`fm-fade-in`. Add the needed variants to `components/ui/Skeleton.jsx`, with their CSS in `Skeleton.css`:
| Page | Real layout | Skeleton to build |
|---|---|---|
| Clerk Registration | 2 columns: 3 panels (personal info 7 fields, plan cards, coach) + payment summary | `SkeletonRegistration` |
| Clerk Membership | 3 step cards + summary aside + toolbar + status tabs + table | `SkeletonMembership` |
| Clerk Payments | drawer strip with 5 stats + 2 step cards + summary aside + transactions table | `SkeletonPayments` |
| Clerk Member Information | toolbar, status tabs, 7-column grid table (desktop) / cards (mobile) | `SkeletonMemberTable` using the real grid template |
| Clerk Attendance (none today) | 4 KPI cards, 2 action cards, floor grid, table | `SkeletonAttendance` |
| Clerk Settings | 2 cards left (profile, security) + avatar + preferences right | `SkeletonSettings` |
| Clerk Dashboard | already close; add the cash-drawer and expiring cards | extend |
| Admin Dashboard | add the plan-distribution panel | extend |
| Admin user/plan modals | details loading | `SkeletonForm` inside the modal |
Rules: no skeleton on background refreshes (dim with `fm-refreshing`); every list/table also needs the empty state and the error state with Retry; respect `prefers-reduced-motion` (disable the shimmer).

## Part 4: Feedback consistency
- One `useAsyncAction()` hook: `run(fn, { success, error })` handles `saving` state, double-click prevention, success/error toasts and returns the result. Use it for every button that calls the API in the clerk and admin pages.
- Errors that happen while a modal is open must be shown inside that modal.
- Replace the ad-hoc admin modals and the clerk drawer modal with one shared `Modal` (see task 18).

## Done when
Navigating between clerk pages does not remount the sidebar, the network tab shows one `/clerk/dashboard` poll, and every skeleton matches its page at 1920, 1366 and 390 px (take screenshots and compare). Run `verify-before-done`.
