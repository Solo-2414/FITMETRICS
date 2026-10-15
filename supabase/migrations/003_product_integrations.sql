-- Product rules and integration persistence. Run after 002_security_and_reporting.sql.

alter table public.profiles
  add column if not exists username text;

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username))
  where username is not null;

alter table public.membership_plans
  add column if not exists account_eligible boolean not null default true;

update public.membership_plans
set account_eligible = false
where code = 'session';

create or replace function public.validate_account_eligible_plan()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from public.membership_plans
    where id = new.plan_id and account_eligible
  ) then
    raise exception 'This plan cannot create an account membership';
  end if;
  return new;
end;
$$;

create trigger memberships_account_eligible
before insert or update of plan_id on public.memberships
for each row execute function public.validate_account_eligible_plan();

create table public.promos (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(12,2) not null check (discount_value >= 0),
  applies_to_plan_id uuid references public.membership_plans(id) on delete cascade,
  valid_from timestamptz,
  valid_until timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 100),
  check (valid_until is null or valid_from is null or valid_until > valid_from)
);

create table public.walk_in_visits (
  id uuid primary key default gen_random_uuid(),
  guest_name text,
  guest_phone text,
  plan_id uuid not null references public.membership_plans(id) on delete restrict,
  visit_date date not null default current_date,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (guest_name is not null or guest_phone is not null)
);

alter table public.payments
  alter column member_id drop not null,
  add column if not exists walk_in_visit_id uuid references public.walk_in_visits(id) on delete restrict,
  add column if not exists promo_id uuid references public.promos(id) on delete set null,
  add column if not exists gross_amount numeric(12,2),
  add column if not exists provider text,
  add column if not exists provider_checkout_id text,
  add column if not exists provider_payment_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists failure_reason text,
  add constraint payments_subject_check
    check ((member_id is not null) <> (walk_in_visit_id is not null));

create unique index if not exists payments_provider_payment_idx
  on public.payments (provider, provider_payment_id)
  where provider_payment_id is not null;

alter type public.payment_status add value if not exists 'failed';
alter type public.payment_status add value if not exists 'expired';
alter type public.payment_status add value if not exists 'refunded';

alter table public.attendance
  alter column member_id drop not null,
  add column if not exists walk_in_visit_id uuid references public.walk_in_visits(id) on delete set null,
  add constraint attendance_subject_check
    check ((member_id is not null) <> (walk_in_visit_id is not null));

create table public.paymongo_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  signature_valid boolean not null,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now()
);

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  email_type text not null check (email_type in ('expiry_reminder', 'expiry_notice', 'receipt', 'password_otp', 'information_overview')),
  recipient text not null,
  subject text,
  status text not null check (status in ('queued', 'sent', 'failed', 'cancelled')),
  provider_message_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.email_queue (
  id uuid primary key default gen_random_uuid(),
  email_log_id uuid not null references public.email_log(id) on delete cascade,
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create table public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  insight_type text not null check (insight_type in ('analytics', 'chatbot')),
  period_start date,
  period_end date,
  metrics jsonb not null default '{}'::jsonb,
  result jsonb not null,
  model text,
  generated_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null
);

create table public.prediction_snapshots (
  id uuid primary key default gen_random_uuid(),
  prediction_date date not null,
  target_date date not null,
  predicted_visits numeric(12,2),
  predicted_revenue numeric(12,2),
  predicted_renewals integer,
  confidence_note text not null,
  method_version text not null,
  explanation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (prediction_date, target_date, method_version)
);

create table public.maintenance_backups (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'supabase',
  backup_reference text,
  status text not null check (status in ('requested', 'running', 'completed', 'failed')),
  requested_by uuid not null references public.profiles(id) on delete restrict,
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create index promos_active_dates_idx on public.promos(active, valid_from, valid_until);
create index walk_in_visits_date_idx on public.walk_in_visits(visit_date, status);
create index payments_walk_in_idx on public.payments(walk_in_visit_id);
create index payments_status_created_idx on public.payments(status, created_at desc);
create index attendance_walk_in_idx on public.attendance(walk_in_visit_id);
create index webhook_events_created_idx on public.paymongo_webhook_events(created_at desc);
create index email_queue_ready_idx on public.email_queue(next_attempt_at) where completed_at is null;
create index ai_insights_type_expiry_idx on public.ai_insights(insight_type, expires_at);
create index prediction_target_date_idx on public.prediction_snapshots(target_date);

create trigger promos_touch before update on public.promos
for each row execute function public.touch_updated_at();

-- Staff-only operational extensions; admins inherit staff access.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'promos','walk_in_visits','paymongo_webhook_events','email_log','email_queue',
    'ai_insights','prediction_snapshots','maintenance_backups'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
    execute format('grant select on public.%I to authenticated', table_name);
  end loop;
end $$;

create policy promos_read on public.promos for select to authenticated
using (active or public.is_staff());
create policy promos_admin_write on public.promos for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy walk_ins_staff_write on public.walk_in_visits for all to authenticated
using (public.is_staff()) with check (public.is_staff() and created_by = auth.uid());

create policy webhook_admin_read on public.paymongo_webhook_events for select to authenticated
using (public.is_admin());

create policy email_admin_read on public.email_log for select to authenticated
using (public.is_admin());
create policy email_queue_admin_read on public.email_queue for select to authenticated
using (public.is_admin());

create policy ai_admin_read on public.ai_insights for select to authenticated
using (public.is_admin());
create policy predictions_admin_read on public.prediction_snapshots for select to authenticated
using (public.is_admin());

create policy backups_admin_all on public.maintenance_backups for all to authenticated
using (public.is_admin()) with check (public.is_admin() and requested_by = auth.uid());

grant insert, update on public.promos to authenticated;
grant insert, update on public.walk_in_visits to authenticated;
grant insert, update on public.email_log, public.email_queue to authenticated;
grant insert, update on public.ai_insights, public.prediction_snapshots to authenticated;
grant insert, update on public.maintenance_backups to authenticated;

drop policy if exists payments_staff_insert on public.payments;
create policy payments_staff_insert on public.payments for insert to authenticated
with check (public.is_staff() and received_by = auth.uid()
  and ((member_id is not null) or (walk_in_visit_id is not null)));

drop policy if exists attendance_staff_write on public.attendance;
create policy attendance_staff_write on public.attendance for insert to authenticated
with check (public.is_staff() and recorded_by = auth.uid()
  and ((member_id is not null) or (walk_in_visit_id is not null)));
