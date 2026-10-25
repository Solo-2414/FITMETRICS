import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use('/member', requireAuth, requireRole('member'));

router.get('/member/dashboard', async (req, res, next) => {
  try {
    const [membership, attendance, notifications, settings] = await Promise.all([
      supabaseAdmin.from('memberships').select('*, membership_plans(*), coaches(*)').eq('member_id', req.user.id).order('end_date', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('member_attendance_summary').select('*').eq('member_id', req.user.id).maybeSingle(),
      supabaseAdmin.from('notifications').select('id, title, message, type, announcement_id, read_at, created_at').eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(5),
      supabaseAdmin.from('gym_settings').select('show_live_capacity').eq('id', true).maybeSingle(),
    ]);
    const failure = [membership, attendance, notifications, settings].find((item) => item.error);
    if (failure) return next(failure.error);
    res.json({ membership: membership.data, attendance: attendance.data, notifications: notifications.data || [], showLiveCapacity: settings.data?.show_live_capacity ?? true });
  } catch (error) { next(error); }
});

router.get('/member/membership', async (req, res, next) => {
  try {
    const [current, plans, coaches] = await Promise.all([
      supabaseAdmin.from('memberships').select('*, membership_plans(*), coaches(*)').eq('member_id', req.user.id).order('end_date', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('membership_plans').select('*').eq('active', true).order('duration_days'),
      supabaseAdmin.from('coaches').select('*').eq('active', true).order('display_name'),
    ]);
    const failure = [current, plans, coaches].find((item) => item.error);
    if (failure) return next(failure.error);
    res.json({ current: current.data, plans: plans.data || [], coaches: coaches.data || [] });
  } catch (error) { next(error); }
});

router.get('/member/billing', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('member_billing_history').select('*').eq('member_id', req.user.id).order('created_at', { ascending: false });
    if (error) return next(error);
    res.json(data || []);
  } catch (error) { next(error); }
});

router.get('/member/notifications', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('notifications').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
    if (error) return next(error);
    res.json(data || []);
  } catch (error) { next(error); }
});

router.patch('/member/notifications/:id', async (req, res, next) => {
  try {
    const updates = { read_at: req.body?.read === false ? null : new Date().toISOString() };
    const { data, error } = await supabaseAdmin.from('notifications').update(updates).eq('id', req.params.id).eq('user_id', req.user.id).select().single();
    if (error) return next(error);
    res.json(data);
  } catch (error) { next(error); }
});

router.patch('/member/notifications', async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', req.user.id).is('read_at', null);
    if (error) return next(error);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

export default router;
