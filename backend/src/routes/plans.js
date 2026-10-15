import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const recordPlanAudit = async (actorId, action, planId, details) => {
  const { error } = await supabaseAdmin.from('audit_log').insert({
    actor_id: actorId,
    action,
    entity_type: 'membership_plan',
    entity_id: planId,
    details,
  });
  if (error) throw error;
};

const planPayload = (body = {}, partial = false) => {
  const allowed = ['name', 'code', 'category', 'duration_days', 'price', 'student_price', 'description', 'active', 'account_eligible'];
  const payload = Object.fromEntries(allowed
    .filter((key) => Object.prototype.hasOwnProperty.call(body, key))
    .map((key) => [key, body[key]]));
  if (!partial) {
    if (!payload.name?.trim() || !payload.code?.trim()) throw new Error('Plan name and code are required.');
    if (!Number.isInteger(Number(payload.duration_days)) || Number(payload.duration_days) <= 0) throw new Error('Duration must be a positive number of days.');
    if (!Number.isFinite(Number(payload.price)) || Number(payload.price) < 0) throw new Error('Price must be a non-negative amount.');
  }
  if (payload.duration_days !== undefined) payload.duration_days = Number(payload.duration_days);
  if (payload.price !== undefined) payload.price = Number(payload.price);
  if (payload.student_price === '' || payload.student_price === null) payload.student_price = null;
  else if (payload.student_price !== undefined) payload.student_price = Number(payload.student_price);
  if (payload.code) payload.code = payload.code.trim().toLowerCase();
  if (payload.name) payload.name = payload.name.trim();
  return payload;
};

router.get(['/plans', '/membership-plans'], requireAuth, async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('membership_plans')
      .select('*')
      .order('duration_days', { ascending: true });
    if (error) return next(error);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.post(['/plans', '/membership-plans'], requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const payload = planPayload(req.body);
    const { data, error } = await supabaseAdmin.from('membership_plans').insert(payload).select().single();
    if (error) return res.status(error.code === '23505' ? 409 : 400).json({ error: error.message });
    await recordPlanAudit(req.user.id, 'plan_created', data.id, payload);
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.patch(['/plans/:id', '/membership-plans/:id'], requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const payload = planPayload(req.body, true);
    if (!Object.keys(payload).length) return res.status(400).json({ error: 'Nothing to update.' });
    const { data, error } = await supabaseAdmin
      .from('membership_plans')
      .update(payload)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(error.code === 'PGRST116' ? 404 : 400).json({ error: error.message });
    await recordPlanAudit(req.user.id, 'plan_updated', data.id, payload);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
