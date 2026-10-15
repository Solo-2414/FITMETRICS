import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const ROLES = ['admin', 'clerk', 'member'];
const STATUSES = ['active', 'inactive', 'suspended'];
// Same rule as your Forgot Password screen: 8+ chars and a number or symbol
const passwordOk = (p) => typeof p === 'string' && p.length >= 8 && /[0-9!@#$%^&*(),.?":{}|<>]/.test(p);
const emailOk = (e) => typeof e === 'string' && /^\S+@\S+\.\S+$/.test(e);
const usernameOk = (u) => typeof u === 'string' && /^[a-z0-9][a-z0-9._-]{2,31}$/.test(u.trim().toLowerCase());

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

// GET /api/users?role=&status=&search=   (admin: Manage Users page)
router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
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
router.patch('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
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
  res.json(data);
});

// POST /api/users/:id/password   (admin: set a new password for someone)
router.post('/users/:id/password', requireAuth, requireRole('admin'), async (req, res) => {
  const { password } = req.body || {};
  if (!passwordOk(password)) {
    return res.status(400).json({ error: 'Password needs 8+ characters and a number or symbol.' });
  }
  const { error } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, { password });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
