create table if not exists public.checkin_qr_codes (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(trim(label)) between 1 and 80),
  token_hash text not null unique,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  scan_count integer not null default 0 check (scan_count >= 0)
);

alter table public.profiles add column if not exists phone_normalized text;
create index if not exists profiles_phone_normalized_idx on public.profiles(phone_normalized);

alter table public.attendance
  add column if not exists device_id text,
  add column if not exists ip_hash text,
  add column if not exists user_agent text,
  add column if not exists source_qr_id uuid references public.checkin_qr_codes(id) on delete set null,
  add column if not exists flagged boolean not null default false,
  add column if not exists checked_out_via text;

create table if not exists public.checkin_attempts (
  id uuid primary key default gen_random_uuid(),
  qr_id uuid references public.checkin_qr_codes(id) on delete set null,
  phone_hash text,
  ip_hash text,
  outcome text not null,
  confirm_token_hash text,
  created_at timestamptz not null default now()
);
create index if not exists checkin_attempts_created_at_idx on public.checkin_attempts(created_at);
create index if not exists checkin_attempts_phone_idx on public.checkin_attempts(phone_hash, created_at);
create index if not exists checkin_attempts_qr_idx on public.checkin_attempts(qr_id, created_at);
create index if not exists attendance_device_idx on public.attendance(device_id, check_in_at);

alter table public.gym_settings
  add column if not exists checkin_phone_enabled boolean not null default true,
  add column if not exists capacity integer not null default 100 check (capacity > 0);

create or replace function public.normalize_phone_number(value text)
returns text
language sql
immutable
as $$
  select case
    when regexp_replace(coalesce(value, ''), '\D', '', 'g') ~ '^63(9[0-9]{9})$'
      then '0' || substring(regexp_replace(coalesce(value, ''), '\D', '', 'g') from 3)
    when regexp_replace(coalesce(value, ''), '\D', '', 'g') ~ '^9[0-9]{9}$'
      then '0' || regexp_replace(coalesce(value, ''), '\D', '', 'g')
    when regexp_replace(coalesce(value, ''), '\D', '', 'g') ~ '^09[0-9]{9}$'
      then regexp_replace(coalesce(value, ''), '\D', '', 'g')
    else null
  end
$$;

update public.profiles set phone_normalized = public.normalize_phone_number(phone)
where phone_normalized is null and phone is not null;

create or replace function public.sync_profile_phone_normalized()
returns trigger
language plpgsql
as $$
begin
  new.phone_normalized := public.normalize_phone_number(new.phone);
  return new;
end;
$$;
drop trigger if exists profiles_phone_normalized_sync on public.profiles;
create trigger profiles_phone_normalized_sync
before insert or update of phone on public.profiles
for each row execute function public.sync_profile_phone_normalized();

-- Review this report before enabling phone-only check-in for existing data:
-- select phone_normalized, count(*) from public.profiles
-- where role = 'member' and phone_normalized is not null
-- group by phone_normalized having count(*) > 1;

alter table public.checkin_qr_codes enable row level security;
alter table public.checkin_attempts enable row level security;
revoke all on public.checkin_qr_codes from anon, authenticated;
revoke all on public.checkin_attempts from anon, authenticated;

drop policy if exists checkin_qr_codes_staff_read on public.checkin_qr_codes;
create policy checkin_qr_codes_staff_read on public.checkin_qr_codes
for select to authenticated using (public.is_staff());

drop policy if exists checkin_qr_codes_staff_write on public.checkin_qr_codes;
create policy checkin_qr_codes_staff_write on public.checkin_qr_codes
for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists checkin_attempts_no_direct_access on public.checkin_attempts;
create policy checkin_attempts_no_direct_access on public.checkin_attempts
for all to authenticated using (false) with check (false);
