import { supabaseAdmin } from '../config/supabase.js';
import { sendEmail } from './mailer.js';
import { dayStart, nextDayStart } from '../utils/time.js';

const MAX_ATTEMPTS = Number(process.env.EMAIL_MAX_ATTEMPTS || 5);
const RETRY_BASE_MINUTES = Number(process.env.EMAIL_RETRY_BASE_MINUTES || 5);
const TRANSACTIONAL_TYPES = new Set(['password_otp', 'receipt', 'expiry_reminder', 'expiry_notice', 'information_overview']);
const isTransactional = (emailType) => TRANSACTIONAL_TYPES.has(emailType);
const tomorrow = () => nextDayStart();
const limits = () => ({
  primary: Number(process.env.EMAIL_DAILY_LIMIT_PRIMARY || 280),
  backup: Number(process.env.EMAIL_DAILY_LIMIT_BACKUP || 180),
  reserve: Number(process.env.EMAIL_TRANSACTIONAL_RESERVE || 100),
});

const retryAt = (attempts) => new Date(Date.now() + RETRY_BASE_MINUTES * 60_000 * (2 ** Math.max(0, attempts - 1))).toISOString();

export const enqueueEmail = async ({ emailType, recipient, payload, dedupeKey = null }) => {
  if (!recipient) return null;
  if (dedupeKey) {
    const existing = await supabaseAdmin.from('email_log').select('id, status').eq('email_type', emailType).eq('recipient', recipient).contains('payload', { dedupe_key: dedupeKey }).in('status', ['queued', 'sent']).limit(1);
    if (existing.error) throw existing.error;
    if (existing.data?.length) return existing.data[0];
  }

  const now = new Date().toISOString();
  const { data: log, error: logError } = await supabaseAdmin.from('email_log').insert({
    email_type: emailType,
    recipient,
    status: 'queued',
    payload: { ...payload, dedupe_key: dedupeKey },
    priority: isTransactional(emailType) ? 0 : 10,
    next_attempt_at: now,
  }).select().single();
  if (logError) throw logError;

  const { error: queueError } = await supabaseAdmin.from('email_queue').insert({
    email_log_id: log.id,
    next_attempt_at: now,
    priority: isTransactional(emailType) ? 0 : 10,
  });
  if (queueError) {
    await supabaseAdmin.from('email_log').update({ status: 'failed', error: queueError.message }).eq('id', log.id);
    throw queueError;
  }
  return log;
};

const getReady = async () => {
  const { data, error } = await supabaseAdmin.from('email_queue')
    .select('id, email_log_id, attempts, next_attempt_at, email_log(*)')
    .is('completed_at', null)
    .lte('next_attempt_at', new Date().toISOString())
    .is('locked_at', null)
    .order('priority')
    .order('next_attempt_at')
    .limit(10);
  if (error) throw error;
  return data || [];
};

const sentCount = async (provider, since, until) => {
  const result = await supabaseAdmin.from('email_log').select('id', { count: 'exact', head: true })
    .eq('status', 'sent').eq('provider', provider).gte('sent_at', since).lt('sent_at', until);
  if (result.error) throw result.error;
  return result.count || 0;
};

const bulkMinuteCount = async () => {
  const since = new Date(Date.now() - 60_000).toISOString();
  const result = await supabaseAdmin.from('email_log').select('id', { count: 'exact', head: true })
    .eq('status', 'sent').in('email_type', ['announcement', 'promo']).gte('sent_at', since);
  if (result.error) throw result.error;
  return result.count || 0;
};

const capacity = async (emailType) => {
  const now = new Date();
  const start = dayStart(now);
  const end = nextDayStart(now);
  const current = { primary: await sentCount('primary', start, end), backup: await sentCount('backup', start, end) };
  const config = limits();
  const transactional = isTransactional(emailType);
  const bulkLimit = Number(process.env.EMAIL_BULK_PER_MINUTE || 20);
  if (!transactional && await bulkMinuteCount() >= bulkLimit) return { providers: [], retryAt: new Date(Date.now() + 60_000).toISOString() };
  const providers = ['primary', 'backup'].filter((provider) => current[provider] < (transactional ? config[provider] : Math.max(0, config[provider] - config.reserve)));
  return { providers, retryAt: tomorrow() };
};

const markFailure = async (job, errorMessage) => {
  const attempts = Number(job.attempts || 0) + 1;
  const exhausted = attempts >= MAX_ATTEMPTS;
  const next = exhausted ? null : retryAt(attempts);
  await supabaseAdmin.from('email_queue').update({
    attempts,
    last_error: errorMessage,
    next_attempt_at: next || new Date().toISOString(),
    locked_at: null,
    completed_at: exhausted ? new Date().toISOString() : null,
  }).eq('id', job.id);
  await supabaseAdmin.from('email_log').update({
    attempts,
    next_attempt_at: next,
    status: exhausted ? 'failed' : 'queued',
    error: errorMessage,
  }).eq('id', job.email_log_id);
};

export const processEmailQueue = async () => {
  const jobs = await getReady();
  for (const job of jobs) {
    const lock = await supabaseAdmin.from('email_queue').update({ locked_at: new Date().toISOString() }).eq('id', job.id).is('locked_at', null).select('id').maybeSingle();
    if (lock.error || !lock.data) continue;
    try {
      const available = await capacity(job.email_log.email_type);
      if (!available.providers.length) {
        await supabaseAdmin.from('email_queue').update({ next_attempt_at: available.retryAt, locked_at: null }).eq('id', job.id);
        continue;
      }
      const result = await sendEmail({
        recipient: job.email_log.recipient,
        emailType: job.email_log.email_type,
        payload: job.email_log.payload || {},
        providers: available.providers,
      });
      await supabaseAdmin.from('email_queue').update({ completed_at: new Date().toISOString(), locked_at: null }).eq('id', job.id);
      await supabaseAdmin.from('email_log').update({ status: 'sent', provider: result.provider, provider_message_id: result.messageId, sent_at: new Date().toISOString(), next_attempt_at: null }).eq('id', job.email_log_id);
    } catch (error) {
      await markFailure(job, error.message);
      console.error(`Email delivery failed for ${job.email_log.recipient}: ${error.message}`);
    }
  }
};
