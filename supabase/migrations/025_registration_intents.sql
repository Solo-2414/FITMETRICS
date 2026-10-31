create table if not exists public.registration_intents (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'processing', 'paid', 'cancelled', 'expired', 'failed', 'needs_review')),
  email_normalized text not null,
  phone_normalized text not null,
  plan_id uuid not null references public.membership_plans(id) on delete restrict,
  is_student boolean not null default false,
  coach_id uuid references public.coaches(id) on delete set null,
  amount_total numeric(12,2) not null check (amount_total > 0),
  method public.payment_method not null,
  form_encrypted text,
  provider_intent_id text,
  expires_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  member_id uuid references public.profiles(id) on delete set null,
  send_receipt boolean not null default true
);

alter table public.registration_intents enable row level security;
revoke all on public.registration_intents from anon, authenticated;
create unique index if not exists registration_intents_pending_email_idx on public.registration_intents(email_normalized) where status = 'pending';
create unique index if not exists registration_intents_pending_phone_idx on public.registration_intents(phone_normalized) where status = 'pending';
create index if not exists registration_intents_expiry_idx on public.registration_intents(status, expires_at) where status = 'pending';
create index if not exists registration_intents_plan_idx on public.registration_intents(plan_id);
create index if not exists registration_intents_coach_idx on public.registration_intents(coach_id);
create index if not exists registration_intents_member_idx on public.registration_intents(member_id);
