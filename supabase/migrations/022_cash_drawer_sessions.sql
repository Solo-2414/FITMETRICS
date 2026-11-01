create table if not exists public.cash_drawer_sessions (
  id uuid primary key default gen_random_uuid(),
  business_date date not null unique,
  opening_float numeric(12,2) not null default 0 check (opening_float >= 0),
  opened_by uuid not null references public.profiles(id) on delete restrict,
  opened_at timestamptz not null default now(),
  closing_counted numeric(12,2) check (closing_counted is null or closing_counted >= 0),
  expected_cash numeric(12,2) check (expected_cash is null or expected_cash >= 0),
  variance numeric(12,2),
  closed_by uuid references public.profiles(id) on delete restrict,
  closed_at timestamptz,
  note text,
  status text not null default 'open' check (status in ('open', 'closed')),
  check ((status = 'open' and closed_at is null and closed_by is null) or
    (status = 'closed' and closed_at is not null and closed_by is not null and closing_counted is not null))
);

create table if not exists public.cash_drawer_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.cash_drawer_sessions(id) on delete cascade,
  kind text not null check (kind in ('payout', 'refund', 'correction')),
  amount numeric(12,2) not null check (amount > 0),
  reason text not null check (length(trim(reason)) between 1 and 500),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists cash_drawer_entries_session_idx
  on public.cash_drawer_entries(session_id, created_at desc);
create index if not exists cash_drawer_sessions_status_date_idx
  on public.cash_drawer_sessions(status, business_date desc);

alter table public.gym_settings
  add column if not exists floor_capacity integer not null default 50 check (floor_capacity > 0);

alter table public.cash_drawer_sessions enable row level security;
alter table public.cash_drawer_entries enable row level security;
revoke all on public.cash_drawer_sessions, public.cash_drawer_entries from anon, authenticated;

drop policy if exists cash_drawer_sessions_staff_all on public.cash_drawer_sessions;
create policy cash_drawer_sessions_staff_all on public.cash_drawer_sessions
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists cash_drawer_entries_staff_all on public.cash_drawer_entries;
create policy cash_drawer_entries_staff_all on public.cash_drawer_entries
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
