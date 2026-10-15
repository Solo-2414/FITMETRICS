-- RLS, business rules, receipt generation, and reporting surfaces.

create sequence if not exists public.receipt_number_seq;

create or replace function public.next_receipt_number()
returns text language sql volatile security definer set search_path = public as $$
  select 'FIT-' || to_char(current_date, 'YYYYMMDD') || '-' ||
    lpad(nextval('public.receipt_number_seq')::text, 6, '0');
$$;

alter table public.payments alter column receipt_number set default public.next_receipt_number();

create or replace function public.validate_operational_actor()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Only active staff may record operational data';
  end if;
  return new;
end;
$$;

create trigger payments_staff_only before insert or update on public.payments
for each row execute function public.validate_operational_actor();
create trigger attendance_staff_only before insert or update on public.attendance
for each row execute function public.validate_operational_actor();

create or replace function public.prevent_duplicate_open_checkin()
returns trigger language plpgsql as $$
begin
  if exists (
    select 1 from public.attendance
    where member_id = new.member_id and status = 'open' and id <> new.id
  ) then
    raise exception 'Member already has an open check-in';
  end if;
  if exists (
    select 1 from public.attendance
    where member_id = new.member_id
      and check_in_at::date = new.check_in_at::date
      and status <> 'cancelled'
      and id <> new.id
  ) then
    raise exception 'Member already has a check-in for this date';
  end if;
  return new;
end;
$$;
create trigger attendance_no_duplicate_open before insert or update on public.attendance
for each row execute function public.prevent_duplicate_open_checkin();

create or replace function public.prevent_payment_mutation()
returns trigger language plpgsql as $$
begin
  if old.member_id <> new.member_id
     or old.membership_id is distinct from new.membership_id
     or old.amount <> new.amount
     or old.method <> new.method
     or old.reference_number is distinct from new.reference_number
     or old.received_by <> new.received_by
     or old.receipt_number <> new.receipt_number
     or old.created_at <> new.created_at then
    raise exception 'Payments are immutable; void the payment with a reason';
  end if;
  if old.status = 'voided' and new.status <> 'voided' then
    raise exception 'Voided payments cannot be reopened';
  end if;
  return new;
end;
$$;
create trigger payments_immutable before update on public.payments
for each row execute function public.prevent_payment_mutation();

create or replace function public.expire_memberships()
returns integer language plpgsql security definer set search_path = public as $$
declare affected integer;
begin
  update public.memberships
  set status = 'expired'
  where status = 'active' and end_date < current_date;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

create or replace view public.member_billing_history as
select p.id, p.member_id, p.membership_id, p.receipt_number, p.amount,
       p.method, p.reference_number, p.status, p.created_at,
       mp.name as plan_name
from public.payments p
left join public.memberships m on m.id = p.membership_id
left join public.membership_plans mp on mp.id = m.plan_id;

create or replace view public.attendance_daily_summary as
select check_in_at::date as attendance_date,
       count(*)::integer as visits,
       count(*) filter (where check_out_at is null)::integer as open_visits,
       round(avg(extract(epoch from (check_out_at - check_in_at)) / 3600)
         filter (where check_out_at is not null), 2) as average_duration_hours
from public.attendance
where status <> 'cancelled'
group by check_in_at::date;

create or replace view public.revenue_daily_summary as
select created_at::date as revenue_date,
       sum(amount) filter (where status = 'paid') as total_revenue,
       sum(amount) filter (where status = 'paid' and method = 'cash') as cash_revenue,
       sum(amount) filter (where status = 'paid' and method in ('gcash', 'maya', 'bank_transfer')) as online_revenue,
       count(*) filter (where status = 'paid')::integer as payment_count
from public.payments
group by created_at::date;

create or replace view public.member_attendance_summary as
select member_id, count(*) filter (where status <> 'cancelled')::integer as visit_count,
       max(check_in_at)::date as last_visit_date,
       round(avg(extract(epoch from (check_out_at - check_in_at)) / 3600)
         filter (where check_out_at is not null), 2) as average_duration_hours
from public.attendance
group by member_id;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'member_details','coaches','membership_plans','memberships','payments',
    'attendance','notifications','announcements','workout_plans',
    'workout_plan_days','workout_exercises','video_tutorials','churn_snapshots',
    'reports','gym_settings','audit_log','chatbot_conversations','chatbot_messages'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
    execute format('grant select on public.%I to authenticated', table_name);
  end loop;
end $$;

-- Members see their own records. Staff can operate on member-facing records.
create policy member_details_read on public.member_details for select to authenticated
using (member_id = auth.uid() or public.is_staff());
create policy member_details_member_update on public.member_details for update to authenticated
using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy member_details_staff_write on public.member_details for all to authenticated
using (public.is_staff()) with check (public.is_staff());

create policy coaches_read on public.coaches for select to authenticated using (public.is_staff() or active);
create policy coaches_admin_write on public.coaches for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy plans_read on public.membership_plans for select to authenticated using (active or public.is_staff());
create policy plans_admin_write on public.membership_plans for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy memberships_read on public.memberships for select to authenticated using (member_id = auth.uid() or public.is_staff());
create policy memberships_staff_write on public.memberships for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy payments_read on public.payments for select to authenticated using (member_id = auth.uid() or public.is_staff());
create policy payments_staff_insert on public.payments for insert to authenticated with check (public.is_staff() and received_by = auth.uid());
create policy payments_admin_update on public.payments for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy attendance_read on public.attendance for select to authenticated using (member_id = auth.uid() or public.is_staff());
create policy attendance_staff_write on public.attendance for insert to authenticated with check (public.is_staff() and recorded_by = auth.uid());
create policy attendance_staff_update on public.attendance for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy notifications_read on public.notifications for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy notifications_self_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_staff_insert on public.notifications for insert to authenticated with check (public.is_staff());

create policy announcements_read on public.announcements for select to authenticated
using (public.is_staff() or (status = 'published' and (expires_at is null or expires_at > now())
  and (audience = 'all' or audience::text = public.current_app_role()::text)));
create policy announcements_admin_write on public.announcements for all to authenticated
using (public.is_admin()) with check (public.is_admin() and author_id = auth.uid());

create policy workout_plans_read on public.workout_plans for select to authenticated
using (member_id = auth.uid() or public.is_staff());
create policy workout_plans_staff_write on public.workout_plans for all to authenticated
using (public.is_staff()) with check (public.is_staff());
create policy workout_days_read on public.workout_plan_days for select to authenticated
using (exists (select 1 from public.workout_plans p where p.id = plan_id and (p.member_id = auth.uid() or public.is_staff())));
create policy workout_days_staff_write on public.workout_plan_days for all to authenticated
using (public.is_staff()) with check (public.is_staff());
create policy exercises_read on public.workout_exercises for select to authenticated
using (exists (select 1 from public.workout_plan_days d join public.workout_plans p on p.id = d.plan_id
  where d.id = plan_day_id and (p.member_id = auth.uid() or public.is_staff())));
create policy exercises_staff_write on public.workout_exercises for all to authenticated
using (public.is_staff()) with check (public.is_staff());

create policy videos_read on public.video_tutorials for select to authenticated using (visibility = 'public' or public.is_staff());
create policy videos_admin_write on public.video_tutorials for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy churn_staff_read on public.churn_snapshots for select to authenticated using (member_id = auth.uid() or public.is_staff());
create policy churn_admin_write on public.churn_snapshots for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy reports_admin_only on public.reports for all to authenticated using (public.is_admin()) with check (public.is_admin() and generated_by = auth.uid());
create policy settings_read on public.gym_settings for select to authenticated using (true);
create policy settings_admin_write on public.gym_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy audit_admin_read on public.audit_log for select to authenticated using (public.is_admin());
create policy audit_staff_insert on public.audit_log for insert to authenticated with check (public.is_staff() and actor_id = auth.uid());
create policy conversations_read on public.chatbot_conversations for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy conversations_write on public.chatbot_conversations for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy messages_read on public.chatbot_messages for select to authenticated using (exists (select 1 from public.chatbot_conversations c where c.id = conversation_id and (c.user_id = auth.uid() or public.is_admin())));
create policy messages_write on public.chatbot_messages for insert to authenticated with check (exists (select 1 from public.chatbot_conversations c where c.id = conversation_id and c.user_id = auth.uid()));

-- Reporting views are consumed through authorized backend endpoints. Do not
-- expose aggregate or billing views directly to every authenticated client.
revoke all on public.member_billing_history, public.attendance_daily_summary,
  public.revenue_daily_summary, public.member_attendance_summary from anon, authenticated;

grant insert, update on public.member_details to authenticated;
grant insert, update on public.coaches to authenticated;
grant insert, update on public.membership_plans to authenticated;
grant insert, update on public.memberships to authenticated;
grant insert, update on public.payments to authenticated;
grant insert, update on public.attendance to authenticated;
grant insert, update on public.notifications to authenticated;
grant insert, update on public.announcements to authenticated;
grant insert, update on public.workout_plans to authenticated;
grant insert, update on public.workout_plan_days to authenticated;
grant insert, update on public.workout_exercises to authenticated;
grant insert, update on public.video_tutorials to authenticated;
grant insert, update on public.churn_snapshots to authenticated;
grant insert, update on public.reports to authenticated;
grant update on public.gym_settings to authenticated;
grant insert on public.audit_log to authenticated;
grant insert, update on public.chatbot_conversations to authenticated;
grant insert on public.chatbot_messages to authenticated;
