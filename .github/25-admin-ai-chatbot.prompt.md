---
description: "Integrate the existing face + ID verification code into the system and make it standard, private and reviewable."
agent: 'agent'
---
# Task 27: Face and ID verification

Use `biometric-id-verification`, `design-freeze`, `toast-feedback`, `skeleton-fidelity`, `supabase-migration-review` and `verify-before-done`.

## Input I will give you
My existing face/ID verification code is NOT in this repository yet. I will put it in `docs/face-id-existing/` before you start. If that folder is empty, ask me for it once and stop.
Read all of it first and summarize in 10 lines: what it does, which library/model it uses, its license, what it sends over the network, and what is weak (no consent, public storage, no liveness, secrets, no review).

## Where it runs (assumption, tell me if wrong)
At member registration at the front desk (clerk captures ID front + selfie, `ClerkMemberRegistration`) and a re-verify option for a clerk from member information. Smallest safe assumption: it must never block registration;
a failed or skipped check becomes `needs_review` and the clerk can verify manually.

## Build
1. Migration (next number): `identity_verifications` (member/registration reference, status enum per the skill, method, score, consent_version, consent_at, id_type, id_last4, image paths, reviewed_by, reviewed_at, review_reason, expires_at),
   private storage bucket + policies, RLS, backend-only access to images. Idempotent. Run `supabase-migration-review`.
2. Backend `routes/identity.js` (path-prefixed guards, validation, rate limit): upload (multipart with `multer`, already installed, size and magic-byte checks), submit result, list review queue,
   approve/reject with reason, signed-URL view, delete, retention job in `jobs/` (config `ID_IMAGE_RETENTION_DAYS`). Every access writes `audit_log`.
3. Frontend: a reusable `components/identity/IdentityCapture.jsx` (camera permission handling, guidance overlay, blur/glare checks, liveness step, retry, fallback "verify manually") derived from my code but cleaned up:
   one responsibility per file, no globals, cleanup of camera streams, models lazy-loaded, no secrets. Inserted into the registration flow without changing its layout (`design-freeze`).
   A clerk review queue view (reuse existing table and modal styles) with a matching skeleton. All feedback through toast / `InlineError`.
4. Consent text and retention shown before capture; member can see their own verification status only.
5. Tests: status transitions, consent required, non-clerk cannot read images, signed URL expiry, mask of ID numbers in logs/audit, retention job deletes files and keeps the result.

## Final reply
Data inventory table, what I must configure (bucket, env), the migration to run, manual test steps (good capture, blurry ID, camera denied, low score -> review, clerk approve, retention delete), and the remaining risks (liveness limits, lighting/skin-tone accuracy, legal review).
