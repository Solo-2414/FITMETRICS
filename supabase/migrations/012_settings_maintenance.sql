alter table public.gym_settings
  add column if not exists payment_modes jsonb not null default '["cash","gcash","maya"]'::jsonb,
  add column if not exists allow_member_registrations boolean not null default true,
  add column if not exists show_live_capacity boolean not null default true,
  add column if not exists maintenance_starts_at timestamptz;

alter table public.maintenance_backups
  add column if not exists summary jsonb not null default '{}'::jsonb;

create or replace function public.get_database_size_bytes()
returns bigint
language sql
security definer
set search_path = public
as $$ select pg_database_size(current_database()); $$;

revoke all on function public.get_database_size_bytes() from public, anon, authenticated;
grant execute on function public.get_database_size_bytes() to service_role;
