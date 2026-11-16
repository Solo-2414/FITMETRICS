---
description: "Performance and scalability: unbounded roster queries, .in() URL limits, in-memory pagination, per-request auth lookups, polling load, rate limiting, bundle size, indexes."
agent: 'agent'
---
# Task 20: Optimization (measure first, then change)

Use `verify-before-done` and `supabase-migration-review`. Do NOT run SQL yourself: put all SQL in the next numbered migration file and tell me to run it. Before each change write the measured "before" (request count, payload size, query time or bundle size) and after the change the "after".

## A. Backend
1. **Roster scalability.** `memberRoster()` loads every member and every membership (`.in('member_id', allIds)`). With a few hundred members the URL exceeds the PostgREST limit and the endpoint fails. Remove the unpaginated branch of `GET /clerk/members`: always use `get_clerk_member_roster` (already paginated). Replace the callers that relied on the plain array:
   - `ClerkPayments.jsx`: `api("/clerk/members")` -> `/clerk/members/lookup?q=` (type-ahead) and a "Needs renewal" list from `?status=expiring,expired&limit=5`.
   - `ClerkLayout.jsx` scanner/Fast Check-in (task 15).
   Also stop sending every member's emergency contacts to the clerk browser: `lookup` and the roster return only the fields the UI uses.
2. **`getMembershipState`** uses `.in('member_id', ids)`: chunk ids in batches of 100 or move the logic to one SQL function/view.
3. **Payments list.** `GET /clerk/payments` loads every payment in the range and slices/filters in memory (and the search runs a second query). Move filter + search + pagination + totals into SQL (`range`, `count: 'exact'`, or an RPC `get_clerk_payments`) and return `{ rows, total, totals }`.
4. **Attendance log** filters `state`/`search` after pagination: move into the query. Merge `live`, `stats` and `log` into `GET /clerk/attendance/overview?date=` (one round trip, one auth) and keep the old routes working.
5. **Notifications.** `GET /clerk/notifications` downloads every notification row just to count by type. Use a grouped count RPC. Add `unread_by_type`.
6. **Auth cost.** `requireAuth` makes 2 network calls on every request (`auth.getUser` + profile) and, for members, a third settings query. Add a small in-memory cache: profile and gym settings for 15-30 s keyed by user id / token hash, invalidated when a profile is updated.
7. **Settings reads.** `gym_settings` is queried in many handlers per request. Add `getGymSettingsCached()` with a 30 s TTL and invalidate it on save.
8. **Rate limit.** The limiter is 120 requests/min per IP: several clerks behind one desk router share it and polling will cause 429s. Key by `req.user?.id || req.ip` (apply the limiter after auth for `/api/clerk` and `/api/admin`) and raise the limit for authenticated staff to 300/min; keep strict limits for public routes (`/check-in`, login).
9. Add `compression()` middleware (skip the PayMongo webhook raw route) and `Cache-Control: no-store` on authenticated JSON.
10. `findExistingMember` calls `auth.admin.listUsers({ perPage: 1000 })` and only checks page 1. Query the profile by normalized email/phone first and use `auth.admin.getUserByEmail`-style lookup (or an RPC on `auth.users`) instead of listing users.
11. `cashDrawerTotals` sums cash payments with no upper bound; add `.lt('paid_at', session.closed_at ?? now)` and use a SQL `sum` instead of fetching rows.

## B. Database (next numbered migration, idempotent)
Create indexes only if missing, after checking the existing ones in `supabase/migrations`:
- `payments (created_at desc)`, `payments (status, paid_at)`, `payments (member_id, created_at desc)`
- `attendance (check_in_at desc)`, `attendance (status, check_out_at) where check_out_at is null`, `attendance (member_id, check_in_at desc)`
- `memberships (member_id, status, end_date)`
- `notifications (user_id, read_at, created_at desc)`
- `profiles (role, status)`, `profiles (phone_normalized)`, trigram index (`pg_trgm`) on `profiles.full_name`/`email` for ilike search
- `walk_in_customers (phone_normalized)`, `walk_in_customers (email_normalized)`
Add `check_in_at`-based partial index for "open today" queries. Explain each index with the query it serves. Add retention for `notifications` and `email_log` (delete/archive older than 180 days via a scheduled job in `emailJobs.js`), and a nightly job that closes attendance rows left open from previous days.

## C. Frontend
1. **`api()` in `lib/api.js`:** accept an `AbortSignal` (`api(path, { signal })`), add a 20 s timeout, and dedupe identical in-flight GETs. Update `useApiData` to abort on path change/unmount. Use it in every search box (Members, Membership, Payments, Walk-ins, Users, Notifications).
2. Add `hooks/useDebouncedValue.js` and use it instead of per-page `setTimeout` code and for the unthrottled `updateFilters` in Membership and Payments.
3. **Polling policy** in one `usePolling(fn, ms, { whenVisible: true, pauseOffline: true })` hook with backoff (x2 up to 2 minutes after errors) and an immediate refresh on tab focus. Replace every `setInterval` that calls the API.
4. **Code splitting.** Convert page imports in `App.jsx` to `React.lazy` + `Suspense` with `SkeletonPage` as the fallback; configure `build.rollupOptions.output.manualChunks` in `vite.config.js` for `react`, `chart.js/react-chartjs-2`, `qrcode`, `@supabase/supabase-js`. Load `qrcode` only inside `ClerkAttendance`. Register only the chart.js components in use. Report the bundle sizes before and after (`npm run build`).
5. Memoize expensive derived data (`useMemo`) in `ClerkPayments` (matching members), `ClerkNotifications` (grouping) and the list components; avoid rendering both the desktop table and the mobile cards at the same time in Member Information/Membership (render one based on `matchMedia`).
6. Images: serve avatars at a small size (`?width=96` Supabase transform or resize on upload to 256 px), add `loading="lazy"` and explicit width/height to avoid layout shift. `hero.png` and `gym-bg.jpg` in `public`: compress and add `fetchpriority` only for the landing hero.
7. Repository hygiene: `frontend/dist` and `backend/tmp/report-previews` are in the project folder; add them to `.gitignore` and remove them from git. Confirm `.env` files are not tracked (`git ls-files | grep .env`); if any secret was ever committed, tell me so I can rotate the keys.

## Tests / done when
- Roster, payments, attendance log, notifications each return in one request and stay correct with 1,000 seeded members (add `backend/scripts/seed-load-test.mjs` that seeds a local test schema only and a script that prints timings).
- No 414/400 "URI too long" errors on the roster, no 429 with 3 clerks polling for 5 minutes, one `/clerk/dashboard` poll in the network tab, initial JS for the clerk login route under 250 KB gzipped.
- Report: files changed, migration to run, before/after numbers, and what was only read vs executed.
