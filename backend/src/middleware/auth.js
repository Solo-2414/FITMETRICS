import { supabaseAdmin } from '../config/supabase.js';

/**
 * Verifies the Supabase access token (JWT) sent by the frontend as
 *   Authorization: Bearer <token>
 * then loads the user's profile and rejects inactive/suspended accounts.
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing access token.' });

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, status')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: 'No profile found for this account.' });
    }
    if (profile.status !== 'active') {
      return res.status(403).json({ error: `Account is ${profile.status}.` });
    }

    req.user = data.user;
    req.profile = profile;
    next();
  } catch (err) {
    next(err);
  }
}

/** Usage: router.get('/x', requireAuth, requireRole('admin', 'clerk'), handler) */
export const requireRole = (...allowed) => (req, res, next) => {
  if (!allowed.includes(req.profile.role)) {
    return res.status(403).json({ error: 'You do not have permission to do this.' });
  }
  next();
};
