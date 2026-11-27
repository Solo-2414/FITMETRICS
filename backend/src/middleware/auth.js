import { supabaseAdmin } from '../config/supabase.js';
import { hasAdminPasskey } from '../lib/adminPasskey.js';
import { getGymSettings, maintenanceStatus } from '../services/maintenance.js';

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

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, status')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: 'No profile found for this account.' });
    }
    if (profile.status !== 'active') {
      return res.status(403).json({ error: `Account is ${profile.status}.` });
    }
    if (profile.role === 'member') {
      const status = maintenanceStatus(await getGymSettings());
      if (status.maintenance) return res.status(503).json(status);
    }

    req.user = userData.user;
    req.profile = profile;
    if (profile.role === 'admin') {
      const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
      }
      req.authClaims = claimsData.claims;
    }
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
  if (req.profile.role === 'admin' && allowed.includes('admin')) {
    if (!hasAdminPasskey(req.authClaims)) {
      return res.status(403).json({
        error: 'Sign in with an admin passkey before continuing.',
        code: 'ADMIN_PASSKEY_REQUIRED',
      });
    }
  }
  next();
};
