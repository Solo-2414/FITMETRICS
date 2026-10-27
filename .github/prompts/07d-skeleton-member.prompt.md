---
description: "Replace placeholder/flash loading with skeleton loaders on every MEMBER page and the login guard."
agent: 'agent'
---
# Task 7d: Skeleton loading on all member pages

Prerequisite: tasks 7a-7c are done. Follow EXACTLY the same rules as task 7b ("Rules (apply to every page)").

## Pages
- MemberDashboard: membership status card, days-left, attendance summary, recent activity, announcements (`SkeletonKpiCards`, `SkeletonList`).
  Never show a made-up membership or expiry date while loading.
- MemberProfile: personal information form and avatar (`SkeletonForm`).
- MemberMembership: current plan card and plan options (`SkeletonCards`).
- MemberAttendance: streak/KPI cards, calendar or list (`SkeletonKpiCards`, `SkeletonList`).
- MemberBilling: payments table and receipts (`SkeletonTable`).
- MemberNotifications: list (`SkeletonList`); marking a notification read keeps the list on screen.
- MemberWorkoutPlans, MemberVideoTutorials: card grids (`SkeletonCards`); video cards show their thumbnail area as a skeleton.
- Maintenance case: if the API answers 503 with `maintenance: true`, show the maintenance screen, not a skeleton or an error.

## Also check
- Login and Forgot Password: the submit button shows "Logging in..." / "Sending..." and is disabled during the request (no skeleton needed).
- `ProtectedRoute` and the three layouts use `SkeletonPage` and name skeletons as done in task 7a. Confirm there is no remaining
  "Loading..." plain text anywhere: search the frontend for `Loading...`.

## Done when
Same checks as 7b for every member page. On a throttled connection, refreshing any member page shows the layout skeleton immediately,
then the real content, with no flash of placeholder names, zeros or empty states.
`npm run build` and `npm run lint` pass. Run /verify-before-done and list the pages you changed.
