-- =====================================================================
-- FITMETRICS : auth & accounts schema  (run in Supabase > SQL Editor)
-- Roles match your frontend: admin (owner), clerk (desk staff), member
-- =====================================================================

create type public.user_role   as enum ('admin', 'clerk', 'member');
create type public.user_status as enum ('active', 'inactive', 'suspended');

create table public.profiles (
  id                       uuid primary key references auth.users(id) on delete cascade,
  email                    text,
  full_name                text,
  phone                    text,
  gender                   text,
  emergency_contact_name   text,
  emergency_contact_phone  text,
  avatar_url               text,
  role                     public.user_role   not null default 'member',
  status                   public.user_status not null default 'active',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index profiles_role_idx   on public.profiles (role);
create index profiles_status_idx on public.profiles (status);

-- ---------------------------------------------------------------------
-- Auto-create a profile for every new auth user.
-- Role is read from app_metadata (only the server / service_role can set
-- it; a user can NEVER set it themselves). Everything else is user_metadata.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, full_name, phone, gender,
    emergency_contact_name, emergency_contact_phone, role
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'gender',
    new.raw_user_meta_data ->> 'emergency_contact_name',
    new.raw_user_meta_data ->> 'emergency_contact_phone',
    coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'member')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Role helpers for RLS policies on ALL future tables.
-- security definer => no recursive-RLS problems.
-- A suspended/inactive user has NO role, so every policy denies them.
-- ---------------------------------------------------------------------
create or replace function public.current_app_role()
returns public.user_role
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles
  where id = auth.uid() and status = 'active';
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_app_role() in ('admin', 'clerk'), false);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_app_role() = 'admin', false);
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "staff read all profiles"
  on public.profiles for select
  to authenticated
  using (public.is_staff());

create policy "update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Users may only edit harmless columns of their own profile.
-- role / status / email can only be changed by the backend (service_role).
revoke update on public.profiles from authenticated, anon;
grant  update (full_name, phone, gender,
               emergency_contact_name, emergency_contact_phone, avatar_url)
  on public.profiles to authenticated;

-- No insert/delete policies on purpose: profiles are created by the trigger
-- and managed by the backend only.

-- ---------------------------------------------------------------------
-- FIRST ADMIN (do once):
--   1. Supabase > Authentication > Users > "Add user" (tick Auto Confirm)
--   2. Then run, with that user's email:
--
--   update public.profiles set role = 'admin' where email = 'owner@example.com';
-- ---------------------------------------------------------------------
