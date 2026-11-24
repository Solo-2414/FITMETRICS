create or replace function public.consume_ai_usage(
  p_user_id uuid,
  p_role text,
  p_usage_day date,
  p_daily_limit integer,
  p_minute_limit integer default 0
)
returns table (
  allowed boolean,
  request_count integer,
  minute_request_count integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usage public.ai_usage%rowtype;
  v_now timestamptz := clock_timestamp();
  v_minute_count integer;
  v_retry_after integer;
begin
  if p_user_id is null
    or p_usage_day is null
    or p_role is null
    or p_role not in ('admin', 'member')
    or p_daily_limit is null
    or p_daily_limit < 1
    or p_minute_limit is null
    or p_minute_limit < 0 then
    raise exception 'Invalid AI quota arguments.';
  end if;

  insert into public.ai_usage (user_id, role, usage_day)
  values (p_user_id, p_role, p_usage_day)
  on conflict (user_id, role, usage_day) do nothing;

  select * into v_usage
  from public.ai_usage
  where user_id = p_user_id and role = p_role and usage_day = p_usage_day
  for update;

  if v_usage.request_count >= p_daily_limit then
    v_retry_after := greatest(
      1,
      ceil(extract(epoch from (((p_usage_day + 1)::timestamp at time zone 'Asia/Manila') - v_now)))::integer
    );
    return query select false, v_usage.request_count, v_usage.minute_request_count, v_retry_after;
    return;
  end if;

  if v_usage.minute_window_started_at <= v_now - interval '1 minute' then
    v_minute_count := 0;
  else
    v_minute_count := v_usage.minute_request_count;
  end if;

  if p_role = 'member' and p_minute_limit > 0 and v_minute_count >= p_minute_limit then
    v_retry_after := greatest(
      1,
      ceil(extract(epoch from (v_usage.minute_window_started_at + interval '1 minute' - v_now)))::integer
    );
    return query select false, v_usage.request_count, v_minute_count, v_retry_after;
    return;
  end if;

  update public.ai_usage as usage_row
  set request_count = usage_row.request_count + 1,
      minute_window_started_at = case
        when v_minute_count = 0 then v_now
        else usage_row.minute_window_started_at
      end,
      minute_request_count = v_minute_count + 1
  where usage_row.user_id = p_user_id
    and usage_row.role = p_role
    and usage_row.usage_day = p_usage_day
  returning usage_row.* into v_usage;

  return query select true, v_usage.request_count, v_usage.minute_request_count, 0;
end
$$;

revoke all on function public.consume_ai_usage(uuid, text, date, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_usage(uuid, text, date, integer, integer) to service_role;
