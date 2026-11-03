import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { checkInMember } from '../services/attendance.js';
import { getMembershipState } from '../services/membershipState.js';
import { getGymSettings, maintenanceStatus } from '../services/maintenance.js';
import { notifyStaff } from '../services/notify.js';
import { dayStart, nextDayStart, today } from '../utils/time.js';
import { sendEmail } from '../services/mailer.js';

const router = Router();
const publicLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait and try again.' },
});
const secret = () => process.env.CHECKIN_CONFIRM_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
const hash = (value) => crypto.createHash('sha256').update(`${process.env.CHECKIN_CONFIRM_SECRET || 'fitmetrics'}:${value}`).digest('hex');
const deviceHash = (secretValue) => hash(`device:${secretValue}`);
const codeHash = (code) => crypto.createHmac('sha256', secret()).update(String(code)).digest('hex');
const safeEqual = (left, right) => {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const sign = (payload) => {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
};
const verify = (token) => {
  try {
    const [encoded, signature] = String(token || '').split('.');
    const expected = crypto.createHmac('sha256', secret()).update(encoded).digest('base64url');
    if (!encoded || !safeEqual(signature, expected)) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
};
const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (/^63?9\d{9}$/.test(digits)) return `0${digits.slice(digits.startsWith('63') ? 2 : 0)}`;
  if (/^09\d{9}$/.test(digits)) return digits;
  return null;
};
const displayName = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0]} ${parts.at(-1)[0]}.` : parts[0] || 'Member';
};
const requestIp = (req) => req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '';
const qrForToken = async (token) => {
  const { data, error } = await supabaseAdmin.from('checkin_qr_codes').select('*').eq('token_hash', hash(token)).maybeSingle();
  if (error) throw error;
  return data;
};
const qrState = (qr) => {
  if (!qr) return 'invalid';
  if (qr.revoked_at) return 'revoked';
  if (qr.expires_at && new Date(qr.expires_at).getTime() <= Date.now()) return 'expired';
  return 'valid';
};
const recordAttempt = async ({ qrId, phoneHash, ipHash, outcome, confirmTokenHash = null }) => {
  const { error } = await supabaseAdmin.from('checkin_attempts').insert({
    qr_id: qrId, phone_hash: phoneHash, ip_hash: ipHash, outcome, confirm_token_hash: confirmTokenHash,
  });
  if (error) throw error;
};
const tooMany = async ({ column, value, qrId }) => {
  const query = supabaseAdmin.from('checkin_attempts').select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());
  const scoped = column === 'qr_id' ? query.eq(column, qrId) : query.eq(column, value);
  const result = await scoped;
  if (result.error) throw result.error;
  return (result.count || 0) >= (column === 'qr_id' ? 30 : 5);
};
const publicError = (res, status, error) => res.status(status).json({ error });
const deviceLabel = (userAgent) => {
  const value = String(userAgent || '');
  const browser = value.includes('Edg/') ? 'Edge' : value.includes('Chrome/') ? 'Chrome' : value.includes('Firefox/') ? 'Firefox' : value.includes('Safari/') ? 'Safari' : 'Browser';
  const os = value.includes('Android') ? 'Android' : value.includes('iPhone') || value.includes('iPad') ? 'iOS' : value.includes('Windows') ? 'Windows' : value.includes('Mac OS') ? 'macOS' : 'Device';
  return `${browser} on ${os}`;
};
const findTrustedDevice = async (memberId, deviceId, deviceSecret) => {
  if (!deviceId || !deviceSecret) return null;
  const { data, error } = await supabaseAdmin.from('member_check_in_devices')
    .select('id').eq('member_id', memberId).eq('device_hash', deviceHash(`${deviceId}:${deviceSecret}`))
    .is('revoked_at', null).gt('expires_at', new Date().toISOString()).maybeSingle();
  if (error) throw error;
  if (data) await supabaseAdmin.from('member_check_in_devices').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);
  return data;
};
const issueDevice = async (memberId, deviceId, userAgent) => {
  const deviceSecret = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 90 * 86400000).toISOString();
  const { error } = await supabaseAdmin.from('member_check_in_devices').insert({
    member_id: memberId, device_hash: deviceHash(`${deviceId}:${deviceSecret}`), label: deviceLabel(userAgent), expires_at: expiresAt,
  });
  if (error) throw error;
  const { data: active, error: activeError } = await supabaseAdmin.from('member_check_in_devices')
    .select('id').eq('member_id', memberId).is('revoked_at', null).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: true });
  if (activeError) throw activeError;
  if ((active || []).length > 3) {
    const revokeIds = active.slice(0, active.length - 3).map((row) => row.id);
    await supabaseAdmin.from('member_check_in_devices').update({ revoked_at: new Date().toISOString() }).in('id', revokeIds);
  }
  return { deviceSecret, expiresAt };
};

router.use('/public/checkin', publicLimiter);

router.get('/public/checkin/station', async (req, res, next) => {
  try {
    const qr = await qrForToken(req.query.t);
    const state = qrState(qr);
    if (state !== 'valid') return res.json({ valid: false, reason: state });
    const settings = await getGymSettings();
    return res.json({ valid: true, gym_name: settings.gym_name || 'FITMETRICS', phone_checkin_enabled: settings.checkin_phone_enabled !== false });
  } catch (error) { return next(error); }
});

router.post('/public/checkin/lookup', async (req, res, next) => {
  try {
    const token = String(req.body?.t || '');
    const phone = normalizePhone(req.body?.phone);
    const deviceId = String(req.body?.device_id || '').slice(0, 100);
    const qr = await qrForToken(token);
    const state = qrState(qr);
    if (state !== 'valid') return publicError(res, 400, 'This QR code is no longer valid. Ask the front desk for the current code.');
    const settings = await getGymSettings();
    const maintenance = maintenanceStatus(settings);
    if (maintenance.maintenance) return res.status(503).json({ error: maintenance.message, maintenance: true });
    if (settings.checkin_phone_enabled === false) return publicError(res, 503, 'Phone check-in is temporarily unavailable. Please see the front desk.');
    if (!phone) return publicError(res, 422, 'Enter a valid Philippine mobile number.');
    const phoneHash = hash(phone);
    const ipHash = hash(requestIp(req));
    if (await tooMany({ column: 'phone_hash', value: phoneHash }) || await tooMany({ column: 'ip_hash', value: ipHash }) || await tooMany({ column: 'qr_id', qrId: qr.id })) {
      res.set('Retry-After', '600');
      await recordAttempt({ qrId: qr.id, phoneHash, ipHash, outcome: 'rate_limited' });
      return publicError(res, 429, 'Too many attempts. Please wait 10 minutes and try again.');
    }
    const { data: profiles, error: profileError } = await supabaseAdmin.from('profiles')
      .select('id, full_name, status, email, phone_normalized').eq('role', 'member').eq('phone_normalized', phone);
    if (profileError) return next(profileError);
    await recordAttempt({ qrId: qr.id, phoneHash, ipHash, outcome: 'lookup' });
    if (!profiles?.length || profiles.length !== 1) return res.json({ status: 'not_found', message: "We couldn't find an active membership for this number. Please see the front desk." });
    const member = profiles[0];
    const membership = await getMembershipState(member.id);
    const current = membership.current;
    let status = 'not_found';
    let message = "We couldn't find an active membership for this number. Please see the front desk.";
    if (member.status === 'suspended') { status = 'suspended'; message = 'Please see the front desk.'; }
    else if (current) status = 'ready';
    else if (membership.queued[0]) { status = 'not_started'; message = `Your plan starts ${membership.queued[0].start_date}. Please see the front desk.`; }
    else if (membership.last_expired) { status = 'expired'; message = `Your membership ended ${membership.last_expired.end_date}. Please renew at the front desk.`; }
    const { data: open, error: openError } = await supabaseAdmin.from('attendance').select('id, check_in_at')
      .eq('member_id', member.id).eq('status', 'open').is('check_out_at', null).maybeSingle();
    if (openError) return next(openError);
    if (current && open) status = 'already_in';
    if (status !== 'ready' && status !== 'already_in') return res.json({ status, message });
    if (settings.checkin_security_mode !== 'phone_only' && !member.email) {
      return res.json({ status: 'needs_clerk', message: 'Please see the front desk to check in.' });
    }
    const trusted = settings.checkin_security_mode !== 'phone_only'
      ? await findTrustedDevice(member.id, deviceId, req.body?.device_secret)
      : true;
    const payload = { member_id: member.id, qr_id: qr.id, action: open ? 'check_out' : 'check_in', exp: Date.now() + 120000, nonce: crypto.randomBytes(12).toString('hex') };
    const confirmToken = sign(payload);
    await recordAttempt({ qrId: qr.id, phoneHash, ipHash, outcome: 'confirm_issued', confirmTokenHash: hash(confirmToken) });
    await supabaseAdmin.from('checkin_qr_codes').update({ last_used_at: new Date().toISOString(), scan_count: (qr.scan_count || 0) + 1 }).eq('id', qr.id);
    return res.json({
      status, display_name: displayName(member.full_name), plan_name: current?.membership_plans?.name || 'Current plan',
      valid_until: current?.end_date || null, check_in_at: open?.check_in_at || null, confirm_token: confirmToken, action: payload.action,
      ...(trusted ? {} : { needs_verification: true, masked_email: member.email ? `${member.email[0]}***@${member.email.split('@').at(-1)}` : null }),
    });
  } catch (error) { return next(error); }
});

router.post('/public/checkin/send-code', async (req, res, next) => {
  try {
    const token = String(req.body?.t || '');
    const phone = normalizePhone(req.body?.phone);
    const lookupPayload = verify(req.body?.confirm_token);
    const qr = await qrForToken(token);
    if (qrState(qr) !== 'valid' || !phone || !lookupPayload || lookupPayload.qr_id !== qr.id) return publicError(res, 400, 'This verification request is no longer valid.');
    const ipHash = hash(requestIp(req));
    const phoneHash = hash(phone);
    const since = new Date(Date.now() - 3600000).toISOString();
    const memberResult = await supabaseAdmin.from('profiles').select('id, email').eq('id', lookupPayload.member_id).eq('role', 'member').eq('phone_normalized', phone).maybeSingle();
    if (memberResult.error) return next(memberResult.error);
    const [memberLimit, ipLimit] = await Promise.all([
      supabaseAdmin.from('member_check_in_codes').select('id', { count: 'exact', head: true }).eq('member_id', memberResult.data?.id || '').gte('created_at', since),
      supabaseAdmin.from('checkin_attempts').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).eq('outcome', 'code_sent').gte('created_at', since),
    ]);
    if (memberLimit.error) return next(memberLimit.error);
    if (ipLimit.error) return next(ipLimit.error);
    if (!memberResult.data?.email) return res.json({ status: 'needs_clerk', message: 'Please see the front desk to check in.' });
    if ((memberLimit.count || 0) >= 3 || (ipLimit.count || 0) >= 5) { res.set('Retry-After', '3600'); return publicError(res, 429, 'Too many codes requested. Please try again later.'); }
    const daily = await supabaseAdmin.from('email_log').select('id', { count: 'exact', head: true }).eq('email_type', 'checkin_code').gte('created_at', dayStart()).lt('created_at', nextDayStart());
    if (daily.error) return next(daily.error);
    if ((daily.count || 0) >= Number(process.env.EMAIL_DAILY_LIMIT || 400)) return publicError(res, 503, 'Email verification is temporarily unavailable. Please see the front desk.');
    const code = String(crypto.randomInt(100000, 1000000));
    const member = memberResult.data[0];
    const { error: insertError } = await supabaseAdmin.from('member_check_in_codes').insert({ member_id: member.id, code_hash: codeHash(code), expires_at: new Date(Date.now() + 600000).toISOString() });
    if (insertError) return next(insertError);
    const email = await sendEmail({ recipient: member.email, emailType: 'checkin_code', payload: { code }, providers: ['primary', 'backup'] });
    await supabaseAdmin.from('email_log').insert({ email_type: 'checkin_code', recipient: member.email, status: 'sent', provider: email.provider, provider_message_id: email.messageId, sent_at: new Date().toISOString(), payload: {} });
    await recordAttempt({ qrId: qr.id, phoneHash, ipHash, outcome: 'code_sent' });
    return res.json({ status: 'sent' });
  } catch (error) { return next(error); }
});

router.post('/public/checkin/verify-code', async (req, res, next) => {
  try {
    const token = String(req.body?.t || '');
    const phone = normalizePhone(req.body?.phone);
    const code = String(req.body?.code || '');
    const deviceId = String(req.body?.device_id || '').slice(0, 100);
    const lookupPayload = verify(req.body?.confirm_token);
    const qr = await qrForToken(token);
    if (qrState(qr) !== 'valid' || !phone || !lookupPayload || lookupPayload.qr_id !== qr.id || !/^\d{6}$/.test(code) || !deviceId) return publicError(res, 400, 'That code is invalid or expired.');
    const { data: member, error: memberError } = await supabaseAdmin.from('profiles').select('id').eq('id', lookupPayload.member_id).eq('role', 'member').eq('phone_normalized', phone).maybeSingle();
    if (memberError) return next(memberError);
    if (!member) return publicError(res, 400, 'That code is invalid or expired.');
    const { data: record, error: codeError } = await supabaseAdmin.from('member_check_in_codes').select('*').eq('member_id', member.id).is('used_at', null).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (codeError) return next(codeError);
    if (!record || record.attempts >= 5) return publicError(res, 400, 'That code is invalid or expired.');
    if (!safeEqual(record.code_hash, codeHash(code))) {
      await supabaseAdmin.from('member_check_in_codes').update({ attempts: record.attempts + 1, used_at: record.attempts + 1 >= 5 ? new Date().toISOString() : null }).eq('id', record.id);
      return publicError(res, 400, 'That code is invalid or expired.');
    }
    await supabaseAdmin.from('member_check_in_codes').update({ used_at: new Date().toISOString() }).eq('id', record.id);
    const issued = await issueDevice(member.id, deviceId, req.get('user-agent'));
    const confirmToken = sign({ member_id: member.id, qr_id: qr.id, action: 'check_in', exp: Date.now() + 120000, nonce: crypto.randomBytes(12).toString('hex') });
    return res.json({ status: 'verified', confirm_token: confirmToken, device_secret: issued.deviceSecret });
  } catch (error) { return next(error); }
});

router.post('/public/checkin/confirm', async (req, res, next) => {
  try {
    const payload = verify(req.body?.confirm_token);
    const deviceId = String(req.body?.device_id || '').slice(0, 100);
    if (!payload || !payload.member_id || !payload.qr_id || !deviceId) return publicError(res, 400, 'This confirmation has expired. Start again with the current QR code.');
    const ipHash = hash(requestIp(req));
    const tokenHash = hash(req.body.confirm_token);
    const used = await supabaseAdmin.from('checkin_attempts').select('id').eq('confirm_token_hash', tokenHash).eq('outcome', 'confirmed').maybeSingle();
    if (used.error) return next(used.error);
    if (used.data) return res.json({ status: 'already_confirmed' });
    const qr = await supabaseAdmin.from('checkin_qr_codes').select('*').eq('id', payload.qr_id).maybeSingle();
    if (qr.error) return next(qr.error);
    if (qrState(qr.data) !== 'valid') return publicError(res, 400, 'This QR code is no longer valid. Ask the front desk for the current code.');
    const { data: open, error: openError } = await supabaseAdmin.from('attendance').select('id, check_in_at')
      .eq('member_id', payload.member_id).eq('status', 'open').is('check_out_at', null).maybeSingle();
    if (openError) return next(openError);
    if (payload.action === 'check_out' || open) {
      if (!open) return res.json({ status: 'already_checked_out' });
      const { data, error } = await supabaseAdmin.from('attendance').update({ check_out_at: new Date().toISOString(), status: 'completed', checked_out_via: 'qr_phone' }).eq('id', open.id).select('check_in_at, check_out_at').single();
      if (error) return next(error);
      await recordAttempt({ qrId: payload.qr_id, ipHash, outcome: 'confirmed', confirmTokenHash: tokenHash });
      return res.json({ status: 'checked_out', duration_minutes: Math.max(0, Math.round((new Date(data.check_out_at) - new Date(data.check_in_at)) / 60000)) });
    }
    const result = await checkInMember({
      memberId: payload.member_id, method: 'qr_phone', deviceId, ipHash, userAgent: req.get('user-agent')?.slice(0, 500) || null, sourceQrId: payload.qr_id,
    });
    await recordAttempt({ qrId: payload.qr_id, ipHash, outcome: 'confirmed', confirmTokenHash: tokenHash });
    const { data: deviceRows, error: deviceError } = await supabaseAdmin.from('attendance').select('member_id')
      .eq('device_id', deviceId).gte('check_in_at', new Date(Date.now() - 86400000).toISOString());
    if (deviceError) return next(deviceError);
    const memberIds = [...new Set((deviceRows || []).map((row) => row.member_id).filter(Boolean))];
    if (memberIds.length >= 3) {
      await supabaseAdmin.from('attendance').update({ flagged: true }).eq('device_id', deviceId).gte('check_in_at', new Date(Date.now() - 86400000).toISOString());
      const noticeKey = hash(`${deviceId}:flagged`);
      const notice = await supabaseAdmin.from('checkin_attempts').select('id').eq('phone_hash', noticeKey).eq('outcome', 'device_flag_notice').maybeSingle();
      if (!notice.error && !notice.data) {
        await recordAttempt({ phoneHash: noticeKey, ipHash, outcome: 'device_flag_notice' });
        await notifyStaff({ type: 'system', title: 'Possible shared-device check-ins', message: 'A device checked in three or more different members within 24 hours.', meta: {} });
      }
    }
    return res.status(201).json({ status: 'checked_in', time: result.check_in_at, plan_name: result.plan_name, valid_until: result.membership.end_date });
  } catch (error) { return next(error); }
});

export default router;
