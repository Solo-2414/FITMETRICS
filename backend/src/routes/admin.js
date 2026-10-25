import { Router } from 'express';
import PDFDocument from 'pdfkit';
import rateLimit from 'express-rate-limit';
import { createRequire } from 'node:module';
import { supabaseAdmin } from '../config/supabase.js';
import { notifyStaff } from '../services/notify.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { enqueueEmail } from '../services/emailQueue.js';
import { dayStart, nextDayStart } from '../utils/time.js';
import { addDays, manilaDateString, manilaHour, rangeFromDates } from '../lib/time.js';
import { clearSettingsCache, getGymSettings } from '../services/maintenance.js';

const router = Router();
router.use('/admin', requireAuth, requireRole('admin'));
const backupLimiter = rateLimit({ windowMs: 60 * 60_000, limit: 3, message: { error: 'Export limit reached. Try again later.' } });
const PAYMENT_MODES = ['cash', 'gcash', 'maya'];
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;
const TIME_RE = /^\d{2}:\d{2}(?::\d{2})?$/;
const timeValue = (value) => {
  if (!TIME_RE.test(String(value || ''))) return null;
  const [hours, minutes, seconds = 0] = String(value).split(':').map(Number);
  return hours < 24 && minutes < 60 && seconds < 60 ? hours * 60 + minutes : null;
};
const validateSettings = (body, current = {}) => {
  const allowed = ['gym_name', 'address', 'phone', 'email', 'monday_saturday_open', 'monday_saturday_close', 'sunday_open', 'sunday_close', 'expiry_reminder_days', 'notifications', 'maintenance_enabled', 'maintenance_message', 'payment_modes', 'allow_member_registrations', 'show_live_capacity', 'maintenance_starts_at'];
  const updates = Object.fromEntries(allowed.filter((key) => Object.hasOwn(body || {}, key)).map((key) => [key, body[key]]));
  if (Object.hasOwn(updates, 'gym_name') && (typeof updates.gym_name !== 'string' || updates.gym_name.trim().length < 1 || updates.gym_name.length > 100)) throw new Error('Gym name must be 1-100 characters.');
  if (Object.hasOwn(updates, 'email') && updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) throw new Error('Contact email must be valid or empty.');
  if (Object.hasOwn(updates, 'phone') && (typeof updates.phone !== 'string' || updates.phone.length > 30)) throw new Error('Contact phone must be at most 30 characters.');
  for (const [label, pair] of [['Monday to Saturday', ['monday_saturday_open', 'monday_saturday_close']], ['Sunday', ['sunday_open', 'sunday_close']]]) {
    if (pair.some((key) => Object.hasOwn(updates, key))) {
      const opening = updates[pair[0]] ?? current[pair[0]];
      const closing = updates[pair[1]] ?? current[pair[1]];
      const openingMinutes = timeValue(opening);
      const closingMinutes = timeValue(closing);
      if (openingMinutes === null || closingMinutes === null) throw new Error(`${label}: enter opening and closing times in a valid time format.`);
      if (closingMinutes <= openingMinutes) throw new Error(`${label}: closing time must be later than opening time.`);
    }
  }
  if (Object.hasOwn(updates, 'expiry_reminder_days') && (!Number.isInteger(updates.expiry_reminder_days) || updates.expiry_reminder_days < 1 || updates.expiry_reminder_days > 30)) throw new Error('Expiration reminder days must be an integer from 1 to 30.');
  if (Object.hasOwn(updates, 'payment_modes') && (!Array.isArray(updates.payment_modes) || !updates.payment_modes.every((mode) => PAYMENT_MODES.includes(mode)) || updates.payment_modes.length === 0)) throw new Error('Select at least one valid payment mode.');
  for (const key of ['maintenance_enabled', 'allow_member_registrations', 'show_live_capacity']) if (Object.hasOwn(updates, key) && typeof updates[key] !== 'boolean') throw new Error(`${key} must be a boolean.`);
  if (Object.hasOwn(updates, 'maintenance_message') && (typeof updates.maintenance_message !== 'string' || updates.maintenance_message.length > 300)) throw new Error('Maintenance message must be at most 300 characters.');
  if (Object.hasOwn(updates, 'maintenance_starts_at') && updates.maintenance_starts_at !== null && Number.isNaN(Date.parse(updates.maintenance_starts_at))) throw new Error('Maintenance start time must be a valid date.');
  return updates;
};
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buffer) => buffer.reduce((crc, byte) => crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8), 0xffffffff) ^ 0xffffffff;
const csv = (rows) => {
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const clean = (value) => {
    const text = value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    return /^[=+\-@]/.test(text) ? `'${text}` : text;
  };
  const quote = (value) => `"${clean(value).replaceAll('"', '""')}"`;
  return `\uFEFF${keys.map(quote).join(',')}\n${rows.map((row) => keys.map((key) => quote(row[key])).join(',')).join('\n')}\n`;
};
const zip = (files) => {
  const locals = [], centrals = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBuffer = Buffer.from(name);
    const data = Buffer.from(content, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30 + nameBuffer.length);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8); local.writeUInt16LE(0, 10); local.writeUInt16LE(0, 12); local.writeUInt32LE(crc >>> 0, 14);
    local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBuffer.length, 26); nameBuffer.copy(local, 30);
    locals.push(Buffer.concat([local, data]));
    const central = Buffer.alloc(46 + nameBuffer.length);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10); central.writeUInt16LE(0, 12); central.writeUInt16LE(0, 14); central.writeUInt32LE(crc >>> 0, 16);
    central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(nameBuffer.length, 28); nameBuffer.copy(central, 46);
    central.writeUInt32LE(offset, 42); centrals.push(central); offset += local.length + data.length;
  }
  const centralData = Buffer.concat(centrals);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(centrals.length, 8); end.writeUInt16LE(centrals.length, 10);
  end.writeUInt32LE(centralData.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralData, end]);
};

const today = () => manilaDateString();
const dateOr = (value, fallback) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? value : fallback;
const range = (query) => {
  const end = dateOr(query.end, today());
  const start = dateOr(query.start, new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10));
  return { start, end };
};
const reportTypes = new Set(['sales', 'collections', 'attendance', 'members']);
const reportShifts = new Set(['all', 'morning', 'evening']);
const reportTypeNames = {
  sales: 'Monthly Sales Summary',
  collections: 'Daily Cash & GCash Collection Log',
  attendance: 'Member Attendance Summary',
  members: 'Expired & Inactive Members List',
};
const reportShiftMatches = (value, shift) => {
  if (!shift || shift === 'all') return true;
  const hour = manilaHour(value);
  return shift === 'morning' ? hour >= 6 && hour < 14 : hour >= 14 && hour < 22;
};
const reportFilters = (query) => {
  const { start, end } = range(query);
  const plan = query.plan && query.plan !== 'all' ? String(query.plan) : 'all';
  const shift = String(query.shift || 'all');
  if (!reportTypes.has(String(query.type))) throw new Error('Invalid report type.');
  if (!['csv', 'pdf'].includes(String(query.format))) throw new Error('Invalid report format.');
  if (!reportShifts.has(shift)) throw new Error('Invalid report shift.');
  if (plan !== 'all' && plan !== 'walk-ins' && !UUID_PATTERN.test(plan)) throw new Error('Invalid report plan.');
  return { start, end, plan, shift };
};
const reportRows = async ({ type, start, end, plan, shift }) => {
  const { from, to } = rangeFromDates(start, addDays(end, 1));
  if (type === 'sales' || type === 'collections') {
    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('id, amount, gross_amount, discount, method, status, reference_number, receipt_number, provider, provider_payment_id, paid_at, created_at, plan_id, membership_id, walk_in_visit_id, memberships(plan_id, membership_plans(name)), walk_in_visits(plan_id, membership_plans(name))')
      .gte('created_at', from)
      .lt('created_at', to)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const filtered = (data || []).filter((payment) => {
      const timestamp = payment.paid_at || payment.created_at;
      const linkedPlan = payment.plan_id || payment.memberships?.plan_id || payment.walk_in_visits?.plan_id || null;
      return reportShiftMatches(timestamp, shift)
        && (plan === 'all' || (plan === 'walk-ins' ? !linkedPlan : linkedPlan === plan));
    });
    if (type === 'collections') {
      const grouped = new Map();
      for (const payment of filtered) {
        const key = `${manilaDateString(payment.paid_at || payment.created_at)}|${payment.method}`;
        const current = grouped.get(key) || { date: key.split('|')[0], method: payment.method, transactions: 0, paid_amount: 0, voided_amount: 0, refunded_amount: 0 };
        current.transactions += 1;
        if (payment.status === 'paid') current.paid_amount += Number(payment.amount || 0);
        if (payment.status === 'voided') current.voided_amount += Number(payment.amount || 0);
        if (payment.status === 'refunded') current.refunded_amount += Number(payment.amount || 0);
        grouped.set(key, current);
      }
      return [...grouped.values()];
    }
    return filtered.map((payment) => ({
      date: manilaDateString(payment.paid_at || payment.created_at),
      receipt_number: payment.receipt_number,
      plan: payment.memberships?.membership_plans?.name || payment.walk_in_visits?.membership_plans?.name || 'Walk-in',
      method: payment.method,
      status: payment.status,
      gross_amount: Number(payment.gross_amount ?? payment.amount ?? 0),
      discount: Number(payment.discount || 0),
      net_amount: Number(payment.amount || 0),
      reference_number: payment.reference_number || '',
      provider: payment.provider || '',
      provider_payment_id: payment.provider_payment_id || '',
    }));
  }
  if (type === 'attendance') {
    const { data, error } = await supabaseAdmin
      .from('attendance')
      .select('id, check_in_at, check_out_at, method, status, member_id, memberships(membership_plans(name)), walk_in_visits(guest_name, membership_plans(name))')
      .gte('check_in_at', from)
      .lt('check_in_at', to)
      .order('check_in_at', { ascending: true });
    if (error) throw error;
    const memberIds = [...new Set((data || []).map((row) => row.member_id).filter(Boolean))];
    const profiles = memberIds.length ? await supabaseAdmin.from('profiles').select('id, full_name, phone, email').in('id', memberIds) : { data: [], error: null };
    if (profiles.error) throw profiles.error;
    const names = new Map((profiles.data || []).map((profile) => [profile.id, profile]));
    return (data || []).filter((row) => row.status !== 'cancelled' && reportShiftMatches(row.check_in_at, shift)).map((row) => ({
      date: manilaDateString(row.check_in_at),
      member: names.get(row.member_id)?.full_name || row.walk_in_visits?.guest_name || 'Walk-in Guest',
      plan: row.memberships?.membership_plans?.name || row.walk_in_visits?.membership_plans?.name || 'Walk-in',
      check_in: row.check_in_at,
      check_out: row.check_out_at || '',
      method: row.method,
      duration_hours: row.check_out_at ? ((new Date(row.check_out_at) - new Date(row.check_in_at)) / 3600000).toFixed(2) : '',
    }));
  }
  const { data: profiles, error: profileError } = await supabaseAdmin.from('profiles').select('id, full_name, phone, email').eq('role', 'member').order('full_name');
  if (profileError) throw profileError;
  const ids = (profiles || []).map((profile) => profile.id);
  const memberships = ids.length ? await supabaseAdmin.from('memberships').select('member_id, plan_id, end_date, status, membership_plans(name)').in('member_id', ids).order('end_date', { ascending: false }) : { data: [], error: null };
  if (memberships.error) throw memberships.error;
  const visits = ids.length ? await supabaseAdmin.from('attendance').select('member_id, check_in_at').in('member_id', ids).neq('status', 'cancelled').order('check_in_at', { ascending: false }) : { data: [], error: null };
  if (visits.error) throw visits.error;
  const latestMembership = new Map();
  for (const membership of memberships.data || []) if (!latestMembership.has(membership.member_id)) latestMembership.set(membership.member_id, membership);
  const latestVisit = new Map();
  for (const visit of visits.data || []) if (!latestVisit.has(visit.member_id)) latestVisit.set(visit.member_id, visit.check_in_at);
  const todayDate = new Date(`${today()}T00:00:00+08:00`);
  return (profiles || []).map((profile) => {
    const membership = latestMembership.get(profile.id);
    const lastVisit = latestVisit.get(profile.id) || null;
    const expiry = membership?.end_date || null;
    const expiryDate = expiry ? new Date(`${expiry}T00:00:00+08:00`) : null;
    const daysInactive = lastVisit ? Math.max(0, Math.floor((todayDate - new Date(lastVisit)) / 86400000)) : null;
    return { member: profile.full_name || 'Unnamed member', plan_id: membership?.plan_id || null, plan: membership?.membership_plans?.name || 'No active plan', expiry_date: expiry || '', phone: profile.phone || '', email: profile.email || '', last_visit: lastVisit ? manilaDateString(lastVisit) : '', days_inactive: daysInactive ?? '' };
  }).filter((row) => (plan === 'all' || (plan !== 'walk-ins' && row.plan_id === plan) || (plan === 'walk-ins' && !row.plan_id))
    && (row.expiry_date && new Date(`${row.expiry_date}T00:00:00+08:00`) < todayDate || row.days_inactive === '' || Number(row.days_inactive) >= 30));
};
const pdfBuffer = ({ title, start, end, generatedBy, rows }) => new Promise((resolve, reject) => {
  const document = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
  const chunks = [];
  document.on('data', (chunk) => chunks.push(chunk));
  document.on('end', () => resolve(Buffer.concat(chunks)));
  document.on('error', reject);
  document.fontSize(16).text(`Analyn's Fitness Gym - ${title}`);
  document.fontSize(9).text(`Period: ${start} to ${end} | Generated by: ${generatedBy} | Generated at: ${new Date().toISOString()}`);
  document.moveDown();
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const formatValue = (key, value) => {
    if (value === null || value === undefined) return '';
    if (/(amount|revenue|price|discount)/i.test(key) && value !== '') return `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return value;
  };
  const lines = [keys, ...rows.map((row) => keys.map((key) => formatValue(key, row[key])))];
  document.fontSize(7);
  for (const line of lines) document.text(line.map((value) => String(value).replaceAll('\n', ' ')).join(' | '), { lineGap: 2 });
  document.end();
});
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
    const [reportsResult, downloadsResult] = await Promise.all([
      supabaseAdmin.from('reports').select('id, report_type, period_start, period_end, filters, generated_by, generated_at, result').order('generated_at', { ascending: false }).limit(100),
      supabaseAdmin.from('report_downloads').select('id, report_type, period_start, period_end, filters, format, generated_by, created_at').order('created_at', { ascending: false }).limit(100),
    ]);
    if (reportsResult.error) return next(reportsResult.error);
    if (downloadsResult.error) return next(downloadsResult.error);
    const ids = [...new Set([...(reportsResult.data || []), ...(downloadsResult.data || [])].map((row) => row.generated_by).filter(Boolean))];
    const profiles = ids.length ? await supabaseAdmin.from('profiles').select('id, full_name').in('id', ids) : { data: [], error: null };
    if (profiles.error) return next(profiles.error);
    const names = new Map((profiles.data || []).map((profile) => [profile.id, profile.full_name || 'Unknown user']));
    res.json({
      reports: (reportsResult.data || []).map((row) => ({ ...row, generated_by_name: names.get(row.generated_by) || 'Unknown user' })),
      downloads: (downloadsResult.data || []).map((row) => ({ ...row, generated_by_name: names.get(row.generated_by) || 'Unknown user' })),
    });
  } catch (error) { next(error); }
});

router.get('/admin/reports/summary', async (req, res, next) => {
  try {
    const { start, end } = range(req.query || {});
    const plan = req.query.plan && req.query.plan !== 'all' && req.query.plan !== 'walk-ins' ? String(req.query.plan) : null;
    const shift = ['all', 'morning', 'evening'].includes(String(req.query.shift || 'all')) ? String(req.query.shift || 'all') : null;
    if (req.query.plan && req.query.plan !== 'all' && req.query.plan !== 'walk-ins' && !UUID_PATTERN.test(plan)) return res.status(400).json({ error: 'Invalid report plan.' });
    if (!shift) return res.status(400).json({ error: 'Invalid report shift.' });
    const { data, error } = await supabaseAdmin.rpc('reports_summary', { p_start: start, p_end: end, p_plan: plan, p_shift: shift, p_walk_ins: req.query.plan === 'walk-ins' });
    if (error) return next(error);
    res.json({ ...data, period: { start, end }, loadedAt: new Date().toISOString() });
  } catch (error) { next(error); }
});

router.get('/admin/reports/export', async (req, res, next) => {
  try {
    const type = String(req.query.type || '');
    const format = String(req.query.format || '');
    const filters = reportFilters({ ...req.query, type, format });
    const rows = await reportRows({ type, ...filters });
    const profile = await supabaseAdmin.from('profiles').select('full_name').eq('id', req.user.id).single();
    if (profile.error) return next(profile.error);
    const generatedBy = profile.data?.full_name || 'Unknown user';
    const filterDetails = { plan: filters.plan, shift: filters.shift };
    let content;
    let headers;
    if (format === 'csv') {
      content = csv(rows);
      headers = {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="fitmetrics-${type}-${filters.start}-to-${filters.end}.csv"`,
      };
    } else {
      content = await pdfBuffer({ title: reportTypeNames[type], start: filters.start, end: filters.end, generatedBy, rows });
      headers = {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="fitmetrics-${type}-${filters.start}-to-${filters.end}.pdf"`,
      };
    }
    const { data: download, error: downloadError } = await supabaseAdmin.from('report_downloads').insert({
      report_type: type,
      period_start: filters.start,
      period_end: filters.end,
      filters: filterDetails,
      format,
      generated_by: req.user.id,
    }).select().single();
    if (downloadError) return next(downloadError);
    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({
      actor_id: req.user.id,
      action: 'report_downloaded',
      entity_type: 'report_download',
      entity_id: download.id,
      details: { report_type: type, format, period_start: filters.start, period_end: filters.end, filters: filterDetails, row_count: rows.length },
    });
    if (auditError) return next(auditError);
    return res.status(200).set(headers).send(content);
  } catch (error) {
    if (error.message?.startsWith('Invalid report')) return res.status(400).json({ error: error.message });
    next(error);
  }
});

router.post('/admin/reports', async (req, res, next) => {
  try {
    const type = ['revenue', 'attendance', 'memberships'].includes(req.body?.report_type) ? req.body.report_type : null;
    if (!type) return res.status(400).json({ error: 'Report type must be revenue, attendance, or memberships.' });
    const { start, end } = range(req.body || {});
    const filters = req.body.filters && typeof req.body.filters === 'object' && !Array.isArray(req.body.filters) ? req.body.filters : {};
    const plan = filters.plan && filters.plan !== 'all' ? String(filters.plan) : null;
    const shift = ['all', 'morning', 'evening'].includes(String(filters.shift || 'all')) ? String(filters.shift || 'all') : 'all';
    if (plan && plan !== 'walk-ins' && !UUID_PATTERN.test(plan)) return res.status(400).json({ error: 'Invalid report plan.' });
    const summary = await supabaseAdmin.rpc('reports_summary', { p_start: start, p_end: end, p_plan: plan === 'walk-ins' ? null : plan, p_shift: shift, p_walk_ins: plan === 'walk-ins' });
    if (summary.error) return next(summary.error);
    const insert = await supabaseAdmin.from('reports').insert({ report_type: type, period_start: start, period_end: end, filters: { ...filters, shift, plan }, generated_by: req.user.id, result: summary.data }).select().single();
    if (insert.error) return next(insert.error);
    const profile = await supabaseAdmin.from('profiles').select('full_name').eq('id', req.user.id).single();
    res.status(201).json({ ...insert.data, generated_by_name: profile.data?.full_name || 'Unknown user' });
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
    res.json(await getGymSettings());
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
    const current = await getGymSettings();
    const updates = validateSettings(req.body, current);
    const changed = Object.fromEntries(Object.entries(updates).filter(([key, value]) => JSON.stringify(current[key]) !== JSON.stringify(value)));
    if (Object.keys(changed).length === 0) return res.json(current);
    const { data, error } = await supabaseAdmin.from('gym_settings').update({ ...updates, updated_by: req.user.id }).eq('id', true).select().single();
    if (error) return next(error);
    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({ actor_id: req.user.id, action: 'settings_updated', entity_type: 'gym_settings', details: { changes: Object.fromEntries(Object.keys(changed).map((key) => [key, { from: current[key] ?? null, to: changed[key] }])) } });
    if (auditError) return next(auditError);
    clearSettingsCache();
    res.json(data);
  } catch (error) { if (error.message?.includes('must be') || error.message?.includes('must have') || error.message?.includes('Select') || error.message?.includes('characters') || error.message?.includes('valid')) return res.status(400).json({ error: error.message }); next(error); }
});

router.get('/admin/system-info', async (_req, res, next) => {
  try {
    const require = createRequire(import.meta.url);
    const packageJson = require('../../package.json');
    const [{ data: size, error: sizeError }, { data: lastBackup, error: backupError }] = await Promise.all([
      supabaseAdmin.rpc('get_database_size_bytes'),
      supabaseAdmin.from('maintenance_backups').select('*').eq('status', 'completed').order('completed_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (sizeError) return next(sizeError);
    if (backupError) return next(backupError);
    res.json({ version: packageJson.version, databaseSizeBytes: Number(size || 0), databaseLimitBytes: Number(process.env.DB_PLAN_LIMIT_MB || 500) * 1024 * 1024, lastBackup });
  } catch (error) { next(error); }
});

router.get('/admin/maintenance/backups', async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('maintenance_backups').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) return next(error);
    res.json(data);
  } catch (error) { next(error); }
});

router.post('/admin/maintenance/backups', backupLimiter, async (req, res, next) => {
  try {
    const tables = ['profiles', 'member_details', 'memberships', 'membership_plans', 'payments', 'attendance', 'walk_in_visits', 'announcements', 'notifications', 'promos', 'gym_settings', 'audit_log'];
    const summary = {};
    const files = {};
    for (const table of tables) {
      const { data, error } = await supabaseAdmin.from(table).select('*');
      if (error) throw error;
      summary[table] = data?.length || 0;
      files[`${table}.csv`] = csv(data || []);
    }
    const archive = zip(files);
    const { data: backup, error } = await supabaseAdmin.from('maintenance_backups').insert({ provider: 'data-export', status: 'completed', requested_by: req.user.id, summary, started_at: new Date().toISOString(), completed_at: new Date().toISOString() }).select().single();
    if (error) return next(error);
    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({ actor_id: req.user.id, action: 'data_exported', entity_type: 'maintenance_backup', entity_id: backup.id, details: { summary } });
    if (auditError) return next(auditError);
    res.status(200).set({ 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="fitmetrics-data-export-${new Date().toISOString().slice(0, 10)}.zip"` }).send(archive);
  } catch (error) {
    await supabaseAdmin.from('maintenance_backups').insert({ provider: 'data-export', status: 'failed', requested_by: req.user.id, error: error.message, completed_at: new Date().toISOString() });
    next(error);
  }
});

export default router;
