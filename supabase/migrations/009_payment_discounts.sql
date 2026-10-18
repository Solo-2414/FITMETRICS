-- PayMongo and promo accounting fields. Run after 008_email_queue_payload.sql.

alter table public.payments
  add column if not exists plan_id uuid references public.membership_plans(id) on delete restrict,
  add column if not exists discount numeric(12,2) not null default 0
    check (discount >= 0);
