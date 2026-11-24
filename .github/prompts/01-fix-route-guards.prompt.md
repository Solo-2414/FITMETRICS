---
description: "Fix the path-less role guards that block admins from /api/users and /api/me, then verify Manage Users end to end."
agent: 'agent'
---
# Task 1 of 6: Fix route guards + verify Manage Users

## Problem (already diagnosed; confirm it in the code, then fix)
`backend/src/routes/admin.js`, `clerk.js` and `member.js` each start with
`router.use(requireAuth, requireRole(...))` with NO path, and `server.js` mounts all of them at `/api`.
Express runs a path-less `router.use` for every request that reaches that router, even for paths the
router does not define. Effects:
- Admin calling `GET /api/users` falls through `memberRoutes` (mounted before `userRoutes`) and gets
  "You do not have permission to do this." This is the Manage Users bug.
- `/api/me` is blocked for admins and clerks the same way.
- Members calling `/api/me` or `/api/attendance/me` are blocked by the clerk guard first.

## Do
1. Scope each guard to its own prefix:
   admin.js `router.use('/admin', ...)`, clerk.js `router.use('/clerk', ...)`, member.js `router.use('/member', ...)`.
2. Search ALL of `backend/src` for any other path-less `router.use(` / `app.use(` that applies
   requireAuth or requireRole. Fix each one that has the same problem and list them in your reply.
3. Add `backend/scripts/check-guards.mjs`: a static scan of `backend/src/routes/*.js` that exits with
   code 1 if any `router.use(` call that references requireAuth/requireRole has a first argument that
   is not a string-literal path. Add `"check:guards": "node scripts/check-guards.mjs"` to
   `backend/package.json`. Run it. Then temporarily reintroduce a path-less guard, confirm the script
   fails, and revert.
4. Write `docs/api-access-matrix.md`: a table of every endpoint (method + path) and which roles may call it,
   derived from the code.
5. Walk through Manage Users end to end (`frontend/src/pages/admin/AdminManageUsers.jsx` and
   `backend/src/routes/users.js`): list + search + filters, add user (check the username rules),
   edit role/status, view details, membership assignment. For each, confirm the request path, the
   role guard and the response shape match between frontend and backend. Fix real bugs only. List
   anything suspicious that you left unchanged.

## Don't
- Don't touch unrelated routes, the database schema, styling or dependencies.
- Don't rewrite AdminManageUsers.jsx; make minimal edits only if a real bug requires them.

## Done when
- `npm run check:guards` passes in /backend; `npm run build` and `npm run lint` pass in /frontend.
- Using the code (and by running it if you can), this matrix holds. Say which rows you actually ran:
  admin->GET /api/users 200 | admin->GET /api/me 200 | clerk->GET /api/me 200 | member->GET /api/me 200
  member->GET /api/attendance/me 200 | clerk->GET /api/admin/settings 403 | member->GET /api/clerk/payments 403
  member->GET /api/users 403 | admin->GET /api/member/dashboard 403
- Give me a short manual browser checklist for logging in as admin, clerk and member.
