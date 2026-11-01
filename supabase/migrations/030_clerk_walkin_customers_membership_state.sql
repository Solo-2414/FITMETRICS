-- Walk-in customer records, staged walk-in intent support, and a backend-only
-- membership state view. Run this migration in the Supabase SQL Editor.

create sequence if not exists public.walk_in_customer_code_seq;

create table if not exists public.walk_in_customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null unique default ('WI-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.walk_in_customer_code_seq')::text, 6, '0')),
  full_name text not null check (char_length(trim(full_name)) between 2 and 80),
  phone_normalized text,
  email_normalized text,
  is_student boolean not null default false,
  notes text,
  first_visit_at timestamptz not null default now(),
  last_visit_at timestamptz not null default now(),
  visit_count integer not null default 0 check (visit_count >= 0),
  created_at timestamptz not null default now()
);

create unique index if not exists walk_in_customers_phone_uq on public.walk_in_customers(phone_normalized)
  where phone_normalized is not null;
create unique index if not exists walk_in_customers_email_uq on public.walk_in_customers(email_normalized)
  where email_normalized is not null;

alter table public.walk_in_visits
  add column if not exists customer_id uuid references public.walk_in_customers(id) on delete set null,
  add column if not exists guest_email text,
  add column if not exists is_student boolean not null default false,
  add column if not exists notes text,
  add column if not exists valid_until timestamptz,
  add column if not exists payment_id uuid references public.payments(id) on delete set null,
  add column if not exists checked_in_at timestamptz;

alter table public.registration_intents
  add column if not exists kind text not null default 'registration'
    check (kind in ('registration', 'walkin'));

alter table public.payments drop constraint if exists payments_subject_check;
alter table public.payments add constraint payments_subject_check check (
  (member_id is not null and walk_in_visit_id is null)
  or (member_id is null and walk_in_visit_id is not null)
  or (
    member_id is null and walk_in_visit_id is null
    and status in ('cancelled', 'expired', 'failed', 'needs_review')
    and jsonb_typeof(registration_snapshot -> 'member_id') = 'string'
  )
);

create index if not exists walk_in_visits_customer_idx on public.walk_in_visits(customer_id, created_at desc);
create index if not exists walk_in_visits_payment_idx on public.walk_in_visits(payment_id);
create index if not exists walk_in_visits_valid_until_idx on public.walk_in_visits(status, valid_until)
  where status = 'active';

alter table public.walk_in_customers enable row level security;
revoke all on public.walk_in_customers from anon, authenticated;
drop policy if exists walk_in_customers_staff_read on public.walk_in_customers;
create policy walk_in_customers_staff_read on public.walk_in_customers for select to authenticated
using (public.is_staff());

alter table public.walk_in_visits enable row level security;
drop policy if exists walk_in_visits_staff_write on public.walk_in_visits;
create policy walk_in_visits_staff_write on public.walk_in_visits for all to authenticated
using (public.is_staff()) with check (public.is_staff() and created_by = auth.uid());

create or replace view public.member_membership_state as
select
  m.member_id,
  jsonb_agg(to_jsonb(m) order by m.start_date) filter (where m.status = 'active' and m.start_date <= (timezone('Asia/Manila', now()))::date and m.end_date >= (timezone('Asia/Manila', now()))::date) as current_memberships,
  jsonb_agg(to_jsonb(m) order by m.start_date) filter (where m.status = 'active' and m.start_date > (timezone('Asia/Manila', now()))::date) as queued_memberships,
  max(m.end_date) filter (where m.status = 'active' and m.end_date < (timezone('Asia/Manila', now()))::date) as last_expired_date
from public.memberships m
group by m.member_id;
revoke all on public.member_membership_state from anon, authenticated;
