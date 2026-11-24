alter table public.chatbot_conversations
  add column if not exists conversation_scope text not null default 'admin';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.chatbot_conversations'::regclass
      and conname = 'chatbot_conversations_scope_check'
  ) then
    alter table public.chatbot_conversations
      add constraint chatbot_conversations_scope_check
      check (conversation_scope in ('admin', 'member'));
  end if;
end
$$;

alter table public.gym_settings
  add column if not exists member_ai_enabled boolean not null default true;

create index if not exists chatbot_conversations_owner_scope_updated_idx
  on public.chatbot_conversations(user_id, conversation_scope, updated_at desc);

create table if not exists public.ai_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  usage_day date not null,
  request_count integer not null default 0 check (request_count >= 0),
  token_count bigint not null default 0 check (token_count >= 0),
  minute_window_started_at timestamptz not null default date_trunc('minute', now()),
  minute_request_count integer not null default 0 check (minute_request_count >= 0),
  primary key (user_id, role, usage_day)
);

alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;
grant all on public.ai_usage to service_role;
drop policy if exists ai_usage_service_role_only on public.ai_usage;
create policy ai_usage_service_role_only on public.ai_usage
  for all to service_role using (true) with check (true);

drop policy if exists conversations_read on public.chatbot_conversations;
drop policy if exists conversations_write on public.chatbot_conversations;
drop policy if exists messages_read on public.chatbot_messages;
drop policy if exists messages_write on public.chatbot_messages;
revoke insert, update, delete on public.chatbot_conversations, public.chatbot_messages from authenticated;

create policy conversations_read on public.chatbot_conversations
  for select to authenticated
  using (
    user_id = auth.uid()
    and (
      (conversation_scope = 'admin' and public.is_admin())
      or (
        conversation_scope = 'member'
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'member'
        )
      )
    )
  );

create policy conversations_write on public.chatbot_conversations
  for all to authenticated
  using (
    user_id = auth.uid()
    and (
      (conversation_scope = 'admin' and public.is_admin())
      or (
        conversation_scope = 'member'
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'member'
        )
      )
    )
  )
  with check (
    user_id = auth.uid()
    and (
      (conversation_scope = 'admin' and public.is_admin())
      or (
        conversation_scope = 'member'
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'member'
        )
      )
    )
  );

create policy messages_read on public.chatbot_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.chatbot_conversations c
      where c.id = conversation_id
        and c.user_id = auth.uid()
        and (
          (c.conversation_scope = 'admin' and public.is_admin())
          or (
            c.conversation_scope = 'member'
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid() and p.role = 'member'
            )
          )
        )
    )
  );

create policy messages_write on public.chatbot_messages
  for insert to authenticated
  with check (
    exists (
      select 1 from public.chatbot_conversations c
      where c.id = conversation_id
        and c.user_id = auth.uid()
        and (
          (c.conversation_scope = 'admin' and public.is_admin())
          or (
            c.conversation_scope = 'member'
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid() and p.role = 'member'
            )
          )
        )
    )
  );

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

  update public.ai_usage
  set request_count = request_count + 1,
      minute_window_started_at = case
        when v_minute_count = 0 then v_now
        else minute_window_started_at
      end,
      minute_request_count = v_minute_count + 1
  where user_id = p_user_id and role = p_role and usage_day = p_usage_day
  returning * into v_usage;

  return query select true, v_usage.request_count, v_usage.minute_request_count, 0;
end
$$;

create or replace function public.add_ai_usage_tokens(
  p_user_id uuid,
  p_role text,
  p_usage_day date,
  p_tokens bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null
    or p_role is null
    or p_role not in ('admin', 'member')
    or p_usage_day is null
    or p_tokens is null
    or p_tokens < 0 then
    raise exception 'Invalid AI token usage arguments.';
  end if;

  update public.ai_usage
  set token_count = token_count + p_tokens
  where user_id = p_user_id and role = p_role and usage_day = p_usage_day;

  if not found then
    raise exception 'AI usage record was not found.';
  end if;
end
$$;

revoke all on function public.consume_ai_usage(uuid, text, date, integer, integer) from public, anon, authenticated;
revoke all on function public.add_ai_usage_tokens(uuid, text, date, bigint) from public, anon, authenticated;
grant execute on function public.consume_ai_usage(uuid, text, date, integer, integer) to service_role;
grant execute on function public.add_ai_usage_tokens(uuid, text, date, bigint) to service_role;
