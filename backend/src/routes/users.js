import { Router } from 'express';
import multer from 'multer';
import { supabaseAdmin } from '../config/supabase.js';
import { supabaseAuth } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const ROLES = ['admin', 'clerk', 'member'];
const STATUSES = ['active', 'inactive', 'suspended'];
// Same rule as your Forgot Password screen: 8+ chars and a number or symbol
const emailOk = (e) => typeof e === 'string' && /^\S+@\S+\.\S+$/.test(e);
const usernameOk = (u) => typeof u === 'string' && /^[a-z0-9][a-z0-9._-]{2,31}$/.test(u.trim().toLowerCase());
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, ['image/jpeg', 'image/png'].includes(file.mimetype)),
});
const passwordOk = (p) => typeof p === 'string' && p.length >= 8 && /[0-9!@#$%^&*(),.?":{}|<>]/.test(p);
const requireAdmin = (req, res, next) => {
  if (req.profile.role !== 'admin') {
    return res.status(403).json({ error: `Manage Users requires an admin account. Current account role: ${req.profile.role}.` });
  }
  next();
};

// GET /api/me  -> the logged-in user's profile
router.get('/me', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles').select('*').eq('id', req.user.id).single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/me', requireAuth, async (req, res) => {
  const allowed = [
    'full_name',
    'phone',
    'gender',
    'emergency_contact_name',
    'emergency_contact_phone',
    'avatar_url',
  ];
  const updates = Object.fromEntries(
    allowed.filter((key) => Object.prototype.hasOwnProperty.call(req.body || {}, key))
      .map((key) => [key, req.body[key]]),
  );
  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'Nothing to update.' });
  }
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', req.user.id)
    .select('*')
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.post('/me/avatar', requireAuth, avatarUpload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'A JPG or PNG avatar under 5MB is required.' });
    const extension = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
    const path = `${req.user.id}/avatar.${extension}`;
    const upload = await supabaseAdmin.storage.from('avatars').upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
    if (upload.error) return next(upload.error);
    const { data: publicUrl } = supabaseAdmin.storage.from('avatars').getPublicUrl(path);
    const { data, error } = await supabaseAdmin.from('profiles').update({ avatar_url: publicUrl.publicUrl }).eq('id', req.user.id).select('*').single();
    if (error) return next(error);
    res.json(data);
  } catch (error) { next(error); }
});

router.delete('/me/avatar', requireAuth, async (req, res, next) => {
  try {
    const paths = [`${req.user.id}/avatar.jpg`, `${req.user.id}/avatar.png`];
    const removal = await supabaseAdmin.storage.from('avatars').remove(paths);
    if (removal.error) return next(removal.error);
    const { data, error } = await supabaseAdmin.from('profiles').update({ avatar_url: null }).eq('id', req.user.id).select('*').single();
    if (error) return next(error);
    res.json(data);
  } catch (error) { next(error); }
});

router.post('/me/password', requireAuth, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body || {};
    if (!passwordOk(new_password)) return res.status(400).json({ error: 'Password needs 8+ characters and a number or symbol.' });
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(req.user.id);
    if (!authUser?.user?.email) return res.status(400).json({ error: 'Your account email is unavailable.' });
    const { error: verifyError } = await supabaseAuth.auth.signInWithPassword({ email: authUser.user.email, password: current_password });
    if (verifyError) return res.status(401).json({ error: 'Current password is incorrect.' });
    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, { password: new_password });
    if (error) return next(error);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

// GET /api/users?role=&status=&search=   (admin: Manage Users page)
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  const { role, status, search } = req.query;
  let q = supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false });
  if (ROLES.includes(role)) q = q.eq('role', role);
  if (STATUSES.includes(status)) q = q.eq('status', status);
  if (search) {
    const s = String(search).replace(/[%,()]/g, '');
    q = q.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,username.ilike.%${s}%`);
  }
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/users/:id/details', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const [profileResult, detailsResult, membershipsResult] = await Promise.all([
    supabaseAdmin.from('profiles').select('*').eq('id', id).single(),
    supabaseAdmin.from('member_details').select('*').eq('member_id', id).maybeSingle(),
    supabaseAdmin.from('memberships').select('id, plan_id, start_date, end_date, status, coach_addon_amount, membership_plans(id, name, price, student_price, duration_days)').eq('member_id', id).order('created_at', { ascending: false }),
  ]);
  const failure = [profileResult, detailsResult, membershipsResult].find((result) => result.error);
  if (failure) return res.status(500).json({ error: failure.error.message });
  if (!profileResult.data) return res.status(404).json({ error: 'User not found.' });
  res.json({ profile: profileResult.data, memberDetails: detailsResult.data, memberships: membershipsResult.data || [] });
});

// POST /api/users   (clerk: Member Registration / admin: add staff)
// Clerks may only create members. Admins may create any role.
router.post('/users', requireAuth, requireRole('admin', 'clerk'), async (req, res) => {
  const {
    email, username, password, full_name, phone, gender,
    emergency_contact_name, emergency_contact_phone,
  } = req.body || {};
  const role = req.body?.role || 'member';

  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role.' });
  if (req.profile.role === 'clerk' && role !== 'member') {
    return res.status(403).json({ error: 'Clerks can only register members.' });
  }
  if (!emailOk(email)) return res.status(400).json({ error: 'A valid email is required.' });
  if (username !== undefined && !usernameOk(username)) {
    return res.status(400).json({ error: 'Username must be 3-32 lowercase letters, numbers, dots, underscores, or hyphens.' });
  }
  if (!passwordOk(password)) {
    return res.status(400).json({ error: 'Password needs 8+ characters and a number or symbol.' });
  }
  if (!full_name?.trim()) return res.status(400).json({ error: 'Full name is required.' });

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,                          // staff vouch for the email
    user_metadata: {
      username: username?.trim().toLowerCase(),
      full_name,
      phone,
      gender,
      emergency_contact_name,
      emergency_contact_phone,
    },
    app_metadata: { role },                       // read by the DB trigger
  });

  if (error) {
    const dup = /already|registered|exists/i.test(error.message);
    return res.status(dup ? 409 : 400).json({ error: dup ? 'That email is already registered.' : error.message });
  }

  // The profile trigger defaults to member when older migrations are still
  // installed, so persist the validated server-side role explicitly as well.
  const { error: profileRoleError } = await supabaseAdmin
    .from('profiles')
    .update({ role })
    .eq('id', data.user.id);
  if (profileRoleError) {
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    return res.status(500).json({ error: `Account created but its role could not be assigned: ${profileRoleError.message}` });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles').select('*').eq('id', data.user.id).single();
  if (profileError) return res.status(500).json({ error: profileError.message });
  res.status(201).json(profile);
});

// PATCH /api/users/:id   (admin: change role / status)
router.patch('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role, status } = req.body || {};
  const updates = {};

  if (role !== undefined) {
    if (!ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role.' });
    updates.role = role;
  }
  if (status !== undefined) {
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
    updates.status = status;
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nothing to update.' });

  if (id === req.user.id && (updates.role || (updates.status && updates.status !== 'active'))) {
    return res.status(400).json({ error: "You can't change your own role or deactivate yourself." });
  }

  const { data, error } = await supabaseAdmin
    .from('profiles').update(updates).eq('id', id).select().single();
  if (error) return res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: error.message });

  // Block / unblock sign-in at the auth level too (stops token refresh)
  if (updates.status) {
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      ban_duration: updates.status === 'active' ? 'none' : '876000h',
    });
    if (banError) return res.status(500).json({ error: banError.message });
  }
  await supabaseAdmin.from('audit_log').insert({
    actor_id: req.user.id,
    action: 'user_updated',
    entity_type: 'profile',
    entity_id: id,
    details: updates,
  });
  res.json(data);
});

router.patch('/users/:id/membership', requireAuth, requireAdmin, async (req, res) => {
  const { membershipId, plan_id, start_date, end_date, status } = req.body || {};
  if (!membershipId || !plan_id) return res.status(400).json({ error: 'Membership and plan are required.' });
  const { data: plan, error: planError } = await supabaseAdmin.from('membership_plans').select('id, duration_days').eq('id', plan_id).eq('active', true).single();
  if (planError || !plan) return res.status(400).json({ error: 'The selected membership plan is not active.' });
  const updates = { plan_id };
  if (start_date) updates.start_date = start_date;
  if (end_date) updates.end_date = end_date;
  else if (start_date) updates.end_date = new Date(new Date(`${start_date}T00:00:00Z`).getTime() + plan.duration_days * 86400000).toISOString().slice(0, 10);
  if (status) {
    if (!['active', 'expired', 'cancelled', 'frozen'].includes(status)) return res.status(400).json({ error: 'Invalid membership status.' });
    updates.status = status;
  }
  const { data, error } = await supabaseAdmin.from('memberships').update(updates).eq('id', membershipId).eq('member_id', req.params.id).select('id, plan_id, start_date, end_date, status, coach_addon_amount, membership_plans(id, name, price, student_price, duration_days)').single();
  if (error) return res.status(error.code === 'PGRST116' ? 404 : 400).json({ error: error.message });
  res.json(data);
});

router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account.' });
  const { data: target, error: targetError } = await supabaseAdmin.from('profiles').select('id, role').eq('id', req.params.id).single();
  if (targetError || !target) return res.status(404).json({ error: 'User not found.' });
  const [memberships, payments] = await Promise.all([
    supabaseAdmin.from('memberships').select('id', { count: 'exact', head: true }).eq('member_id', req.params.id),
    supabaseAdmin.from('payments').select('id', { count: 'exact', head: true }).eq('member_id', req.params.id),
  ]);
  if (memberships.error || payments.error) return res.status(500).json({ error: 'Could not verify account dependencies.' });
  if ((memberships.count || 0) > 0 || (payments.count || 0) > 0) {
    return res.status(409).json({ error: 'This account has membership or payment history. Disable it instead to preserve gym records.' });
  }
  await supabaseAdmin.from('audit_log').insert({
    actor_id: req.user.id,
    action: 'user_deleted',
    entity_type: 'profile',
    entity_id: req.params.id,
    details: { role: target.role },
  });
  const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).end();
});

// POST /api/users/:id/password   (admin: set a new password for someone)
router.post('/users/:id/password', requireAuth, requireAdmin, async (req, res) => {
  const { password } = req.body || {};
  if (!passwordOk(password)) {
    return res.status(400).json({ error: 'Password needs 8+ characters and a number or symbol.' });
  }
  const { error } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, { password });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
