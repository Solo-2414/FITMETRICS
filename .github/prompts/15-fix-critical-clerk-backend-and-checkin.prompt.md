---
description: "Fix the broken clerk check-in paths, swallowed backend error messages, the global scanner listener, dead /clerk/members links, member lookup and the dashboard floor count."
agent: 'agent'
---
# Task 15: Critical clerk fixes (do this first)

Use the skills `design-freeze` and `verify-before-done`. Do ONLY what is listed. Do not change the look of any page.
Search for every caller before changing an endpoint or response shape.

## 1. Backend error messages are swallowed
`backend/src/server.js` error handler returns `err.publicMessage || mapped.message`, and nothing in the repo sets `publicMessage`.
So errors such as "This member already has an open check-in." and "This member does not have a current active membership." reach the UI as "Something went wrong on our side."
- In the handler: if `err.statusCode` is 400-499, return `{ error: err.message, code: err.code }`. For 5xx and database errors keep the mapped generic message and never leak `err.message` in production.
- Keep `debug` only when `NODE_ENV !== 'production'`.
- Add a case to `backend/scripts/test-error-mapper.mjs` (or a new script) proving a 409 error keeps its message and a plain `Error` still returns the generic text.

## 2. Fast Check-in and Quick Scan in `ClerkLayout.jsx` always fail
- `POST /clerk/attendance` only accepts `method: "manual"`. The layout sends `"member_id"` and `"qr"`. Send `"manual"` (the audit log already records who did it). Do not loosen the backend.
- The modal search calls `/clerk/members?search=...` with no `page`; that path ignores `search` and returns the whole roster, so `rows[0]` is the first member alphabetically. Replace it with `/clerk/members/lookup?q=` (already returns status, plan, validity).
- Show a result LIST (max 8) the clerk clicks to select, with loading, "No members found", and the blocked reason for expired/suspended/no plan, exactly like `ClerkAttendance.jsx` does. Do not auto-select `rows[0]`.
- Debounce 250 ms, ignore out-of-order responses (request id or AbortController), catch errors with a toast.
- Submit button: disabled + "Checking in..." while saving. After success: toast, close, dispatch `window.dispatchEvent(new Event("fitmetrics:attendance-changed"))`, and reload the header floor count on that event.
- Honor the saved preferences `fastCheckinAutoFocus` and `autoClearCheckinSearch` (they are currently read by no page).
- Modal accessibility: use `ClerkModal` (Escape, backdrop, focus trap) instead of the custom overlay. Make `ClerkModal` keep `onClose` in a ref so an inline callback does not re-run its effect and steal focus.

## 3. The global scanner listener captures every keystroke
The `keydown` listener in `ClerkLayout.jsx` appends every printable key (including text typed in inputs) to `scannerBuffer`; pressing Enter in ANY input fires a roster lookup and a "No member matches this scan" toast, and a typed member code would check a member in.
- Ignore events whose target is `input`, `textarea`, `select` or `[contenteditable]`, and events with ctrl/meta/alt.
- Use a ref for the buffer (not state, so the listener is registered once) and treat input as a scanner only if keys arrive faster than ~35 ms apart; clear the buffer after 100 ms of silence.
- Look the code up with `/clerk/members/lookup?q=<code>` and require an exact `member_code` match; then `POST /clerk/attendance` with `method: "manual"`.
- Only listen while Quick Scan mode is open OR when focus is on `document.body`. Show a toast with the member name on success and the real server message on failure.

## 4. Links to a route that does not exist
`/clerk/members` is not a route (the page is `/clerk/member-information`); the catch-all redirects the clerk to the landing page.
- `ClerkMemberRegistration.jsx`: two "View member" links (`href="/clerk/members?search=..."`). Use `useNavigate`/`<Link to={`/clerk/member-information?search=${...}`}>` (no full page reload).
- `backend/src/routes/clerk.js` `/clerk/notifications/summary`: the registration fallback link `'/clerk/members'` -> `/clerk/member-information`. Also fix any stored `link` values with a small migration only if they exist in `notifications` (ask me before writing the migration).
- Search the whole repo for other `/clerk/members` strings used as page links.

## 5. Member lookup returns wrong people
In `GET /clerk/members/lookup`:
- For a name query `normalized` is `''`, so `phone_normalized.ilike.%%` matches everyone. Only add the phone clause when `normalized.length >= 3`.
- Add `member_details.member_code` search (the UI promises it). If PostgREST cannot `or` across the embedded table, query member_code separately and merge by id.
- Escape `%`, `_`, `,`, `(`, `)` and `\` in the term before interpolating into `.or(...)`. Apply the same escaping to `findExistingMember` in `clerk.js`.

## 6. Dashboard "Active on floor" is wrong
In `GET /clerk/dashboard`: `new Set(members.data.map(r => r.member_id))` includes `null` for walk-in attendance rows, then `walkIns.data.length` is added again.
- Compute from open attendance rows only: `activeOnFloor` = count of attendance rows with `status='open'` and `check_out_at is null` (members + walk-ins). `openSessions` = same number. Remove the `walk_in_visits` count from this formula.
- Make `/clerk/attendance/live`, the header count, the dashboard and the Attendance page all use this same definition and the same capacity source (`gym_settings.floor_capacity` vs `capacity` are both used today: pick one, state which, and migrate the other).
- Open attendance rows from previous days must not count as "on the floor". Add `check_in_at >= today start` or auto-close stale rows at the next opening (state your choice).

## 7. Failed QR generation leaves junk rows
In `POST /clerk/attendance/qr-codes` the row is inserted before `PUBLIC_APP_URL` is validated. Validate the base URL first, then insert. Also refuse to fall back to the hard-coded secret `'fitmetrics'` when `CHECKIN_CONFIRM_SECRET` is missing (return 503 with a clear message).

## Tests / done when
- Fast Check-in selects the member the clerk clicked, checks them in (201), a second try shows "This member already has an open check-in." and an expired member shows the real reason.
- Typing a name and pressing Enter in any input shows no scan toast.
- Registration success "View member" opens Member Information filtered, not the landing page.
- Searching "juan" in lookup returns only matching people.
- Dashboard count equals Attendance "On the floor now" with a walk-in checked in.
- Run the `verify-before-done` checklist and paste what you ran versus only read.
