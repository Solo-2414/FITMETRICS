create table if not exists public.report_downloads (
  id uuid primary key default gen_random_uuid(),
  report_type text not null check (report_type in ('sales', 'collections', 'attendance', 'members')),
  period_start date not null,
  period_end date not null,
  filters jsonb not null default '{}'::jsonb,
  format text not null check (format in ('csv', 'pdf')),
  generated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create index if not exists report_downloads_created_at_idx
  on public.report_downloads (created_at desc);
create index if not exists report_downloads_generated_by_idx
  on public.report_downloads (generated_by);

alter table public.report_downloads enable row level security;
drop policy if exists report_downloads_admin_read on public.report_downloads;
create policy report_downloads_admin_read on public.report_downloads
  for select to authenticated using (public.is_admin());

revoke all on public.report_downloads from public, anon, authenticated;

create or replace function public.reports_summary(
  p_start date,
  p_end date,
  p_plan uuid default null,
  p_shift text default null,
  p_walk_ins boolean default false
)
returns jsonb
language sql
security definer
set search_path = public
as $$
with bounds as (
  select
    p_start::timestamp at time zone 'Asia/Manila' as start_at,
    (p_end + 1)::timestamp at time zone 'Asia/Manila' as end_at,
    ((p_end - p_start + 1)::integer) as period_days
),
payment_rows as (
  select p.*,
         coalesce(p.paid_at, p.created_at) as effective_at,
         coalesce(p.plan_id, m.plan_id, w.plan_id) as effective_plan_id
  from payments p
  left join memberships m on m.id = p.membership_id
  left join walk_in_visits w on w.id = p.walk_in_visit_id
  cross join bounds b
  where coalesce(p.paid_at, p.created_at) >= b.start_at
    and coalesce(p.paid_at, p.created_at) < b.end_at
    and ((p_walk_ins and coalesce(p.plan_id, m.plan_id, w.plan_id) is null)
      or (not p_walk_ins and (p_plan is null or coalesce(p.plan_id, m.plan_id, w.plan_id) = p_plan)))
    and (p_shift is null or p_shift = 'all'
      or (p_shift = 'morning' and extract(hour from timezone('Asia/Manila', coalesce(p.paid_at, p.created_at))) between 6 and 13)
      or (p_shift = 'evening' and extract(hour from timezone('Asia/Manila', coalesce(p.paid_at, p.created_at))) between 14 and 21))
),
previous_rows as (
  select p.*
  from payments p
  cross join bounds b
  where coalesce(p.paid_at, p.created_at) >= b.start_at - make_interval(days => b.period_days)
    and coalesce(p.paid_at, p.created_at) < b.start_at
),
attendance_rows as (
  select a.*
  from attendance a
  cross join bounds b
  where a.check_in_at >= b.start_at and a.check_in_at < b.end_at
    and a.status <> 'cancelled'
    and (p_shift is null or p_shift = 'all'
      or (p_shift = 'morning' and extract(hour from timezone('Asia/Manila', a.check_in_at)) between 6 and 13)
      or (p_shift = 'evening' and extract(hour from timezone('Asia/Manila', a.check_in_at)) between 14 and 21))
),
daily_visits as (
  select timezone('Asia/Manila', check_in_at)::date as visit_date, count(*)::integer as visits
  from attendance_rows
  group by 1
),
peak_windows as (
  select extract(hour from timezone('Asia/Manila', check_in_at))::integer as hour, count(*)::integer as visits
  from attendance_rows
  group by 1
),
sales_by_plan as (
  select coalesce(mp.name, 'Walk-in') as plan,
         count(*) filter (where pr.status = 'paid')::integer as sold,
         coalesce(sum(pr.amount) filter (where pr.status = 'paid'), 0)::numeric(12,2) as amount
  from payment_rows pr
  left join membership_plans mp on mp.id = pr.effective_plan_id
  group by coalesce(mp.name, 'Walk-in')
),
member_activity as (
  select p.id,
         max(a.check_in_at) as last_visit,
         max(m.end_date) filter (where m.status = 'active') as expiry_date
  from profiles p
  left join attendance a on a.member_id = p.id and a.status <> 'cancelled'
  left join memberships m on m.member_id = p.id
  where p.role = 'member'
  group by p.id
)
select jsonb_build_object(
  'revenue', jsonb_build_object(
    'total', coalesce(sum(pr.amount) filter (where pr.status = 'paid'), 0),
    'previousTotal', coalesce((select sum(amount) from previous_rows where status = 'paid'), 0),
    'cash', coalesce(sum(pr.amount) filter (where pr.status = 'paid' and pr.method = 'cash'), 0),
    'cashCount', count(*) filter (where pr.status = 'paid' and pr.method = 'cash'),
    'online', coalesce(sum(pr.amount) filter (where pr.status = 'paid' and pr.method in ('gcash', 'maya', 'bank_transfer')), 0),
    'onlineCount', count(*) filter (where pr.status = 'paid' and pr.method in ('gcash', 'maya', 'bank_transfer')),
    'discounts', coalesce(sum(coalesce(pr.discount, 0)) filter (where pr.status = 'paid'), 0),
    'voided', coalesce(sum(pr.amount) filter (where pr.status = 'voided'), 0),
    'refunded', coalesce(sum(pr.amount) filter (where pr.status = 'refunded'), 0)
  ),
  'paymongo', jsonb_build_object(
    'paidCount', count(*) filter (where pr.provider = 'paymongo' and pr.status = 'paid'),
    'paidAmount', coalesce(sum(pr.amount) filter (where pr.provider = 'paymongo' and pr.status = 'paid'), 0),
    'pendingCount', count(*) filter (where pr.provider = 'paymongo' and pr.status = 'pending'),
    'failedCount', count(*) filter (where pr.provider = 'paymongo' and pr.status = 'failed'),
    'expiredCount', count(*) filter (where pr.provider = 'paymongo' and pr.status = 'expired'),
    'refundedCount', count(*) filter (where pr.provider = 'paymongo' and pr.status = 'refunded'),
    'missingProviderPaymentId', count(*) filter (where pr.provider = 'paymongo' and pr.status = 'paid' and pr.provider_payment_id is null)
  ),
  'salesByPlan', coalesce((select jsonb_agg(to_jsonb(sales_by_plan) order by amount desc) from sales_by_plan), '[]'::jsonb),
  'attendance', jsonb_build_object(
    'total', (select coalesce(sum(visits), 0) from daily_visits),
    'averagePerDay', coalesce((select round(avg(visits), 2) from daily_visits), 0),
    'peak', (select jsonb_build_object('startHour', hour, 'endHour', hour + 2, 'visits', visits)
             from peak_windows order by visits desc, hour limit 1)
  ),
  'members', jsonb_build_object(
    'expiredLast7Days', (select count(*) from member_activity where expiry_date >= ((timezone('Asia/Manila', now()))::date - 7) and expiry_date < (timezone('Asia/Manila', now()))::date),
    'expiringWithin48Hours', (select count(*) from member_activity where expiry_date >= (timezone('Asia/Manila', now()))::date and expiry_date <= (timezone('Asia/Manila', now()))::date + 2),
    'inactive', (select count(*) from member_activity where last_visit is null or last_visit < now() - interval '30 days')
  )
)
from payment_rows pr;
$$;

revoke all on function public.reports_summary(date, date, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.reports_summary(date, date, uuid, text, boolean) to service_role;
