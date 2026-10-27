---
description: "Fix system-wide animations: AOS settings, chart animation and options, hand-made bars, reduced motion, and the full-page loading screen."
agent: 'agent'
---
# Task 7a: Fix animations (motion + charts)

New shared files were added and tested; read them first and DO NOT rewrite them (fix a real bug only, and tell me):
`frontend/src/lib/motion.js`, `frontend/src/lib/chartDefaults.js`, `frontend/src/styles/motion.css`,
`frontend/src/hooks/useApiData.js`, `frontend/src/components/ui/Skeleton.jsx` (+ Skeleton.css).

## Problems found in the code (verified)
- `App.jsx` uses `AOS.init({ once: false, mirror: true })`: every block fades in AND out again each time you scroll past it.
  AOS also leaves a long transition and a transform on animated elements, which fights hover effects on cards.
  `AOSRefresh` only calls `AOS.refresh()`, which does not register the new page's elements.
- Chart pages (AdminDashboard, AdminAttendanceAnalysis, AdminChurnAnalytics, AdminPredictiveAnalytics) build `chartData` and
  `chartOptions` inline on every render, render the chart before data exists (empty chart, then bars pop/grow), use the Chart.js 3
  option `drawBorder: false` (ignored in Chart.js 4, so axis lines show) and give the tallest bar no headroom.
- `.chartWrapper` has `height` but no `position: relative`.
- Hand-made bars (plan distribution in AdminDashboard, ClerkAttendance, ClerkDashboard) appear instantly with inline widths/heights.
- No page respects `prefers-reduced-motion`. The route guard shows plain "Loading..." text, and the layouts show a placeholder
  name ("Admin", "Clerk", "Member") until the profile loads.

## Do
1. `App.jsx`: remove the direct AOS import/CSS import and `AOS.init({...})`; call `initMotion()` once in the existing effect;
   change `AOSRefresh` to call `refreshMotion()`. Keep everything else in App.jsx unchanged.
2. Charts, in each of the four chart pages:
   - Replace the local `ChartJS.register(...)` and the inline options with `buildBarOptions({ count, ... })` from
     `lib/chartDefaults.js` (keep the page's own colors, thresholds and tooltip text; pass `tooltipLabel`/`yMax` when the page needs them).
   - Wrap `chartData` and `chartOptions` in `useMemo` (data depends on the fetched rows; options are built once per chart).
   - Do not mount the chart until its data has loaded. While loading, show `<SkeletonChart height={...} />` with the SAME height as
     the chart wrapper. (Full skeleton rollout comes in tasks 7b-7d; here only do the chart regions.)
   - Add `position: relative; min-width: 0;` to every chart wrapper class (`.chartWrapper` and equivalents) in the CSS modules.
3. Hand-made bars: add class `fm-grow-x` (horizontal) or `fm-grow-y` (vertical) to each bar fill and set `--i` to its index in
   the inline style, for example `style={{ width: "62%", "--i": index }}`. Keep the final widths/heights exactly as they are.
4. Route guard and layouts:
   - In `components/ProtectedRoute.jsx` replace the "Loading..." text with `<SkeletonPage />`.
   - In AdminLayout, ClerkLayout and MemberLayout, while the profile is not loaded show a `<Skeleton w={120} h={14} />` where the
     user's name is shown (and a short one for the role line) instead of a made-up placeholder name.
5. `transition: all`: do NOT mass-replace the ~90 occurrences. Only change the ones on chart wrappers, progress/bars and KPI cards
   that also lift on hover, to list the exact properties used. Report the rest to me as a list (file:line) without changing them.
6. Check for `data-aos` placed on elements that only mount AFTER data loads (inside a conditional). Move the attribute to a stable
   parent that always renders, so a block never animates twice (AOS + skeleton swap).

## Don't
- Don't change colors, spacing, copy or the look of any animation; only fix timing, replays, jitter and loading flashes.
- Don't add libraries. Don't touch backend files or `.env`.

## Done when
- Scrolling up/down no longer replays animations; each block reveals once; card hover effects work after the reveal.
- Each chart draws once with bars rising in order, and changing a range or filter morphs smoothly without re-staggering.
- With Chrome DevTools Network set to "Slow 4G", no chart appears empty and then jumps.
- With "Reduce motion" enabled in the OS, content appears without movement.
- `npm run build` and `npm run lint` pass in /frontend. Then run /verify-before-done.
