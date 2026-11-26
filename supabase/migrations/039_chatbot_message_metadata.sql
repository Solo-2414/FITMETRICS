alter table public.chatbot_messages
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create or replace view public.ai_active_membership_distribution
with (security_invoker = true) as
select
  p.code,
  p.name,
  p.duration_days,
  count(m.id)::integer as active_memberships
from public.membership_plans p
left join public.memberships m
  on m.plan_id = p.id and m.status = 'active'
group by p.id, p.code, p.name, p.duration_days
order by active_memberships desc;

revoke all on public.ai_active_membership_distribution from public, anon, authenticated;
grant select on public.ai_active_membership_distribution to service_role;
