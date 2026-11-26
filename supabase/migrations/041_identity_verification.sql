do $$
begin
  create type public.identity_verification_status as enum (
    'pending',
    'verified',
    'needs_review',
    'rejected',
    'expired'
  );
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.identity_verifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.profiles(id) on delete set null,
  status public.identity_verification_status not null default 'pending',
  method text not null check (method in ('facepp_ocrspace', 'manual')),
  score numeric(5,2) check (score is null or score between 0 and 100),
  id_name_match boolean,
  liveness_check_completed boolean not null default false,
  consent_version text,
  consent_at timestamptz,
  id_type text check (id_type is null or id_type in ('national_id', 'drivers_license', 'passport', 'postal_id', 'voters_id', 'other')),
  id_last4 varchar(4) check (id_last4 is null or id_last4 ~ '^[A-Z0-9]{4}$'),
  id_image_path text,
  selfie_image_path text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_reason text,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  expires_at timestamptz,
  images_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  check ((consent_version is null) = (consent_at is null)),
  check ((status = 'verified') = (verified_at is not null))
);

comment on column public.identity_verifications.liveness_check_completed is
  'Client-side liveness completion hint only; never treat as server-verified spoof prevention.';

create index if not exists identity_verifications_member_created_idx
  on public.identity_verifications (member_id, created_at desc);
create index if not exists identity_verifications_reviewed_by_idx
  on public.identity_verifications (reviewed_by);
create index if not exists identity_verifications_verified_by_idx
  on public.identity_verifications (verified_by);
create index if not exists identity_verifications_status_created_idx
  on public.identity_verifications (status, created_at desc);
create index if not exists identity_verifications_expiry_idx
  on public.identity_verifications (expires_at)
  where expires_at is not null and images_deleted_at is null;

alter table public.identity_verifications enable row level security;
revoke all on public.identity_verifications from public, anon, authenticated;
grant all on public.identity_verifications to service_role;

drop policy if exists identity_verifications_admin_read on public.identity_verifications;
create policy identity_verifications_admin_read
  on public.identity_verifications for select
  to authenticated
  using (public.is_admin());

drop policy if exists identity_verifications_no_direct_writes on public.identity_verifications;
create policy identity_verifications_no_direct_writes
  on public.identity_verifications for all
  to authenticated
  using (false)
  with check (false);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('identity-verifications', 'identity-verifications', false, 8388608, array['image/jpeg'])
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists identity_verification_objects_deny_anon on storage.objects;
create policy identity_verification_objects_deny_anon
  on storage.objects as restrictive for all
  to anon
  using (bucket_id <> 'identity-verifications')
  with check (bucket_id <> 'identity-verifications');

drop policy if exists identity_verification_objects_deny_authenticated on storage.objects;
create policy identity_verification_objects_deny_authenticated
  on storage.objects as restrictive for all
  to authenticated
  using (bucket_id <> 'identity-verifications')
  with check (bucket_id <> 'identity-verifications');
