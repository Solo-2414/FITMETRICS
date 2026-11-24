---
description: "Replace placeholder/flash loading with skeleton loaders on every CLERK page."
agent: 'agent'
---
# Task 7c: Skeleton loading on all clerk pages

Prerequisite: tasks 7a and 7b are done. Follow EXACTLY the same rules as task 7b (read `.github/prompts/07b-skeleton-admin.prompt.md`
"Rules (apply to every page)" and use the same pattern, hook and components).

## Pages
- ClerkDashboard: KPI cards, today's check-ins, expiring list; its hand-made bars use `fm-grow-x`/`fm-grow-y` if task 7a skipped them.
- ClerkMemberInformation: member search results table and the selected member's detail panel (use `SkeletonForm`/`SkeletonList`).
  Searching keeps old rows dimmed with `fm-refreshing`.
- ClerkMemberRegistration: plans/coaches/promos dropdown data loads first; show a skeleton for the plan cards and disable the
  Register button until data is ready. Never show hard-coded plans or prices while loading.
- ClerkMembership: members/memberships table + plan cards.
- ClerkPayments: payments table, totals strip, filters (keep rows while refetching).
- ClerkAttendance: today's attendance KPIs, live list, log table.
- ClerkNotifications: list (`SkeletonList`).
- ClerkSettings: profile/preferences form (`SkeletonForm`).

## Extra rules for the clerk desk
- Buttons that call the API (check-in, record payment, register) show a small inline "Saving..." state and are disabled while the
  request runs, so a double-click cannot create two records. Do not change what the buttons do.
- After a successful action, refresh the affected list with `reload()` and keep the old rows dimmed meanwhile, not a skeleton.

## Done when
Same checks as 7b for every clerk page, plus: the Register Member form never flashes fake plans/prices.
`npm run build` and `npm run lint` pass. Run /verify-before-done and list the pages you changed.
