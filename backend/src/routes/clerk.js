import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin', 'clerk'));

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (date, days) => {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + Number(days) - 1);
  return result.toISOString().slice(0, 10);
};

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

const createMembershipAndPayment = async ({ memberId, plan, coachId, coachAddonAmount = 0, amount = plan.price, method, actorId }) => {
  const startDate = today();
  const endDate = addDays(startDate, plan.duration_days);
  const { data: membership, error: membershipError } = await supabaseAdmin.from('memberships').insert({
    member_id: memberId,
    plan_id: plan.id,
    coach_id: coachId || null,
    coach_addon_amount: coachAddonAmount,
    start_date: startDate,
    end_date: endDate,
    status: 'active',
    created_by: actorId,
  }).select().single();
  if (membershipError) throw new Error(membershipError.message);

  const { data: payment, error: paymentError } = await supabaseAdmin.from('payments').insert({
    member_id: memberId,
    membership_id: membership.id,
    amount: Number(amount) + Number(coachAddonAmount),
    gross_amount: Number(amount) + Number(coachAddonAmount),
    method,
    status: 'paid',
    received_by: actorId,
    paid_at: new Date().toISOString(),
  }).select().single();
  if (paymentError) {
    await supabaseAdmin.from('memberships').delete().eq('id', membership.id);
    throw new Error(paymentError.message);
  }
  return { membership, payment };
};

const createWalkInPayment = async ({ plan, guestName, guestPhone, amount, method, actorId }) => {
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
    amount: Number(amount),
    gross_amount: Number(amount),
    method,
    status: 'paid',
    received_by: actorId,
    paid_at: new Date().toISOString(),
  }).select().single();
  if (paymentError) {
    await supabaseAdmin.from('walk_in_visits').delete().eq('id', visit.id);
    throw new Error(paymentError.message);
  }
  return { visit, payment };
};

router.get('/clerk/plans', async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('membership_plans').select('*').eq('active', true).order('duration_days');
    if (error) return next(error);
    res.json(data);
  } catch (error) { next(error); }
});

router.get('/clerk/coaches', async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('coaches').select('*').eq('active', true).order('display_name');
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
      .eq('status', 'paid')
      .gte('created_at', `${date}T00:00:00.000Z`)
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
      guest_name, guest_phone,
    } = req.body || {};
    if (!plan_code) return res.status(400).json({ error: 'A payment plan is required.' });
    const plan = await getPlan(plan_code);
    const amount = is_student && plan.student_price !== null ? plan.student_price : plan.price;
    if (plan.code === 'session') {
      if (!guest_name && !guest_phone) return res.status(400).json({ error: 'Walk-in name or phone is required.' });
      const result = await createWalkInPayment({
        plan, guestName: guest_name, guestPhone: guest_phone,
        amount, method: payment_method, actorId: req.user.id,
      });
      return res.status(201).json({ plan, ...result });
    }
    if (!member_id) return res.status(400).json({ error: 'Select a member for this membership payment.' });
    const result = await createMembershipAndPayment({
      memberId: member_id, plan, amount, method: payment_method, actorId: req.user.id,
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
    if (!membership) return res.status(400).json({ error: 'Member has no active membership.' });
    const { data, error } = await supabaseAdmin.from('attendance').insert({ member_id, membership_id: membership.id, method, recorded_by: req.user.id }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (error) { next(error); }
});

router.get('/clerk/dashboard', async (_req, res, next) => {
  try {
    const date = today();
    const [attendance, payments, members, registrations] = await Promise.all([
      supabaseAdmin.from('attendance').select('id, member_id, check_in_at, check_out_at').gte('check_in_at', `${date}T00:00:00.000Z`),
      supabaseAdmin.from('payments').select('amount, method').eq('status', 'paid').gte('created_at', `${date}T00:00:00.000Z`),
      supabaseAdmin.from('attendance').select('member_id').gte('check_in_at', `${date}T00:00:00.000Z`).is('check_out_at', null),
      supabaseAdmin.from('profiles').select('id').eq('role', 'member').gte('created_at', `${date}T00:00:00.000Z`),
    ]);
    const failure = [attendance, payments, members, registrations].find((result) => result.error);
    if (failure) return next(failure.error);
    const total = payments.data.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const cash = payments.data.filter((payment) => payment.method === 'cash').reduce((sum, payment) => sum + Number(payment.amount), 0);
    const recentResult = await supabaseAdmin.from('payments')
      .select('id, amount, method, created_at, member_id, memberships(membership_plans(name)), walk_in_visits(guest_name, membership_plans(name))')
      .eq('status', 'paid').gte('created_at', `${date}T00:00:00.000Z`)
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
      .gte('check_in_at', `${date}T00:00:00.000Z`)
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
    res.json({ checkIns: attendance.data.length, activeOnFloor: new Set(members.data.map((row) => row.member_id)).size, registrations: registrations.data.length, totalCollected: total, cashCollected: cash, eWalletCollected: total - cash, cashTransactions: payments.data.filter((payment) => payment.method === 'cash').length, eWalletTransactions: payments.data.filter((payment) => payment.method !== 'cash').length, transactionCount: payments.data.length, recentPayments, recentAttendance });
  } catch (error) { next(error); }
});

export default router;
