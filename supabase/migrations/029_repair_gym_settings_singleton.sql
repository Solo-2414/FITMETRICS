-- Preserve the newest settings row, merge configured payment modes, and remove
-- duplicate singleton rows created before the primary-key constraint was enforced.
with keeper as (
  select ctid
  from public.gym_settings
  where id = true
  order by updated_at desc nulls last, ctid desc
  limit 1
),
merged_modes as (
  select coalesce(jsonb_agg(distinct mode order by mode), '[]'::jsonb) as payment_modes
  from public.gym_settings settings
  cross join lateral jsonb_array_elements_text(coalesce(settings.payment_modes, '[]'::jsonb)) as values(mode)
  where settings.id = true
)
update public.gym_settings settings
set payment_modes = merged_modes.payment_modes
from keeper, merged_modes
where settings.ctid = keeper.ctid;

-- Only duplicate rows for the singleton id are removed; the keeper above remains.
with keeper as (
  select ctid
  from public.gym_settings
  where id = true
  order by updated_at desc nulls last, ctid desc
  limit 1
)
delete from public.gym_settings settings
where settings.id = true
  and settings.ctid <> (select ctid from keeper);

create unique index if not exists gym_settings_singleton_id_idx
  on public.gym_settings (id)
  where id = true;
