import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createTransientAuthClient, supabaseAdmin, supabaseAuth } from '../config/supabase.js';
import { PasswordResetError, createPasswordResetService } from '../services/passwordReset.js';
import { enqueueEmail } from '../services/emailQueue.js';
import { getGymSettings, maintenanceStatus } from '../services/maintenance.js';

const router = Router();
const identifierOk = (value) => typeof value === 'string' && value.trim().length >= 3 && value.trim().length <= 254;
const genericResetRequestResponse = {
  message: 'If an active account uses that email, a verification code will be sent.',
  resendAfter: 60,
};
const PASSWORD_RESET_REQUEST_MIN_MS = 750;

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

const passwordResetRequestLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => res.json(genericResetRequestResponse),
});

const passwordResetVerifyLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    error: 'Too many verification attempts. Request a new code and try again later.',
    code: 'RESET_RATE_LIMITED',
  }),
});

const passwordResetConfirmLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    error: 'Too many password reset attempts. Try again later.',
    code: 'RESET_RATE_LIMITED',
  }),
});

const passwordResetRepository = {
  async findActiveProfileByEmail(email) {
    const { data, error } = await supabaseAdmin.from('profiles')
      .select('id, email, status')
      .eq('email', email)
      .eq('status', 'active')
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async findProfileById(userId) {
    const { data, error } = await supabaseAdmin.from('profiles')
      .select('id, email, status')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async hasRecentRequest(userId, ipHash, cutoff) {
    const [emailRequest, ipRequest] = await Promise.all([
      supabaseAdmin.from('password_reset_codes').select('id')
        .eq('user_id', userId).gte('created_at', cutoff).limit(1).maybeSingle(),
      supabaseAdmin.from('password_reset_codes').select('id')
        .eq('request_ip_hash', ipHash).gte('created_at', cutoff).limit(1).maybeSingle(),
    ]);
    if (emailRequest.error) throw emailRequest.error;
    if (ipRequest.error) throw ipRequest.error;
    return Boolean(emailRequest.data || ipRequest.data);
  },
  async createCode(code) {
    const { data, error } = await supabaseAdmin.rpc('create_password_reset_code', {
      p_user_id: code.user_id,
      p_code_hash: code.code_hash,
      p_expires_at: code.expires_at,
      p_created_at: code.created_at,
      p_request_ip_hash: code.request_ip_hash,
    });
    if (error) throw error;
    return data ? { id: data } : null;
  },
  async invalidateCode(codeId, usedAt) {
    const { error } = await supabaseAdmin.from('password_reset_codes')
      .update({ used_at: usedAt }).eq('id', codeId).is('used_at', null);
    if (error) throw error;
  },
  async findLatestCode(userId) {
    const { data, error } = await supabaseAdmin.from('password_reset_codes')
      .select('id, user_id, code_hash, expires_at, attempts, used_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async findCodeById(codeId) {
    const { data, error } = await supabaseAdmin.from('password_reset_codes')
      .select('id, user_id, code_hash, expires_at, attempts, used_at')
      .eq('id', codeId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async incrementAttempts(codeId, attempts) {
    const { data, error } = await supabaseAdmin.from('password_reset_codes')
      .update({ attempts: Number(attempts) + 1 })
      .eq('id', codeId)
      .eq('attempts', attempts)
      .lt('attempts', 5)
      .is('used_at', null)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  },
  async consumeCode(codeId, userId, usedAt) {
    const { data, error } = await supabaseAdmin.from('password_reset_codes')
      .update({ used_at: usedAt })
      .eq('id', codeId)
      .eq('user_id', userId)
      .lt('attempts', 5)
      .is('used_at', null)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  },
};

const passwordReset = createPasswordResetService({
  repository: passwordResetRepository,
  enqueueOtp: (email, otp) => enqueueEmail({
    emailType: 'password_otp',
    recipient: email,
    payload: { otp },
    priority: 1,
  }),
  updatePassword: async (userId, password) => {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
    if (error) throw error;
  },
  revokeSessions: async (_userId, email, password) => {
    const transientAuth = createTransientAuthClient();
    const { data, error } = await transientAuth.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data?.session?.access_token) throw new Error('Could not establish a session to revoke existing logins.');
    const { error: revokeError } = await supabaseAdmin.auth.admin.signOut(data.session.access_token, 'global');
    if (revokeError) throw revokeError;
  },
  writeAudit: async (userId) => {
    const { error } = await supabaseAdmin.from('audit_log').insert({
      actor_id: userId,
      action: 'password_reset_completed',
      entity_type: 'profile',
      entity_id: userId,
      details: { method: 'email_otp' },
    });
    if (error) throw error;
  },
  sendPasswordChanged: (email) => enqueueEmail({
    emailType: 'password_changed',
    recipient: email,
    payload: {},
    priority: 1,
  }),
});

const sendResetError = (error, res, next) => {
  if (error instanceof PasswordResetError) {
    return res.status(error.statusCode).json({ error: error.message, code: error.code });
  }
  return next(error);
};

const waitForRequestFloor = async (startedAt) => {
  const remaining = PASSWORD_RESET_REQUEST_MIN_MS - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
};

router.post('/password-reset/request', passwordResetRequestLimiter, async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const result = await passwordReset.request({
      email: req.body?.email,
      ip: req.ip || req.socket.remoteAddress,
    });
    await waitForRequestFloor(startedAt);
    res.json(result);
  } catch (error) {
    await waitForRequestFloor(startedAt);
    sendResetError(error, res, next);
  }
});

router.post('/password-reset/verify', passwordResetVerifyLimiter, async (req, res, next) => {
  try {
    const result = await passwordReset.verify({
      email: req.body?.email,
      code: req.body?.code,
    });
    res.json(result);
  } catch (error) {
    sendResetError(error, res, next);
  }
});

router.post('/password-reset/confirm', passwordResetConfirmLimiter, async (req, res, next) => {
  try {
    const result = await passwordReset.confirm({
      email: req.body?.email,
      resetToken: req.body?.resetToken,
      newPassword: req.body?.newPassword,
    });
    res.json(result);
  } catch (error) {
    sendResetError(error, res, next);
  }
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifierOk(identifier) || typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({ error: 'Identifier and password are required.' });
    }

    const value = identifier.trim().toLowerCase();
    let email = value;
    if (!value.includes('@')) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .ilike('username', value)
        .maybeSingle();
      if (error) return next(error);
      email = data?.email || '';
    }

    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
    if (error || !data?.session || !data?.user) {
      return res.status(401).json({ error: 'Incorrect username/email or password.' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    if (profileError || !profile) {
      await supabaseAuth.auth.signOut();
      return res.status(401).json({ error: 'Incorrect username/email or password.' });
    }
    if (profile.status !== 'active') {
      await supabaseAuth.auth.signOut();
      return res.status(403).json({ error: `This account is ${profile.status}. Please contact the gym.` });
    }

    const status = profile.role === 'member' ? maintenanceStatus(await getGymSettings()) : null;
    if (status?.maintenance) {
      await supabaseAuth.auth.signOut();
      return res.status(503).json({ ...status, error: status.message });
    }
    res.json({ session: data.session, user: data.user, profile, maintenance: null });
  } catch (error) {
    next(error);
  }
});

export default router;
