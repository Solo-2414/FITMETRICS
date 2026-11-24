---
description: "Fix Clerk Attendance, Dashboard, Notifications, Member Information and Settings: loading states, feedback, QR station, drawer, dead buttons and unfinished functions."
agent: 'agent'
---
# Task 17: Clerk Attendance, Dashboard, Notifications, Member Information, Settings

Use `design-freeze` and `verify-before-done`. Reuse existing classes; new classes go in the page's own module.

## Attendance (`ClerkAttendance.jsx`)
1. **No loading state.** Show `SkeletonKpiCards` + a floor-grid skeleton + `SkeletonTable` on first load, then `fm-fade-in`. Keep data on screen (dim) on 10 s refreshes. Show a real error state with Retry instead of zeros.
2. Replace the 4-request / 10 s poll with: live (10 s, only when the tab is visible and date is today), stats + log (30 s), QR codes (only on mount and after create/revoke).
3. Date picker: `max` = today; when the date is not today hide "Check out all", relabel "Check-ins today"/"Today's log" with the date, and hide the live floor card.
4. Log: use server pagination (`page`, `limit`, `total`) and move `search` and `state` filtering into the SQL query (currently filtered after paging, so counts and rows disagree). Add a page control.
5. Search box: loading spinner, "No members found" message, clear matches when the input is under 2 characters, do not re-search after picking a member, honor `fastCheckinAutoFocus` / `autoClearCheckinSearch`, read `?focus=checkin` (Dashboard links to it) and focus the search input.
6. Check-out buttons: per-row busy state; toasts for every error (not the top banner). `checkoutAll` shows the count in the confirm message.
7. **QR station.** Revoke needs `useConfirm` (printed posters stop working). The Saved QR list must show status (Active / Expired / Revoked), expiry and last used, hide Revoke for revoked/expired codes, and allow "Show QR" again: add `GET /clerk/attendance/qr-codes/:id/url` is NOT possible because only the token hash is stored, so instead make "Generate" reuse an unexpired non-revoked code with the same label when one exists, and say so. Wrap clipboard in try/catch with a success/failure toast; handle `image.onerror` in `downloadPoster`.
8. Flagged: add a "Flagged" column/pill in the log and a "Clear flag" action (`POST /clerk/attendance/:id/unflag`, audit-logged) or remove the KPI if you cannot define flagged.

## Dashboard (`ClerkDashboard.jsx`)
1. Delete the hidden `<tbody style={{display:"none"}}>` that holds fake rows (Carlos Mendoza etc.).
2. Successful refresh must clear `error`. Poll with visibility check, and share data with `ClerkLayout` (see task 19) instead of calling `/clerk/dashboard` twice.
3. `record.display_name.split` crashes on null: use a safe `initials()` helper.
4. Cash drawer: "Starting morning float" must show `drawer.session.opening_float` (not the preference). Disable "Count / Close" when the drawer is closed and show "Closed" with the variance; the Adjust form must reset its fields each time it opens. Show modal errors INSIDE the modal (not in the page banner behind it). Use `ClerkModal`.
5. The reminder state is one string for the whole list; use a per-membership map. Use the response: if `queued` is false show "Already sent today" instead of "Reminder Sent". Pluralise "1 day".
6. Replace the static "Real-time Sync Active" badge with a real state (Live / Updating / Offline based on the last poll). "Quiet" density label must match the header ("-" is shown now).
7. Dashboard KPI "E-Wallets" and text "GCash/Maya" should say "QR Ph / e-wallet".

## Notifications (`ClerkNotifications.jsx`, `ClerkLayout.jsx` dropdown)
1. Clear `error` on every successful load. Ignore stale responses when switching tabs (AbortController). "Load more" shows a spinner and is disabled while loading.
2. Make each notification clickable: navigate to `item.link` and mark it read. Use the same type icons as the dropdown.
3. Show unread counts per tab (the API returns totals; add `unread_by_type` to the response) and disable "Mark all as read" when nothing is unread.
4. Listen for `fitmetrics:notifications-changed` and refresh the list; group by day in Asia/Manila.
5. Dropdown in `ClerkLayout`: on fetch failure show an error row with Retry instead of "Loading..." forever; wrap item click and Mark all in try/catch; create one shared `AudioContext` and do not beep on the first load.

## Member Information (`ClerkMemberInformation.jsx`)
1. The header says "view and manage" but there is only Send info and Renew. Add a "View" drawer/modal (name, code, contact, emergency contact, plan history, QR devices count, last visit) and clerk actions: Suspend/Reactivate (confirm + audit log + backend route `PATCH /clerk/members/:id/status`), "Reset check-in devices" (the route already exists), "Edit contact" (phone/email with the same validation as registration). Ask before adding any migration.
2. Mobile cards hide the Plan & coach block (`.cardTop>div:nth-of-type(3){display:none}`); show it. Fix the status-dot class names (`dotsuspended`, `dotno-membership` do not exist in the CSS).
3. "This month" chip uses the browser date; use the Manila helper. Remove the unused `.toast` CSS and the ignored `showSystemErrorToast` prop everywhere.
4. Skeleton: match the real columns (`2fr 1.15fr 1.5fr 1fr 1.15fr .9fr .7fr`) on desktop and use `SkeletonList` cards on mobile.

## Settings (`ClerkSettings.jsx`)
1. The bottom "Cancel" has no handler and "Save Changes" only saves the phone. Remove the bar or make it real (dirty tracking, disabled when nothing changed, Cancel reverts).
2. Phone: validate (same rules as registration), loading state, trim. Password: min length and match rules, show/hide toggle, disabled while saving, reject new = current, toast.
3. Avatar: progress/spinner, preview, reset `input.value` so the same file can be chosen again, confirm before delete, bust the cache after upload (append `?v=<updated_at>`) and reset `avatarFailed` in `ClerkLayout` when `avatar_url` changes.
4. Preferences: debounce number input (and allow an empty value), roll back on a failed save and show a toast "Saved"/"Could not save". Listen to `fitmetrics:preferences-error` or remove it. Remove the options that do not exist (gcash/maya) and add the missing "Default landing page" select (`defaultLandingPage` is used by Login already).
5. `api("/clerk/settings")` result is unused; either use the gym info (hours, payment modes) or drop the request and the skeleton gate.

## Done when
No page shows fake zeros while loading, every action has a toast or inline result, no dead button remains on these pages, and `verify-before-done` passes.
