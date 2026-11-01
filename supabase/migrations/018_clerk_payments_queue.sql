alter table public.payments
  add column if not exists coach_id uuid references public.coaches(id) on delete set null,
  add column if not exists coach_addon_amount numeric(12,2) not null default 0 check (coach_addon_amount >= 0),
  add column if not exists checkout_url text;

alter type public.payment_status add value if not exists 'cancelled';

create index if not exists memberships_member_start_idx
  on public.memberships(member_id, start_date);

create index if not exists payments_clerk_filters_idx
  on public.payments(created_at desc, status, method);

create or replace view public.current_memberships as
select m.*
from public.memberships m
where m.start_date <= (timezone('Asia/Manila', now()))::date
  and m.end_date >= (timezone('Asia/Manila', now()))::date
  and m.status = 'active';

revoke all on public.current_memberships from anon, authenticated;
