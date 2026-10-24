import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { notifyStaff } from '../services/notify.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { enqueueEmail } from '../services/emailQueue.js';
import { dayStart, nextDayStart } from '../utils/time.js';

const router = Router();
router.use('/admin', requireAuth, requireRole('admin'));

const today = () => new Date().toISOString().slice(0, 10);
const dateOr = (value, fallback) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? value : fallback;
const range = (query) => {
  const end = dateOr(query.end, today());
  const start = dateOr(query.start, new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10));
  return { start, end };
};
const readView = async (name, query = {}, dateColumn = 'period') => {
  let request = supabaseAdmin.from(name).select('*');
  if (query.start) request = request.gte(dateColumn, query.start);
  if (query.end) request = request.lte(dateColumn, query.end);
  const result = await request;
  if (result.error) throw result.error;
  return result.data || [];
};

router.get('/admin/dashboard', async (req, res, next) => {
  try {
    const currentDay = today();
    const [kpis, revenue, growth, peak, distribution, retention, daily, weekly, monthly, todayPayments, todayAttendance, expiringSoon, activeMemberships] = await Promise.all([
      supabaseAdmin.from('analytics_kpis').select('*').single(),
      readView('revenue_trend'),
      readView('membership_growth_trend'),
      readView('attendance_peak_analysis'),
      readView('membership_type_distribution'),
      readView('retention_trend'),
      readView('revenue_daily_summary', { start: dateOr(req.query.start, today()), end: today() }, 'revenue_date'),
      readView('revenue_daily_summary', { start: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10), end: today() }, 'revenue_date'),
      readView('revenue_daily_summary', { start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), end: today() }, 'revenue_date'),
      supabaseAdmin.from('payments').select('amount').eq('status', 'paid').gte('created_at', `${currentDay}T00:00:00.000Z`).lt('created_at', `${currentDay}T23:59:59.999Z`),
      supabaseAdmin.from('attendance').select('id, member_id, check_in_at, check_out_at, recorded_by').neq('status', 'cancelled').gte('check_in_at', `${currentDay}T00:00:00.000Z`).lt('check_in_at', `${currentDay}T23:59:59.999Z`).order('check_in_at', { ascending: false }).limit(100),
      supabaseAdmin.from('memberships').select('id, member_id, end_date, membership_plans(name, price, duration_days)').eq('status', 'active').gte('end_date', currentDay).lte('end_date', new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)).order('end_date').limit(20),
      supabaseAdmin.from('memberships').select('member_id, plan_id, membership_plans(id, name, price)').eq('status', 'active').gte('end_date', currentDay),
    ]);
    const failure = [kpis, revenue, growth, peak, distribution, retention, daily, weekly, monthly, todayPayments, todayAttendance, expiringSoon, activeMemberships].find((item) => item.error);
    if (failure) return next(failure.error);
    const attendance = todayAttendance.data || [];
    const memberIds = [...new Set([...attendance.map((row) => row.member_id), ...(expiringSoon.data || []).map((row) => row.member_id)])];
    const profileResult = memberIds.length
      ? await supabaseAdmin.from('profiles').select('id, full_name, email, member_details(member_code)').in('id', memberIds)
      : { data: [], error: null };
    if (profileResult.error) return next(profileResult.error);
    const profiles = new Map((profileResult.data || []).map((profile) => [profile.id, profile]));
    const staffIds = [...new Set(attendance.map((row) => row.recorded_by).filter(Boolean))];
    const staffResult = staffIds.length
      ? await supabaseAdmin.from('profiles').select('id, full_name').in('id', staffIds)
      : { data: [], error: null };
    if (staffResult.error) return next(staffResult.error);
    const staff = new Map((staffResult.data || []).map((profile) => [profile.id, profile.full_name]));
    const hourlyVisits = Array.from({ length: 24 }, (_, hour) => ({ hour, visits: attendance.filter((row) => new Date(row.check_in_at).getHours() === hour).length }));
    const planCounts = new Map();
    (activeMemberships.data || []).forEach((membership) => {
      const plan = membership.membership_plans;
      if (plan) planCounts.set(plan.id, { ...plan, count: (planCounts.get(plan.id)?.count || 0) + 1 });
    });
    const memberPlans = new Map((activeMemberships.data || []).map((membership) => [membership.member_id, membership.membership_plans?.name]));
    res.json({
      kpis: kpis.data,
      charts: { revenue, membershipGrowth: growth, attendancePeak: peak, membershipTypes: distribution, retention },
      sales: { daily, weekly, monthly },
      today: {
        sales: (todayPayments.data || []).reduce((total, payment) => total + Number(payment.amount || 0), 0),
        checkIns: attendance.length,
        openVisits: attendance.filter((row) => !row.check_out_at).length,
        expiringCount: (expiringSoon.data || []).length,
        hourlyVisits,
      },
      recentCheckIns: attendance.slice(0, 5).map((row) => ({ ...row, member: profiles.has(row.member_id) ? { ...profiles.get(row.member_id), membership_plan: memberPlans.get(row.member_id) } : null, recordedByName: staff.get(row.recorded_by) || 'Staff' })),
      expiringSoon: (expiringSoon.data || []).map((membership) => ({ ...membership, member: profiles.get(membership.member_id) || null })),
      planDistribution: [...planCounts.values()],
    });
  } catch (error) { next(error); }
});

router.get('/admin/churn', async (_req, res, next) => {
  try {
    const { data: members, error } = await supabaseAdmin.from('profiles')
      .select('id, full_name, email, phone, memberships!memberships_member_id_fkey(id, end_date, status, membership_plans(name))')
      .eq('role', 'member').eq('status', 'active');
    if (error) return next(error);
    const ids = members.map((member) => member.id);
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 5, 1);
    const attendanceRows = await supabaseAdmin.from('attendance')
      .select('member_id, check_in_at')
      .gte('check_in_at', sixMonthsAgo.toISOString())
      .neq('status', 'cancelled');
    if (attendanceRows.error) return next(attendanceRows.error);
    const visits = ids.length
      ? await supabaseAdmin.from('member_attendance_summary').select('member_id, last_visit_date, visit_count').in('member_id', ids)
      : { data: [], error: null };
    if (visits.error) return next(visits.error);
    const visitMap = new Map((visits.data || []).map((visit) => [visit.member_id, visit]));
    const todayDate = new Date(today());
    const snapshots = members.map((member) => {
      const visit = visitMap.get(member.id);
      const daysInactive = visit?.last_visit_date
        ? Math.max(0, Math.floor((todayDate - new Date(visit.last_visit_date)) / 86400000))
        : 999;
      const expiry = member.memberships?.find((item) => item.status === 'active')?.end_date;
      const daysToExpiry = expiry ? Math.ceil((new Date(expiry) - todayDate) / 86400000) : 999;
      const riskScore = Math.min(100, (daysInactive >= 30 ? 70 : daysInactive >= 14 ? 45 : daysInactive >= 7 ? 25 : 0) + (daysToExpiry <= 7 ? 30 : daysToExpiry <= 14 ? 15 : 0));
      return { member_id: member.id, full_name: member.full_name, email: member.email, phone: member.phone, risk_score: riskScore, last_visit_date: visit?.last_visit_date || null, days_inactive: daysInactive, expiry_date: expiry || null, plan_name: member.memberships?.find((item) => item.status === 'active')?.membership_plans?.name || null };
    }).filter((row) => row.risk_score > 0).sort((a, b) => b.risk_score - a.risk_score);
    if (snapshots.length) {
      const rows = snapshots.map(({ expiry_date: _expiry, full_name: _name, email: _email, phone: _phone, plan_name: _plan, ...snapshot }) => snapshot);
      const write = await supabaseAdmin.from('churn_snapshots').upsert(rows, { onConflict: 'member_id,snapshot_date,model_version' });
      if (write.error) return next(write.error);
    }
    const monthVisits = new Set((attendanceRows.data || []).filter((row) => new Date(row.check_in_at) >= monthStart).map((row) => row.member_id)).size;
    const trend = Array.from({ length: 6 }, (_, index) => {
      const start = new Date(sixMonthsAgo);
      start.setUTCMonth(start.getUTCMonth() + index);
      const end = new Date(start);
      end.setUTCMonth(end.getUTCMonth() + 1);
      return {
        label: start.toLocaleDateString('en-US', { month: 'short' }),
        visits: (attendanceRows.data || []).filter((row) => new Date(row.check_in_at) >= start && new Date(row.check_in_at) < end).length,
      };
    });
    const renewals = await supabaseAdmin.from('memberships').select('member_id, start_date, status').lte('start_date', today());
    if (renewals.error) return next(renewals.error);
    const currentMonthStarts = (renewals.data || []).filter((membership) => membership.status === 'active' && new Date(`${membership.start_date}T00:00:00Z`) >= monthStart);
    const membersWithPreviousMembership = new Set((renewals.data || []).filter((membership) => new Date(`${membership.start_date}T00:00:00Z`) < monthStart).map((membership) => membership.member_id));
    const renewedThisMonth = currentMonthStarts.filter((membership) => membersWithPreviousMembership.has(membership.member_id)).length;
    const renewalRate = members.length ? Math.round((renewedThisMonth / Math.max(1, members.length)) * 100) : 0;
    res.json({ members: snapshots, stats: { visitedThisMonth: monthVisits, inactive14: snapshots.filter((row) => row.days_inactive >= 14).length, endingSoon: snapshots.filter((row) => row.expiry_date && Math.ceil((new Date(row.expiry_date) - new Date()) / 86400000) <= 7).length, renewedThisMonth, renewalRate }, trend });
  } catch (error) { next(error); }
});

router.post('/admin/churn/:memberId/reminder', async (req, res, next) => {
  try {
    const { data: member, error } = await supabaseAdmin.from('profiles').select('id, full_name, email').eq('id', req.params.memberId).eq('role', 'member').single();
    if (error) return next(error);
    if (!member.email) return res.status(400).json({ error: 'This member has no email address.' });
    const queued = await enqueueEmail({
      emailType: 'expiry_reminder',
      recipient: member.email,
      payload: { memberName: member.full_name, customMessage: String(req.body?.message || 'We miss you at the gym. Come get your workout in today!').slice(0, 500) },
    });
    res.status(202).json({ queued: true, email: queued });
  } catch (error) { next(error); }
});

router.get('/admin/predictive', async (_req, res, next) => {
  try {
    const todayDate = new Date();
    const start = new Date(todayDate);
    start.setUTCDate(start.getUTCDate() - 56);
    const [attendance, payments, memberships, peaks] = await Promise.all([
      supabaseAdmin.from('attendance').select('check_in_at').gte('check_in_at', start.toISOString()).neq('status', 'cancelled'),
      supabaseAdmin.from('payments').select('amount, created_at').eq('status', 'paid').gte('created_at', start.toISOString()),
      supabaseAdmin.from('memberships').select('member_id, end_date, status, membership_plans(name), profiles!memberships_member_id_fkey(full_name, email)').eq('status', 'active'),
      supabaseAdmin.from('attendance_peak_analysis').select('*'),
    ]);
    const failure = [attendance, payments, memberships, peaks].find((result) => result.error);
    if (failure) return next(failure.error);
    const rows = attendance.data || [];
    const byWeekday = Array.from({ length: 7 }, (_, weekday) => {
      const values = rows.filter((row) => new Date(row.check_in_at).getUTCDay() === weekday);
      return values.length / Math.max(1, new Set(values.map((row) => new Date(row.check_in_at).toISOString().slice(0, 10))).size);
    });
    const forecast = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(todayDate);
      date.setUTCDate(date.getUTCDate() + index + 1);
      return { date: date.toISOString().slice(0, 10), visits: Math.round(byWeekday[date.getUTCDay()] || 0) };
    });
    const tomorrow = forecast[0]?.visits || 0;
    const dailyRevenue = (payments.data || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0) / 56;
    const daysInMonth = new Date(todayDate.getUTCFullYear(), todayDate.getUTCMonth() + 1, 0).getDate();
    const renewals14 = (memberships.data || []).filter((membership) => {
      const days = Math.ceil((new Date(membership.end_date) - todayDate) / 86400000);
      return days >= 0 && days <= 14;
    });
    const peak = (peaks.data || []).sort((a, b) => Number(b.visits) - Number(a.visits))[0] || {};
    const forecastRows = forecast.map((item) => ({ ...item, predicted_visits: item.visits }));
    const predictionRows = forecastRows.map((item) => ({
      prediction_date: today(),
      target_date: item.date,
      predicted_visits: item.visits,
      predicted_revenue: dailyRevenue,
      predicted_renewals: renewals14.length,
      confidence_note: 'Historical weekday average from the last 56 days; confidence depends on recorded attendance volume.',
      method_version: 'weekday-average-v1',
      explanation: { source_days: 56 },
    }));
    const write = await supabaseAdmin.from('prediction_snapshots').upsert(predictionRows, { onConflict: 'prediction_date,target_date,method_version' });
    if (write.error) return next(write.error);
    res.json({
      stats: { expectedTomorrow: tomorrow, projectedMonthlyRevenue: Math.round(dailyRevenue * daysInMonth), renewalsNext14: renewals14.length },
      forecast: forecastRows,
      peak: { hour: peak.hour ?? null, visits: peak.visits ?? 0 },
      renewals: renewals14.map((membership) => ({ ...membership, full_name: membership.profiles?.full_name, email: membership.profiles?.email })),
      advisory: { busyEvening: Number(peak.hour) >= 17 && Number(peak.hour) <= 20, staffing: tomorrow >= 30 ? 'Schedule at least 2 staff during peak hours.' : 'Standard desk coverage is sufficient.' },
    });
  } catch (error) { next(error); }
});

router.get('/admin/reports', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('reports').select('*').order('generated_at', { ascending: false }).limit(100);
    if (error) return next(error);
    res.json(data);
  } catch (error) { next(error); }
});

router.post('/admin/reports', async (req, res, next) => {
  try {
    const type = ['revenue', 'attendance', 'memberships'].includes(req.body?.report_type) ? req.body.report_type : null;
    if (!type) return res.status(400).json({ error: 'Report type must be revenue, attendance, or memberships.' });
    const { start, end } = range(req.body || {});
    const view = type === 'revenue' ? 'revenue_daily_summary' : type === 'attendance' ? 'attendance_daily_summary' : 'membership_type_distribution';
    const result = type === 'memberships'
      ? await readView(view)
      : await readView(view, { start, end }, type === 'revenue' ? 'revenue_date' : 'attendance_date');
    const insert = await supabaseAdmin.from('reports').insert({ report_type: type, period_start: start, period_end: end, filters: req.body.filters || {}, generated_by: req.user.id, result }).select().single();
    if (insert.error) return next(insert.error);
    res.status(201).json(insert.data);
  } catch (error) { next(error); }
});

router.get('/admin/announcements', async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false });
    if (error) return next(error);
    res.json(data);
  } catch (error) { next(error); }
});

router.post('/admin/announcements', async (req, res, next) => {
  try {
    const { title, body, audience = 'all', status = 'published', publish_at, expires_at, pinned = false } = req.body || {};
    if (!title?.trim() || !body?.trim() || !['all', 'admin', 'clerk', 'member'].includes(audience)) return res.status(400).json({ error: 'Title, body, and valid audience are required.' });
    const { data, error } = await supabaseAdmin.from('announcements').insert({ title: title.trim(), body: body.trim(), audience, status, publish_at: publish_at || new Date().toISOString(), expires_at: expires_at || null, pinned, author_id: req.user.id }).select().single();
    if (error) return next(error);
    if (status === 'published' && ['all', 'admin', 'clerk'].includes(audience)) await notifyStaff({ type: 'announcement', title: title.trim(), message: body.trim() });
    res.status(201).json(data);
  } catch (error) { next(error); }
});

router.patch('/admin/announcements/:id', async (req, res, next) => {
  try {
    const allowed = ['title', 'body', 'audience', 'status', 'publish_at', 'expires_at', 'pinned'];
    const updates = Object.fromEntries(allowed.filter((key) => Object.hasOwn(req.body || {}, key)).map((key) => [key, req.body[key]]));
    const { data, error } = await supabaseAdmin.from('announcements').update(updates).eq('id', req.params.id).select().single();
    if (error) return next(error);
    res.json(data);
  } catch (error) { next(error); }
});

router.delete('/admin/announcements/:id', async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin.from('announcements').delete().eq('id', req.params.id);
    if (error) return next(error);
    res.status(204).end();
  } catch (error) { next(error); }
});

router.get('/admin/settings', async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('gym_settings').select('*').eq('id', true).maybeSingle();
    if (error) return next(error);
    res.json(data);
  } catch (error) { next(error); }
});

router.get('/admin/email-status', async (_req, res, next) => {
  try {
    const start = dayStart();
    const end = nextDayStart();
    const countSent = async (provider) => {
      const result = await supabaseAdmin.from('email_log').select('id', { count: 'exact', head: true }).eq('status', 'sent').eq('provider', provider).gte('sent_at', start).lt('sent_at', end);
      if (result.error) throw result.error;
      return result.count || 0;
    };
    const countStatus = async (status) => {
      const result = await supabaseAdmin.from('email_log').select('id', { count: 'exact', head: true }).eq('status', status);
      if (result.error) throw result.error;
      return result.count || 0;
    };
    res.json({
      date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date()),
      providers: {
        primary: { sent: await countSent('primary'), cap: Number(process.env.EMAIL_DAILY_LIMIT_PRIMARY || 280) },
        backup: { sent: await countSent('backup'), cap: Number(process.env.EMAIL_DAILY_LIMIT_BACKUP || 180) },
      },
      transactionalReserve: Number(process.env.EMAIL_TRANSACTIONAL_RESERVE || 100),
      queued: await countStatus('queued'),
      failed: await countStatus('failed'),
    });
  } catch (error) { next(error); }
});

router.patch('/admin/settings', async (req, res, next) => {
  try {
    const allowed = ['gym_name', 'address', 'phone', 'email', 'monday_saturday_open', 'monday_saturday_close', 'sunday_open', 'sunday_close', 'expiry_reminder_days', 'notifications', 'maintenance_enabled', 'maintenance_message'];
    const updates = Object.fromEntries(allowed.filter((key) => Object.hasOwn(req.body || {}, key)).map((key) => [key, req.body[key]]));
    const { data, error } = await supabaseAdmin.from('gym_settings').upsert({ id: true, ...updates, updated_by: req.user.id }).select().single();
    if (error) return next(error);
    res.json(data);
  } catch (error) { next(error); }
});

router.get('/admin/maintenance/backups', async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('maintenance_backups').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) return next(error);
    res.json(data);
  } catch (error) { next(error); }
});

router.post('/admin/maintenance/backups', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('maintenance_backups').insert({ provider: 'supabase', status: 'requested', requested_by: req.user.id }).select().single();
    if (error) return next(error);
    res.status(201).json(data);
  } catch (error) { next(error); }
});

export default router;
