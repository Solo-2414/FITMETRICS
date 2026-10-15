import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const dayStart = (date = new Date()) => {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value.toISOString();
};
const nextDay = (date = new Date()) => {
  const value = new Date(date);
  value.setUTCDate(value.getUTCDate() + 1);
  return dayStart(value);
};

router.get('/attendance/me', requireAuth, requireRole('member'), async (req, res, next) => {
  try {
    const from = String(req.query.from || dayStart(new Date(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)));
    const to = String(req.query.to || nextDay());
    const { data, error } = await supabaseAdmin
      .from('attendance')
      .select('id, check_in_at, check_out_at, method, status, notes, memberships(membership_plans(name))')
      .eq('member_id', req.user.id)
      .gte('check_in_at', from)
      .lt('check_in_at', to)
      .order('check_in_at', { ascending: false });
    if (error) return next(error);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/attendance/analysis', requireAuth, requireRole('admin', 'clerk'), async (_req, res, next) => {
  try {
    const start = dayStart();
    const end = nextDay();
    const { data, error } = await supabaseAdmin
      .from('attendance')
      .select('id, member_id, check_in_at, check_out_at, method, status')
      .gte('check_in_at', start)
      .lt('check_in_at', end)
      .order('check_in_at', { ascending: false });
    if (error) return next(error);
    const hourly = Array.from({ length: 8 }, () => 0);
    data.forEach((row) => {
      const hour = new Date(row.check_in_at).getHours();
      const index = Math.floor((hour - 6) / 2);
      if (index >= 0 && index < hourly.length) hourly[index] += 1;
    });
    res.json({
      totalCheckIns: data.length,
      activeInGym: data.filter((row) => !row.check_out_at && row.status === 'open').length,
      hourly,
      records: data,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/attendance/:id/checkout', requireAuth, requireRole('admin', 'clerk'), async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('attendance')
      .update({ check_out_at: new Date().toISOString(), status: 'completed' })
      .eq('id', req.params.id)
      .is('check_out_at', null)
      .select()
      .single();
    if (error) return res.status(error.code === 'PGRST116' ? 404 : 400).json({ error: error.message });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
