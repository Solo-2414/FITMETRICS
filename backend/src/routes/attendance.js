import { Router } from 'express';
import { verifyCheckinToken } from '../lib/checkinQr.js';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { checkInMember } from '../services/attendance.js';
import { monthStart } from '../utils/time.js';
import {
  addDays,
  manilaRange,
  previousRange,
  rangeFromDates,
} from '../lib/time.js';

const router = Router();
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;
const RANGE_VALUES = new Set(['today', '7d', '30d', 'custom']);
const qrAttempts = new Map();

const validDate = (value) => DATE_PATTERN.test(value) && !Number.isNaN(new Date(`${value}T00:00:00+08:00`).getTime());

const resolveRange = (query) => {
  if (query.date) {
    const fromDate = String(query.date);
    if (!validDate(fromDate)) throw new Error('Invalid attendance date.');
    const toDate = addDays(fromDate, 1);
    return { fromDate, toDate, ...rangeFromDates(fromDate, toDate) };
  }
  const range = String(query.range || 'today');
  if (!RANGE_VALUES.has(range)) throw new Error('Invalid attendance range.');
  if (range === 'custom') {
    const fromDate = String(query.from || '');
    const toDate = String(query.to || '');
    if (!validDate(fromDate) || !validDate(toDate) || fromDate >= toDate) throw new Error('Invalid custom attendance range.');
    return { fromDate, toDate, ...rangeFromDates(fromDate, toDate) };
  }
  return manilaRange(range);
};

const pageParams = (query) => {
  const page = Math.max(1, Number.parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit || '10', 10) || 10));
  return { page, limit, offset: (page - 1) * limit };
};

router.get('/attendance/me', requireAuth, requireRole('member'), async (req, res, next) => {
  try {
    const from = String(req.query.from || monthStart());
    const to = String(req.query.to || new Date().toISOString());
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

router.post('/attendance/qr-checkin', requireAuth, requireRole('member'), async (req, res, next) => {
  try {
    if (!verifyCheckinToken(req.body?.token)) return res.status(400).json({ error: 'This gym QR code is invalid or expired.' });
    const lastAttempt = qrAttempts.get(req.user.id) || 0;
    if (Date.now() - lastAttempt < 10_000) return res.status(429).json({ error: 'Please wait a few seconds before trying again.' });
    qrAttempts.set(req.user.id, Date.now());
    const result = await checkInMember({ memberId: req.user.id, method: 'qr' });
    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({
      actor_id: req.user.id, action: 'attendance_qr_checkin', entity_type: 'attendance', entity_id: result.id, details: { method: 'qr' },
    });
    if (auditError) return next(auditError);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/attendance/analysis', requireAuth, requireRole('admin', 'clerk', 'member'), async (req, res, next) => {
  try {
    let period;
    try {
      period = resolveRange(req.query);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    const previous = previousRange(period.fromDate, period.toDate);
    const { page, limit, offset } = pageParams(req.query);
    const plan = req.query.plan && req.query.plan !== 'all' ? String(req.query.plan) : null;
    if (plan && !UUID_PATTERN.test(plan)) return res.status(400).json({ error: 'Invalid attendance plan.' });
    const [summaryResult, settingsResult, recordsResult] = await Promise.all([
      supabaseAdmin.rpc('attendance_analysis_summary', {
        p_from: period.fromDate,
        p_to: period.toDate,
        p_previous_from: previous.fromDate,
        p_previous_to: previous.toDate,
        p_plan: plan,
      }),
      supabaseAdmin.from('gym_settings').select('daily_visit_target').limit(1).maybeSingle(),
      supabaseAdmin
        .from('attendance')
        .select('id, member_id, walk_in_visit_id, check_in_at, check_out_at, method, status, recorded_by, memberships(membership_plans(name)), walk_in_visits(guest_name, membership_plans(name))')
        .gte('check_in_at', period.from)
        .lt('check_in_at', period.to)
        .order('check_in_at', { ascending: false })
        .range(offset, offset + limit - 1),
    ]);
    if (summaryResult.error) return next(summaryResult.error);
    if (settingsResult.error) return next(settingsResult.error);
    if (recordsResult.error) return next(recordsResult.error);

    const records = recordsResult.data || [];
    const profileIds = [...new Set(records.flatMap((row) => [row.member_id, row.recorded_by]).filter(Boolean))];
    const profilesResult = profileIds.length
      ? await supabaseAdmin.from('profiles').select('id, full_name').in('id', profileIds)
      : { data: [], error: null };
    if (profilesResult.error) return next(profilesResult.error);
    const profiles = new Map((profilesResult.data || []).map((profile) => [profile.id, profile.full_name || 'Unnamed user']));
    const summary = summaryResult.data || {};
    const hourly = summary.hourly || [];
    const busiest = hourly.filter((bucket) => bucket.label !== 'Other hours').reduce((best, bucket) => bucket.visits > best.visits ? bucket : best, { visits: 0, label: 'No data' });
    const bestWindow = hourly.filter((bucket) => bucket.label !== 'Other hours').reduce((best, bucket, index, buckets) => {
      const next = buckets[index + 1];
      const visits = bucket.visits + (next?.visits || 0);
      return visits > best.visits ? { visits, label: `${bucket.label} - ${next?.endLabel || bucket.endLabel}` } : best;
    }, { visits: 0, label: 'No data' });
    const rows = records.map((row) => ({
      ...row,
      member_name: profiles.get(row.member_id) || row.walk_in_visits?.guest_name || 'Walk-in Guest',
      plan_name: row.memberships?.membership_plans?.name || row.walk_in_visits?.membership_plans?.name || 'Walk-in',
      recorded_by_name: profiles.get(row.recorded_by) || 'Unknown staff',
    }));
    res.json({
      totalCheckIns: summary.totalCheckIns || 0,
      activeInGym: summary.activeInGym || 0,
      hourly,
      records: rows,
      total: summary.totalCheckIns || 0,
      page,
      limit,
      kpis: {
        totalCheckIns: summary.totalCheckIns || 0,
        previousPeriodTotal: summary.previousPeriodTotal || 0,
        changePct: summary.previousPeriodTotal ? Math.round(((summary.totalCheckIns - summary.previousPeriodTotal) / summary.previousPeriodTotal) * 100) : null,
        activeInGym: summary.activeInGym || 0,
        target: settingsResult.data?.daily_visit_target || 70,
        busiestHourLabel: busiest.label,
        busiestWindowLabel: bestWindow.label,
        mostActiveWeekdays: (summary.weekday || []).slice(0, 2),
      },
      weekday: summary.weekday || [],
      byPlan: summary.byPlan || [],
      peak: summary.peak || [],
      planAnalysis: summary.byPlan || [],
      daily: summary.daily || [],
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
