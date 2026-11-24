import { supabaseAdmin } from '../../config/supabase.js';
import { manilaDateString } from '../../lib/time.js';
import { AI_RATE_LIMITED } from './errors.js';

export const createQuotaService = ({ rpc, date = manilaDateString }) => ({
  async consume({ userId, role, dailyLimit, minuteLimit = 0 }) {
    const usageDay = date();
    const { data, error } = await rpc('consume_ai_usage', {
      p_user_id: userId,
      p_role: role,
      p_usage_day: usageDay,
      p_daily_limit: dailyLimit,
      p_minute_limit: minuteLimit,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('AI quota service returned no usage record.');
    if (!row.allowed) throw AI_RATE_LIMITED(row.retry_after_seconds || 60);
    return { usageDay, requestCount: row.request_count };
  },
  async addTokens({ userId, role, usageDay, tokens }) {
    if (!Number.isSafeInteger(tokens) || tokens < 0) throw new Error('AI token count is invalid.');
    const { error } = await rpc('add_ai_usage_tokens', {
      p_user_id: userId,
      p_role: role,
      p_usage_day: usageDay,
      p_tokens: tokens,
    });
    if (error) throw error;
  },
});

export const aiQuota = createQuotaService({ rpc: (...args) => supabaseAdmin.rpc(...args) });
