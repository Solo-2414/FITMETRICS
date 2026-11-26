# Admin identity verification

The migrated identity workflow is available only in the protected admin area at
`/admin/identity-verification`. It is not part of member login, member profile,
clerk registration, or clerk member-information screens. Backend routes also
require an authenticated admin; frontend route protection is not the security
boundary.

## Processing and review

- The admin selects a member and confirms that the member explicitly consented
  before using the camera or selecting files. The consent version and server
  timestamp are stored with the attempt.
- The browser runs a basic blink/head-turn check with the pinned MediaPipe
  Tasks Vision package. Video frames are processed locally; the WASM and model
  files are downloaded from jsDelivr and Google-hosted storage. This check is
  not reliable protection against replay video, masks, or advanced spoofing.
- The backend validates file signatures, re-encodes images as JPEG with Sharp
  to strip metadata, and limits the provider-bound images to 900 KiB.
- The ID image is sent to OCR.space for name reading. The ID image and selfie
  are sent to Face++ for face comparison. Provider keys are read only by the
  backend from `OCR_SPACE_API_KEY`, `FACEPP_API_KEY`, and `FACEPP_API_SECRET`.
  The application stores neither OCR text nor face embeddings/templates.
- Every image check ends in `needs_review`, including high scores and name
  matches. An admin must approve or reject with a reason. A separate manual
  path records an in-person check without collecting or storing images.
- Face++ states that it processes biometric information for face functions and
  calls for consent before collection; its policy says source images/results
  are deleted or anonymized as soon as possible. OCR.space states that hosted
  OCR documents are deleted after processing, while API IP addresses are
  logged for a month. Check the current provider terms before production use.

## Configuration and deployment

- Run `supabase/migrations/041_identity_verification.sql` in the Supabase SQL
  Editor. Do not use a public bucket. The migration creates the private
  `identity-verifications` bucket and denies direct `anon`/`authenticated`
  object access.
- The existing backend Supabase service-role configuration is used for
  storage and database operations. Do not expose it to the frontend.
- Set `OCR_SPACE_API_KEY`, `FACEPP_API_KEY`, and `FACEPP_API_SECRET` in
  `backend/.env`. No provider key is needed in Vite configuration.
- `ID_IMAGE_RETENTION_DAYS` is optional (default 30; accepted range 1-3650).
  An Asia/Manila job checks every 15 minutes and deletes expired image objects
  while keeping the result record. Expired unreviewed records become `expired`.
  Member deletion unlinks the profile but leaves the record/images until their
  configured retention deadline.

## Data inventory

| Data | Stored where | Who can read it | Retention and deletion |
|---|---|---|---|
| ID front and selfie | Private Supabase Storage bucket; random UUID paths | Backend service role; admin through 5-minute signed URLs | `ID_IMAGE_RETENTION_DAYS`; scheduled job removes the objects; admin can delete sooner |
| Status, score, method, name-match result, liveness completion hint | `public.identity_verifications` | Express backend; admin through admin routes | Retained with the verification result; images are deleted separately |
| Consent version and timestamp | `public.identity_verifications` | Express backend; admin through admin routes | Retained with the result |
| ID type and final four characters only | `public.identity_verifications` | Express backend; admin through admin routes | Retained with the result; full ID number is not stored |
| Review decision and reason | `public.identity_verifications` | Express backend; admin through admin routes | Retained with the result; numeric ID-like sequences are masked |
| Access/review/deletion audit events | `public.audit_log` | Admin | Existing audit-log retention applies |
| Face/ID request data | Face++ and OCR.space processing endpoints | The respective service | Provider policies apply; see provider links in the admin consent notice |
| Live camera frames | Browser memory during MediaPipe check | The current browser only | Not uploaded; released when capture ends or the page closes |

The current consent wording should be reviewed by the gym owner and qualified
Philippine privacy counsel or the National Privacy Commission before production.
This implementation note is not legal advice.
