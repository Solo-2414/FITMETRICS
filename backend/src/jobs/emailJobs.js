import cron from 'node-cron';
import { supabaseAdmin } from '../config/supabase.js';
import { enqueueEmail, processEmailQueue } from '../services/emailQueue.js';
import { notifyStaff } from '../services/notify.js';
import { dayStart, today } from '../utils/time.js';
import { publishDueAnnouncements } from '../services/announcements.js';
import { expireRegistrationIntents } from '../services/registration.js';
import { expirePendingQrPayments } from '../services/membership.js';

const expiryDate = (days) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + Number(days));
  return date.toISOString().slice(0, 10);
};

const queueExpiryReminders = async () => {
  const settings = await supabaseAdmin.from('gym_settings').select('expiry_reminder_days').eq('id', true).maybeSingle();
  if (settings.error) throw settings.error;
  const days = Number(settings.data?.expiry_reminder_days || 3);
  const target = expiryDate(days);
  const memberships = await supabaseAdmin.from('memberships')
    .select('id, end_date, member_id, membership_plans(name), profiles(full_name, email)')
    .eq('status', 'active')
    .eq('end_date', target);
  if (memberships.error) throw memberships.error;
  for (const membership of memberships.data || []) {
    const profile = membership.profiles;
    if (!profile?.email) continue;
    await enqueueEmail({
      emailType: 'expiry_reminder',
      recipient: profile.email,
      dedupeKey: `${membership.id}:${target}`,
      payload: {
        memberName: profile.full_name,
        planName: membership.membership_plans?.name,
        expiryDate: membership.end_date,
      },
    });
    await notifyStaff({ type: 'membership_expiry', title: 'Membership expiring soon', message: `${profile.full_name || 'A member'} expires on ${membership.end_date}.`, meta: { member_id: membership.member_id } });
  }
};

export const runDailyEmailJobs = async () => {
  const cutoff = dayStart();
  const { data: staleAttendance, error: attendanceError } = await supabaseAdmin.from('attendance')
    .update({ check_out_at: cutoff, status: 'completed', checked_out_via: 'system' })
    .eq('status', 'open')
    .is('check_out_at', null)
    .lt('check_in_at', cutoff)
    .select('id');
  if (attendanceError) throw attendanceError;
  if (staleAttendance?.length) {
    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({
      actor_id: null,
      action: 'attendance_auto_checkout',
      entity_type: 'attendance',
      details: { count: staleAttendance.length, checked_out_at: cutoff, reason: 'previous_day_open_checkin' },
    });
    if (auditError) throw auditError;
  }
  const { error } = await supabaseAdmin.rpc('expire_memberships');
  if (error) throw error;
  const { error: walkInError } = await supabaseAdmin.from('walk_in_visits')
    .update({ status: 'completed' }).eq('status', 'active').lt('valid_until', new Date().toISOString());
  if (walkInError) throw walkInError;
  const { error: attemptsError } = await supabaseAdmin.from('checkin_attempts')
    .delete().lt('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
  if (attemptsError) throw attemptsError;
  const { error: codesError } = await supabaseAdmin.from('member_check_in_codes')
    .delete().lt('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
  if (codesError) throw codesError;
  await queueExpiryReminders();
};

export const startEmailJobs = () => {
  cron.schedule('*/1 * * * *', () => processEmailQueue().catch((error) => console.error(`Email queue worker failed: ${error.message}`)));
  cron.schedule('* * * * *', () => publishDueAnnouncements().catch((error) => console.error(`Announcement scheduler failed: ${error.message}`)));
  cron.schedule('* * * * *', () => expireRegistrationIntents().catch((error) => console.error(`Registration intent expiry failed: ${error.message}`)));
  cron.schedule('* * * * *', () => expirePendingQrPayments().catch((error) => console.error(`QR payment expiry failed: ${error.message}`)));
  cron.schedule('5 0 * * *', () => runDailyEmailJobs().catch((error) => console.error(`Daily membership job failed: ${error.message}`)), { timezone: process.env.CRON_TIMEZONE || 'Asia/Manila' });
};
