import { supabaseAdmin } from '../../config/supabase.js';
import { manilaDateString } from '../../lib/time.js';
import { AI_RATE_LIMITED } from './errors.js';

export const createQuotaService = ({ rpc, readUsage, date = manilaDateString }) => ({
  async get({ userId, role, dailyLimit }) {
    if (typeof readUsage !== 'function') throw new Error('AI quota read service is not configured.');
    const usageDay = date();
    const { data, error } = await readUsage({ userId, role, usageDay });
    if (error) throw error;
    const requestCount = Number(data?.request_count || 0);
    return {
      usageDay,
      requestCount,
      dailyLimit,
      remainingQuota: Math.max(0, dailyLimit - requestCount),
    };
  },
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
    if (!row.allowed) throw AI_RATE_LIMITED(row.retry_after_seconds || 60, row.request_count);
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

export const aiQuota = createQuotaService({
  rpc: (...args) => supabaseAdmin.rpc(...args),
  readUsage: ({ userId, role, usageDay }) => supabaseAdmin.from('ai_usage')
    .select('request_count')
    .eq('user_id', userId)
    .eq('role', role)
    .eq('usage_day', usageDay)
    .maybeSingle(),
});
