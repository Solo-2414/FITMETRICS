---
name: skeleton-fidelity
description: "Use whenever a FITMETRICS task creates, changes or audits a loading skeleton. Makes the skeleton match the real page in structure, spacing, colors and breakpoints, measured not guessed."
---

# Skeleton fidelity (strict)

A skeleton is correct only if the page does not jump when real content replaces it, and its surfaces look like the page's own surfaces.

## When to use this skill
- You edit `frontend/src/components/ui/Skeleton.jsx` / `Skeleton.css`, a page's loading branch, or add a new page.

## Procedure per page (do not batch pages; finish one, then the next)
1. Open the real page JSX and its `.module.css`. Write the structure down: section order, grid columns per breakpoint,
   card count, heading/label/value rows, table columns and row height, button sizes, gaps, radii, borders.
2. Read the computed values from the real page, not from memory: container max-width, card padding, border color, radius, background token,
   table header height, row height. If a browser tool is available (see `.vscode/mcp.json`), measure bounding boxes at 1920, 1366, 768 and 390 px.
   Otherwise derive them from the CSS and say plainly that nothing was measured in a browser.
3. Build or adjust the skeleton variant from the existing primitives (`Skeleton`, `SkeletonCards`, `SkeletonTable`...). Same Bootstrap
   column classes as the page, same number of cards/rows, same fixed heights (use `min-height` equal to the real element).
4. Colors: use only the tokens the real surfaces use (`--secondary-background-color`, `--card-stroke-color`, and the same card background
   the page uses). No hard-coded hex the page does not use. Same radius and border as the real card.
5. Behavior: `SkeletonRegion` for a11y, `useMinimumLoading` (300 ms), `Loadable` + `fm-fade-in`, no skeleton on background refresh
   (`fm-refreshing` dim), shimmer disabled under `prefers-reduced-motion`.
6. Layout routes: the skeleton replaces only the page content, never the sidebar or top bar.
7. Compare: record real vs skeleton height of every major block at each width. Tolerance 4 px. Anything above is a defect to fix.

## Do not
- Do not change the real page to make a skeleton easier. Do not edit existing CSS rules; add new classes at the END of `Skeleton.css`
  under `/* added for <task> */`. Do not alter other pages' skeletons when you adjust a shared primitive (add an optional prop).

## Output
A table per page: block, real size, skeleton size, difference, fixed yes/no, per breakpoint. State what was measured versus derived.
