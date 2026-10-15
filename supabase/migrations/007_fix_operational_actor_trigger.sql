-- Resolve row fields only inside the trigger branch that owns them.
-- PostgreSQL can otherwise validate NEW.recorded_by on payment rows.

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
    actor_id := new.received_by;
  elsif tg_table_name = 'attendance' then
    actor_id := new.recorded_by;
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
