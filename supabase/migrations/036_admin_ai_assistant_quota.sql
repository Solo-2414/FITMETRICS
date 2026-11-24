create table if not exists public.ai_chat_usage_daily (
  user_id uuid not null references public.profiles(id) on delete cascade,
  usage_date date not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, usage_date)
);

alter table public.ai_chat_usage_daily enable row level security;
revoke all on public.ai_chat_usage_daily from anon, authenticated;

drop policy if exists ai_chat_usage_admin_read on public.ai_chat_usage_daily;
create policy ai_chat_usage_admin_read on public.ai_chat_usage_daily
  for select to authenticated using (public.is_admin() and user_id = auth.uid());
