-- Demo data for the Attendance Analysis page.
-- Run after all migrations, including 013_attendance_analysis.sql.
-- This creates 120 marked attendance rows across the last 30 Manila days.
-- It is intended for a development/staging database only.

begin;

update public.gym_settings
set daily_visit_target = 12,
    updated_at = now();

do $$
declare
  v_staff_count integer;
  v_member_count integer;
begin
  select count(*) into v_staff_count
  from public.profiles
  where role in ('admin', 'clerk') and status = 'active';

  select count(*) into v_member_count
  from public.profiles
  where role = 'member' and status = 'active';

  if v_staff_count = 0 then
    raise exception 'Demo attendance data needs at least one active admin or clerk profile.';
  end if;

  if v_member_count < 4 then
    raise exception 'Demo attendance data needs at least four active member profiles; found %.', v_member_count;
  end if;
end
$$;

insert into public.memberships (
  id, member_id, plan_id, start_date, end_date, status, created_by
)
select gen_random_uuid(),
       member.id,
       p.id,
       (timezone('Asia/Manila', now())::date - 45),
       (timezone('Asia/Manila', now())::date + 45),
       'active',
       (select id from public.profiles where role in ('admin', 'clerk') and status = 'active' order by created_at, id limit 1)
from (
  select id,
         row_number() over (order by created_at, id)::integer as member_number
  from public.profiles
  where role = 'member' and status = 'active'
  order by created_at, id
  limit 4
) member
join public.membership_plans p
  on p.code = case member.member_number
    when 1 then 'monthly'
    when 2 then 'weekly'
    when 3 then 'biweekly'
    else 'monthly'
  end
where not exists (
  select 1
  from public.memberships existing
  where existing.member_id = member.id
    and existing.start_date = timezone('Asia/Manila', now())::date - 45
    and existing.end_date = timezone('Asia/Manila', now())::date + 45
);

insert into public.attendance (
  member_id,
  membership_id,
  check_in_at,
  check_out_at,
  method,
  recorded_by,
  status,
  notes
)
select member.id,
       membership.id,
       timezone(
         'Asia/Manila',
         (
           timezone('Asia/Manila', now())::date - days.day
           + case member.member_number
             when 1 then time '06:30'
             when 2 then time '10:00'
             when 3 then time '18:00'
             else time '20:30'
           end
         )::timestamp
       ),
       case
         when days.day = 0 and member.member_number in (1, 3) then null
         else timezone(
           'Asia/Manila',
           (
             timezone('Asia/Manila', now())::date - days.day
             + case member.member_number
               when 1 then time '08:00'
               when 2 then time '11:30'
               when 3 then time '20:00'
               else time '22:00'
             end
           )::timestamp
         )
       end,
       case when member.member_number = 4 then 'qr'::public.attendance_method else 'member_id'::public.attendance_method end,
       (
         select staff.id
         from (
           select id,
                  row_number() over (order by created_at, id)::integer as staff_number
           from public.profiles
           where role in ('admin', 'clerk') and status = 'active'
         ) staff
         where staff.staff_number = ((member.member_number - 1) % (
           select count(*) from public.profiles
           where role in ('admin', 'clerk') and status = 'active'
         )) + 1
       ),
       case when days.day = 0 and member.member_number in (1, 3) then 'open'::public.attendance_status else 'completed'::public.attendance_status end,
       'attendance-analysis-demo'
from (
  select id,
         row_number() over (order by created_at, id)::integer as member_number
  from public.profiles
  where role = 'member' and status = 'active'
  order by created_at, id
  limit 4
) member
join public.memberships membership
  on membership.member_id = member.id
 and membership.start_date = timezone('Asia/Manila', now())::date - 45
 and membership.end_date = timezone('Asia/Manila', now())::date + 45
cross join generate_series(0, 29) as days(day)
where not exists (
  select 1
  from public.attendance existing
  where existing.member_id = member.id
    and existing.notes = 'attendance-analysis-demo'
    and existing.check_in_at = timezone(
      'Asia/Manila',
      (
        timezone('Asia/Manila', now())::date - days.day
        + case member.member_number
          when 1 then time '06:30'
          when 2 then time '10:00'
          when 3 then time '18:00'
          else time '20:30'
        end
      )::timestamp
    )
);

commit;

-- Optional cleanup for this demo dataset:
-- delete from public.attendance where notes = 'attendance-analysis-demo';
-- delete from public.memberships
-- where created_by = (select id from public.profiles where role = 'admin' order by created_at, id limit 1)
--   and start_date = timezone('Asia/Manila', now())::date - 45
--   and end_date = timezone('Asia/Manila', now())::date + 45;
