import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getMembershipState } from '../services/membershipState.js';
import { queueReceiptEmail } from '../services/membership.js';

const router = Router();
router.use('/member', requireAuth, requireRole('member'));

const DAY_COUNT = 7;
const MAX_TEXT_LENGTH = 160;
const VALID_UNITS = new Set(['kg', 'lbs']);

const text = (value, field, max = MAX_TEXT_LENGTH) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    const error = new Error(`${field} is required and must be at most ${max} characters.`);
    error.statusCode = 422;
    throw error;
  }
  return value.trim();
};

const optionalText = (value, max = MAX_TEXT_LENGTH) => (
  value == null || value === '' ? null : text(value, 'Text', max)
);

const exerciseInput = (value) => {
  const source = value || {};
  const name = text(source.name, 'Exercise name', 120);
  const target_muscle = optionalText(source.target_muscle, 160);
  const sets = source.sets == null || source.sets === '' ? null : Number(source.sets);
  const weight = source.weight == null || source.weight === '' ? null : Number(source.weight);
  const rest_seconds = source.rest_seconds == null || source.rest_seconds === '' ? null : Number(source.rest_seconds);
  if (sets !== null && (!Number.isInteger(sets) || sets < 1 || sets > 100)) {
    const error = new Error('Sets must be a whole number from 1 to 100.');
    error.statusCode = 422;
    throw error;
  }
  if (weight !== null && (!Number.isFinite(weight) || weight < 0 || weight > 10000)) {
    const error = new Error('Weight must be a number from 0 to 10000.');
    error.statusCode = 422;
    throw error;
  }
  if (rest_seconds !== null && (!Number.isInteger(rest_seconds) || rest_seconds < 0 || rest_seconds > 3600)) {
    const error = new Error('Rest time must be a whole number from 0 to 3600 seconds.');
    error.statusCode = 422;
    throw error;
  }
  const unit = source.unit == null || source.unit === '' ? 'kg' : String(source.unit);
  if (!VALID_UNITS.has(unit)) {
    const error = new Error('Unit must be kg or lbs.');
    error.statusCode = 422;
    throw error;
  }
  return {
    name,
    target_muscle,
    sets,
    reps: optionalText(source.reps, 40),
    weight,
    unit,
    rest_seconds,
    position: Number.isInteger(source.position) && source.position >= 0 ? source.position : 0,
  };
};

const dayInput = (value, index) => {
  const source = value || {};
  const dayOfWeek = Number(source.day_of_week ?? index);
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek >= DAY_COUNT) {
    const error = new Error('Each workout day must have a valid day of week.');
    error.statusCode = 422;
    throw error;
  }
  const isRest = Boolean(source.is_rest);
  const title = text(source.title, 'Workout title', 100);
  return {
    id: source.id || null,
    day_of_week: dayOfWeek,
    title,
    focus: optionalText(source.focus, 160),
    is_rest: isRest,
    exercises: isRest ? [] : (Array.isArray(source.exercises) ? source.exercises.map(exerciseInput) : []),
  };
};

const getActivePlan = async (memberId) => {
  const { data: plan, error: planError } = await supabaseAdmin
    .from('workout_plans')
    .select('id, member_id, title, description, active, updated_at')
    .eq('member_id', memberId)
    .eq('active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (planError) throw planError;
  if (!plan) return null;

  const { data: days, error: daysError } = await supabaseAdmin
    .from('workout_plan_days')
    .select('id, plan_id, day_of_week, title, focus, is_rest')
    .eq('plan_id', plan.id)
    .order('day_of_week');
  if (daysError) throw daysError;
  const dayIds = (days || []).map((day) => day.id);
  let exercises = [];
  if (dayIds.length) {
    const { data, error } = await supabaseAdmin
      .from('workout_exercises')
      .select('id, plan_day_id, name, target_muscle, sets, reps, weight, unit, rest_seconds, position')
      .in('plan_day_id', dayIds)
      .order('position');
    if (error) throw error;
    exercises = data || [];
  }
  return {
    ...plan,
    days: (days || []).map((day) => ({
      ...day,
      exercises: exercises.filter((exercise) => exercise.plan_day_id === day.id),
    })),
  };
};

const ensurePlan = async (memberId, title = 'Custom Program') => {
  const existing = await getActivePlan(memberId);
  if (existing) return existing;
  const { data, error } = await supabaseAdmin
    .from('workout_plans')
    .insert({ member_id: memberId, title, active: true })
    .select('id, member_id, title, description, active, updated_at')
    .single();
  if (error) throw error;
  return { ...data, days: [] };
};

router.get('/member/workout-plan', async (req, res, next) => {
  try {
    res.json({ plan: await getActivePlan(req.user.id) });
  } catch (error) {
    next(error);
  }
});

router.put('/member/workout-plan', async (req, res, next) => {
  try {
    if (!Array.isArray(req.body?.days) || req.body.days.length !== DAY_COUNT) {
      return res.status(422).json({ error: 'Exactly seven workout days are required.' });
    }
    const days = req.body.days.map((day, index) => dayInput(day, index));
    const uniqueDays = new Set(days.map((day) => day.day_of_week));
    if (uniqueDays.size !== DAY_COUNT) {
      return res.status(422).json({ error: 'Each day of the week must be included once.' });
    }
    const planTitle = text(req.body?.title, 'Program title', 120);
    const plan = await ensurePlan(req.user.id, planTitle);
    const { error: planError } = await supabaseAdmin
      .from('workout_plans')
      .update({ title: planTitle, updated_at: new Date().toISOString() })
      .eq('id', plan.id)
      .eq('member_id', req.user.id);
    if (planError) throw planError;

    for (const day of days) {
      const { data: savedDay, error: dayError } = await supabaseAdmin
        .from('workout_plan_days')
        .upsert({
          ...(day.id ? { id: day.id } : {}),
          plan_id: plan.id,
          day_of_week: day.day_of_week,
          title: day.title,
          focus: day.focus,
          is_rest: day.is_rest,
        }, { onConflict: 'plan_id,day_of_week' })
        .select('id')
        .single();
      if (dayError) throw dayError;
      const { error: deleteError } = await supabaseAdmin
        .from('workout_exercises')
        .delete()
        .eq('plan_day_id', savedDay.id);
      if (deleteError) throw deleteError;
      if (day.exercises.length) {
        const { error: exerciseError } = await supabaseAdmin
          .from('workout_exercises')
          .insert(day.exercises.map((exercise) => ({ ...exercise, plan_day_id: savedDay.id })));
        if (exerciseError) throw exerciseError;
      }
    }
    res.json({ plan: await getActivePlan(req.user.id) });
  } catch (error) {
    next(error);
  }
});

router.post('/member/workout-plan/exercises', async (req, res, next) => {
  try {
    const dayOfWeek = Number(req.body?.day_of_week);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek >= DAY_COUNT) {
      return res.status(422).json({ error: 'A valid day of week is required.' });
    }
    const plan = await getActivePlan(req.user.id);
    const day = plan?.days.find((item) => item.day_of_week === dayOfWeek);
    if (!day) return res.status(404).json({ error: 'Workout day not found.' });
    const exercise = exerciseInput(req.body);
    if (day.is_rest) {
      const { error: dayError } = await supabaseAdmin
        .from('workout_plan_days')
        .update({ is_rest: false, title: day.title === 'Rest' ? 'Workout' : day.title })
        .eq('id', day.id)
        .eq('plan_id', plan.id);
      if (dayError) throw dayError;
    }
    const { data, error } = await supabaseAdmin
      .from('workout_exercises')
      .insert({ ...exercise, plan_day_id: day.id, position: day.exercises.length })
      .select('id, plan_day_id, name, target_muscle, sets, reps, weight, unit, rest_seconds, position')
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

router.delete('/member/workout-plan/exercises/:id', async (req, res, next) => {
  try {
    const plan = await getActivePlan(req.user.id);
    const exercise = plan?.days.flatMap((day) => day.exercises).find((item) => item.id === req.params.id);
    if (!exercise) return res.status(404).json({ error: 'Exercise not found.' });
    const { error } = await supabaseAdmin.from('workout_exercises').delete().eq('id', exercise.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get('/member/dashboard', async (req, res, next) => {
  try {
    const [membershipState, attendance, notifications, settings, workoutPlan] = await Promise.all([
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
      getActivePlan(req.user.id),
    ]);
    const failure = [attendance, notifications, settings].find((item) => item.error);
    if (failure) return next(failure.error);
    res.json({
      membership: membershipState.current,
      next_membership: membershipState.queued[0] || null,
      attendance: attendance.data,
      notifications: notifications.data || [],
      showLiveCapacity: settings.data?.show_live_capacity ?? true,
      workoutPlan,
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
