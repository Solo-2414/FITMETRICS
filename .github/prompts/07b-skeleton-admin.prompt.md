---
description: "Replace placeholder/flash loading with skeleton loaders on every ADMIN page."
agent: 'agent'
---
# Task 7b: Skeleton loading on all admin pages

Prerequisite: task 7a is done. Read `components/ui/Skeleton.jsx`, `hooks/useApiData.js` and `styles/motion.css` first.

## The problem (verified)
Pages start with `null`/empty state and render hard-coded zeros, "—", an empty chart or blank tables, then swap to real data a moment
later. We want a skeleton that matches each region, then a soft fade-in of the real content, and NO stale or invented numbers.

## Rules (apply to every page)
1. Keep the page title, subtitle, buttons, filters and static labels always visible. Only the data regions get skeletons.
2. Use `useApiData(path)` for plain fetches (it returns `data, error, showSkeleton, refreshing, reload`). If a page has its own
   fetch code with several endpoints, give each independent region its own loading flag so fast regions appear first. Do not call
   `setState` synchronously inside an effect body (the project's ESLint rule forbids it).
3. Pattern:
   `{showSkeleton ? <SkeletonKpiCards count={4} /> : <div className="row g-3 mb-4 fm-fade-in">{...real cards...}</div>}`
   Use the matching skeleton: `SkeletonKpiCards`, `SkeletonChart` (same height as the real chart), `SkeletonTable` (rows = page size,
   cols = real columns), `SkeletonList`, `SkeletonCards`, `SkeletonForm`.
4. Filters, ranges, search and pagination: on refetch keep the old data on screen and add the class `fm-refreshing` to the data
   container (`refreshing` flag). Never swap the whole table back to a skeleton for a filter change.
5. Errors: replace the skeleton with a short error message and a "Try again" button that calls `reload`. Never leave it loading forever.
6. Empty data: show the page's existing empty state, not a skeleton.
7. Remove invented fallbacks (hard-coded numbers, fake names, "—" shown as if it were data) from the loading state.
8. `data-aos` stays only on elements that always render. Never put it inside the conditional that swaps skeleton and content.
9. Keep all existing markup, CSS-module classes and design. Add only the skeleton branches and the hook usage.

## Pages
AdminDashboard (KPI cards, hourly chart, recent check-ins table, expiring list, plan distribution),
AdminAttendanceAnalysis (KPIs, chart, weekday bars, plan breakdown, log table with range and plan filters),
AdminChurnAnalytics, AdminPredictiveAnalytics (KPIs, chart, member table),
AdminManageUsers (KPI cards + table; filters/search/pagination keep old rows while loading),
AdminMembershipPlans (KPI cards + plan cards),
AdminReports (KPI cards + export cards + downloads table),
AdminAnnouncements (KPI cards + list), AdminVideoTutorials (video grid), AdminSettings (form fields via `SkeletonForm`).

## Done when
- With DevTools Network on "Slow 4G", opening every admin page shows skeletons immediately, with no layout jump and no flash of
  zeros, "—" or an empty chart; real content fades in.
- A very fast response still keeps the skeleton about 0.3 s (no flicker).
- Changing a filter dims the old rows instead of showing a skeleton.
- `npm run build` and `npm run lint` pass. Run /verify-before-done and list the pages you changed.
