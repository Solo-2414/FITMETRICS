---
description: "Clerk Notifications and Settings: real header bell badge with a recent-notifications dropdown, a better notifications page, settings layout fixes, and working Terminal Preferences."
agent: 'agent'
---
# Task 8d of 8d: Clerk Notifications (header bell) + Settings

Files: `frontend/src/components/clerk/ClerkLayout.jsx` (+ .module.css), `frontend/src/pages/clerk/ClerkNotifications.jsx`,
`ClerkSettings.jsx` (+ .module.css), `ClerkPayments.jsx` and `ClerkAttendance.jsx` (only to consume preferences),
`backend/src/routes/clerk.js` (`/clerk/notifications*`, `/clerk/settings`), `backend/src/services/notify.js`.

## Current state (verified in the code)
- ClerkLayout loads `GET /clerk/notifications` once on mount and counts `!read_at`. The sidebar shows `navBadge` with the number, but
  the header bell (`btnNotification`) only shows a dot (`notificationDot`) and navigates straight to `/clerk/notification`.
  The count never refreshes after you read items or when new ones arrive.
- `GET /clerk/notifications` returns the list (check its limit); the page filters tabs on the client; the tab counts for
  "New Registrations" are missing (the count expression ignores `key === "new"`), and "new registrations" is detected by searching
  the title for the word "registered".
- Settings: `ClerkSettings.jsx` saves two "terminal preferences" (`audioAlerts`, `paymentPrompt`) to `localStorage` only. A search
  shows NOTHING else reads them, so the toggles have no effect. Layout problems: button positions and design inconsistencies
  (look at the profile, security and preferences cards on desktop and phone widths).

## Notifications: header bell
- New lightweight endpoint `GET /clerk/notifications/summary` returns `{ unread, latest: [5 newest, with id,type,title,message,
  created_at, read_at, link] }`. Add `?limit=` (max 10). The layout uses it, not the full list.
- Badge: a small number badge on the bell (1-99, then "99+"), hidden at 0, with an accessible label ("3 unread notifications").
  The same number is used in the sidebar badge. Subtle pop animation when the count increases (respect `prefers-reduced-motion`).
- Refresh: poll the summary every 30 s while the tab is visible, refresh when the tab regains focus, and update immediately when
  the notifications page marks items read (use a small shared store/context or a window event; keep it simple).
  If Supabase realtime is already used elsewhere in the project, reuse it; otherwise polling is fine. Do not add a new service.
- Clicking the bell opens a dropdown panel (not a navigation): header "Notifications" + unread count, the 5 most recent items
  (icon by type, title, one-line message, relative time, unread dot), per-item click = mark read and go to the related page when
  there is one (payment -> `/clerk/payments`, expiring -> `/clerk/membership?member=<id>`, registration -> `/clerk/members`,
  announcement -> notifications page), "Mark all as read", and a "View all notifications" link to `/clerk/notification`.
  Loading skeleton, error and "You're all caught up" empty states. Close on outside click, Escape and route change;
  keyboard and screen-reader friendly; fits on a phone screen.

## Notifications: page improvements
- Server-side filter by type/read state and pagination (or "Load more"), so old notifications are reachable and nothing silently
  stops at a limit. Tab counts come from the server (`counts` by type + unread) and every tab has a count, including New Registrations.
- Store the type properly: registrations use a real notification `type` (add one if needed in the next numbered migration, or reuse
  an existing type) instead of matching the word "registered" in the title. Backfill nothing destructive.
- Group by Today / Yesterday / Earlier, unread first inside a group, "Mark read" per item, "Mark all read" works for the active
  tab only if a tab is selected (confirm text says which), and a small "Delete/dismiss" only if the table already supports it.
- Optional, only if cheap: a `Settings` preference to mute sound for new notifications (see Settings below). Do not build a push system.

## Settings: layout and design fixes
- Fix button positions: consistent alignment of Save/Update/Cancel buttons (right-aligned in each card on desktop, full width on
  mobile), consistent order (secondary left, primary right), no buttons floating outside cards, consistent heights, disabled and
  loading states ("Saving...") on every button, and sensible spacing between cards. Keep colors, fonts and class names; only fix
  spacing, alignment and responsive breakpoints in `ClerkSettings.module.css`, plus small markup changes needed for alignment.
- Profile photo, phone and password forms keep working (they call `/me`, `/me/avatar`, `/me/password`). Add inline validation
  messages and keep success/error alerts visible near the form they belong to.

## Settings: Terminal Preferences (make them real)
- Persist preferences per clerk, not per browser: add a `preferences jsonb not null default '{}'` column to `profiles`
  (or a small `staff_preferences` table with RLS) in the next numbered migration, `GET/PATCH /clerk/settings/preferences` with a
  validated allow-list of keys and types. Keep a localStorage copy only as an instant-load cache and migrate any existing
  `fitmetrics.audioAlerts` / `fitmetrics.paymentPrompt` values the first time.
- Existing toggles must actually do something:
  `audioAlerts`: play a short sound (a tiny bundled audio file or WebAudio beep, no external URL) on successful check-in,
  payment recorded, and when a new notification arrives; browsers block audio before a user gesture, so handle that quietly.
  `paymentPrompt`: when on, show a confirmation dialog before recording a payment ("Record ₱X by GCash for NAME?");
  when off, record directly. Read the preferences through one hook `useTerminalPreferences()` used by ClerkPayments,
  ClerkAttendance and ClerkLayout.
- Add the other terminal preferences that fit a front desk (only these, each must work): default payment method (cash/GCash/Maya),
  default landing page after login (dashboard/attendance), Fast Check-in auto-focus on page open, auto-clear the check-in search
  after success, and opening cash float (move the `fitmetrics_opening_float` localStorage value used by the Dashboard into this
  server-saved preference and have the Dashboard read it from there). Each has a clear label, helper text and a "Reset to defaults" button.

## Don't
- Don't send email or SMS from notifications. Don't expose other users' notifications; every endpoint filters by the logged-in user.
- Don't change the member or admin notification behavior (they share the table). Search for all callers of `/clerk/notifications`
  before changing its response; keep the existing list response working or update every consumer.

## Done when
- The header bell badge shows the real unread count, updates without a page reload, and the dropdown shows only the 5 most recent
  items with a working "View all" to the notifications page; sidebar and bell numbers always match.
- Every notification tab shows a correct count; old notifications are reachable.
- Settings looks aligned on desktop and phone; each Terminal Preference changes behavior and is remembered after logout/login on
  another browser.
- Frontend build + lint pass; backend `node --check` passes; run `/supabase-migration-review` and `/verify-before-done`.
