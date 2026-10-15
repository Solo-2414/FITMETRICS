import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { supabaseAdmin, supabaseAuth } from '../config/supabase.js';

const router = Router();
const identifierOk = (value) => typeof value === 'string' && value.trim().length >= 3 && value.trim().length <= 254;

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
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

    res.json({ session: data.session, user: data.user, profile });
  } catch (error) {
    next(error);
  }
});

export default router;
