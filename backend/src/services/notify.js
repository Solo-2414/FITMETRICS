import { supabaseAdmin } from '../config/supabase.js';

export const notifyUser = async (userId, { type, title, message, meta = {} }) => {
  if (!userId) return null;
  const { data, error } = await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message,
    related_member_id: meta.member_id || null,
  }).select().single();
  if (error) throw error;
  return data;
};

export const notifyStaff = async ({ type, title, message, meta = {} }) => {
  const { data: staff, error } = await supabaseAdmin.from('profiles')
    .select('id').in('role', ['admin', 'clerk']).eq('status', 'active');
  if (error) throw error;
  if (!staff?.length) return [];
  const rows = staff.map(({ id }) => ({
    user_id: id,
    type,
    title,
    message,
    related_member_id: meta.member_id || null,
  }));
  const result = await supabaseAdmin.from('notifications').insert(rows).select();
  if (result.error) throw result.error;
  return result.data || [];
};
