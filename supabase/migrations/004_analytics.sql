-- Deterministic analytics surfaces. AI may explain these values but does not
-- calculate or replace them.

create or replace view public.analytics_kpis as
with bounds as (
  select current_date as today,
         date_trunc('month', current_date)::date as month_start,
         (date_trunc('month', current_date) - interval '1 month')::date as prior_month_start
),
members as (
  select count(*) filter (where p.role = 'member')::numeric as total_members,
         count(*) filter (where p.role = 'member' and p.status = 'active')::numeric as active_members,
         count(*) filter (where p.role = 'member' and p.created_at::date >= b.month_start)::numeric as new_members
  from public.profiles p cross join bounds b
),
revenue as (
  select coalesce(sum(p.amount) filter (where p.status = 'paid' and p.created_at >= b.month_start), 0)::numeric(12,2) as monthly_revenue,
         coalesce(sum(p.amount) filter (where p.status = 'paid' and p.created_at >= b.prior_month_start and p.created_at < b.month_start), 0)::numeric(12,2) as prior_month_revenue
  from public.payments p cross join bounds b
),
membership_metrics as (
  select
    count(*) filter (where m.status = 'active' and m.end_date >= b.today and m.end_date <= b.today + 14)::numeric as expiring_memberships,
    count(*) filter (where m.status = 'active' and m.end_date >= b.today)::numeric as active_memberships,
    count(*) filter (where m.status in ('expired', 'cancelled') and m.end_date >= b.prior_month_start and m.end_date < b.month_start)::numeric as ended_memberships,
    count(*) filter (where m.status = 'active' and m.end_date >= b.month_start and m.end_date < b.month_start + interval '1 month')::numeric as renewed_or_active_month_memberships
  from public.memberships m cross join bounds b
),
attendance_metrics as (
  select count(*) filter (where a.check_in_at >= b.month_start)::numeric as month_visits,
         count(distinct a.member_id) filter (where a.check_in_at >= b.month_start)::numeric as visiting_members,
         count(*) filter (where a.check_in_at >= b.prior_month_start and a.check_in_at < b.month_start)::numeric as prior_month_visits
  from public.attendance a cross join bounds b
),
rates as (
  select
    coalesce(100 * mm.renewed_or_active_month_memberships / nullif(mm.renewed_or_active_month_memberships + mm.ended_memberships, 0), 0) as renewal_rate,
    coalesce(100 * am.visiting_members / nullif(mem.active_members, 0), 0) as retention_rate,
    coalesce(100 * (am.month_visits - am.prior_month_visits) / nullif(am.prior_month_visits, 0), 0) as attendance_trend,
    coalesce(100 * (r.monthly_revenue - r.prior_month_revenue) / nullif(r.prior_month_revenue, 0), 0) as revenue_growth,
    coalesce(100 * mem.new_members / nullif(mem.active_members, 0), 0) as active_member_growth
  from members mem cross join revenue r cross join membership_metrics mm cross join attendance_metrics am
)
select
  mem.total_members,
  mem.active_members,
  mem.new_members,
  mm.expiring_memberships,
  r.monthly_revenue,
  am.month_visits,
  coalesce(am.month_visits / nullif(am.visiting_members, 0), 0)::numeric(12,2) as average_visits_per_member,
  rates.renewal_rate::numeric(5,2),
  greatest(0, least(100, rates.retention_rate))::numeric(5,2) as retention_rate,
  greatest(0, least(100, rates.attendance_trend + 50))::numeric(5,2) as attendance_trend_score,
  greatest(0, least(100, rates.revenue_growth + 50))::numeric(5,2) as revenue_growth_score,
  greatest(0, least(100, rates.active_member_growth))::numeric(5,2) as active_member_growth_score,
  greatest(0, least(100,
    rates.renewal_rate * 0.30 +
    greatest(0, least(100, rates.retention_rate)) * 0.25 +
    greatest(0, least(100, rates.attendance_trend + 50)) * 0.20 +
    greatest(0, least(100, rates.revenue_growth + 50)) * 0.15 +
    greatest(0, least(100, rates.active_member_growth)) * 0.10
  ))::numeric(5,2) as business_health_score
from members mem cross join revenue r cross join membership_metrics mm
cross join attendance_metrics am cross join rates;

create or replace view public.revenue_trend as
select date_trunc('day', p.created_at)::date as period,
       sum(p.amount) filter (where p.status = 'paid')::numeric(12,2) as revenue,
       count(*) filter (where p.status = 'paid')::integer as transactions
from public.payments p
group by 1
order by 1;

create or replace view public.membership_growth_trend as
select d.period,
       count(m.id) filter (where m.start_date <= d.period)::integer as cumulative_memberships,
       count(m.id) filter (where m.start_date = d.period)::integer as new_memberships
from generate_series(
  (current_date - interval '12 months')::date, current_date, interval '1 day'
) d(period)
left join public.memberships m on m.start_date <= d.period::date
group by d.period
order by d.period;

create or replace view public.attendance_peak_analysis as
select extract(isodow from a.check_in_at)::integer as weekday,
       extract(hour from a.check_in_at)::integer as hour,
       count(*)::integer as visits
from public.attendance a
where a.status <> 'cancelled'
group by 1, 2
order by visits desc;

create or replace view public.membership_type_distribution as
select p.code, p.name, count(m.id)::integer as membership_count
from public.membership_plans p
left join public.memberships m on m.plan_id = p.id and m.status <> 'cancelled'
group by p.id, p.code, p.name
order by membership_count desc;

create or replace view public.retention_trend as
select date_trunc('month', m.start_date)::date as period,
       count(*)::integer as started,
       count(*) filter (where m.status = 'active' or m.end_date >= current_date)::integer as retained
from public.memberships m
group by 1
order by 1;

alter table public.ai_insights enable row level security;
alter table public.prediction_snapshots enable row level security;

revoke all on public.analytics_kpis, public.revenue_trend,
  public.membership_growth_trend, public.attendance_peak_analysis,
  public.membership_type_distribution, public.retention_trend from anon, authenticated;
