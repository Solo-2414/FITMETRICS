create table if not exists public.member_check_in_devices (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  device_hash text not null,
  label text not null default 'Unknown device',
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create unique index if not exists member_check_in_devices_hash_idx
  on public.member_check_in_devices(device_hash);
create index if not exists member_check_in_devices_member_idx
  on public.member_check_in_devices(member_id, revoked_at, expires_at);

create table if not exists public.member_check_in_codes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists member_check_in_codes_member_idx
  on public.member_check_in_codes(member_id, created_at);

alter table public.gym_settings
  add column if not exists checkin_security_mode text not null default 'device_email_code'
  check (checkin_security_mode in ('phone_only', 'device_email_code'));

alter table public.member_check_in_devices enable row level security;
alter table public.member_check_in_codes enable row level security;
revoke all on public.member_check_in_devices from anon, authenticated;
revoke all on public.member_check_in_codes from anon, authenticated;

drop policy if exists member_check_in_devices_no_direct_access on public.member_check_in_devices;
create policy member_check_in_devices_no_direct_access on public.member_check_in_devices
for all to authenticated using (false) with check (false);
drop policy if exists member_check_in_codes_no_direct_access on public.member_check_in_codes;
create policy member_check_in_codes_no_direct_access on public.member_check_in_codes
for all to authenticated using (false) with check (false);

alter table public.email_log drop constraint if exists email_log_email_type_check;
alter table public.email_log add constraint email_log_email_type_check
  check (email_type in ('expiry_reminder', 'expiry_notice', 'receipt', 'password_otp',
    'information_overview', 'announcement', 'promo', 'welcome', 'checkin_code'));
