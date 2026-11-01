-- Fix: cancelling/expiring a QR Ph registration failed with
--   new row for relation "payments" violates check constraint "payments_subject_check"
-- The old rule required exactly one of member_id / walk_in_visit_id. A cancelled registration payment keeps
-- only its registration_snapshot (the unpaid account is deleted), so that third shape must be allowed.
-- Idempotent: safe to run more than once.

alter table public.payments drop constraint if exists payments_subject_check;

alter table public.payments
  add constraint payments_subject_check check (
    (member_id is not null and walk_in_visit_id is null)
    or (member_id is null and walk_in_visit_id is not null)
    or (
      member_id is null and walk_in_visit_id is null
      and status in ('cancelled', 'expired', 'failed')
      and jsonb_typeof(registration_snapshot -> 'member_id') = 'string'
    )
  );

-- Lets the cleanup job find unpaid registration payments quickly.
create index if not exists payments_unpaid_registration_idx
  on public.payments (status, qr_expires_at)
  where registration_snapshot ? 'member_id';
