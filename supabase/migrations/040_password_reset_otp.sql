create table if not exists public.password_reset_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts between 0 and 5),
  used_at timestamptz,
  created_at timestamptz not null default now(),
  request_ip_hash text not null
);

create index if not exists password_reset_codes_user_created_idx
  on public.password_reset_codes (user_id, created_at desc);
create index if not exists password_reset_codes_ip_created_idx
  on public.password_reset_codes (request_ip_hash, created_at desc);

alter table public.password_reset_codes enable row level security;
revoke all on public.password_reset_codes from anon, authenticated;

drop policy if exists password_reset_codes_no_direct_access on public.password_reset_codes;
create policy password_reset_codes_no_direct_access on public.password_reset_codes
for all to authenticated using (false) with check (false);

create or replace function public.create_password_reset_code(
  p_user_id uuid,
  p_code_hash text,
  p_expires_at timestamptz,
  p_created_at timestamptz,
  p_request_ip_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  user_lock bigint := hashtextextended('password-reset:user:' || p_user_id::text, 0);
  ip_lock bigint := hashtextextended('password-reset:ip:' || p_request_ip_hash, 0);
  new_code_id uuid;
begin
  perform pg_advisory_xact_lock(least(user_lock, ip_lock));
  if user_lock <> ip_lock then
    perform pg_advisory_xact_lock(greatest(user_lock, ip_lock));
  end if;

  if exists (
    select 1
    from public.password_reset_codes
    where created_at >= p_created_at - interval '60 seconds'
      and (user_id = p_user_id or request_ip_hash = p_request_ip_hash)
  ) then
    return null;
  end if;

  update public.password_reset_codes
  set used_at = p_created_at
  where user_id = p_user_id and used_at is null;

  insert into public.password_reset_codes (
    user_id, code_hash, expires_at, attempts, created_at, request_ip_hash
  ) values (
    p_user_id, p_code_hash, p_expires_at, 0, p_created_at, p_request_ip_hash
  )
  returning id into new_code_id;

  return new_code_id;
end;
$$;

revoke all on function public.create_password_reset_code(uuid, text, timestamptz, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.create_password_reset_code(uuid, text, timestamptz, timestamptz, text)
  to service_role;

do $$
declare
  email_type_constraint text;
begin
  select conname into email_type_constraint
  from pg_constraint
  where conrelid = 'public.email_log'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%email_type%'
  limit 1;

  if email_type_constraint is not null then
    execute format('alter table public.email_log drop constraint %I', email_type_constraint);
  end if;
end
$$;

alter table public.email_log
  add constraint email_log_email_type_check
  check (email_type in (
    'expiry_reminder',
    'expiry_notice',
    'receipt',
    'password_otp',
    'password_changed',
    'information_overview',
    'announcement',
    'promo',
    'welcome',
    'checkin_code'
  ));
