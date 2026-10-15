-- Backend operational writes use the service-role connection after Express
-- has authenticated the staff member. Validate the actor recorded on the row
-- instead of relying only on auth.uid(), which is unavailable in that context.

create or replace function public.validate_operational_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
begin
  actor_id := case
    when tg_table_name = 'payments' then new.received_by
    when tg_table_name = 'attendance' then new.recorded_by
    else auth.uid()
  end;

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
