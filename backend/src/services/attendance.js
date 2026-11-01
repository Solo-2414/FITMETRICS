import { supabaseAdmin } from '../config/supabase.js';
import { today } from '../utils/time.js';
import { notifyStaff } from './notify.js';

export const checkInMember = async ({ memberId, method, recordedBy = null }) => {
  const { data: membership, error: membershipError } = await supabaseAdmin.from('memberships')
    .select('id, end_date, status, membership_plans(name)')
    .eq('member_id', memberId)
    .eq('status', 'active')
    .lte('start_date', today())
    .gte('end_date', today())
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership) {
    const error = new Error('This member does not have a current active membership.');
    error.statusCode = 400;
    throw error;
  }
  const { data: openCheckIn, error: openError } = await supabaseAdmin.from('attendance')
    .select('id').eq('member_id', memberId).is('check_out_at', null).eq('status', 'open').limit(1).maybeSingle();
  if (openError) throw openError;
  if (openCheckIn) {
    const error = new Error('This member already has an open check-in.');
    error.statusCode = 409;
    throw error;
  }
  const { data, error } = await supabaseAdmin.from('attendance').insert({
    member_id: memberId, membership_id: membership.id, method, recorded_by: recordedBy,
  }).select().single();
  if (error) throw error;
  await notifyStaff({
    type: 'system',
    title: 'Member checked in',
    message: `A member checked in using ${method === 'qr' ? 'the gym QR code' : 'the front desk'}.`,
    meta: { member_id: memberId },
  });
  return { ...data, plan_name: membership.membership_plans?.name || 'Current plan', membership };
};
