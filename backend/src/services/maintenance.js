import { supabaseAdmin } from '../config/supabase.js';

let cachedSettings = null;
let cachedAt = 0;

export const clearSettingsCache = () => {
  cachedSettings = null;
  cachedAt = 0;
};

export const getGymSettings = async () => {
  if (cachedSettings && Date.now() - cachedAt < 30_000) return cachedSettings;
  const { data, error } = await supabaseAdmin.from('gym_settings').select('*').eq('id', true).maybeSingle();
  if (error) throw error;
  cachedSettings = data || {};
  cachedAt = Date.now();
  return cachedSettings;
};

export const maintenanceStatus = (settings, now = Date.now()) => {
  const scheduled = settings?.maintenance_starts_at && new Date(settings.maintenance_starts_at).getTime() <= now;
  return {
    maintenance: Boolean(settings?.maintenance_enabled || scheduled),
    message: settings?.maintenance_message || 'The member portal is temporarily unavailable for maintenance.',
    startsAt: settings?.maintenance_starts_at || null,
    gymName: settings?.gym_name || 'FITMETRICS',
  };
};

export const rejectDuringMaintenance = async (req, res, next) => {
  try {
    const status = maintenanceStatus(await getGymSettings());
    if (status.maintenance) return res.status(503).json(status);
    next();
  } catch (error) {
    next(error);
  }
};
