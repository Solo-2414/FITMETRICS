-- Keep the existing payment configuration while enabling the QR Ph flow once.
update public.gym_settings
set payment_modes = payment_modes || '["qrph"]'::jsonb
where id = true
  and not (payment_modes @> '["qrph"]'::jsonb);
