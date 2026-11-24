---
description: "Make every loading skeleton match its real page exactly (structure, tokens, heights, breakpoints). Adds missing skeletons. Measured, per page."
agent: 'agent'
---
# Task 23: Skeletons that match the system UI (strict)

Use `skeleton-fidelity`, `design-freeze` and `verify-before-done`. Prompt 19 added the variants in `components/ui/Skeleton.jsx`, but they were not measured against the pages.

## Audit first (one message, then continue)
List every page under `frontend/src/pages` and for each say: which skeleton it uses (or none), real structure, and the differences you can see by reading the code.
From my scan these pages have no `Skeleton`/`Loadable` at all: `ClerkAttendance`, `MemberWorkoutPlans`, `MemberCheckIn`, `CheckIn`, `RegistrationModal` (and the public pages).
Check whether each really loads data asynchronously before adding one. `Skeleton.css` uses fallback hex colors; confirm the tokens `--card-bg-dark` and `--card-pill-bg`
really exist in `App.css`/`index.css` and match the card background the pages actually use. If they do not, fix the skeleton to use the real tokens.

## Work (page by page, finish one before the next)
Follow the `skeleton-fidelity` procedure exactly. Order: Member pages, Admin pages, Clerk pages, then the unskeletoned ones.
- Same grid classes, card count, row count, fixed heights, radius, border and background as the real page, at 1920, 1366, 768 and 390 px.
- Tables: same column count and header/row heights, mobile card layout if the real page has one.
- Modals with loading details use `SkeletonForm` sized like the real form.
- New variants go in `Skeleton.jsx`/`Skeleton.css` (new classes appended at the end). Shared primitives only get optional props.
- Pages with an empty state or error state must show those, not a stuck skeleton (check the loading flag is cleared in `finally`).

## Deliverable
For each page a table (block, real px, skeleton px, difference per breakpoint). Fix anything over 4 px. State clearly which numbers were measured in a browser and which were derived from CSS.
Do not change any real page's markup or CSS to fit a skeleton. End with `verify-before-done`.
