alter type public.notification_type add value if not exists 'registration';

alter table public.notifications
  add column if not exists link text;

alter table public.profiles
  add column if not exists preferences jsonb not null default '{}'::jsonb;

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);
