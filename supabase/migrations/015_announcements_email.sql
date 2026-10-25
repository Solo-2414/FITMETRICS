-- Announcement delivery metadata and email blast support.

alter table public.notifications
  add column if not exists announcement_id uuid references public.announcements(id) on delete set null;

create index if not exists notifications_announcement_idx
  on public.notifications (announcement_id, read_at);

alter table public.announcements
  add column if not exists send_email boolean not null default false;

alter table public.announcements
  add column if not exists fanout_done_at timestamptz;

alter table public.announcements
  add column if not exists email_total integer not null default 0 check (email_total >= 0);

alter table public.email_log
  drop constraint if exists email_log_email_type_check;

alter table public.email_log
  add constraint email_log_email_type_check
  check (email_type in ('expiry_reminder', 'expiry_notice', 'receipt', 'password_otp', 'information_overview', 'announcement', 'promo'));

alter table public.email_queue
  alter column priority set default 5;

create index if not exists email_queue_priority_ready_idx
  on public.email_queue (priority, next_attempt_at) where completed_at is null;
