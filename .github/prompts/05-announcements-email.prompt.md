---
description: "Make Admin Announcements real: real list and KPIs, scheduling, in-app notifications, and opt-in Gmail SMTP email delivery."
agent: 'agent'
---
# Task 5 of 6: Announcements + in-app notifications + email

Files: `frontend/src/pages/admin/AdminAnnouncements.jsx` (+ .module.css), `backend/src/routes/admin.js`
(`/admin/announcements` CRUD), `backend/src/services/emailQueue.js`, `backend/src/services/mailer.js`,
`backend/src/jobs/emailJobs.js`, tables `announcements`, `notifications`, `email_log`, `email_queue`,
`gym_settings`; member/clerk notification pages and endpoints.

## Current state (verified in the code)
- CRUD endpoints exist, but POST only inserts the row (status from the body is not validated). Nothing creates
  notifications and nothing sends email.
- The page loads the list into state but renders three hard-coded cards. The KPIs ("418", "Read receipts: 92%"),
  the character counter and the "Active & Scheduled" cards are static. Edit, delete, pin, schedule and the
  list update after create are not wired.
- Email stack exists: `enqueueEmail({ emailType, recipient, payload, dedupeKey })`, a queue worker (10 jobs/minute)
  and `renderEmail(emailType, payload)`. The `email_log.email_type` CHECK constraint only allows
  expiry_reminder, expiry_notice, receipt, password_otp, information_overview, and `renderEmail` has no
  announcement template.
- `notifications` has `type` (enum includes `announcement`), `user_id`, `title`, `message`, `read_at`, but no
  link to an announcement. `MemberNotifications.jsx` and `ClerkNotifications.jsx` must display type
  `announcement` properly (check their type-to-icon mapping).
- `announcements.status` enum: draft, scheduled, published, expired, archived. `audience`: all, admin, clerk, member.

## Database (next numbered migration)
- `notifications.announcement_id uuid references announcements(id) on delete set null` (+ index).
- `announcements`: add `send_email boolean not null default false`, `fanout_done_at timestamptz`
  (idempotency guard), `email_total int default 0`.
- Replace the `email_log.email_type` CHECK to also allow `announcement` (look up the constraint name in
  `pg_constraint`; drop and recreate it). Add a `priority smallint default 5` to `email_queue` (or equivalent) so
  receipts and password OTPs (priority 1) are never stuck behind an announcement blast (priority 8). Update the
  queue worker to order by priority, then next_attempt_at.

## Backend
- Validation: title 3-120, body 1-500, audience enum, status in draft|scheduled|published, `expires_at` after
  `publish_at`, `publish_at` in the future when scheduled, `pinned` boolean, `send_email` boolean.
- Publishing (immediately or by the scheduler) runs ONE idempotent fan-out, guarded by `fanout_done_at`:
  a) create in-app notifications (type `announcement`, `announcement_id`) for every ACTIVE profile in the audience,
     inserted in chunks of 500;
  b) if `send_email` is true and `gym_settings.notifications.email` is not false: enqueue one email per active
     recipient with an email address, `emailType: 'announcement'`, dedupeKey `announcement:<id>`, priority 8;
     store the recipient count in `email_total`.
  c) if SMTP env vars are missing, still publish in-app and return a clear warning instead of failing.
- Throttling: Gmail has daily sending limits (check Google's current limits; they differ for personal and
  Workspace accounts). Add env `EMAIL_DAILY_LIMIT` (default 400, add it to .env.example). The worker stops
  sending when today's sent count (Manila day) reaches the limit and resumes the next day; surface this in the API.
- Email template for `announcement`: HTML-escape title and body (never render admin text as raw HTML), gym name,
  footer "You are receiving this because you are a member of <gym name>", reply-to = gym email from settings.
- Scheduler (cron every minute, register it where the other jobs start): move due `scheduled` rows to
  `published` and run the fan-out; move published rows past `expires_at` to `expired`.
- Edit rules: only draft/scheduled can change audience, schedule or send_email; published can change text only
  and never re-sends. Delete: hard delete only for drafts; otherwise archive. Every create/publish/edit/archive/
  delete writes an audit_log row.
- `GET /admin/announcements` returns each row with computed delivery stats: in-app delivered count, read count
  and read rate (from `notifications.read_at`), emails queued/sent/failed (from `email_log`/`email_queue`).
  `GET /admin/announcements/summary` returns the KPI values. Add `POST /admin/announcements/test-email` that
  sends the rendered email only to the logged-in admin's own address.
- Members and clerks see their announcements through notifications (existing endpoints); make sure the
  `announcement` type renders with a sensible icon and the full text on both pages.

## Frontend
- Replace the three static cards with the real list (pinned first). Show status, audience, publish/expire
  dates, delivery stats, and actions: pin/unpin, edit, archive/delete, publish a draft.
- Make the real create form work: title, body with a live character counter (max 500), audience, publish now /
  schedule (date-time) / save as draft, expiry, pin, and an opt-in "Also send by email" checkbox (default off)
  with a confirmation dialog that shows the exact recipient count before an email blast.
- Bind the three KPI cards to the summary endpoint; remove "418" and "Read receipts: 92%".
- New items appear in the list immediately; loading, error and empty states everywhere.

## Don't
- Don't send any email unless `send_email` is true. Don't email suspended/inactive users.
- Don't store or log the SMTP password. Don't render raw HTML from admin input.
- Don't change the layout or class names.

## Done when
- Publishing for audience=member creates one notification per active member, visible on the member's
  notifications page; republishing or retrying never duplicates them.
- With send_email on, the queue sends one email per recipient (test against your own address first), receipts are
  not delayed, and the daily limit stops the worker.
- A scheduled announcement publishes at its time and expires on its expiry time.
- Read rate and email counts on the page match the database.
- Frontend build + lint pass; backend files pass `node --check`.
