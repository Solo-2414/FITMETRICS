---
description: "Admin posts workout video tutorials (YouTube/Vimeo links) that members can watch; real admin CRUD and real member page."
agent: 'agent'
---
# Task 6 of 6: Workout Video Tutorials

Files: `frontend/src/pages/admin/AdminVideoTutorials.jsx` (+ .module.css),
`frontend/src/pages/member/MemberVideoTutorials.jsx`, `backend/src/routes/admin.js` and `member.js` (or a new
`videos.js` mounted in `server.js`), table `video_tutorials` (RLS already: members read `visibility = 'public'`,
admin writes).

## Decision already made
Videos are PASTED LINKS (YouTube or Vimeo) shown with an embedded player. No file uploads and no storage bucket.

## Current state (verified in the code)
- No backend routes exist for videos.
- Admin page: six hard-coded cards; the add/edit forms only close the modal; the edit modal is not tied to a record;
  there is no delete. The banner shows fake "24 Video Tutorials Published" and "579 Total Views".
- Member page: a static list (titles such as "Dumbbell Incline Press"). Members cannot actually watch anything yet.
- Table columns: title, category, difficulty, duration_seconds, video_url, thumbnail_url, visibility (public|hidden),
  created_by, timestamps.

## Do
1. Migration (next number): add an index on `category`, a `unique` constraint (or unique index) on `video_url`
   to prevent duplicates, and a CHECK that `difficulty` is null or one of beginner|intermediate|advanced.
2. Backend helper `backend/src/lib/video.js`: parse a pasted URL, ACCEPT ONLY https links on youtube.com,
   www.youtube.com, m.youtube.com, youtu.be and vimeo.com. Extract provider + id, reject everything else
   (no other hosts, no `javascript:`/`data:` URLs). Build the embed URL server-side
   (`https://www.youtube-nocookie.com/embed/<id>`, `https://player.vimeo.com/video/<id>`). For YouTube derive the
   thumbnail `https://i.ytimg.com/vi/<id>/hqdefault.jpg`; for Vimeo return null and let the UI show a placeholder.
   Verify these URL formats against the official docs.
3. Admin endpoints (requireAuth + requireRole('admin'), prefix-scoped guard): `GET /admin/videos` (all, with
   filters category/visibility/search), `POST /admin/videos`, `PATCH /admin/videos/:id`,
   `DELETE /admin/videos/:id` (hard delete is fine here). Validate: title 3-120, category from a shared list,
   difficulty enum, duration as `mm:ss` converted to `duration_seconds` (0 < d <= 4 hours), visibility enum.
   Responses include `provider`, `embedUrl`, `thumbnailUrl`. Write an audit_log row for create/update/delete.
4. Member endpoint `GET /member/videos` (members only; return ONLY `visibility = 'public'`; support `category`
   and `search`); responses include `embedUrl`, `thumbnailUrl`, duration label.
5. Keep ONE shared category list used by the admin form, the member filter chips and the API validation:
   the categories currently in the admin form (read the page for the exact strings; there are five plus a placeholder).
6. Admin page: grid from `GET /admin/videos`; Add modal posts; Edit modal prefilled for the selected record;
   delete with a confirm step; a show/hide (visibility) toggle; category filter and search; loading, error and
   empty states. Replace the fake banner with real counts (published / hidden). REMOVE the "Total Views" stat
   (views are not tracked; do not invent a number).
7. Member page: fetch `/member/videos`; filter chips from the shared categories; clicking a card opens a modal
   with the embedded player (`<iframe>` with `src` = server-built `embedUrl`, `allowFullScreen`,
   `referrerPolicy="strict-origin-when-cross-origin"`, `loading="lazy"`, a descriptive `title`). Close stops playback
   (unmount the iframe). Loading, error and empty states. Remove the hard-coded list.

## Don't
- Don't embed any URL that did not pass the server-side allowlist. Don't accept raw iframe/HTML from the admin.
- Don't add storage buckets, upload fields or new heavy dependencies.
- Don't change the layout or class names.

## Done when
- Pasting a YouTube and a Vimeo link creates two cards; a `facebook.com` or `javascript:` link is rejected with a clear message.
- A hidden video disappears from the member page immediately; deleting removes it everywhere.
- A member can open a video and watch it in the embedded player on desktop and mobile widths.
- Frontend build + lint pass; backend files pass `node --check`.
