create or replace function public.get_clerk_member_roster(
  p_search text default '', p_status text default '', p_plan text default '',
  p_coach text default '', p_joined_from date default null, p_joined_to date default null,
  p_expiring_in integer default null, p_student boolean default null, p_sort text default 'name',
  p_order text default 'asc', p_page integer default 1, p_limit integer default 10,
  p_today date default current_date, p_reminder_days integer default 3
)
returns jsonb
language sql
security definer
set search_path = public
as $$
with roster as (
  select p.id, p.email, p.username, p.full_name, p.phone, p.status as account_status, p.created_at,
    md.member_code, md.join_date, md.is_student, selected.membership_id, selected.plan_id,
    selected.coach_id, selected.start_date, selected.end_date, selected.membership_status,
    selected.coach_addon_amount, selected.queued, mp.name as plan_name, c.display_name as coach_name,
    to_jsonb(mp) as plan_json, to_jsonb(c) as coach_json,
    case
      when p.status = 'suspended' then 'Suspended'
      when p.status = 'inactive' then 'Inactive'
      when selected.membership_id is null then 'No plan'
      when selected.queued then 'Upcoming'
      when selected.end_date < p_today then 'Expired'
      when selected.end_date <= p_today + greatest(p_reminder_days, 0) then 'Expiring'
      else 'Active'
    end as status_label
  from profiles p
  left join member_details md on md.member_id = p.id
  left join lateral (
    select m.id as membership_id, m.plan_id, m.coach_id, m.start_date, m.end_date,
      m.status as membership_status, m.coach_addon_amount, (m.start_date > p_today) as queued
    from memberships m
    where m.member_id = p.id and (
      (m.status = 'active' and m.start_date <= p_today and m.end_date >= p_today)
      or (m.status = 'active' and m.start_date > p_today)
      or (m.status = 'expired' and m.end_date < p_today)
    )
    order by case
      when m.status = 'active' and m.start_date <= p_today and m.end_date >= p_today then 1
      when m.status = 'active' and m.start_date > p_today then 2 else 3 end,
      case when m.status = 'expired' then m.end_date end desc nulls last, m.start_date asc
    limit 1
  ) selected on true
  left join membership_plans mp on mp.id = selected.plan_id
  left join coaches c on c.id = selected.coach_id
  where p.role = 'member'
), filtered as (
  select * from roster
  where (
    nullif(trim(p_search), '') is null
    or lower(coalesce(full_name, '') || ' ' || coalesce(email, '') || ' ' ||
      coalesce(username, '') || ' ' || coalesce(phone, '') || ' ' || coalesce(member_code, ''))
      like '%' || lower(trim(p_search)) || '%'
  )
  and (nullif(trim(p_status), '') is null or lower(status_label) = lower(trim(p_status)))
  and (nullif(trim(p_plan), '') is null or plan_id::text = trim(p_plan) or lower(coalesce(plan_name, '')) = lower(trim(p_plan)))
  and (nullif(trim(p_coach), '') is null or coach_id::text = trim(p_coach) or lower(coalesce(coach_name, '')) = lower(trim(p_coach)))
  and (p_joined_from is null or join_date >= p_joined_from)
  and (p_joined_to is null or join_date <= p_joined_to)
  and (p_student is null or is_student = p_student)
  and (p_expiring_in is null or (status_label = 'Expiring' and end_date <= p_today + greatest(p_expiring_in, 0)))
), ordered as (
  select * from filtered order by
    case when p_sort = 'name' and lower(p_order) <> 'desc' then lower(coalesce(full_name, '')) end asc,
    case when p_sort = 'name' and lower(p_order) = 'desc' then lower(coalesce(full_name, '')) end desc,
    case when p_sort = 'joined' and lower(p_order) <> 'desc' then join_date end asc,
    case when p_sort = 'joined' and lower(p_order) = 'desc' then join_date end desc,
    case when p_sort = 'expiry' and lower(p_order) <> 'desc' then end_date end asc nulls last,
    case when p_sort = 'expiry' and lower(p_order) = 'desc' then end_date end desc nulls last,
    case when p_sort = 'status' and lower(p_order) <> 'desc' then status_label end asc,
    case when p_sort = 'status' and lower(p_order) = 'desc' then status_label end desc, id
), page_rows as (
  select * from ordered offset greatest(p_page - 1, 0) * least(greatest(p_limit, 1), 50)
  limit least(greatest(p_limit, 1), 50)
), counts as (
  select count(*) as all_count, count(*) filter (where status_label = 'Active') as active_count,
    count(*) filter (where status_label = 'Expiring') as expiring_count,
    count(*) filter (where status_label = 'Expired') as expired_count,
    count(*) filter (where status_label = 'Upcoming') as upcoming_count,
    count(*) filter (where status_label = 'No plan') as no_membership_count,
    count(*) filter (where status_label = 'Suspended') as suspended_count from filtered
)
select jsonb_build_object(
  'rows', coalesce((select jsonb_agg(jsonb_build_object(
    'id', id, 'email', email, 'username', username, 'full_name', full_name, 'phone', phone,
    'status', account_status, 'created_at', created_at,
    'member_details', jsonb_build_object('member_code', member_code, 'join_date', join_date, 'is_student', is_student),
    'joined_date', join_date, 'is_student', is_student, 'status_label', status_label,
    'membership', case when membership_id is null then null else jsonb_build_object(
      'id', membership_id, 'plan_id', plan_id, 'coach_id', coach_id, 'coach_addon_amount', coach_addon_amount,
      'start_date', start_date, 'end_date', end_date, 'status', membership_status, 'queued', queued,
      'derived_status', status_label, 'membership_plans', plan_json, 'coaches', coach_json) end
  )) from page_rows), '[]'::jsonb),
  'total', (select count(*) from filtered), 'page', greatest(p_page, 1),
  'limit', least(greatest(p_limit, 1), 50),
  'counts', jsonb_build_object('all', (select all_count from counts), 'active', (select active_count from counts),
    'expiring', (select expiring_count from counts), 'expired', (select expired_count from counts),
    'upcoming', (select upcoming_count from counts), 'no-membership', (select no_membership_count from counts),
    'suspended', (select suspended_count from counts))
);
$$;

revoke execute on function public.get_clerk_member_roster(text, text, text, text, date, date, integer, boolean, text, text, integer, integer, date, integer) from public, anon, authenticated;
grant execute on function public.get_clerk_member_roster(text, text, text, text, date, date, integer, boolean, text, text, integer, integer, date, integer) to service_role;
