alter table public.gym_settings
  add column if not exists churn_reminder_message text
    not null default 'We miss you at Analyn''s Gym! Come get your workout in today.'
    check (char_length(churn_reminder_message) between 1 and 500);
