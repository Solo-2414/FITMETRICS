-- Preserve the original operational actor when an attendance row is closed later.
-- Automated checkout updates must not require a new staff actor on the row.
create or replace function public.validate_operational_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
begin
  if tg_table_name = 'payments' then
    actor_id := case when tg_op = 'UPDATE' then old.received_by else new.received_by end;
  elsif tg_table_name = 'attendance' then
    actor_id := case when tg_op = 'UPDATE' then old.recorded_by else new.recorded_by end;
  else
    actor_id := auth.uid();
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = actor_id
      and role in ('admin', 'clerk')
      and status = 'active'
  ) then
    raise exception 'Only active staff may record operational data';
  end if;

  return new;
end;
$$;
