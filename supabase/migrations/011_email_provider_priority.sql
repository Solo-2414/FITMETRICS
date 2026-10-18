alter table public.email_log add column if not exists provider text;
alter table public.email_log add column if not exists priority smallint not null default 0;
alter table public.email_queue add column if not exists priority smallint not null default 0;

alter table public.email_log drop constraint if exists email_log_email_type_check;
alter table public.email_log add constraint email_log_email_type_check
  check (email_type in ('expiry_reminder', 'expiry_notice', 'receipt', 'password_otp', 'information_overview', 'announcement', 'promo'));

create index if not exists email_queue_priority_ready_idx
  on public.email_queue(priority, next_attempt_at) where completed_at is null;
