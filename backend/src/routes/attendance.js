import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { dayStart, monthStart, nextDayStart, manilaHour } from '../utils/time.js';

const router = Router();

router.get('/attendance/me', requireAuth, requireRole('member'), async (req, res, next) => {
  try {
    const from = String(req.query.from || monthStart());
    const to = String(req.query.to || nextDayStart());
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

router.get('/attendance/analysis', requireAuth, requireRole('admin', 'clerk', 'member'), async (req, res, next) => {
  try {
    const date = String(req.query.date || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date()));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Invalid attendance date.' });
    const start = dayStart(`${date}T00:00:00+08:00`);
    const end = nextDayStart(`${date}T00:00:00+08:00`);
    const { data, error } = await supabaseAdmin
      .from('attendance')
      .select('id, member_id, check_in_at, check_out_at, method, status')
      .gte('check_in_at', start)
      .lt('check_in_at', end)
      .order('check_in_at', { ascending: false });
    if (error) return next(error);
    const [peak, plans, days] = await Promise.all([
      supabaseAdmin.from('attendance_peak_analysis').select('*'),
      supabaseAdmin.from('membership_type_distribution').select('*'),
      supabaseAdmin.from('attendance_daily_summary').select('*').order('attendance_date', { ascending: false }).limit(31),
    ]);
    const failure = [peak, plans, days].find((result) => result.error);
    if (failure) return next(failure.error);
    const hourly = Array.from({ length: 8 }, () => 0);
    data.forEach((row) => {
      const hour = manilaHour(row.check_in_at);
      const index = Math.floor((hour - 6) / 2);
      if (index >= 0 && index < hourly.length) hourly[index] += 1;
    });
    res.json({
      totalCheckIns: data.length,
      activeInGym: data.filter((row) => !row.check_out_at && row.status === 'open').length,
      hourly,
      records: data,
      peak: peak.data || [],
      planAnalysis: plans.data || [],
      daily: days.data || [],
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
