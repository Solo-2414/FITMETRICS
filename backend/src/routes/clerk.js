import { Router } from 'express';
import { checkinQrExpiry, createCheckinToken } from '../lib/checkinQr.js';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createMembershipAndPayment, queueReceiptEmail, startClerkPayment } from '../services/membership.js';
import { enqueueEmail } from '../services/emailQueue.js';
import { notifyStaff } from '../services/notify.js';
import { dayStart, nextDayStart, today } from '../utils/time.js';
import { cancelPaymongoIntent, createPaymongoCheckout, createQrphPayment, getPaymongoIntent, getPromo, priceFor } from './paymongo.js';
import {
  clearIntentForm, completeRegistration, findRegistrationConflict, registrationErrors, encryptFormForIntent,
  finalizeRegistrationIntent,
} from '../services/registration.js';
import { getGymSettings } from '../services/maintenance.js';
import { checkInMember } from '../services/attendance.js';

const router = Router();
router.use('/clerk', requireAuth, requireRole('admin', 'clerk'));

const auditPayment = async (actorId, action, paymentId, details = {}) => {
  const { error } = await supabaseAdmin.from('audit_log').insert({
    actor_id: actorId, action, entity_type: 'payment', entity_id: paymentId, details,
  });
  if (error) throw error;
};

const getPlan = async (planIdOrCode) => {
  let query = supabaseAdmin.from('membership_plans').select('*').eq('active', true).eq('account_eligible', true);
  query = planIdOrCode?.length === 36 ? query.eq('id', planIdOrCode) : query.eq('code', planIdOrCode);
  const { data, error } = await query.single();
  if (error || !data) throw new Error('The selected membership plan is unavailable.');
  return data;
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('63') && digits.length === 12) return `0${digits.slice(2)}`;
  return digits;
};
const memberSummary = (profile, details) => ({
  id: profile.id, full_name: profile.full_name, member_code: details?.member_code || null, status: profile.status,
});
const findExistingMember = async ({ email, phone, username }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  const profileResult = await supabaseAdmin.from('profiles')
    .select('id, full_name, email, phone, status, member_details(member_code)')
    .or(`email.eq.${normalizedEmail},phone.eq.${phone || ''}`)
    .limit(20);
  if (profileResult.error) throw profileResult.error;
  const found = (profileResult.data || []).find((profile) =>
    normalizeEmail(profile.email) === normalizedEmail
    || normalizePhone(profile.phone) === normalizedPhone
    || (username && normalizeEmail(profile.email).split('@')[0] === normalizeEmail(username)));
  if (found) return { field: normalizeEmail(found.email) === normalizedEmail ? 'email' : 'phone', member: memberSummary(found, found.member_details) };
  const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const authUser = authUsers.users.find((user) => normalizeEmail(user.email) === normalizedEmail);
  if (authUser) {
    const profile = await supabaseAdmin.from('profiles').select('id, full_name, status, member_details(member_code)').eq('id', authUser.id).maybeSingle();
    return { field: 'email', member: memberSummary({ ...authUser, ...profile.data }, profile.data?.member_details) };
  }
  return null;
};

const getCoach = async (coachId) => {
  if (!coachId) return null;
  const { data, error } = await supabaseAdmin.from('coaches').select('*').eq('id', coachId).eq('active', true).single();
  if (error || !data) throw new Error('The selected coach is unavailable.');
  return data;
};

const createWalkInPayment = async ({ plan, guestName, guestPhone, amount, grossAmount, discount, promoId, method, actorId }) => {
  const { data: visit, error: visitError } = await supabaseAdmin.from('walk_in_visits').insert({
    plan_id: plan.id,
    guest_name: guestName || null,
    guest_phone: guestPhone || null,
    status: 'active',
    created_by: actorId,
  }).select().single();
  if (visitError) throw new Error(visitError.message);

  const { data: payment, error: paymentError } = await supabaseAdmin.from('payments').insert({
    walk_in_visit_id: visit.id,
    plan_id: plan.id,
    amount: Number(amount),
    gross_amount: Number(grossAmount ?? amount),
    discount: Number(discount || 0),
    promo_id: promoId || null,
    method,
    status: 'paid',
    received_by: actorId,
    paid_at: new Date().toISOString(),
  }).select().single();
  if (paymentError) {
    await supabaseAdmin.from('walk_in_visits').delete().eq('id', visit.id);
    throw new Error(paymentError.message);
  }
  await notifyStaff({ type: 'payment', title: 'Payment received', message: `A ${method} walk-in payment was recorded for ${plan.name}.` });
  return { visit, payment };
};

router.get('/clerk/plans', async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('membership_plans').select('*').eq('active', true).eq('account_eligible', true).neq('code', 'session').order('duration_days');
    if (error) return next(error);
    res.json(data);
  } catch (error) { next(error); }
});

router.get('/clerk/members/exists', async (req, res, next) => {
  try {
    const result = await findExistingMember({ email: req.query.email, phone: req.query.phone });
    res.json(result ? { exists: true, ...result } : { exists: false, field: null, member: null });
  } catch (error) { next(error); }
});

router.post('/clerk/payments/:id/resend-receipt', async (req, res, next) => {
  try {
    const { data: payment, error } = await supabaseAdmin.from('payments')
      .select('*, memberships(membership_plans(*))').eq('id', req.params.id).single();
    if (error || !payment?.member_id) return res.status(404).json({ error: 'Member payment not found.' });
    const plan = payment.memberships?.membership_plans;
    if (!plan) return res.status(400).json({ error: 'Payment plan details are unavailable.' });
    await queueReceiptEmail({ memberId: payment.member_id, plan, payment });
    res.json({ queued: true });
  } catch (error) { next(error); }
});

router.post('/clerk/payments/:id/cancel', async (req, res, next) => {
  try {
    const { data: current, error: findError } = await supabaseAdmin.from('payments').select('*').eq('id', req.params.id).eq('status', 'pending').single();
    if (findError || !current) return res.status(400).json({ error: 'Only pending payments can be cancelled.' });
    const payment = (await supabaseAdmin.from('payments').update({ status: 'cancelled', failure_reason: 'Cancelled by clerk' }).eq('id', req.params.id).eq('status', 'pending').select().single()).data;
    if (!payment) return res.status(400).json({ error: 'Only pending payments can be cancelled.' });
    await auditPayment(req.user.id, 'payment_cancelled', payment.id);
    res.json(payment);
  } catch (error) { next(error); }
});

router.post('/clerk/payments/quote', async (req, res, next) => {
  try {
    const { plan_code, is_student = false, promo_code = null, coach_id = null } = req.body || {};
    if (!plan_code) return res.status(400).json({ error: 'A payment plan is required.' });
    const plan = await getPlan(plan_code);
    const coach = await getCoach(coach_id);
    const promo = await getPromo(promo_code, plan.id);
    const pricing = priceFor(plan, Boolean(is_student), promo);
    const coachAddonAmount = Number(coach?.addon_amount || coach?.monthly_price || 0);
    res.json({ ...pricing, coachAddonAmount, total: pricing.amount + coachAddonAmount });
  } catch (error) { next(error); }
});

router.get('/clerk/coaches', async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('coaches').select('*').eq('active', true).order('display_name');
    if (error) return next(error);
    res.json(data);
  } catch (error) { next(error); }
});

router.get('/clerk/notifications/summary', async (req, res, next) => {
  try {
    const limit = Math.min(10, Math.max(1, Number(req.query.limit) || 5));
    const { data, error } = await supabaseAdmin.from('notifications')
      .select('id, type, title, message, created_at, read_at, link, related_member_id, announcement_id')
      .eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(limit);
    if (error) return next(error);
    const unreadResult = await supabaseAdmin.from('notifications').select('id', { count: 'exact', head: true })
      .eq('user_id', req.user.id).is('read_at', null);
    if (unreadResult.error) return next(unreadResult.error);
    const latest = (data || []).map((item) => ({
      ...item,
      link: item.link || (item.type === 'payment' ? '/clerk/payments'
        : item.type === 'membership_expiry' && item.related_member_id ? `/clerk/membership?member=${item.related_member_id}`
          : item.type === 'registration' ? '/clerk/members' : '/clerk/notification'),
    }));
    res.json({ unread: unreadResult.count || 0, latest });
  } catch (error) { next(error); }
});

router.get('/clerk/notifications', async (req, res, next) => {
  try {
    const allowedTypes = ['membership_expiry', 'registration', 'payment', 'announcement', 'system', 'workout_plan', 'milestone'];
    const type = req.query.type && req.query.type !== 'all' ? String(req.query.type) : null;
    if (type && !allowedTypes.includes(type)) return res.status(400).json({ error: 'Invalid notification type.' });
    const read = req.query.read === 'unread' ? 'unread' : req.query.read === 'read' ? 'read' : null;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    let query = supabaseAdmin.from('notifications').select('*', { count: 'exact' }).eq('user_id', req.user.id);
    if (type) query = query.eq('type', type);
    if (read === 'unread') query = query.is('read_at', null);
    if (read === 'read') query = query.not('read_at', 'is', null);
    const { data, error, count } = await query.order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
    if (error) return next(error);
    const { data: countRows, error: countError } = await supabaseAdmin.from('notifications')
      .select('type, read_at').eq('user_id', req.user.id);
    if (countError) return next(countError);
    const counts = { all: countRows.length, unread: countRows.filter((item) => !item.read_at).length };
    for (const item of countRows) counts[item.type] = (counts[item.type] || 0) + 1;
    res.json({ rows: data || [], total: count || 0, page, limit, hasMore: (count || 0) > page * limit, counts });
  } catch (error) { next(error); }
});

router.patch('/clerk/notifications/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', req.params.id).eq('user_id', req.user.id).select().single();
    if (error) return next(error);
    res.json(data);
  } catch (error) { next(error); }
});

router.patch('/clerk/notifications', async (req, res, next) => {
  try {
    const type = req.body?.type && req.body.type !== 'all' ? String(req.body.type) : null;
    const allowedTypes = ['membership_expiry', 'registration', 'payment', 'announcement', 'system', 'workout_plan', 'milestone'];
    if (type && !allowedTypes.includes(type)) return res.status(400).json({ error: 'Invalid notification type.' });
    let query = supabaseAdmin.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', req.user.id).is('read_at', null);
    if (type) query = query.eq('type', type);
    const { error } = await query;
    if (error) return next(error);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

router.get('/clerk/settings/preferences', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('profiles').select('preferences').eq('id', req.user.id).single();
    if (error) return next(error);
    res.json(data?.preferences || {});
  } catch (error) { next(error); }
});

router.patch('/clerk/settings/preferences', async (req, res, next) => {
  try {
    const body = req.body || {};
    const validators = {
      audioAlerts: (value) => typeof value === 'boolean',
      paymentPrompt: (value) => typeof value === 'boolean',
      defaultPaymentMethod: (value) => ['cash', 'gcash', 'maya'].includes(value),
      defaultLandingPage: (value) => ['dashboard', 'attendance'].includes(value),
      fastCheckinAutoFocus: (value) => typeof value === 'boolean',
      autoClearCheckinSearch: (value) => typeof value === 'boolean',
      openingFloat: (value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1000000,
    };
    const current = await supabaseAdmin.from('profiles').select('preferences').eq('id', req.user.id).single();
    if (current.error) return next(current.error);
    const nextPreferences = { ...(current.data?.preferences || {}) };
    for (const [key, value] of Object.entries(body)) {
      if (!validators[key] || !validators[key](value)) return res.status(400).json({ error: `Invalid preference: ${key}.` });
      nextPreferences[key] = key === 'openingFloat' ? Number(value) : value;
    }
    const { error } = await supabaseAdmin.from('profiles').update({ preferences: nextPreferences }).eq('id', req.user.id);
    if (error) return next(error);
    res.json(nextPreferences);
  } catch (error) { next(error); }
});

router.get('/clerk/settings', async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('gym_settings').select('gym_name, address, phone, email, monday_saturday_open, monday_saturday_close, sunday_open, sunday_close, notifications').eq('id', true).maybeSingle();
    if (error) return next(error);
    res.json(data);
  } catch (error) { next(error); }
});

router.get('/clerk/payments', async (req, res, next) => {
  try {
    const from = String(req.query.from || req.query.date || today());
    const to = String(req.query.to || from);
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
    let query = supabaseAdmin
      .from('payments')
      .select('id, amount, method, status, receipt_number, created_at, paid_at, member_id, membership_id, walk_in_visit_id, memberships(membership_plans(name)), walk_in_visits(guest_name, guest_phone, plan_id, membership_plans(name))')
      .gte('created_at', dayStart(`${from}T00:00:00+08:00`))
      .lt('created_at', nextDayStart(`${to}T00:00:00+08:00`))
      .order('created_at', { ascending: false });
    if (req.query.status) query = query.in('status', String(req.query.status).split(','));
    if (req.query.method) query = query.in('method', String(req.query.method).split(','));
    const { data: allData, error } = await query;
    if (error) return next(error);
    let data = allData || [];
    if (req.query.search) {
      const search = String(req.query.search).toLowerCase();
      const ids = [...new Set(data.map((payment) => payment.member_id).filter(Boolean))];
      const profilesResult = ids.length ? await supabaseAdmin.from('profiles').select('id, full_name, email').in('id', ids) : { data: [] };
      const matching = new Set((profilesResult.data || []).filter((profile) => `${profile.full_name} ${profile.email}`.toLowerCase().includes(search)).map((profile) => profile.id));
      data = data.filter((payment) => matching.has(payment.member_id) || payment.receipt_number?.toLowerCase().includes(search));
    }
    const total = data.length;
    const rows = data.slice((page - 1) * limit, page * limit);
    const memberIds = [...new Set(rows.map((payment) => payment.member_id).filter(Boolean))];
    let profiles = [];
    if (memberIds.length) {
      const result = await supabaseAdmin.from('profiles').select('id, full_name, email').in('id', memberIds);
      if (result.error) return next(result.error);
      profiles = result.data || [];
    }
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const mapped = rows.map((payment) => ({
      ...payment,
      profile: payment.member_id ? profileMap.get(payment.member_id) || null : null,
      display_name: profileMap.get(payment.member_id)?.full_name || payment.walk_in_visits?.guest_name || 'Walk-in Guest',
      plan_name: payment.memberships?.membership_plans?.name || payment.walk_in_visits?.membership_plans?.name || 'Payment',
    }));
    const paid = data.filter((payment) => payment.status === 'paid');
    res.json({ rows: mapped, total, totals: {
      paid: paid.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      cash: paid.filter((payment) => payment.method === 'cash').reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      ewallet: paid.filter((payment) => ['gcash', 'maya'].includes(payment.method)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      pending: data.filter((payment) => payment.status === 'pending').length,
    } });
  } catch (error) { next(error); }
});

router.post('/clerk/payments', async (req, res, next) => {
  try {
    const {
      member_id, plan_code, is_student = false, payment_method = 'cash',
      guest_name, guest_phone, promo_code = null, coach_id = null,
    } = req.body || {};
    if (!plan_code) return res.status(400).json({ error: 'A payment plan is required.' });
    const paymentModes = (await getGymSettings()).payment_modes || ['cash', 'gcash', 'maya'];
    if (!paymentModes.includes(payment_method)) return res.status(400).json({ error: `Payment method "${payment_method}" is disabled.` });
    const plan = await getPlan(plan_code);
    const promo = await getPromo(promo_code, plan.id);
    const coach = await getCoach(coach_id);
    if (plan.code === 'session' && payment_method !== 'cash') {
      return res.status(400).json({ error: 'Session e-wallet payments are not supported without a registered member.' });
    }
    if (plan.code === 'session') {
      if (!guest_name && !guest_phone) return res.status(400).json({ error: 'Walk-in name or phone is required.' });
      const result = await startClerkPayment({
        kind: 'session', guest: { name: guest_name, phone: guest_phone }, plan,
        isStudent: Boolean(is_student), promo, coach, method: payment_method, actorId: req.user.id,
        createCheckout: ({ payment, amount, method }) => createPaymongoCheckout({ payment, plan, amount, method }),
      });
      await auditPayment(req.user.id, 'payment_created', result.payment.id, { method: payment_method, kind: 'session' });
      return res.status(201).json({ plan, ...result });
    }
    if (!member_id) return res.status(400).json({ error: 'Select a member for this membership payment.' });
    const result = await startClerkPayment({
      memberId: member_id, plan, isStudent: Boolean(is_student), promo, coach,
      method: payment_method, actorId: req.user.id,
      createCheckout: ({ payment, amount, method }) => createPaymongoCheckout({ payment, plan, amount, method }),
    });
    await auditPayment(req.user.id, 'payment_created', result.payment.id, { method: payment_method });
    res.status(201).json({ plan, ...result });
  } catch (error) { next(error); }
});

const memberStatus = (member, membership, reminderDays) => {
  const accountStatus = String(member.status || '').toLowerCase();
  if (accountStatus === 'suspended') return 'Suspended';
  if (accountStatus === 'inactive') return 'Inactive';
  if (!membership) return 'No plan';
  if (membership.queued) return 'Upcoming';
  if (membership.end_date < today()) return 'Expired';
  const expiry = new Date(`${membership.end_date}T00:00:00+08:00`);
  const target = new Date(`${today()}T00:00:00+08:00`);
  target.setUTCDate(target.getUTCDate() + reminderDays);
  return expiry <= target ? 'Expiring' : 'Active';
};

const memberRoster = async (req) => {
  const { data: members, error } = await supabaseAdmin.from('profiles')
    .select('id, email, username, full_name, phone, status, created_at, member_details(*)')
    .eq('role', 'member').order('full_name');
  if (error) throw error;
  const ids = (members || []).map((member) => member.id);
  const [membershipResult, settingsResult] = await Promise.all([
    ids.length
      ? supabaseAdmin.from('memberships').select('*, membership_plans(*), coaches(*)').in('member_id', ids).order('start_date', { ascending: false })
      : { data: [], error: null },
    supabaseAdmin.from('gym_settings').select('expiry_reminder_days').eq('id', true).maybeSingle(),
  ]);
  if (membershipResult.error) throw membershipResult.error;
  if (settingsResult.error) throw settingsResult.error;
  const reminderDays = Number(settingsResult.data?.expiry_reminder_days || 3);
  const byMember = new Map();
  (membershipResult.data || []).forEach((membership) => {
    const list = byMember.get(membership.member_id) || [];
    list.push(membership);
    byMember.set(membership.member_id, list);
  });
  return (members || []).map((member) => {
    const memberships = byMember.get(member.id) || [];
    const current = memberships.find((item) => item.status === 'active'
      && item.start_date <= today() && item.end_date >= today());
    const queued = memberships.find((item) => item.status === 'active' && item.start_date > today());
    const expired = memberships.find((item) => item.status === 'expired' && item.end_date < today());
    const membership = current || queued || expired || null;
    const status = memberStatus(member, membership, reminderDays);
    return {
      ...member,
      membership: membership ? { ...membership, queued: membership === queued, derived_status: status } : null,
      status_label: status,
      joined_date: member.member_details?.join_date || member.created_at?.slice(0, 10),
      is_student: Boolean(member.member_details?.is_student),
    };
  });
};

router.get('/clerk/members', async (req, res, next) => {
  try {
    if (Object.hasOwn(req.query, 'page')) {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
      const sort = ['name', 'joined', 'expiry', 'status'].includes(req.query.sort) ? req.query.sort : 'name';
      const order = String(req.query.order || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
      const parsedExpiringIn = req.query.expiring_in === undefined ? null : Number(req.query.expiring_in);
      if (parsedExpiringIn !== null && (!Number.isInteger(parsedExpiringIn) || parsedExpiringIn < 0 || parsedExpiringIn > 365)) {
        return res.status(400).json({ error: 'expiring_in must be an integer from 0 to 365.' });
      }
      const parsedStudent = req.query.student === undefined || req.query.student === '' ? null : String(req.query.student) === 'true'
        ? true : String(req.query.student) === 'false' ? false : null;
      if (req.query.student !== undefined && req.query.student !== '' && parsedStudent === null) {
        return res.status(400).json({ error: 'student must be true or false.' });
      }
      for (const key of ['joined_from', 'joined_to']) {
        if (req.query[key] && !/^\d{4}-\d{2}-\d{2}$/.test(String(req.query[key]))) {
          return res.status(400).json({ error: `${key} must use YYYY-MM-DD format.` });
        }
      }
      const settings = await supabaseAdmin.from('gym_settings').select('expiry_reminder_days').eq('id', true).maybeSingle();
      if (settings.error) return next(settings.error);
      const { data, error } = await supabaseAdmin.rpc('get_clerk_member_roster', {
        p_search: String(req.query.search || '').slice(0, 100),
        p_status: String(req.query.status || '').slice(0, 30),
        p_plan: String(req.query.plan || '').slice(0, 100),
        p_coach: String(req.query.coach || '').slice(0, 100),
        p_joined_from: req.query.joined_from || null,
        p_joined_to: req.query.joined_to || null,
        p_expiring_in: parsedExpiringIn,
        p_student: parsedStudent,
        p_sort: sort,
        p_order: order,
        p_page: page,
        p_limit: limit,
        p_today: today(),
        p_reminder_days: Number(settings.data?.expiry_reminder_days || 3),
      });
      if (error) return next(error);
      return res.json(data);
    }
    const allRows = await memberRoster(req);
    res.json(allRows);
  } catch (error) { next(error); }
});

router.post('/clerk/members/:id/information-email', async (req, res, next) => {
  try {
    const { data: member, error: memberError } = await supabaseAdmin.from('profiles')
      .select('id, email, full_name, phone, member_details(member_code), memberships!memberships_member_id_fkey(start_date, end_date, status, membership_plans(name))')
      .eq('id', req.params.id).eq('role', 'member').single();
    if (memberError) return next(memberError);
    if (!member.email) return res.status(400).json({ error: 'This member has no email address.' });
    const recent = await supabaseAdmin.from('email_log').select('created_at').eq('email_type', 'information_overview')
      .eq('recipient', member.email).gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()).limit(1);
    if (recent.error) return next(recent.error);
    if (recent.data?.length) return res.status(429).json({ error: 'An information email was already queued for this member. Try again in a few minutes.' });
    const activeMembership = (member.memberships || []).find((item) => item.status === 'active'
      && item.start_date <= today() && item.end_date >= today());
    const queuedMembership = (member.memberships || []).find((item) => item.status === 'active' && item.start_date > today());
    const queued = await enqueueEmail({
      emailType: 'information_overview',
      recipient: member.email,
      payload: {
        memberName: member.full_name,
        memberCode: member.member_details?.member_code,
        phone: member.phone,
        planName: activeMembership?.membership_plans?.name,
        expiryDate: activeMembership?.end_date,
        queuedPlanName: queuedMembership?.membership_plans?.name,
        queuedStartDate: queuedMembership?.start_date,
        portalLink: `${process.env.CLIENT_URL || 'http://localhost:5173'}/member/dashboard`,
      },
    });
    res.status(202).json({ queued: true, email: queued });
  } catch (error) { next(error); }
});

router.post('/clerk/register/validate', async (req, res, next) => {
  try {
    const body = req.body || {};
    const settings = await getGymSettings();
    if (!settings.allow_member_registrations) return res.status(403).json({ error: 'Member registrations are currently disabled in gym settings.' });
    const errors = registrationErrors(body);
    if (errors.plan_code) {
      const plan = await getPlan(body.plan_code).catch(() => null);
      if (!plan) errors.plan_code = 'Please choose an available membership plan to continue.';
    }
    if (Object.keys(errors).length) return res.status(422).json({ errors: Object.entries(errors).map(([field, message]) => ({ field, message })) });
    const conflict = await findRegistrationConflict(body);
    if (conflict) return res.status(409).json({ ...conflict, message: conflict.code === 'REGISTRATION_PENDING' ? 'A registration for this person is waiting for payment.' : 'This member is already registered.' });
    await auditPayment(req.user.id, 'registration_validated', null, { email: normalizeEmail(body.email), phone: normalizePhone(body.phone) });
    res.json({ valid: true });
  } catch (error) { next(error); }
});

router.post('/clerk/register/cash', async (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = registrationErrors(body);
    if (body.payment_method !== 'cash') errors.payment_method = 'Choose cash to complete this payment.';
    if (Number(body.cash_tendered) < 0 || !Number.isFinite(Number(body.cash_tendered))) errors.cash_tendered = 'Enter the cash tendered.';
    if (Object.keys(errors).length) return res.status(422).json({ errors: Object.entries(errors).map(([field, message]) => ({ field, message })) });
    const conflict = await findRegistrationConflict(body);
    if (conflict) return res.status(409).json({ ...conflict, message: 'This member cannot be registered again.' });
    const plan = await getPlan(body.plan_code);
    const coach = await getCoach(body.coach_id);
    const pricing = priceFor(plan, Boolean(body.is_student), null);
    const coachAmount = Number(coach?.addon_amount || coach?.monthly_price || 0);
    const total = pricing.amount + coachAmount;
    if (Number(body.cash_tendered) < total) return res.status(422).json({ errors: [{ field: 'cash_tendered', message: 'Cash tendered must cover the total amount due.' }] });
    const result = await completeRegistration({ form: body, plan, coach, amount: pricing.amount + coachAmount, grossAmount: pricing.gross + coachAmount, discount: pricing.discount, actorId: req.user.id, method: 'cash', cashTendered: Number(body.cash_tendered), sendReceipt: body.send_receipt !== false });
    await auditPayment(req.user.id, 'registration_completed', result.payment.id, { method: 'cash' });
    res.status(201).json({ ...result, receipt_number: result.payment.receipt_number });
  } catch (error) { next(error); }
});

router.post('/clerk/register/qrph', async (req, res, next) => {
  let intent;
  try {
    const body = req.body || {};
    const errors = registrationErrors(body);
    if (Object.keys(errors).length) return res.status(422).json({ errors: Object.entries(errors).map(([field, message]) => ({ field, message })) });
    const conflict = await findRegistrationConflict(body);
    if (conflict) return res.status(409).json({ ...conflict, message: 'This member cannot be registered again.' });
    const plan = await getPlan(body.plan_code);
    const coach = await getCoach(body.coach_id);
    const pricing = priceFor(plan, Boolean(body.is_student), null);
    const coachAmount = Number(coach?.addon_amount || coach?.monthly_price || 0);
    const total = pricing.amount + coachAmount;
    const { data, error } = await supabaseAdmin.from('registration_intents').insert({
      email_normalized: normalizeEmail(body.email), phone_normalized: normalizePhone(body.phone), plan_id: plan.id,
      is_student: Boolean(body.is_student), coach_id: coach?.id || null, amount_total: total, method: 'qrph',
      form_encrypted: encryptFormForIntent(body),
      expires_at: new Date(Date.now() + 300000).toISOString(), created_by: req.user.id, send_receipt: body.send_receipt !== false,
    }).select().single();
    if (error) return next(error);
    intent = data;
    const qr = await createQrphPayment({ payment: intent, amount: total, description: `FITMETRICS membership - ${plan.name}`, metadata: { registration_intent_id: intent.id }, expirySeconds: 300 });
    const { data: updated, error: updateError } = await supabaseAdmin.from('registration_intents').update({ provider_intent_id: qr.intentId, expires_at: qr.expiresAt }).eq('id', intent.id).select().single();
    if (updateError) throw updateError;
    await auditPayment(req.user.id, 'registration_qr_started', intent.id, { method: 'qrph' });
    res.status(201).json({ intent_id: updated.id, qr_image_url: qr.imageUrl, expires_at: qr.expiresAt, amount: total });
  } catch (error) {
    if (intent?.id) await supabaseAdmin.from('registration_intents').delete().eq('id', intent.id);
    next(error);
  }
});

router.get('/clerk/register/qrph/:id/status', async (req, res, next) => {
  try {
    const { data: intent, error } = await supabaseAdmin.from('registration_intents').select('*').eq('id', req.params.id).single();
    if (error || !intent) return res.status(404).json({ error: 'Registration payment not found.' });
    if (intent.status === 'pending' && intent.provider_intent_id) {
      const remote = await getPaymongoIntent(intent.provider_intent_id);
      const attributes = remote?.data?.attributes || {};
      const result = await finalizeRegistrationIntent({ intent, providerStatus: attributes.status, providerIntentId: intent.provider_intent_id, providerAmount: attributes.amount, actorId: req.user.id, getPlan, getCoach, providerPaymentId: attributes.latest_payment_id });
      return res.json(result);
    }
    res.json(intent);
  } catch (error) { next(error); }
});

router.post('/clerk/register/qrph/:id/cancel', async (req, res, next) => {
  try {
    const { data: intent, error } = await supabaseAdmin.from('registration_intents').select('*').eq('id', req.params.id).single();
    if (error || !intent) return res.status(404).json({ error: 'Registration payment not found.' });
    if (intent.status === 'pending') {
      await clearIntentForm(intent.id, 'cancelled');
      try { await cancelPaymongoIntent(intent.provider_intent_id); } catch (cancelError) { console.error(`Could not cancel PayMongo intent ${intent.provider_intent_id}: ${cancelError.message}`); }
    }
    await auditPayment(req.user.id, 'registration_qr_cancelled', intent.id);
    res.json({ id: intent.id, status: 'cancelled' });
  } catch (error) { next(error); }
});

router.post('/clerk/register/qrph/:id/simulate-paid', requireRole('admin'), async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).json({ error: 'Not found.' });
  try {
    const { data: intent, error } = await supabaseAdmin.from('registration_intents').select('*').eq('id', req.params.id).single();
    if (error || !intent) return res.status(404).json({ error: 'Registration payment not found.' });
    res.json(await finalizeRegistrationIntent({ intent, providerStatus: 'succeeded', providerIntentId: intent.provider_intent_id, providerAmount: Math.round(Number(intent.amount_total) * 100), actorId: req.user.id, getPlan, getCoach, providerPaymentId: `dev-${intent.id}` }));
  } catch (error) { next(error); }
});

router.post('/clerk/memberships', async (req, res, next) => {
  try {
    const { member_id, plan_code, coach_id, payment_method = 'cash', promo_code = null } = req.body || {};
    if (!((await getGymSettings()).payment_modes || ['cash', 'gcash', 'maya']).includes(payment_method)) return res.status(400).json({ error: `Payment method "${payment_method}" is disabled.` });
    if (!member_id || !plan_code) return res.status(400).json({ error: 'Member and plan are required.' });
    const plan = await getPlan(plan_code);
    const coach = await getCoach(coach_id);
    const promo = await getPromo(promo_code, plan.id);
    const result = await startClerkPayment({
      memberId: member_id, plan, promo, coach, method: payment_method, actorId: req.user.id,
      createCheckout: ({ payment, amount, method }) => createPaymongoCheckout({ payment, plan, amount, method, returnPath: '/clerk/membership' }),
    });
    await auditPayment(req.user.id, 'payment_created', result.payment.id, { method: payment_method, renewal: true });
    res.status(201).json(result);
  } catch (error) { next(error); }
});

router.post('/clerk/attendance', async (req, res, next) => {
  try {
    const { member_id, method = 'manual' } = req.body || {};
    if (!member_id) return res.status(400).json({ error: 'Member is required.' });
    if (method !== 'manual') return res.status(400).json({ error: 'Clerk check-ins must use the manual method.' });
    const data = await checkInMember({ memberId: member_id, method: 'manual', recordedBy: req.user.id });
    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({
      actor_id: req.user.id, action: 'attendance_manual_checkin', entity_type: 'attendance', entity_id: data.id, details: { method: 'manual' },
    });
    if (auditError) return next(auditError);
    res.status(201).json(data);
  } catch (error) { next(error); }
});

router.get('/clerk/attendance/qr', async (_req, res, next) => {
  try {
    const token = createCheckinToken();
    const expires_at = checkinQrExpiry();
    const url = `${process.env.CLIENT_URL || 'http://localhost:5173'}/member/check-in?t=${encodeURIComponent(token)}`;
    res.json({ token, url, expires_at });
  } catch (error) { next(error); }
});

const cashDrawerTotals = async (session) => {
  const salesResult = await supabaseAdmin.from('payments')
    .select('amount, method')
    .eq('status', 'paid').eq('method', 'cash')
    .gte('paid_at', session.opened_at);
  if (salesResult.error) throw salesResult.error;
  const entriesResult = await supabaseAdmin.from('cash_drawer_entries')
    .select('id, kind, amount, reason, created_by, created_at')
    .eq('session_id', session.id).order('created_at', { ascending: false });
  if (entriesResult.error) throw entriesResult.error;
  const cashSales = (salesResult.data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const entries = entriesResult.data || [];
  const cashIn = entries.filter((row) => row.kind === 'correction').reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const cashOut = entries.filter((row) => ['payout', 'refund'].includes(row.kind)).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return { cashSales, cashIn, cashOut, entries, expectedCash: Number(session.opening_float) + cashSales + cashIn - cashOut };
};

router.get('/clerk/cash-drawer/today', async (req, res, next) => {
  try {
    const { data: session, error } = await supabaseAdmin.from('cash_drawer_sessions')
      .select('*').eq('business_date', today()).maybeSingle();
    if (error) return next(error);
    if (!session) return res.json({ session: null, cashSales: 0, cashIn: 0, cashOut: 0, expectedCash: null, entries: [] });
    const totals = await cashDrawerTotals(session);
    res.json({ session, ...totals });
  } catch (error) { next(error); }
});

router.post('/clerk/cash-drawer/open', async (req, res, next) => {
  try {
    const openingFloat = Number(req.body?.opening_float);
    if (!Number.isFinite(openingFloat) || openingFloat < 0 || openingFloat > 100000000) {
      return res.status(400).json({ error: 'opening_float must be a non-negative amount.' });
    }
    const { data, error } = await supabaseAdmin.from('cash_drawer_sessions').insert({
      business_date: today(), opening_float: openingFloat, opened_by: req.user.id,
    }).select().single();
    if (error) return res.status(error.code === '23505' ? 409 : 400).json({ error: error.code === '23505' ? 'Today\'s drawer is already open.' : error.message });
    await auditPayment(req.user.id, 'cash_drawer_opened', data.id, { opening_float: openingFloat });
    res.status(201).json({ session: data, ...(await cashDrawerTotals(data)) });
  } catch (error) { next(error); }
});

router.post('/clerk/cash-drawer/adjust', async (req, res, next) => {
  try {
    const kind = String(req.body?.kind || '');
    const amount = Number(req.body?.amount);
    const reason = String(req.body?.reason || '').trim();
    if (!['payout', 'refund', 'correction'].includes(kind) || !Number.isFinite(amount) || amount <= 0 || amount > 100000000 || reason.length < 1 || reason.length > 500) {
      return res.status(400).json({ error: 'A valid adjustment kind, positive amount, and reason are required.' });
    }
    const { data: session, error: sessionError } = await supabaseAdmin.from('cash_drawer_sessions')
      .select('*').eq('business_date', today()).eq('status', 'open').maybeSingle();
    if (sessionError) return next(sessionError);
    if (!session) return res.status(409).json({ error: 'Open today\'s cash drawer before adding an adjustment.' });
    const { data, error } = await supabaseAdmin.from('cash_drawer_entries')
      .insert({ session_id: session.id, kind, amount, reason, created_by: req.user.id }).select().single();
    if (error) return next(error);
    await auditPayment(req.user.id, 'cash_drawer_adjusted', session.id, { kind, amount, reason });
    res.status(201).json({ entry: data, ...(await cashDrawerTotals(session)) });
  } catch (error) { next(error); }
});

router.post('/clerk/cash-drawer/close', async (req, res, next) => {
  try {
    const countedCash = Number(req.body?.counted_cash);
    const note = String(req.body?.note || '').trim();
    if (!Number.isFinite(countedCash) || countedCash < 0 || countedCash > 100000000) return res.status(400).json({ error: 'counted_cash must be a non-negative amount.' });
    const { data: session, error: sessionError } = await supabaseAdmin.from('cash_drawer_sessions')
      .select('*').eq('business_date', today()).eq('status', 'open').maybeSingle();
    if (sessionError) return next(sessionError);
    if (!session) return res.status(409).json({ error: 'There is no open drawer to close.' });
    const totals = await cashDrawerTotals(session);
    const variance = Number((countedCash - totals.expectedCash).toFixed(2));
    if (variance !== 0 && !note) return res.status(400).json({ error: 'A note is required when the counted cash differs from expected cash.' });
    const { data, error } = await supabaseAdmin.from('cash_drawer_sessions').update({
      closing_counted: countedCash, expected_cash: totals.expectedCash, variance, closed_by: req.user.id, closed_at: new Date().toISOString(), note: note || null, status: 'closed',
    }).eq('id', session.id).eq('status', 'open').select().single();
    if (error) return next(error);
    await auditPayment(req.user.id, 'cash_drawer_closed', session.id, { counted_cash: countedCash, expected_cash: totals.expectedCash, variance });
    res.json({ session: data, ...totals, expectedCash: totals.expectedCash });
  } catch (error) { next(error); }
});

router.get('/clerk/dashboard', async (_req, res, next) => {
  try {
    const date = today();
    const [attendance, payments, members, registrations, settings, walkIns] = await Promise.all([
      supabaseAdmin.from('attendance').select('id, member_id, check_in_at, check_out_at').gte('check_in_at', dayStart()).lt('check_in_at', nextDayStart()),
      supabaseAdmin.from('payments').select('amount, method').eq('status', 'paid').gte('paid_at', dayStart()).lt('paid_at', nextDayStart()),
      supabaseAdmin.from('attendance').select('member_id').gte('check_in_at', dayStart()).lt('check_in_at', nextDayStart()).is('check_out_at', null),
      supabaseAdmin.from('profiles').select('id').eq('role', 'member').gte('created_at', dayStart()).lt('created_at', nextDayStart()),
      supabaseAdmin.from('gym_settings').select('floor_capacity').eq('id', true).maybeSingle(),
      supabaseAdmin.from('walk_in_visits').select('id').eq('status', 'active').gte('created_at', dayStart()).lt('created_at', nextDayStart()),
    ]);
    const failure = [attendance, payments, members, registrations, settings, walkIns].find((result) => result.error);
    if (failure) return next(failure.error);
    const total = payments.data.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const cash = payments.data.filter((payment) => payment.method === 'cash').reduce((sum, payment) => sum + Number(payment.amount), 0);
    const gcash = payments.data.filter((payment) => payment.method === 'gcash').reduce((sum, payment) => sum + Number(payment.amount), 0);
    const maya = payments.data.filter((payment) => payment.method === 'maya').reduce((sum, payment) => sum + Number(payment.amount), 0);
    const recentResult = await supabaseAdmin.from('payments')
      .select('id, amount, method, created_at, member_id, memberships(membership_plans(name)), walk_in_visits(guest_name, membership_plans(name))')
      .eq('status', 'paid').gte('paid_at', dayStart()).lt('paid_at', nextDayStart())
      .order('paid_at', { ascending: false }).limit(4);
    if (recentResult.error) return next(recentResult.error);
    const recentIds = [...new Set((recentResult.data || []).map((payment) => payment.member_id).filter(Boolean))];
    const recentProfiles = recentIds.length
      ? await supabaseAdmin.from('profiles').select('id, full_name').in('id', recentIds)
      : { data: [], error: null };
    if (recentProfiles.error) return next(recentProfiles.error);
    const recentProfileMap = new Map((recentProfiles.data || []).map((profile) => [profile.id, profile]));
    const recentPayments = (recentResult.data || []).map((payment) => ({
      ...payment,
      display_name: recentProfileMap.get(payment.member_id)?.full_name || payment.walk_in_visits?.guest_name || 'Walk-in Guest',
      plan_name: payment.memberships?.membership_plans?.name || payment.walk_in_visits?.membership_plans?.name || 'Payment',
    }));
    const recentAttendanceResult = await supabaseAdmin.from('attendance')
      .select('id, member_id, check_in_at, method, memberships(membership_plans(name))')
      .gte('check_in_at', dayStart()).lt('check_in_at', nextDayStart())
      .order('check_in_at', { ascending: false }).limit(10);
    if (recentAttendanceResult.error) return next(recentAttendanceResult.error);
    const attendanceIds = [...new Set((recentAttendanceResult.data || []).map((row) => row.member_id).filter(Boolean))];
    const attendanceProfiles = attendanceIds.length
      ? await supabaseAdmin.from('profiles').select('id, full_name').in('id', attendanceIds)
      : { data: [], error: null };
    if (attendanceProfiles.error) return next(attendanceProfiles.error);
    const attendanceProfileMap = new Map((attendanceProfiles.data || []).map((profile) => [profile.id, profile]));
    const recentAttendance = (recentAttendanceResult.data || []).map((row) => ({
      ...row,
      display_name: attendanceProfileMap.get(row.member_id)?.full_name || 'Walk-in Guest',
      plan_name: row.memberships?.membership_plans?.name || 'Membership',
    }));
    const settingResult = await supabaseAdmin.from('gym_settings').select('expiry_reminder_days').eq('id', true).maybeSingle();
    if (settingResult.error) return next(settingResult.error);
    const reminderDays = Number(settingResult.data?.expiry_reminder_days ?? 3);
    const endDate = new Date(`${today()}T00:00:00+08:00`);
    endDate.setUTCDate(endDate.getUTCDate() + reminderDays);
    const expiringResult = await supabaseAdmin.from('memberships')
      .select('id, member_id, end_date, membership_plans(name, price), profiles!memberships_member_id_fkey(full_name, email)')
      .eq('status', 'active').gte('end_date', today()).lte('end_date', endDate.toISOString().slice(0, 10)).order('end_date');
    if (expiringResult.error) return next(expiringResult.error);
    const expiringSoon = (expiringResult.data || []).map((membership) => ({
      ...membership,
      member_name: membership.profiles?.full_name || 'Member',
      member_email: membership.profiles?.email || null,
      days_left: Math.max(0, Math.ceil((new Date(`${membership.end_date}T00:00:00+08:00`) - new Date()) / 86400000)),
    }));
    res.json({ checkIns: attendance.data.length, activeOnFloor: new Set(members.data.map((row) => row.member_id)).size, openSessions: members.data.length + walkIns.data.length, registrations: registrations.data.length, capacity: Number(settings.data?.floor_capacity || 50), totalCollected: total, cashCollected: cash, gcashCollected: gcash, mayaCollected: maya, eWalletCollected: gcash + maya, cashTransactions: payments.data.filter((payment) => payment.method === 'cash').length, eWalletTransactions: payments.data.filter((payment) => ['gcash', 'maya'].includes(payment.method)).length, transactionCount: payments.data.length, recentPayments, recentAttendance, expiringSoon, updatedAt: new Date().toISOString() });
  } catch (error) { next(error); }
});

router.post('/clerk/members/:id/expiry-reminder', async (req, res, next) => {
  try {
    const { data: membership, error } = await supabaseAdmin.from('memberships')
      .select('id, member_id, end_date, membership_plans(name), profiles!memberships_member_id_fkey(full_name, email)')
      .eq('id', req.body?.membership_id || '').eq('member_id', req.params.id).eq('status', 'active').single();
    if (error || !membership?.profiles?.email) return res.status(404).json({ error: 'Active membership or member email not found.' });
    const queued = await enqueueEmail({
      emailType: 'expiry_reminder',
      recipient: membership.profiles.email,
      dedupeKey: `membership:${membership.id}:day:${today()}`,
      payload: { memberName: membership.profiles.full_name, planName: membership.membership_plans?.name, expiryDate: membership.end_date },
    });
    res.json({ queued: Boolean(queued) });
  } catch (error) { next(error); }
});

export default router;
