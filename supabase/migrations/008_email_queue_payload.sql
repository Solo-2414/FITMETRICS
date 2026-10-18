-- Email worker payloads and retry metadata.
-- Run after 003_product_integrations.sql.

alter table public.email_log
  add column if not exists payload jsonb not null default '{}'::jsonb;

alter table public.email_log
  add column if not exists attempts integer not null default 0 check (attempts >= 0);

alter table public.email_log
  add column if not exists next_attempt_at timestamptz;

create index if not exists email_log_dedupe_idx
  on public.email_log (email_type, recipient, created_at desc);
