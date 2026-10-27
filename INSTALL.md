# Skeleton loading + animation fixes: install and run

## 1. Add the files (2 minutes)
1. Copy `frontend/` and `.github/` from this folder into your repo root (merge with the existing folders).
   New files: components/ui/Skeleton.jsx + Skeleton.css, hooks/useApiData.js, lib/motion.js, lib/chartDefaults.js, styles/motion.css,
   and four prompt files in .github/prompts/.
2. Commit: `git add . && git commit -m "Add skeleton and motion helpers"`.
3. `aos` and `chart.js` are already in your package.json. Nothing to install.

## 2. Run the prompts in order (new chat each, Agent mode)
| Order | Command | What it does |
|---|---|---|
| 1 | `/07a-motion-and-charts` | Fixes AOS replays, chart animation/options, hand-made bars, reduced motion, full-page loading screen |
| 2 | `/07b-skeleton-admin` | Skeletons on the 10 admin pages |
| 3 | `/07c-skeleton-clerk` | Skeletons on the 8 clerk pages |
| 4 | `/07d-skeleton-member` | Skeletons on the 8 member pages + login guard |

After each one: `npm run build` and `npm run lint` in /frontend, test in the browser, then `git add -A && git commit -m "Task 7x done"`.

## 3. How to test in the browser
1. Open Chrome DevTools -> Network tab -> set throttling to "Slow 4G".
2. Click through every page of each role (also hard-refresh with Ctrl+Shift+R).
   Expect: a skeleton right away -> real content fades in. No flash of zeros, "—", fake names or an empty chart.
3. Scroll up and down: blocks reveal once and do not replay.
4. Charts: bars rise one after another once. Change a range/filter: they morph, no restart.
5. Windows Settings -> Accessibility -> Visual effects -> Animation effects OFF: content appears without movement.

## Optional
`optional-tests/motion.test.jsx` is the test file used to check these helpers (13 tests). It needs
`npm i -D vitest jsdom @testing-library/react` and is not required.
