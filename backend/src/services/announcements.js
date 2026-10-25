import { supabaseAdmin } from '../config/supabase.js';
import { enqueueEmail } from './emailQueue.js';
import { getGymSettings } from './maintenance.js';

const CHUNK_SIZE = 500;
const rolesFor = (audience) => audience === 'all' ? ['admin', 'clerk', 'member'] : [audience];

const activeRecipients = async (audience) => {
  const { data, error } = await supabaseAdmin.from('profiles')
    .select('id, email, full_name, role')
    .eq('status', 'active')
    .in('role', rolesFor(audience));
  if (error) throw error;
  return data || [];
};

const insertChunks = async (rows) => {
  for (let index = 0; index < rows.length; index += CHUNK_SIZE) {
    const { error } = await supabaseAdmin.from('notifications').insert(rows.slice(index, index + CHUNK_SIZE));
    if (error) throw error;
  }
};

export const fanoutAnnouncement = async (announcement) => {
  if (!announcement || announcement.status !== 'published') return { notificationTotal: 0, emailTotal: 0, warning: null };
  if (announcement.fanout_done_at) return { notificationTotal: 0, emailTotal: announcement.email_total || 0, alreadyDone: true };

  const recipients = await activeRecipients(announcement.audience);
  const existing = await supabaseAdmin.from('notifications').select('user_id').eq('announcement_id', announcement.id);
  if (existing.error) throw existing.error;
  const existingIds = new Set((existing.data || []).map((row) => row.user_id));
  const notificationRows = recipients.filter((recipient) => !existingIds.has(recipient.id)).map((recipient) => ({
    user_id: recipient.id,
    type: 'announcement',
    title: announcement.title,
    message: announcement.body,
    announcement_id: announcement.id,
  }));
  await insertChunks(notificationRows);

  const settings = await getGymSettings();
  const emailEnabled = announcement.send_email && settings.notifications?.email !== false;
  let emailTotal = 0;
  let warning = null;
  if (emailEnabled) {
    const emailRecipients = recipients.filter((recipient) => recipient.email);
    const smtpConfigured = Boolean(process.env.MAIL_FROM && (
      (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS)
      || (process.env.SMTP2_HOST && process.env.SMTP2_PORT && process.env.SMTP2_USER && process.env.SMTP2_PASS)
    ));
    if (!smtpConfigured) {
      warning = 'Announcement published in-app, but email was not queued because SMTP is not configured.';
    } else {
      for (const recipient of emailRecipients) {
        await enqueueEmail({
          emailType: 'announcement',
          recipient: recipient.email,
          priority: 8,
          dedupeKey: `announcement:${announcement.id}`,
          payload: {
            announcement_id: announcement.id,
            title: announcement.title,
            body: announcement.body,
            memberName: recipient.full_name,
            gymName: settings.gym_name || 'FITMETRICS',
            replyTo: settings.email || null,
          },
        });
      }
      emailTotal = emailRecipients.length;
    }
  }

  const { error } = await supabaseAdmin.from('announcements').update({
    fanout_done_at: new Date().toISOString(),
    email_total: emailTotal,
  }).eq('id', announcement.id).is('fanout_done_at', null);
  if (error) throw error;
  return { notificationTotal: notificationRows.length, emailTotal, warning };
};

export const publishDueAnnouncements = async () => {
  const now = new Date().toISOString();
  const due = await supabaseAdmin.from('announcements').select('*')
    .eq('status', 'scheduled').lte('publish_at', now).limit(100);
  if (due.error) throw due.error;
  for (const announcement of due.data || []) {
    const updated = await supabaseAdmin.from('announcements').update({ status: 'published' })
      .eq('id', announcement.id).eq('status', 'scheduled').select().maybeSingle();
    if (updated.error) throw updated.error;
    if (updated.data) {
      await fanoutAnnouncement(updated.data);
      const audit = await supabaseAdmin.from('audit_log').insert({ action: 'announcement_published', entity_type: 'announcement', entity_id: updated.data.id, details: { scheduled: true } });
      if (audit.error) throw audit.error;
    }
  }
  const expired = await supabaseAdmin.from('announcements').update({ status: 'expired' })
    .eq('status', 'published').lt('expires_at', now).not('expires_at', 'is', null).select('id');
  if (expired.error) throw expired.error;
  for (const announcement of expired.data || []) {
    const audit = await supabaseAdmin.from('audit_log').insert({ action: 'announcement_archived', entity_type: 'announcement', entity_id: announcement.id, details: { expired: true } });
    if (audit.error) throw audit.error;
  }
};
