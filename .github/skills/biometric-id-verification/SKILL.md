---
name: biometric-id-verification
description: "Use whenever a FITMETRICS task handles ID photos, selfies, face matching or any identity-verification data. Enforces consent, private storage, human review, retention and audit for sensitive personal data."
---

# Face and ID verification rules

IDs and face images are sensitive personal data. The gym is in the Philippines, so the Data Privacy Act of 2012 likely applies; tell the owner to
confirm requirements with a lawyer or the National Privacy Commission (you are not giving legal advice). Treat this as the most sensitive data in the system.

## Rules
- Consent first: an explicit unticked checkbox with purpose and retention text, stored with timestamp and text version. No consent, no capture.
- Storage: PRIVATE Supabase bucket only, never public, never in `/frontend/public`. Backend creates short-lived signed URLs for admin/clerk only.
  Random uuid paths, no names. Strip EXIF. Limit size and MIME type, verify magic bytes.
- Store the least: keep the result (`status`, `score`, `method`, `verified_at`, `verified_by`) and delete images after a configurable retention
  window with a scheduled job. Do not persist face embeddings/templates unless unavoidable; if you do, say so clearly.
- Never auto-reject on a model score alone. Statuses: `pending`, `verified`, `needs_review`, `rejected`, `expired`. Low confidence goes to a
  clerk review queue (both images side by side, approve/reject with a required reason).
- Anti-spoofing: at least a basic liveness step. State honestly what it does NOT stop.
- ID checks: legibility checks (blur, glare, crop). Never log or display a full ID number; mask all but the last 3-4 characters in UI and audit rows.
- Libraries/models: choose from current official docs and licenses, pin versions, load lazily, run in the browser where possible so raw frames
  are not streamed to third parties. No third-party face API without telling me first.
- Fairness and access: always keep a manual path (clerk checks the ID in person) so nobody is blocked by the algorithm. Works on low-end phones,
  keyboard and screen-reader labels, camera-denied state handled.
- Backend: validate everything, rate limit attempts per member and IP, audit every view/approve/reject/delete of an image, RLS on all new tables,
  members may read only their own status, never the images.
- Frontend: toast for results, `InlineError` for load failures, `Skeleton` for the review queue, `design-freeze` for existing pages.

## Final reply additions
A data inventory table: what is stored, where, who can read it, for how long, how it is deleted.
