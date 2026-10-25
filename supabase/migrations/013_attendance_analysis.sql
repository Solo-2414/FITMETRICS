alter table public.gym_settings
  add column if not exists daily_visit_target integer not null default 70;

create or replace view public.attendance_daily_summary as
select timezone('Asia/Manila', check_in_at)::date as attendance_date,
       count(*)::integer as visits,
       count(*) filter (where check_out_at is null)::integer as open_visits,
       round(avg(extract(epoch from (check_out_at - check_in_at)) / 3600)
         filter (where check_out_at is not null), 2) as average_duration_hours
from public.attendance
where status <> 'cancelled'
group by 1;

create or replace view public.attendance_peak_analysis as
select extract(isodow from timezone('Asia/Manila', a.check_in_at))::integer as weekday,
       extract(hour from timezone('Asia/Manila', a.check_in_at))::integer as hour,
       count(*)::integer as visits
from public.attendance a
where a.status <> 'cancelled'
group by 1, 2
order by visits desc;

revoke all on public.attendance_daily_summary, public.attendance_peak_analysis from anon, authenticated;

create or replace function public.attendance_analysis_summary(
  p_from date,
  p_to date,
  p_previous_from date,
  p_previous_to date,
  p_plan uuid default null
)
returns jsonb
language sql
security definer
set search_path = public
as $$
with filtered as materialized (
  select a.*,
         timezone('Asia/Manila', a.check_in_at)::date as local_date,
         extract(isodow from timezone('Asia/Manila', a.check_in_at))::integer as weekday,
         extract(hour from timezone('Asia/Manila', a.check_in_at))::integer as local_hour,
         coalesce(m.plan_id, w.plan_id) as attendance_plan_id
  from attendance a
  left join memberships m on m.id = a.membership_id
  left join walk_in_visits w on w.id = a.walk_in_visit_id
  where a.status <> 'cancelled'
    and timezone('Asia/Manila', a.check_in_at)::date >= p_from
    and timezone('Asia/Manila', a.check_in_at)::date < p_to
    and (p_plan is null or coalesce(m.plan_id, w.plan_id) = p_plan)
),
previous_total as (
  select count(*)::integer as visits
  from attendance a
  left join memberships m on m.id = a.membership_id
  left join walk_in_visits w on w.id = a.walk_in_visit_id
  where a.status <> 'cancelled'
    and timezone('Asia/Manila', a.check_in_at)::date >= p_previous_from
    and timezone('Asia/Manila', a.check_in_at)::date < p_previous_to
    and (p_plan is null or coalesce(m.plan_id, w.plan_id) = p_plan)
),
hour_buckets as (
  select h,
         to_char(make_time(h, 0, 0), 'FMHH12 AM') as label,
         to_char(make_time(h + 2, 0, 0), 'FMHH12 AM') as end_label,
         (select count(*)::integer from filtered f where f.local_hour >= h and f.local_hour < h + 2) as visits
  from generate_series(6, 20, 2) h
),
weekday_totals as (
  select d.weekday,
         (array['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])[d.weekday] as label,
         count(f.*)::integer as visits
  from generate_series(1, 7) d(weekday)
  left join filtered f on f.weekday = d.weekday
  group by d.weekday
),
plan_totals as (
  select p.id, p.name as plan, count(f.*)::integer as visits
  from membership_plans p
  left join filtered f on f.attendance_plan_id = p.id
  group by p.id, p.name
  having count(f.*) > 0
  order by visits desc, p.name
),
max_weekday as (
  select greatest(coalesce(max(visits), 0), 1) as visits from weekday_totals
),
max_plan as (
  select greatest(coalesce(max(visits), 0), 1) as visits from plan_totals
)
select jsonb_build_object(
  'totalCheckIns', (select count(*)::integer from filtered),
  'activeInGym', (select count(*)::integer from filtered where check_out_at is null and status = 'open'),
  'previousPeriodTotal', (select visits from previous_total),
  'hourly', (
    select jsonb_agg(jsonb_build_object(
      'label', label, 'endLabel', end_label, 'visits', visits
    ) order by h)
    from hour_buckets
  ) || jsonb_build_array(jsonb_build_object(
    'label', 'Other hours', 'endLabel', '', 'visits',
    (select count(*)::integer from filtered where local_hour < 6 or local_hour >= 22)
  )),
  'weekday', (
    select jsonb_agg(jsonb_build_object(
      'weekday', label, 'visits', visits,
      'pctOfMax', round(visits * 100.0 / (select visits from max_weekday), 1)
    ) order by weekday)
    from weekday_totals
  ),
  'byPlan', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'planId', id, 'plan', plan, 'visits', visits,
      'pct', round(visits * 100.0 / (select visits from (select sum(visits)::numeric as visits from plan_totals) totals), 1)
    ) order by visits desc, plan), '[]'::jsonb)
    from plan_totals
  ),
  'daily', (
    select coalesce(jsonb_agg(jsonb_build_object('attendance_date', local_date, 'visits', count)
      order by local_date desc), '[]'::jsonb)
    from (
      select local_date, count(*)::integer as count
      from filtered
      group by local_date
    ) days
  )
);
$$;

revoke all on function public.attendance_analysis_summary(date, date, date, date, uuid) from public, anon, authenticated;
grant execute on function public.attendance_analysis_summary(date, date, date, date, uuid) to service_role;
