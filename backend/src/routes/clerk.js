import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createMembershipAndPayment, queueReceiptEmail } from '../services/membership.js';
import { enqueueEmail } from '../services/emailQueue.js';
import { notifyStaff } from '../services/notify.js';
import { dayStart, nextDayStart, today } from '../utils/time.js';
import { getPromo, priceFor } from './paymongo.js';

const router = Router();
router.use('/clerk', requireAuth, requireRole('admin', 'clerk'));

const getPlan = async (planIdOrCode) => {
  let query = supabaseAdmin.from('membership_plans').select('*').eq('active', true);
  query = planIdOrCode?.length === 36 ? query.eq('id', planIdOrCode) : query.eq('code', planIdOrCode);
  const { data, error } = await query.single();
  if (error || !data) throw new Error('The selected membership plan is unavailable.');
  return data;
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
    const { data, error } = await supabaseAdmin.from('membership_plans').select('*').eq('active', true).order('duration_days');
    if (error) return next(error);
    res.json(data);
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

router.get('/clerk/coaches', async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('coaches').select('*').eq('active', true).order('display_name');
    if (error) return next(error);
    res.json(data);
  } catch (error) { next(error); }
});

router.get('/clerk/notifications', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('notifications').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
    if (error) return next(error);
    res.json(data || []);
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
    const { error } = await supabaseAdmin.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', req.user.id).is('read_at', null);
    if (error) return next(error);
    res.json({ ok: true });
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
    const date = String(req.query.date || today());
    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('id, amount, method, status, receipt_number, created_at, paid_at, member_id, membership_id, walk_in_visit_id, memberships(membership_plans(name)), walk_in_visits(guest_name, guest_phone, plan_id, membership_plans(name))')
      .in('status', req.query.status ? String(req.query.status).split(',') : ['paid', 'pending', 'failed', 'expired'])
      .gte('created_at', dayStart(`${date}T00:00:00+08:00`))
      .lt('created_at', nextDayStart(`${date}T00:00:00+08:00`))
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return next(error);
    const memberIds = [...new Set((data || []).map((payment) => payment.member_id).filter(Boolean))];
    let profiles = [];
    if (memberIds.length) {
      const result = await supabaseAdmin.from('profiles').select('id, full_name, email').in('id', memberIds);
      if (result.error) return next(result.error);
      profiles = result.data || [];
    }
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    res.json((data || []).map((payment) => ({
      ...payment,
      profile: payment.member_id ? profileMap.get(payment.member_id) || null : null,
      display_name: profileMap.get(payment.member_id)?.full_name || payment.walk_in_visits?.guest_name || 'Walk-in Guest',
      plan_name: payment.memberships?.membership_plans?.name || payment.walk_in_visits?.membership_plans?.name || 'Payment',
    })));
  } catch (error) { next(error); }
});

router.post('/clerk/payments', async (req, res, next) => {
  try {
    const {
      member_id, plan_code, is_student = false, payment_method = 'cash',
      guest_name, guest_phone, promo_code = null,
    } = req.body || {};
    if (!plan_code) return res.status(400).json({ error: 'A payment plan is required.' });
    const plan = await getPlan(plan_code);
    const promo = await getPromo(promo_code, plan.id);
    const pricing = priceFor(plan, Boolean(is_student), promo);
    if (plan.code === 'session') {
      if (!guest_name && !guest_phone) return res.status(400).json({ error: 'Walk-in name or phone is required.' });
      const result = await createWalkInPayment({
        plan, guestName: guest_name, guestPhone: guest_phone,
        amount: pricing.amount, grossAmount: pricing.gross, discount: pricing.discount, promoId: promo?.id,
        method: payment_method, actorId: req.user.id,
      });
      return res.status(201).json({ plan, ...result });
    }
    if (!member_id) return res.status(400).json({ error: 'Select a member for this membership payment.' });
    const result = await createMembershipAndPayment({
      memberId: member_id, plan, amount: pricing.amount, grossAmount: pricing.gross,
      discount: pricing.discount, method: payment_method, actorId: req.user.id,
    });

    res.status(201).json({ plan, ...result });
  } catch (error) { next(error); }
});

router.get('/clerk/members', async (req, res, next) => {
  try {
    const search = String(req.query.search || '').replace(/[%,()]/g, '');
    let query = supabaseAdmin.from('profiles').select('id, email, username, full_name, phone, status, created_at, member_details(*)').eq('role', 'member').order('full_name');
    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,username.ilike.%${search}%`);
    const { data: members, error } = await query;
    if (error) return next(error);
    const ids = members.map((member) => member.id);
    const { data: memberships, error: membershipError } = ids.length
      ? await supabaseAdmin.from('memberships').select('*, membership_plans(*), coaches(*)').in('member_id', ids).order('created_at', { ascending: false })
      : { data: [], error: null };
    if (membershipError) return next(membershipError);
    const latest = new Map();
    memberships.forEach((membership) => { if (!latest.has(membership.member_id)) latest.set(membership.member_id, membership); });
    res.json(members.map((member) => ({ ...member, membership: latest.get(member.id) || null })));
  } catch (error) { next(error); }
});

router.post('/clerk/members/:id/information-email', async (req, res, next) => {
  try {
    const { data: member, error: memberError } = await supabaseAdmin.from('profiles')
      .select('id, email, full_name, phone, member_details(member_code), memberships!memberships_member_id_fkey(end_date, status, membership_plans(name))')
      .eq('id', req.params.id).eq('role', 'member').single();
    if (memberError) return next(memberError);
    if (!member.email) return res.status(400).json({ error: 'This member has no email address.' });
    const activeMembership = (member.memberships || []).find((item) => item.status === 'active');
    const queued = await enqueueEmail({
      emailType: 'information_overview',
      recipient: member.email,
      payload: {
        memberName: member.full_name,
        memberCode: member.member_details?.member_code,
        phone: member.phone,
        planName: activeMembership?.membership_plans?.name,
        expiryDate: activeMembership?.end_date,
      },
    });
    res.status(202).json({ queued: true, email: queued });
  } catch (error) { next(error); }
});

router.post('/clerk/register', async (req, res, next) => {
  try {
    const {
      email, username, password, full_name, phone, gender,
      emergency_contact_name, emergency_contact_phone, birthdate, address,
      is_student = false, plan_code, coach_id, coach_addon_amount = 0, payment_method = 'cash',
    } = req.body || {};
    if (!email || !password || !full_name || !plan_code) return res.status(400).json({ error: 'Name, email, password, and membership plan are required.' });
    const plan = await getPlan(plan_code);
    const coach = await getCoach(coach_id);
    const amount = is_student && plan.student_price !== null ? plan.student_price : plan.price;
    if (plan.code === 'session') {
      const result = await createWalkInPayment({
        plan,
        guestName: full_name,
        guestPhone: phone,
        amount: Number(amount) + Number(coach_addon_amount),
        method: payment_method,
        actorId: req.user.id,
      });
      return res.status(201).json({ plan, ...result, message: 'Session pass payment recorded for the walk-in visitor.' });
    }
    const { data: auth, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(), password, email_confirm: true,
      user_metadata: { username, full_name, phone, gender, emergency_contact_name, emergency_contact_phone },
      app_metadata: { role: 'member' },
    });
    if (authError) return res.status(400).json({ error: authError.message });
    const memberId = auth.user.id;
    const { error: detailError } = await supabaseAdmin.from('member_details').insert({
      member_id: memberId, member_code: `FM-${memberId.slice(0, 8).toUpperCase()}`,
      birthdate: birthdate || null, address: address || null, is_student, join_date: today(),
    });
    if (detailError) {
      await supabaseAdmin.auth.admin.deleteUser(memberId);
      return res.status(400).json({ error: detailError.message });
    }
    try {
      const result = await createMembershipAndPayment({ memberId, plan, coachId: coach?.id, coachAddonAmount: coach_addon_amount, amount, method: payment_method, actorId: req.user.id });
        await notifyStaff({ type: 'system', title: 'New member registered', message: `${full_name} registered for ${plan.name}.`, meta: { member_id: memberId } });
        res.status(201).json({ member: auth.user, plan, ...result });
    } catch (error) {
      await supabaseAdmin.auth.admin.deleteUser(memberId);
      throw error;
    }
  } catch (error) { next(error); }
});

router.post('/clerk/memberships', async (req, res, next) => {
  try {
    const { member_id, plan_code, coach_id, coach_addon_amount = 0, payment_method = 'cash' } = req.body || {};
    if (!member_id || !plan_code) return res.status(400).json({ error: 'Member and plan are required.' });
    const plan = await getPlan(plan_code);
    const coach = await getCoach(coach_id);
    const result = await createMembershipAndPayment({ memberId: member_id, plan, coachId: coach?.id, coachAddonAmount: coach_addon_amount, method: payment_method, actorId: req.user.id });
    res.status(201).json(result);
  } catch (error) { next(error); }
});

router.post('/clerk/attendance', async (req, res, next) => {
  try {
    const { member_id, method = 'manual' } = req.body || {};
    if (!member_id) return res.status(400).json({ error: 'Member is required.' });
    const { data: membership } = await supabaseAdmin.from('memberships').select('id, end_date, status').eq('member_id', member_id).eq('status', 'active').gte('end_date', today()).order('end_date', { ascending: false }).limit(1).maybeSingle();
    if (!membership) return res.status(400).json({ error: 'Member membership is expired or inactive.' });
    const { data: openCheckIn } = await supabaseAdmin.from('attendance').select('id').eq('member_id', member_id).is('check_out_at', null).eq('status', 'open').limit(1).maybeSingle();
    if (openCheckIn) return res.status(409).json({ error: 'This member already has an open check-in.' });
    const { data, error } = await supabaseAdmin.from('attendance').insert({ member_id, membership_id: membership.id, method, recorded_by: req.user.id }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    await notifyStaff({ type: 'system', title: 'Member checked in', message: `A member checked in using ${method}.`, meta: { member_id } });
    res.status(201).json(data);
  } catch (error) { next(error); }
});

router.get('/clerk/dashboard', async (_req, res, next) => {
  try {
    const date = today();
    const [attendance, payments, members, registrations] = await Promise.all([
      supabaseAdmin.from('attendance').select('id, member_id, check_in_at, check_out_at').gte('check_in_at', dayStart()).lt('check_in_at', nextDayStart()),
      supabaseAdmin.from('payments').select('amount, method').eq('status', 'paid').gte('created_at', dayStart()).lt('created_at', nextDayStart()),
      supabaseAdmin.from('attendance').select('member_id').gte('check_in_at', dayStart()).lt('check_in_at', nextDayStart()).is('check_out_at', null),
      supabaseAdmin.from('profiles').select('id').eq('role', 'member').gte('created_at', dayStart()).lt('created_at', nextDayStart()),
    ]);
    const failure = [attendance, payments, members, registrations].find((result) => result.error);
    if (failure) return next(failure.error);
    const total = payments.data.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const cash = payments.data.filter((payment) => payment.method === 'cash').reduce((sum, payment) => sum + Number(payment.amount), 0);
    const recentResult = await supabaseAdmin.from('payments')
      .select('id, amount, method, created_at, member_id, memberships(membership_plans(name)), walk_in_visits(guest_name, membership_plans(name))')
      .eq('status', 'paid').gte('created_at', dayStart()).lt('created_at', nextDayStart())
      .order('created_at', { ascending: false }).limit(4);
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
    res.json({ checkIns: attendance.data.length, activeOnFloor: new Set(members.data.map((row) => row.member_id)).size, registrations: registrations.data.length, totalCollected: total, cashCollected: cash, eWalletCollected: total - cash, cashTransactions: payments.data.filter((payment) => payment.method === 'cash').length, eWalletTransactions: payments.data.filter((payment) => payment.method !== 'cash').length, transactionCount: payments.data.length, recentPayments, recentAttendance, expiringSoon });
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
