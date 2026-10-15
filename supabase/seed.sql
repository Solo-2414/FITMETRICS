-- Development seed data only. Do not use in production.
insert into public.gym_settings (
  gym_name, address, phone, email, monday_saturday_open,
  monday_saturday_close, sunday_open, sunday_close, expiry_reminder_days
) values (
  'Analyn''s Fitness Gym', 'San Jose, Batangas', '+63 917 123 4567',
  'contact@analynsgym.com', '06:00', '21:30', '07:00', '19:00', 3
) on conflict (id) do nothing;

insert into public.membership_plans
  (code, name, category, duration_days, price, student_price, description, account_eligible)
values
  ('session', 'Session / Walk-In', 'walk_in', 1, 90, 70, 'Single-day gym access', false),
  ('weekly', 'Weekly Pass', 'standard', 7, 270, null, 'Seven days of gym access', true),
  ('biweekly', 'Two Weeks Pass', 'standard', 14, 540, null, 'Fourteen days of gym access', true),
  ('monthly', 'Monthly Regular', 'standard', 30, 990, 750, 'Thirty days of gym access', true)
on conflict (code) do update set
  name = excluded.name, duration_days = excluded.duration_days,
  price = excluded.price, student_price = excluded.student_price,
  description = excluded.description, account_eligible = excluded.account_eligible,
  updated_at = now();

insert into public.coaches (display_name, notes)
values
  ('Coach Mark', 'External coach contact; communicate through the provided external platform'),
  ('Analyn', 'External coach contact; communicate through the provided external platform')
on conflict do nothing;
