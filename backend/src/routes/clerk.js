import { Router } from 'express';
import crypto from 'node:crypto';
import { checkinQrExpiry, createCheckinToken } from '../lib/checkinQr.js';
import { qrPaymentResponse } from '../lib/qrPayment.js';
import { paymentMethodError } from '../lib/paymentModes.js';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createMembershipAndPayment, expirePendingQrPayments, nextReceiptNumber, queueReceiptEmail, startClerkPayment } from '../services/membership.js';
import { enqueueEmail, processEmailQueue } from '../services/emailQueue.js';
import { notifyStaff } from '../services/notify.js';
import { dayStart, nextDayStart, today } from '../utils/time.js';
import { cancelPaymongoIntent, createPaymongoCheckout, createQrphPayment, getPaymongoIntent, getPromo, priceFor } from './paymongo.js';
import {
  clearIntentForm, completeRegistration, findRegistrationConflict, findRegistrationConflicts, registrationErrors, encryptFormForIntent,
  finalizeIntent,
} from '../services/registration.js';
import { getGymSettings } from '../services/maintenance.js';
import { checkInMember } from '../services/attendance.js';
import { getMembershipState } from '../services/membershipState.js';
import { renderEmail } from '../services/mailer.js';
import { validateWalkInCustomer, walkInValidationResponse } from '../lib/walkInValidation.js';

const router = Router();
router.use('/clerk', requireAuth, requireRole('admin', 'clerk'));

const auditPayment = async (actorId, action, paymentId, details = {}) => {
  const { error } = await supabaseAdmin.from('audit_log').insert({
    actor_id: actorId, action, entity_type: 'payment', entity_id: paymentId, details,
  });
  if (error) throw error;
};

const getPlan = async (planIdOrCode, { allowSession = false } = {}) => {
  let query = supabaseAdmin.from('membership_plans').select('*').eq('active', true);
  if (!allowSession) query = query.eq('account_eligible', true);
  query = planIdOrCode?.length === 36 ? query.eq('id', planIdOrCode) : query.eq('code', planIdOrCode);
  const { data, error } = await query.single();
  if (error || !data) throw new Error('The selected membership plan is unavailable.');
  return data;
};

const getWalkInPlan = async () => {
  const { data, error } = await supabaseAdmin.from('membership_plans')
    .select('*')
    .eq('active', true)
    .eq('code', 'session')
    .single();
  if (error || !data) throw new Error('The walk-in plan is unavailable.');
  return data;
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('63') && digits.length === 12) return `0${digits.slice(2)}`;
  return digits;
};
const escapePostgrestValue = (value) => String(value).replace(/([\\%_(),])/g, '\\$1');
const memberSummary = (profile, details) => ({
  id: profile.id, full_name: profile.full_name, member_code: details?.member_code || null, status: profile.status,
});
const findExistingMember = async ({ email, phone, username }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  const profileResult = await supabaseAdmin.from('profiles')
    .select('id, full_name, email, phone, status, member_details(member_code)')
    .or(`email.eq.${escapePostgrestValue(normalizedEmail)},phone.eq.${escapePostgrestValue(normalizedPhone)}`)
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

const createWalkInPayment = async ({ plan, guestName, guestPhone, guestEmail, isStudent, notes, amount, grossAmount, discount, promoId, method, cashTendered, checkInNow, actorId }) => {
  const phone = normalizePhone(guestPhone);
  const email = normalizeEmail(guestEmail);
  const customerQuery = phone
    ? supabaseAdmin.from('walk_in_customers').select('*').eq('phone_normalized', phone).maybeSingle()
    : supabaseAdmin.from('walk_in_customers').select('*').eq('email_normalized', email).maybeSingle();
  const existing = await customerQuery;
  if (existing.error) throw existing.error;
  let customer = existing.data;
  if (!customer) {
    const result = await supabaseAdmin.from('walk_in_customers').insert({
      full_name: guestName, phone_normalized: phone || null, email_normalized: email || null,
      is_student: Boolean(isStudent), notes: notes || null, visit_count: 0,
    }).select().single();
    if (result.error) throw result.error;
    customer = result.data;
  }
  const { data: visit, error: visitError } = await supabaseAdmin.from('walk_in_visits').insert({
    plan_id: plan.id,
    customer_id: customer.id, guest_name: guestName, guest_phone: phone || null, guest_email: email || null,
    is_student: Boolean(isStudent), notes: notes || null, valid_until: `${today()}T23:59:59+08:00`,
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
    receipt_number: await nextReceiptNumber(),
    cash_tendered: method === 'cash' ? Number(cashTendered) : null,
    change_given: method === 'cash' ? Math.round((Number(cashTendered) - Number(amount)) * 100) / 100 : null,
    paid_at: new Date().toISOString(),
  }).select().single();
  if (paymentError) {
    await supabaseAdmin.from('walk_in_visits').delete().eq('id', visit.id);
    if (!existing.data) await supabaseAdmin.from('walk_in_customers').delete().eq('id', customer.id);
    throw new Error(paymentError.message);
  }
  const updatedVisit = await supabaseAdmin.from('walk_in_visits').update({
    payment_id: payment.id,
    checked_in_at: checkInNow ? new Date().toISOString() : null,
  }).eq('id', visit.id).select().single();
  if (updatedVisit.error) {
    await supabaseAdmin.from('payments').delete().eq('id', payment.id);
    await supabaseAdmin.from('walk_in_visits').delete().eq('id', visit.id);
    if (!existing.data) await supabaseAdmin.from('walk_in_customers').delete().eq('id', customer.id);
    throw updatedVisit.error;
  }
  const customerUpdate = await supabaseAdmin.from('walk_in_customers').update({
    last_visit_at: new Date().toISOString(), visit_count: Number(customer.visit_count || 0) + 1,
  }).eq('id', customer.id);
  if (customerUpdate.error) throw customerUpdate.error;
  if (checkInNow) {
    const attendance = await supabaseAdmin.from('attendance').insert({
      walk_in_visit_id: visit.id, method: 'manual', recorded_by: actorId,
    });
    if (attendance.error) throw attendance.error;
  }
  if (email) {
    const settings = await getGymSettings();
    await enqueueEmail({ emailType: 'receipt', recipient: email, dedupeKey: `payment:${payment.id}:receipt`, payload: {
      isWalkIn: true, memberName: guestName, memberEmail: email, receiptNumber: payment.receipt_number,
      dateTimePaid: new Date(payment.paid_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }),
      planName: plan.name, amount, subtotal: grossAmount, discount, method: method === 'qrph' ? 'QR Ph' : 'Cash',
      reference: payment.provider_payment_id || payment.reference_number, cashTendered, changeGiven: payment.change_given,
      receivedBy: 'Front desk', gymName: settings.gym_name, businessLegalName: settings.business_legal_name,
      businessAddress: settings.business_address, businessTin: settings.business_tin, supportEmail: settings.support_email,
      supportPhone: settings.support_phone, receiptFooterNote: settings.receipt_footer_note,
    } });
  }
  await notifyStaff({ type: 'payment', title: 'Payment received', message: `A ${method} walk-in payment was recorded for ${plan.name}.` });
  return { visit: updatedVisit.data, payment, customer };
};

router.get('/clerk/plans', async (_req, res, next) => {
  try {
    let query = supabaseAdmin.from('membership_plans').select('*').eq('active', true);
    if (_req.query.include_session !== 'true') query = query.eq('account_eligible', true).neq('code', 'session');
    const { data, error } = await query.order('duration_days');
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
      .select('*, memberships(start_date, end_date, membership_plans(*)), walk_in_visits!payments_walk_in_visit_id_fkey(guest_name, guest_email, membership_plans(*))').eq('id', req.params.id).single();
    if (error || !payment) return res.status(404).json({ error: 'Payment not found.' });
    const profile = payment.member_id ? await supabaseAdmin.from('profiles').select('full_name, email, member_details(member_code)').eq('id', payment.member_id).single() : { data: null, error: null };
    if (profile.error) return next(profile.error);
    const recipient = profile.data?.email || payment.walk_in_visits?.guest_email;
    if (!recipient) return res.status(400).json({ error: 'This payment has no receipt email address.' });
    const plan = payment.memberships?.membership_plans || payment.walk_in_visits?.membership_plans;
    if (!plan) return res.status(400).json({ error: 'Payment plan details are unavailable.' });
    if (payment.member_id) await queueReceiptEmail({ memberId: payment.member_id, plan, payment });
    else {
      const settings = await getGymSettings();
      await enqueueEmail({ emailType: 'receipt', recipient, dedupeKey: `payment:${payment.id}:resend:${Date.now()}`, payload: {
        isWalkIn: true, memberName: payment.walk_in_visits?.guest_name || 'Walk-in Guest', memberEmail: recipient,
        receiptNumber: payment.receipt_number, dateTimePaid: new Date(payment.paid_at || payment.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }),
        planName: plan.name, amount: payment.amount, subtotal: payment.gross_amount ?? payment.amount, discount: payment.discount,
        method: payment.method === 'qrph' ? 'QR Ph' : 'Cash', reference: payment.provider_payment_id || payment.reference_number,
        cashTendered: payment.cash_tendered, changeGiven: payment.change_given, receivedBy: 'Front desk',
        gymName: settings.gym_name, businessLegalName: settings.business_legal_name, businessAddress: settings.business_address,
        businessTin: settings.business_tin, supportEmail: settings.support_email, supportPhone: settings.support_phone,
        receiptFooterNote: settings.receipt_footer_note,
      } });
    }
    res.json({ queued: true });
  } catch (error) { next(error); }
});

router.get('/clerk/payments/:id/receipt', async (req, res, next) => {
  try {
    const { data: payment, error } = await supabaseAdmin.from('payments')
      .select('*, memberships(start_date, end_date, membership_plans(*)), walk_in_visits!payments_walk_in_visit_id_fkey(guest_name, guest_email, customer_id, valid_until, membership_plans(*))')
      .eq('id', req.params.id).single();
    if (error || !payment) return res.status(404).json({ error: 'Payment not found.' });
    if (payment.status !== 'paid' || !payment.receipt_number) return res.status(400).json({ error: 'A receipt is available only after payment is paid.' });
    const profile = payment.member_id
      ? await supabaseAdmin.from('profiles').select('full_name, email, member_details(member_code)').eq('id', payment.member_id).single()
      : { data: null, error: null };
    if (profile.error) return next(profile.error);
    const visit = payment.walk_in_visits;
    const plan = payment.memberships?.membership_plans || visit?.membership_plans;
    const settings = await getGymSettings();
    const receipt = renderEmail('receipt', {
      isWalkIn: Boolean(payment.walk_in_visit_id), memberName: profile.data?.full_name || visit?.guest_name || 'Walk-in Guest',
      memberEmail: profile.data?.email || visit?.guest_email, memberCode: profile.data?.member_details?.member_code,
      receiptNumber: payment.receipt_number, dateTimePaid: new Date(payment.paid_at || payment.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }),
      planName: plan?.name, periodStart: payment.memberships?.start_date, periodEnd: payment.memberships?.end_date,
      amount: payment.amount, subtotal: payment.gross_amount ?? payment.amount, discount: payment.discount,
      method: payment.method === 'qrph' ? 'QR Ph' : 'Cash', reference: payment.provider_payment_id || payment.reference_number,
      cashTendered: payment.cash_tendered, changeGiven: payment.change_given, receivedBy: 'Front desk',
      gymName: settings.gym_name, businessLegalName: settings.business_legal_name, businessAddress: settings.business_address,
      businessTin: settings.business_tin, vatStatus: settings.vat_status, supportEmail: settings.support_email,
      supportPhone: settings.support_phone, receiptFooterNote: settings.receipt_footer_note,
    });
    res.type('html').send(receipt.html);
  } catch (error) { next(error); }
});

router.post('/clerk/payments/:id/cancel', async (req, res, next) => {
  try {
    const { data: current, error: findError } = await supabaseAdmin.from('payments').select('*').eq('id', req.params.id).eq('status', 'pending').single();
    if (findError || !current) return res.status(400).json({ error: 'Only pending payments can be cancelled.' });
    const payment = (await supabaseAdmin.from('payments').update({ status: 'cancelled', failure_reason: 'Cancelled by clerk' }).eq('id', req.params.id).eq('status', 'pending').select().single()).data;
    if (!payment) return res.status(400).json({ error: 'Only pending payments can be cancelled.' });
    try { await cancelPaymongoIntent(current.provider_intent_id); } catch (cancelError) {
      console.error(`Could not cancel PayMongo intent ${current.provider_intent_id}: ${cancelError.message}`);
    }
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

router.post('/clerk/promos/validate', async (req, res, next) => {
  try {
    const { code, plan_code, is_student = false } = req.body || {};
    if (!String(code || '').trim() || !plan_code) return res.status(422).json({ error: 'Promo code and plan are required.' });
    const plan = await getPlan(plan_code);
    const promo = await getPromo(code, plan.id);
    if (!promo) return res.status(422).json({ error: 'This promo code is invalid or expired.' });
    const pricing = priceFor(plan, Boolean(is_student), promo);
    res.json({ code: promo.code, discount: pricing.discount, total: pricing.amount });
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
          : item.type === 'registration' ? '/clerk/member-information' : '/clerk/notification'),
    }));
    const unreadByType = (data || []).reduce((counts, item) => {
      if (!item.read_at) counts[item.type] = (counts[item.type] || 0) + 1;
      return counts;
    }, {});
    res.json({ unread: unreadResult.count || 0, unread_by_type: unreadByType, latest });
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
    const unreadByType = {};
    for (const item of countRows) counts[item.type] = (counts[item.type] || 0) + 1;
    for (const item of countRows) if (!item.read_at) unreadByType[item.type] = (unreadByType[item.type] || 0) + 1;
    res.json({ rows: data || [], total: count || 0, page, limit, hasMore: (count || 0) > page * limit, counts, unread_by_type: unreadByType });
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
      defaultPaymentMethod: (value) => ['cash', 'qrph'].includes(value),
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
    const { data, error } = await supabaseAdmin.from('gym_settings').select('gym_name, address, phone, email, monday_saturday_open, monday_saturday_close, sunday_open, sunday_close, notifications, payment_modes').eq('id', true).maybeSingle();
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
      .select('id, amount, method, status, receipt_number, created_at, paid_at, member_id, membership_id, walk_in_visit_id, memberships(membership_plans(name)), walk_in_visits!payments_walk_in_visit_id_fkey(guest_name, guest_phone, guest_email, customer_id, plan_id, membership_plans(name), walk_in_customers(customer_code))')
      .gte('created_at', dayStart(`${from}T00:00:00+08:00`))
      .lt('created_at', nextDayStart(`${to}T00:00:00+08:00`))
      .order('created_at', { ascending: false });
    if (req.query.status) query = query.in('status', String(req.query.status).split(','));
    if (req.query.method) query = query.in('method', String(req.query.method).split(','));
    if (req.query.type === 'member') query = query.not('member_id', 'is', null);
    if (req.query.type === 'walkin') query = query.not('walk_in_visit_id', 'is', null);
    const { data: allData, error } = await query;
    if (error) return next(error);
    let data = allData || [];
    if (req.query.search) {
      const search = String(req.query.search).toLowerCase();
      const ids = [...new Set(data.map((payment) => payment.member_id).filter(Boolean))];
      const profilesResult = ids.length ? await supabaseAdmin.from('profiles').select('id, full_name, email').in('id', ids) : { data: [] };
      const matching = new Set((profilesResult.data || []).filter((profile) => `${profile.full_name} ${profile.email}`.toLowerCase().includes(search)).map((profile) => profile.id));
      const walkInMatches = data.filter((payment) => `${payment.walk_in_visits?.guest_name || ''} ${payment.walk_in_visits?.guest_phone || ''} ${payment.walk_in_visits?.guest_email || ''}`.toLowerCase().includes(search)).map((payment) => payment.id);
      data = data.filter((payment) => matching.has(payment.member_id) || walkInMatches.includes(payment.id) || payment.receipt_number?.toLowerCase().includes(search));
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
      customer_code: payment.walk_in_visits?.walk_in_customers?.customer_code || null,
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

router.post('/clerk/walkins/validate', async (req, res, next) => {
  try {
    const body = req.body || {};
    const plan = await getWalkInPlan();
    const validation = validateWalkInCustomer(body, { plan });
    if (!validation.valid) return res.status(422).json(walkInValidationResponse(validation.errors));
    const { full_name: name, phone, email } = validation.values;
    const profileResult = await supabaseAdmin.from('profiles').select('id, full_name, email, phone, status, member_details(member_code)').or(`phone.eq.${phone},email.eq.${email || 'none@example.invalid'}`).limit(10);
    if (profileResult.error) throw profileResult.error;
    for (const profile of profileResult.data || []) {
      const state = await getMembershipState(profile.id);
      if (state.current || state.queued.length) {
        return res.status(409).json({
          code: 'MEMBER_HAS_ACTIVE_PLAN',
          member_match: memberSummary(profile, profile.member_details),
          message: 'This person has an active or queued member plan.',
        });
      }
    }
    const customerResult = await supabaseAdmin.from('walk_in_customers').select('customer_code, visit_count, last_visit_at').or(`phone_normalized.eq.${phone},email_normalized.eq.${email || 'none@example.invalid'}`).limit(1).maybeSingle();
    if (customerResult.error) throw customerResult.error;
    res.json({
      valid: true,
      plan,
      returning: customerResult.data || null,
      member_match: (profileResult.data || [])[0] ? memberSummary(profileResult.data[0], profileResult.data[0].member_details) : null,
    });
  } catch (error) { next(error); }
});

router.post('/clerk/walkins/cash', async (req, res, next) => {
  try {
    const body = req.body || {};
    const plan = await getWalkInPlan();
    const validation = validateWalkInCustomer(body, { plan });
    if (!validation.valid) return res.status(422).json(walkInValidationResponse(validation.errors));
    const promo = await getPromo(body.promo_code || null, plan.id);
    const pricing = priceFor(plan, Boolean(body.is_student), promo);
    const tendered = Number(body.cash_tendered);
    if (!Number.isFinite(tendered) || tendered < pricing.amount) return res.status(422).json({ error: 'Cash tendered must cover the total amount due.' });
    const result = await createWalkInPayment({
      plan, guestName: validation.values.full_name, guestPhone: validation.values.phone, guestEmail: validation.values.email,
      isStudent: validation.values.is_student, notes: validation.values.notes, amount: pricing.amount, grossAmount: pricing.gross,
      discount: pricing.discount, promoId: promo?.id, method: 'cash', cashTendered: tendered,
      checkInNow: body.check_in_now !== false, actorId: req.user.id,
    });
    await auditPayment(req.user.id, 'walkin_payment_created', result.payment.id, { method: 'cash', walk_in_visit_id: result.visit.id });
    res.status(201).json({ ...result, change: Math.round((tendered - pricing.amount) * 100) / 100, receipt_number: result.payment.receipt_number });
  } catch (error) { next(error); }
});

router.post('/clerk/walkins/qrph', async (req, res, next) => {
  let intent;
  try {
    const paymentError = paymentMethodError((await getGymSettings()).payment_modes || ['cash', 'qrph'], 'qrph');
    if (paymentError) return res.status(400).json({ error: paymentError });
    const body = req.body || {};
    const plan = await getWalkInPlan();
    const validation = validateWalkInCustomer(body, { plan });
    if (!validation.valid) return res.status(422).json(walkInValidationResponse(validation.errors));
    const { full_name, phone, email } = validation.values;
    const pricing = priceFor(plan, Boolean(body.is_student), null);
    const { data, error } = await supabaseAdmin.from('registration_intents').insert({
      kind: 'walkin', email_normalized: email || `${phone}@walkin.invalid`, phone_normalized: phone,
      plan_id: plan.id, is_student: Boolean(body.is_student), amount_total: pricing.amount, method: 'qrph',
      form_encrypted: encryptFormForIntent({ ...body, full_name, phone, email }),
      expires_at: new Date(Date.now() + 300000).toISOString(), created_by: req.user.id,
    }).select().single();
    if (error) return next(error);
    intent = data;
    const qr = await createQrphPayment({ payment: intent, amount: pricing.amount, description: `FITMETRICS day pass - ${plan.name}`, metadata: { walkin_intent_id: intent.id }, expirySeconds: 300 });
    const updated = await supabaseAdmin.from('registration_intents').update({ provider_intent_id: qr.intentId, expires_at: qr.expiresAt }).eq('id', intent.id).select().single();
    if (updated.error) throw updated.error;
    res.status(201).json(qrPaymentResponse({ paymentId: intent.id, qrImageUrl: qr.imageUrl, expiresAt: qr.expiresAt, amountTotal: pricing.amount, simulationEnabled: process.env.NODE_ENV !== 'production' && process.env.ALLOW_PAYMENT_SIMULATION === 'true' }));
  } catch (error) {
    if (intent?.id) await supabaseAdmin.from('registration_intents').delete().eq('id', intent.id);
    next(error);
  }
});

router.get('/clerk/walkins/qrph/:id/status', async (req, res, next) => {
  try {
    const { data: intent, error } = await supabaseAdmin.from('registration_intents').select('*').eq('id', req.params.id).eq('kind', 'walkin').single();
    if (error || !intent) return res.status(404).json({ error: 'Walk-in QR payment was not found.' });
    if (intent.status === 'pending' && intent.provider_intent_id) {
      const remote = await getPaymongoIntent(intent.provider_intent_id);
      const attributes = remote?.data?.attributes || {};
      return res.json(await finalizeIntent(intent, {
        providerStatus: attributes.status, providerIntentId: intent.provider_intent_id,
        paidAmount: attributes.amount == null ? null : Number(attributes.amount) / 100,
        providerPaymentId: attributes.latest_payment_id, actorId: req.user.id, getPlan, getCoach, source: 'polling',
      }));
    }
    res.json(intent);
  } catch (error) { next(error); }
});

router.post('/clerk/walkins/qrph/:id/cancel', async (req, res, next) => {
  try {
    const { data: current, error: findError } = await supabaseAdmin.from('registration_intents').select('*').eq('id', req.params.id).eq('kind', 'walkin').single();
    if (findError || !current) return res.status(404).json({ error: 'Walk-in QR payment was not found.' });
    const { data, error } = await supabaseAdmin.from('registration_intents').update({ status: 'cancelled', form_encrypted: null }).eq('id', req.params.id).eq('kind', 'walkin').eq('status', 'pending').select('id, status').maybeSingle();
    if (error) return next(error);
    if (!data) return res.status(400).json({ error: 'Only a pending walk-in QR payment can be cancelled.' });
    try { await cancelPaymongoIntent(current.provider_intent_id); } catch (cancelError) { console.error(`Could not cancel walk-in PayMongo intent ${current.provider_intent_id}: ${cancelError.message}`); }
    res.json(data);
  } catch (error) { next(error); }
});

router.post('/clerk/walkins/qrph/:id/simulate-paid', requireRole('admin', 'clerk'), async (req, res, next) => {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_PAYMENT_SIMULATION !== 'true') return res.status(404).json({ error: 'Not found.' });
  try {
    const { data: intent, error } = await supabaseAdmin.from('registration_intents').select('*').eq('id', req.params.id).eq('kind', 'walkin').single();
    if (error || !intent) return res.status(404).json({ error: 'Walk-in QR payment was not found.' });
    const result = await finalizeIntent(intent, {
      providerStatus: 'succeeded', providerIntentId: intent.provider_intent_id, paidAmount: intent.amount_total,
      providerPaymentId: `sim_${intent.id}`, actorId: req.user.id, getPlan, getCoach, source: 'simulate',
    });
    await auditPayment(req.user.id, 'walkin_payment_simulated', intent.id, { simulated: true });
    res.json(result);
  } catch (error) { next(error); }
});

router.post('/clerk/payments', async (req, res, next) => {
  try {
    const {
      member_id, plan_code, is_student = false, payment_method = 'cash',
      guest_name, guest_phone, promo_code = null, coach_id = null, cash_tendered = null,
    } = req.body || {};
    if (!plan_code) return res.status(400).json({ error: 'A payment plan is required.' });
    const paymentModes = (await getGymSettings()).payment_modes || ['cash', 'qrph'];
    if (['gcash', 'maya'].includes(payment_method)) return res.status(410).json({ error: 'GCash and Maya are no longer supported. Use Cash or QR Ph.' });
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
      method: payment_method, actorId: req.user.id, cashTendered: cash_tendered,
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
  const states = await getMembershipState(ids);
  return (members || []).map((member) => {
    const state = states.get(member.id) || { current: null, queued: [], last_expired: null };
    const membership = state.current || state.queued[0] || state.last_expired || null;
    const status = memberStatus(member, membership, reminderDays);
    return {
      ...member,
      membership: membership ? { ...membership, queued: membership === state.queued[0], derived_status: status } : null,
      next_membership: state.queued[0] || null,
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
    await processEmailQueue();
    const { data: delivery, error: deliveryError } = await supabaseAdmin.from('email_log')
      .select('status, error, provider, provider_message_id').eq('id', queued.id).single();
    if (deliveryError) return next(deliveryError);
    if (delivery.status === 'failed') {
      return res.status(502).json({ error: delivery.error || 'The information email could not be delivered.' });
    }
    res.status(delivery.status === 'sent' ? 200 : 202).json({
      queued: delivery.status !== 'sent',
      sent: delivery.status === 'sent',
      email: queued,
      provider: delivery.provider || null,
    });
  } catch (error) { next(error); }
});

router.post('/clerk/register/validate', async (req, res, next) => {
  try {
    const body = req.body || {};
    const settings = await getGymSettings();
    if (!settings.allow_member_registrations) return res.status(403).json({ error: 'Member registrations are currently disabled in gym settings.' });
    if (body.field === 'email' || body.field === 'phone') {
      const value = body.field === 'email' ? normalizeEmail(body.value) : normalizePhone(body.value);
      const valid = body.field === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) : /^09\d{9}$/.test(value);
      if (!valid) return res.json({ exists: false, field: null, member: null });
      const conflict = await findRegistrationConflict({ [body.field]: value });
      if (!conflict) return res.json({ exists: false, field: null, member: null });
      return res.status(409).json({ exists: true, ...conflict, message: conflict.staff
        ? `This ${body.field} is used by a staff account and cannot be used for a member.`
        : `This ${body.field === 'phone' ? 'mobile number' : 'email'} is already registered.` });
    }
    const errors = registrationErrors(body);
    if (errors.plan_code) {
      const plan = await getPlan(body.plan_code).catch(() => null);
      if (!plan) errors.plan_code = 'Please choose an available membership plan to continue.';
    }
    if (Object.keys(errors).length) return res.status(422).json({ errors: Object.entries(errors).map(([field, message]) => ({ field, message })) });
    const conflicts = await findRegistrationConflicts(body);
    if (conflicts.length) {
      const conflict = conflicts[0];
      return res.status(409).json({
        ...conflict,
        matches: conflicts,
        message: conflict.code === 'REGISTRATION_PENDING' ? 'A registration for this person is waiting for payment.' : 'This member is already registered.',
      });
    }
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
    const paymentModes = (await getGymSettings()).payment_modes || ['cash', 'qrph'];
    const paymentError = paymentMethodError(paymentModes, 'qrph');
    if (paymentError) return res.status(400).json({ error: paymentError });
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
    res.status(201).json(qrPaymentResponse({
      paymentId: updated.id, qrImageUrl: qr.imageUrl, expiresAt: qr.expiresAt, amountTotal: total,
      simulationEnabled: process.env.NODE_ENV !== 'production' && process.env.ALLOW_PAYMENT_SIMULATION === 'true',
    }));
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
      const result = await finalizeIntent(intent, { providerStatus: attributes.status, providerIntentId: intent.provider_intent_id, paidAmount: attributes.amount == null ? null : Number(attributes.amount) / 100, actorId: req.user.id, getPlan, getCoach, providerPaymentId: attributes.latest_payment_id, source: 'polling' });
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

export const simulatePaidRegistration = async ({
  req, res, next,
  loadIntent = async (id) => supabaseAdmin.from('registration_intents').select('*').eq('id', id).single(),
  finalize = finalizeIntent,
  audit = auditPayment,
}) => {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_PAYMENT_SIMULATION !== 'true') return res.status(404).json({ error: 'Not found.' });
  try {
    const { data: intent, error } = await loadIntent(req.params.id);
    if (error || !intent) return res.status(404).json({ error: 'Registration payment not found.' });
    const result = await finalize(intent, { providerStatus: 'succeeded', providerIntentId: intent.provider_intent_id, paidAmount: intent.amount_total, actorId: req.user.id, getPlan, getCoach, providerPaymentId: `sim_${intent.id}`, source: 'simulate' });
    await audit(req.user.id, 'registration_payment_simulated', intent.id, { simulated: true });
    res.json(result);
  } catch (error) { next(error); }
};

router.post('/clerk/register/qrph/:id/simulate-paid', requireRole('admin', 'clerk'), (req, res, next) => simulatePaidRegistration({ req, res, next }));

router.post('/clerk/memberships', async (req, res, next) => {
  try {
    const { member_id, plan_code, coach_id, payment_method = 'cash', promo_code = null, cash_tendered = null } = req.body || {};
    const paymentError = paymentMethodError((await getGymSettings()).payment_modes || ['cash', 'qrph'], payment_method);
    if (paymentError) return res.status(400).json({ error: paymentError });
    if (!member_id || !plan_code) return res.status(400).json({ error: 'Member and plan are required.' });
    if (!['cash', 'qrph'].includes(payment_method)) return res.status(400).json({ error: 'Renewals support Cash or QR Ph.' });
    const plan = await getPlan(plan_code);
    const coach = await getCoach(coach_id);
    const promo = await getPromo(promo_code, plan.id);
    const pricing = priceFor(plan, Boolean(req.body?.is_student), promo);
    const coachAddonAmount = Number(coach?.addon_amount || coach?.monthly_price || 0);
    const total = pricing.amount + coachAddonAmount;
    if (payment_method === 'cash' && (!Number.isFinite(Number(cash_tendered)) || Number(cash_tendered) < total)) {
      return res.status(422).json({ error: 'Cash tendered must cover the total amount due.' });
    }
    if (payment_method === 'qrph') {
      await expirePendingQrPayments();
      const { data: waiting, error: waitingError } = await supabaseAdmin.from('payments')
        .select('*').eq('member_id', member_id).eq('method', 'qrph').eq('status', 'pending').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (waitingError) return next(waitingError);
      if (waiting) {
        const simulationEnabled = process.env.NODE_ENV !== 'production' && process.env.ALLOW_PAYMENT_SIMULATION === 'true';
        const summary = { payment_id: waiting.id, qr_image_url: null, expires_at: waiting.qr_expires_at, amount_total: Number(waiting.amount), plan_id: waiting.plan_id, coach_id: waiting.coach_id, simulation_enabled: simulationEnabled };
        if (waiting.plan_id === plan.id && (waiting.coach_id || null) === (coach?.id || null) && Number(waiting.amount) === total) {
          const remote = await getPaymongoIntent(waiting.provider_intent_id);
          const qrImageUrl = remote?.data?.attributes?.next_action?.code?.image_url;
          if (!qrImageUrl) return res.status(409).json({ error: 'The previous QR is no longer available. Cancel it and start a new one.', payment: summary });
          return res.status(200).json({ resumed: true, ...qrPaymentResponse({ paymentId: waiting.id, qrImageUrl, expiresAt: waiting.qr_expires_at, amountTotal: waiting.amount, simulationEnabled }) });
        }
        return res.status(409).json({ error: 'A QR payment with different renewal details is waiting.', payment: summary });
      }
      const { data: payment, error: paymentError } = await supabaseAdmin.from('payments').insert({
        member_id, plan_id: plan.id, amount: total, gross_amount: pricing.gross + coachAddonAmount,
        discount: pricing.discount, promo_id: promo?.id || null, method: 'qrph', status: 'pending',
        received_by: req.user.id, provider: 'paymongo', coach_id: coach?.id || null, coach_addon_amount: coachAddonAmount,
        send_receipt: true, qr_expires_at: new Date(Date.now() + 300000).toISOString(),
      }).select().single();
      if (paymentError) return next(paymentError);
      try {
        const qr = await createQrphPayment({ payment, amount: total, description: `FITMETRICS renewal - ${plan.name}`, metadata: { payment_id: payment.id, member_id }, expirySeconds: 300 });
        const { data: updated, error: updateError } = await supabaseAdmin.from('payments').update({ provider_intent_id: qr.intentId, qr_expires_at: qr.expiresAt }).eq('id', payment.id).select().single();
        if (updateError) throw updateError;
        await auditPayment(req.user.id, 'renewal_qr_started', payment.id, { method: 'qrph' });
        return res.status(201).json(qrPaymentResponse({
          paymentId: updated.id, qrImageUrl: qr.imageUrl, expiresAt: qr.expiresAt, amountTotal: total,
          simulationEnabled: process.env.NODE_ENV !== 'production' && process.env.ALLOW_PAYMENT_SIMULATION === 'true',
        }));
      } catch (error) {
        await supabaseAdmin.from('payments').update({ status: 'failed', failure_reason: error.message }).eq('id', payment.id);
        throw error;
      }
    }
    const result = await startClerkPayment({
      memberId: member_id, plan, promo, coach,       method: payment_method, actorId: req.user.id, cashTendered: cash_tendered,
      cashTendered: Number(cash_tendered),
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

    router.get('/clerk/members/lookup', async (req, res, next) => {
      try {
        const query = String(req.query.q || '').trim().slice(0, 100);
        if (query.length < 2) return res.json([]);
        const digits = query.replace(/\D/g, '');
        const normalized = digits.startsWith('63') && digits.length === 12 ? `0${digits.slice(2)}` : digits;
        const escapedQuery = escapePostgrestValue(query);
        const profileFilters = [`full_name.ilike.%${escapedQuery}%`, `email.ilike.%${escapedQuery}%`];
        if (normalized.length >= 3) profileFilters.push(`phone_normalized.ilike.%${escapePostgrestValue(normalized)}%`);
        const profileResult = await supabaseAdmin.from('profiles')
          .select('id, full_name, email, phone, phone_normalized, status, member_details(member_code)')
          .eq('role', 'member')
          .or(profileFilters.join(','))
          .limit(8);
        if (profileResult.error) return next(profileResult.error);
        const codeResult = await supabaseAdmin.from('member_details')
          .select('member_id, member_code')
          .ilike('member_code', `%${escapedQuery}%`)
          .limit(8);
        if (codeResult.error) return next(codeResult.error);
        const codeIds = (codeResult.data || []).map((row) => row.member_id);
        const extraMembers = codeIds.length
          ? await supabaseAdmin.from('profiles').select('id, full_name, email, phone, phone_normalized, status, member_details(member_code)').eq('role', 'member').in('id', codeIds)
          : { data: [], error: null };
        if (extraMembers.error) return next(extraMembers.error);
        const members = [...(profileResult.data || []), ...(extraMembers.data || [])]
          .filter((member, index, rows) => rows.findIndex((item) => item.id === member.id) === index)
          .slice(0, 8);
        const ids = members.map((member) => member.id);
        const states = await getMembershipState(ids);
        return res.json((members || []).map((member) => {
          const state = states.get(member.id) || { current: null, queued: [], last_expired: null };
          const membership = state.current || state.queued[0] || state.last_expired;
          const status = member.status === 'suspended' ? 'suspended'
            : state.current ? (new Date(`${state.current.end_date}T00:00:00+08:00`) - new Date()) < 7 * 86400000 ? 'expiring' : 'active'
              : state.queued[0] ? 'no_plan' : state.last_expired ? 'expired' : 'no_plan';
          return {
            id: member.id, full_name: member.full_name, member_code: member.member_details?.member_code || null,
            status, plan_name: membership?.membership_plans?.name || null, valid_until: membership?.end_date || null,
            email: member.email, phone: member.phone,
          };
        }));
      } catch (error) { return next(error); }
    });

    router.get('/clerk/attendance/live', async (_req, res, next) => {
      try {
        const { data, error } = await supabaseAdmin.from('attendance')
          .select('id, member_id, walk_in_visit_id, check_in_at, method, flagged, profiles:member_id(full_name, member_details(member_code)), memberships(membership_plans(name)), walk_in_visits(guest_name, membership_plans(name))')
          .eq('status', 'open').is('check_out_at', null).gte('check_in_at', dayStart()).order('check_in_at', { ascending: true });
        if (error) return next(error);
        const settings = await supabaseAdmin.from('gym_settings').select('floor_capacity').eq('id', true).maybeSingle();
        if (settings.error) return next(settings.error);
        return res.json({
          capacity: Number(settings.data?.floor_capacity || 50),
          people: (data || []).map((row) => ({
            id: row.id, name: row.profiles?.full_name || row.walk_in_visits?.guest_name || 'Walk-in Guest',
            code: row.profiles?.member_details?.member_code || null, plan: row.memberships?.membership_plans?.name || row.walk_in_visits?.membership_plans?.name || 'Day pass',
            method: row.method, check_in_at: row.check_in_at, flagged: Boolean(row.flagged),
          })),
        });
      } catch (error) { return next(error); }
    });

    router.get('/clerk/attendance/log', async (req, res, next) => {
      try {
        const value = String(req.query.date || today());
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return res.status(400).json({ error: 'Invalid attendance date.' });
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
        const end = new Date(`${value}T00:00:00+08:00`);
        end.setDate(end.getDate() + 1);
        let query = supabaseAdmin.from('attendance')
          .select('id, check_in_at, check_out_at, method, status, flagged, recorded_by, member_id, profiles:member_id(full_name, member_details(member_code)), memberships(membership_plans(name))', { count: 'exact' })
          .gte('check_in_at', `${value}T00:00:00+08:00`).lt('check_in_at', end.toISOString());
        if (req.query.state === 'in') query = query.is('check_out_at', null);
        if (req.query.state === 'out') query = query.not('check_out_at', 'is', null);
        const search = String(req.query.search || '').trim();
        if (search) {
          const escaped = escapePostgrestValue(search);
          query = query.or(`full_name.ilike.%${escaped}%,member_details.member_code.ilike.%${escaped}%`, { foreignTable: 'profiles' });
        }
        const { data, error, count } = await query.order('check_in_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
        if (error) return next(error);
        return res.json({ rows: (data || []).map((row) => ({ ...row, member_name: row.profiles?.full_name || 'Walk-in Guest', plan_name: row.memberships?.membership_plans?.name || 'Day pass', duration_minutes: row.check_out_at ? Math.round((new Date(row.check_out_at) - new Date(row.check_in_at)) / 60000) : null })), total: count || 0, page, limit });
      } catch (error) { return next(error); }
    });

    router.get('/clerk/attendance/stats', async (req, res, next) => {
      try {
        const value = String(req.query.date || today());
        const { data, error } = await supabaseAdmin.from('attendance').select('check_in_at, check_out_at, method, flagged, status')
          .gte('check_in_at', `${value}T00:00:00+08:00`).lt('check_in_at', `${value}T23:59:59+08:00`);
        if (error) return next(error);
        const rows = (data || []).filter((row) => row.status === 'open' || row.check_out_at);
        const open = rows.filter((row) => row.status === 'open' && !row.check_out_at);
        const hours = rows.map((row) => Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hour12: false }).format(new Date(row.check_in_at))));
        const peak = hours.length ? Object.entries(hours.reduce((all, hour) => ({ ...all, [hour]: (all[hour] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1])[0][0] : null;
        return res.json({ on_floor: open.length, check_ins: rows.length, qr_check_ins: rows.filter((row) => ['qr', 'qr_phone'].includes(row.method)).length, desk_check_ins: rows.filter((row) => row.method === 'manual').length, peak_hour: peak, flagged_count: rows.filter((row) => row.flagged).length });
      } catch (error) { return next(error); }
    });

    router.post('/clerk/attendance/:id/check-out', async (req, res, next) => {
      try {
        const { data, error } = await supabaseAdmin.from('attendance').update({ check_out_at: new Date().toISOString(), status: 'completed', checked_out_via: 'clerk' })
          .eq('id', req.params.id).is('check_out_at', null).select().single();
        if (error) return res.status(error.code === 'PGRST116' ? 404 : 400).json({ error: 'That check-in is already closed or missing.' });
        await supabaseAdmin.from('audit_log').insert({ actor_id: req.user.id, action: 'attendance_manual_checkout', entity_type: 'attendance', entity_id: data.id, details: { checked_out_via: 'clerk' } });
        return res.json(data);
      } catch (error) { return next(error); }
    });

    router.post('/clerk/attendance/check-out-all', async (req, res, next) => {
      try {
        const { data, error } = await supabaseAdmin.from('attendance').update({ check_out_at: new Date().toISOString(), status: 'completed', checked_out_via: 'clerk' })
          .eq('status', 'open').is('check_out_at', null).gte('check_in_at', dayStart()).select('id');
        if (error) return next(error);
        await supabaseAdmin.from('audit_log').insert({ actor_id: req.user.id, action: 'attendance_manual_checkout_all', entity_type: 'attendance', details: { count: data?.length || 0 } });
        return res.json({ count: data?.length || 0 });
      } catch (error) { return next(error); }
    });

    router.get('/clerk/attendance/qr-codes', async (_req, res, next) => {
      try {
        const { data, error } = await supabaseAdmin.from('checkin_qr_codes').select('id, label, expires_at, revoked_at, created_at, last_used_at, scan_count').order('created_at', { ascending: false });
        if (error) return next(error);
        return res.json(data || []);
      } catch (error) { return next(error); }
    });

    router.post('/clerk/attendance/qr-codes', async (req, res, next) => {
      try {
        const label = String(req.body?.label || '').trim();
        const validFor = String(req.body?.valid_for || 'until_revoked');
        if (!label || label.length > 80 || !['day', '7d', '30d', 'until_revoked'].includes(validFor)) return res.status(422).json({ error: 'Enter a label and valid QR duration.' });
        const base = process.env.PUBLIC_APP_URL;
        if (!base || /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(base)) {
          return res.status(503).json({ error: 'Public app URL is not configured for phone check-in QR codes.' });
        }
        const secret = process.env.CHECKIN_CONFIRM_SECRET;
        if (!secret) return res.status(503).json({ error: 'Check-in QR security is not configured.' });
        const token = crypto.randomBytes(32).toString('base64url');
        const expires = validFor === 'until_revoked' ? null : new Date(Date.now() + ({ day: 86400000, '7d': 604800000, '30d': 2592000000 }[validFor])).toISOString();
        const { data, error } = await supabaseAdmin.from('checkin_qr_codes').insert({ label, token_hash: crypto.createHash('sha256').update(`${secret}:${token}`).digest('hex'), expires_at: expires, created_by: req.user.id }).select('id, label, expires_at, created_at').single();
        if (error) return next(error);
        await supabaseAdmin.from('audit_log').insert({ actor_id: req.user.id, action: 'attendance_qr_created', entity_type: 'checkin_qr_code', entity_id: data.id, details: { label, valid_for: validFor } });
        return res.status(201).json({ ...data, token, url: `${base}/check-in?t=${encodeURIComponent(token)}` });
      } catch (error) { return next(error); }
    });

    router.post('/clerk/attendance/qr-codes/:id/revoke', async (req, res, next) => {
      try {
        const { data, error } = await supabaseAdmin.from('checkin_qr_codes').update({ revoked_at: new Date().toISOString() }).eq('id', req.params.id).is('revoked_at', null).select('id').single();
        if (error) return res.status(404).json({ error: 'QR code not found or already revoked.' });
        await supabaseAdmin.from('audit_log').insert({ actor_id: req.user.id, action: 'attendance_qr_revoked', entity_type: 'checkin_qr_code', entity_id: data.id, details: {} });
        return res.json({ revoked: true });
      } catch (error) { return next(error); }
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
    const [attendance, payments, registrations, settings] = await Promise.all([
      supabaseAdmin.from('attendance').select('id, member_id, check_in_at, check_out_at, status').eq('status', 'open').is('check_out_at', null).gte('check_in_at', dayStart()).lt('check_in_at', nextDayStart()),
      supabaseAdmin.from('payments').select('amount, method').eq('status', 'paid').gte('paid_at', dayStart()).lt('paid_at', nextDayStart()),
      supabaseAdmin.from('profiles').select('id').eq('role', 'member').gte('created_at', dayStart()).lt('created_at', nextDayStart()),
      supabaseAdmin.from('gym_settings').select('floor_capacity').eq('id', true).maybeSingle(),
    ]);
    const failure = [attendance, payments, registrations, settings].find((result) => result.error);
    if (failure) return next(failure.error);
    const total = payments.data.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const cash = payments.data.filter((payment) => payment.method === 'cash').reduce((sum, payment) => sum + Number(payment.amount), 0);
    const gcash = payments.data.filter((payment) => payment.method === 'gcash').reduce((sum, payment) => sum + Number(payment.amount), 0);
    const maya = payments.data.filter((payment) => payment.method === 'maya').reduce((sum, payment) => sum + Number(payment.amount), 0);
    const recentResult = await supabaseAdmin.from('payments')
      .select('id, amount, method, created_at, member_id, memberships(membership_plans(name)), walk_in_visits!payments_walk_in_visit_id_fkey(guest_name, membership_plans(name))')
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
      .select('id, member_id, walk_in_visit_id, check_in_at, method, memberships(membership_plans(name)), walk_in_visits(guest_name)')
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
      display_name: attendanceProfileMap.get(row.member_id)?.full_name || row.walk_in_visits?.guest_name || 'Walk-in Guest',
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
    const qrph = payments.data.filter((payment) => payment.method === 'qrph').reduce((sum, payment) => sum + Number(payment.amount), 0);
    res.json({ checkIns: attendance.data.length, activeOnFloor: attendance.data.length, openSessions: attendance.data.length, registrations: registrations.data.length, capacity: Number(settings.data?.floor_capacity || 50), totalCollected: total, cashCollected: cash, gcashCollected: gcash, mayaCollected: maya, qrphCollected: qrph, eWalletCollected: gcash + maya + qrph, cashTransactions: payments.data.filter((payment) => payment.method === 'cash').length, eWalletTransactions: payments.data.filter((payment) => ['gcash', 'maya', 'qrph'].includes(payment.method)).length, transactionCount: payments.data.length, recentPayments, recentAttendance, expiringSoon, updatedAt: new Date().toISOString() });
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

router.post('/clerk/members/:memberId/check-in-devices/reset', async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin.from('member_check_in_devices')
      .update({ revoked_at: new Date().toISOString() }).eq('member_id', req.params.memberId).is('revoked_at', null);
    if (error) return next(error);
    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({
      actor_id: req.user.id, action: 'checkin_devices_reset', entity_type: 'member', entity_id: req.params.memberId, details: {},
    });
    if (auditError) return next(auditError);
    return res.json({ ok: true });
  } catch (error) { return next(error); }
});

export default router;
