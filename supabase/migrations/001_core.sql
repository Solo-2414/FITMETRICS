-- FITMETRICS application schema. Run after supabase/schema.sql.
create extension if not exists pgcrypto;

create type public.membership_status as enum ('active', 'expired', 'cancelled', 'frozen');
create type public.payment_method as enum ('cash', 'gcash', 'maya', 'bank_transfer', 'other');
create type public.payment_status as enum ('paid', 'voided', 'pending');
create type public.attendance_method as enum ('member_id', 'manual', 'qr', 'walk_in');
create type public.attendance_status as enum ('open', 'completed', 'cancelled');
create type public.announcement_status as enum ('draft', 'scheduled', 'published', 'expired', 'archived');
create type public.audience_role as enum ('all', 'admin', 'clerk', 'member');
create type public.notification_type as enum ('membership_expiry', 'workout_plan', 'announcement', 'payment', 'milestone', 'system');

create table public.member_details (
  member_id uuid primary key references public.profiles(id) on delete cascade,
  member_code text not null unique,
  birthdate date,
  address text,
  is_student boolean not null default false,
  join_date date not null default current_date,
  notes text,
  emergency_contact_relationship text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coaches (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  phone text,
  email text,
  external_contact_url text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null default 'standard',
  duration_days integer not null check (duration_days > 0),
  price numeric(12,2) not null check (price >= 0),
  student_price numeric(12,2) check (student_price is null or student_price >= 0),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete restrict,
  plan_id uuid not null references public.membership_plans(id) on delete restrict,
  coach_id uuid references public.coaches(id) on delete set null,
  coach_addon_amount numeric(12,2) not null default 0 check (coach_addon_amount >= 0),
  start_date date not null,
  end_date date not null,
  status public.membership_status not null default 'active',
  frozen_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete restrict,
  membership_id uuid references public.memberships(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  method public.payment_method not null,
  reference_number text,
  status public.payment_status not null default 'paid',
  received_by uuid not null references public.profiles(id) on delete restrict,
  receipt_number text not null unique,
  voided_at timestamptz,
  voided_by uuid references public.profiles(id) on delete set null,
  void_reason text,
  created_at timestamptz not null default now(),
  check (status <> 'voided' or (voided_at is not null and void_reason is not null))
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete restrict,
  membership_id uuid references public.memberships(id) on delete set null,
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  method public.attendance_method not null default 'manual',
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  status public.attendance_status not null default 'open',
  notes text,
  created_at timestamptz not null default now(),
  check (check_out_at is null or check_out_at >= check_in_at)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  message text not null,
  related_member_id uuid references public.profiles(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience public.audience_role not null default 'all',
  status public.announcement_status not null default 'draft',
  publish_at timestamptz,
  expires_at timestamptz,
  pinned boolean not null default false,
  author_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or publish_at is null or expires_at > publish_at)
);

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  author_id uuid references public.profiles(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workout_plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.workout_plans(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  title text not null,
  focus text,
  is_rest boolean not null default false,
  unique (plan_id, day_of_week)
);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references public.workout_plan_days(id) on delete cascade,
  name text not null,
  target_muscle text,
  sets integer check (sets is null or sets > 0),
  reps text,
  weight numeric(10,2) check (weight is null or weight >= 0),
  unit text check (unit in ('kg', 'lbs')),
  rest_seconds integer check (rest_seconds is null or rest_seconds >= 0),
  position integer not null default 0
);

create table public.video_tutorials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  difficulty text,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  video_url text not null,
  thumbnail_url text,
  visibility text not null default 'public' check (visibility in ('public', 'hidden')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.churn_snapshots (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  snapshot_date date not null default current_date,
  risk_score numeric(5,2) not null check (risk_score between 0 and 100),
  last_visit_date date,
  days_inactive integer not null default 0 check (days_inactive >= 0),
  model_version text not null default 'rules-v1',
  created_at timestamptz not null default now(),
  unique (member_id, snapshot_date, model_version)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  period_start date not null,
  period_end date not null,
  filters jsonb not null default '{}'::jsonb,
  generated_by uuid not null references public.profiles(id) on delete restrict,
  generated_at timestamptz not null default now(),
  result jsonb,
  check (period_end >= period_start)
);

create table public.gym_settings (
  id boolean primary key default true check (id),
  gym_name text not null,
  address text,
  phone text,
  email text,
  monday_saturday_open time,
  monday_saturday_close time,
  sunday_open time,
  sunday_close time,
  expiry_reminder_days integer not null default 3 check (expiry_reminder_days > 0),
  notifications jsonb not null default '{"email": true, "in_app": true}'::jsonb,
  maintenance_enabled boolean not null default false,
  maintenance_message text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.chatbot_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chatbot_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chatbot_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index member_details_code_idx on public.member_details(member_code);
create index memberships_member_status_idx on public.memberships(member_id, status);
create index memberships_end_date_idx on public.memberships(end_date);
create index payments_member_created_idx on public.payments(member_id, created_at desc);
create index attendance_member_time_idx on public.attendance(member_id, check_in_at desc);
create index attendance_open_idx on public.attendance(status) where status = 'open';
create index notifications_user_read_idx on public.notifications(user_id, read_at, created_at desc);
create index announcements_visibility_idx on public.announcements(status, publish_at, expires_at);
create index churn_member_date_idx on public.churn_snapshots(member_id, snapshot_date desc);
create index audit_entity_idx on public.audit_log(entity_type, entity_id, created_at desc);
create index chatbot_messages_conversation_idx on public.chatbot_messages(conversation_id, created_at);

create trigger member_details_touch before update on public.member_details for each row execute function public.touch_updated_at();
create trigger coaches_touch before update on public.coaches for each row execute function public.touch_updated_at();
create trigger plans_touch before update on public.membership_plans for each row execute function public.touch_updated_at();
create trigger memberships_touch before update on public.memberships for each row execute function public.touch_updated_at();
create trigger announcements_touch before update on public.announcements for each row execute function public.touch_updated_at();
create trigger workout_plans_touch before update on public.workout_plans for each row execute function public.touch_updated_at();
create trigger video_tutorials_touch before update on public.video_tutorials for each row execute function public.touch_updated_at();
create trigger chatbot_conversations_touch before update on public.chatbot_conversations for each row execute function public.touch_updated_at();
