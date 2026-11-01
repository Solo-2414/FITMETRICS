-- QR Ph registration payments and configurable business receipt details.
-- Run this migration in the Supabase SQL Editor before enabling QR Ph.

alter type public.payment_method add value if not exists 'qrph';

alter table public.payments
  alter column receipt_number drop not null,
  alter column receipt_number drop default,
  add column if not exists provider_intent_id text,
  add column if not exists qr_expires_at timestamptz,
  add column if not exists registration_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists send_receipt boolean not null default true,
  add column if not exists cash_tendered numeric(12,2),
  add column if not exists change_given numeric(12,2),
  add column if not exists review_required boolean not null default false;

alter table public.gym_settings
  add column if not exists business_legal_name text,
  add column if not exists business_address text,
  add column if not exists business_tin text,
  add column if not exists vat_status text not null default 'unregistered'
    check (vat_status in ('vat', 'non_vat', 'unregistered')),
  add column if not exists receipt_series_prefix text not null default 'FM',
  add column if not exists bir_permit_note text,
  add column if not exists receipt_footer_note text,
  add column if not exists support_email text,
  add column if not exists support_phone text;

create or replace function public.next_fitmetrics_receipt_number()
returns text language sql volatile security definer set search_path = public as $$
  select coalesce((select nullif(trim(receipt_series_prefix), '') from public.gym_settings where id = true), 'FM')
    || '-' || to_char(current_date, 'YYYY') || '-'
    || lpad(nextval('public.receipt_number_seq')::text, 6, '0');
$$;

revoke all on function public.next_fitmetrics_receipt_number() from public, anon, authenticated;
grant execute on function public.next_fitmetrics_receipt_number() to service_role;

create index if not exists payments_provider_intent_idx on public.payments(provider_intent_id);
create index if not exists payments_qr_expiry_idx on public.payments(qr_expires_at)
  where status = 'pending' and qr_expires_at is not null;
