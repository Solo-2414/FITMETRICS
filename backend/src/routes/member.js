import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getMembershipState } from '../services/membershipState.js';
import { queueReceiptEmail } from '../services/membership.js';

const router = Router();
router.use('/member', requireAuth, requireRole('member'));

router.get('/member/dashboard', async (req, res, next) => {
  try {
    const [membershipState, attendance, notifications, settings] = await Promise.all([
      getMembershipState(req.user.id),
      supabaseAdmin
        .from('member_attendance_summary')
        .select('*')
        .eq('member_id', req.user.id)
        .maybeSingle(),
      supabaseAdmin
        .from('notifications')
        .select('id, title, message, type, announcement_id, read_at, created_at')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabaseAdmin.from('gym_settings').select('show_live_capacity').eq('id', true).maybeSingle(),
    ]);
    const failure = [attendance, notifications, settings].find((item) => item.error);
    if (failure) return next(failure.error);
    res.json({
      membership: membershipState.current,
      next_membership: membershipState.queued[0] || null,
      attendance: attendance.data,
      notifications: notifications.data || [],
      showLiveCapacity: settings.data?.show_live_capacity ?? true,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/member/membership', async (req, res, next) => {
  try {
    const [membershipState, plans, coaches] = await Promise.all([
      getMembershipState(req.user.id),
      supabaseAdmin.from('membership_plans').select('*').eq('active', true).order('duration_days'),
      supabaseAdmin.from('coaches').select('*').eq('active', true).order('display_name'),
    ]);
    const failure = [plans, coaches].find((item) => item.error);
    if (failure) return next(failure.error);
    res.json({
      current: membershipState.current,
      next_membership: membershipState.queued[0] || null,
      plans: plans.data || [],
      coaches: coaches.data || [],
    });
  } catch (error) {
    next(error);
  }
});

router.get('/member/billing', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('member_billing_history')
      .select('*')
      .eq('member_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) return next(error);
    res.json(data || []);
  } catch (error) {
    next(error);
  }
});

router.post('/member/billing/:id/send-receipt', async (req, res, next) => {
  try {
    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .select('*, memberships(start_date, end_date, membership_plans(*))')
      .eq('id', req.params.id)
      .eq('member_id', req.user.id)
      .maybeSingle();
    if (error) return next(error);
    if (!payment) return res.status(404).json({ error: 'Payment not found.' });
    if (String(payment.status).toLowerCase() !== 'paid' || !payment.receipt_number) {
      return res.status(400).json({ error: 'An official receipt is available only for paid payments.' });
    }

    const plan = payment.memberships?.membership_plans;
    if (!plan) return res.status(400).json({ error: 'Payment plan details are unavailable.' });

    await queueReceiptEmail({
      memberId: req.user.id,
      plan,
      payment,
      dedupeKey: `payment:${payment.id}:member-resend:${Date.now()}`,
    });
    return res.json({ queued: true });
  } catch (error) {
    return next(error);
  }
});

router.get('/member/notifications', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) return next(error);
    res.json(data || []);
  } catch (error) {
    next(error);
  }
});

router.patch('/member/notifications/:id', async (req, res, next) => {
  try {
    const updates = { read_at: req.body?.read === false ? null : new Date().toISOString() };
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();
    if (error) return next(error);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.patch('/member/notifications', async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', req.user.id)
      .is('read_at', null);
    if (error) return next(error);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get('/member/check-in-devices', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('member_check_in_devices')
      .select('id, label, created_at, last_used_at, expires_at')
      .eq('member_id', req.user.id)
      .is('revoked_at', null)
      .order('last_used_at', { ascending: false });
    if (error) return next(error);
    return res.json(data || []);
  } catch (error) {
    return next(error);
  }
});

router.delete('/member/check-in-devices/:id', async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('member_check_in_devices')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('member_id', req.user.id)
      .is('revoked_at', null);
    if (error) return next(error);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
