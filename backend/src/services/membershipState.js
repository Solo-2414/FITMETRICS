import { supabaseAdmin } from '../config/supabase.js';
import { today } from '../utils/time.js';

const stateFor = (rows, date) => {
  const active = (rows || []).filter((row) => row.status === 'active');
  const current = active
    .filter((row) => row.start_date <= date && row.end_date >= date)
    .sort((a, b) => b.end_date.localeCompare(a.end_date))[0] || null;
  const queued = active
    .filter((row) => row.start_date > date)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  const lastExpired = active
    .filter((row) => row.end_date < date)
    .sort((a, b) => b.end_date.localeCompare(a.end_date))[0] || null;
  return { current, queued, last_expired: lastExpired };
};

export const getMembershipState = async (memberIdOrIds) => {
  const ids = Array.isArray(memberIdOrIds) ? memberIdOrIds : [memberIdOrIds];
  const validIds = ids.filter(Boolean);
  if (!validIds.length) return Array.isArray(memberIdOrIds) ? new Map() : { current: null, queued: [], last_expired: null };
  const { data, error } = await supabaseAdmin
    .from('memberships')
    .select('*, membership_plans(*), coaches(*)')
    .in('member_id', validIds)
    .order('start_date', { ascending: true });
  if (error) throw error;
  const grouped = new Map(validIds.map((id) => [id, []]));
  for (const row of data || []) grouped.get(row.member_id)?.push(row);
  if (Array.isArray(memberIdOrIds)) {
    return new Map(validIds.map((id) => [id, stateFor(grouped.get(id), today())]));
  }
  return stateFor(grouped.get(validIds[0]), today());
};

export { stateFor };
