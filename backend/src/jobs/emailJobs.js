import cron from 'node-cron';
import { supabaseAdmin } from '../config/supabase.js';
import { enqueueEmail, processEmailQueue } from '../services/emailQueue.js';
import { notifyStaff } from '../services/notify.js';
import { today } from '../utils/time.js';
import { publishDueAnnouncements } from '../services/announcements.js';

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
  const { error } = await supabaseAdmin.rpc('expire_memberships');
  if (error) throw error;
  await queueExpiryReminders();
};

export const startEmailJobs = () => {
  cron.schedule('*/1 * * * *', () => processEmailQueue().catch((error) => console.error(`Email queue worker failed: ${error.message}`)));
  cron.schedule('* * * * *', () => publishDueAnnouncements().catch((error) => console.error(`Announcement scheduler failed: ${error.message}`)));
  cron.schedule('5 0 * * *', () => runDailyEmailJobs().catch((error) => console.error(`Daily membership job failed: ${error.message}`)), { timezone: process.env.CRON_TIMEZONE || 'Asia/Manila' });
};
