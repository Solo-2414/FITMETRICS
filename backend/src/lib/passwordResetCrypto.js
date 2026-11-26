import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const serverKey = (purpose) => {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Password reset signing key is not configured.');
  return createHmac('sha256', secret).update(`fitmetrics:${purpose}:v1`).digest();
};

export const hashResetCode = (userId, code, salt = randomBytes(16).toString('hex')) => {
  const hash = createHmac('sha256', serverKey('password-reset-code'))
    .update(`${salt}:${userId}:${code}`)
    .digest('hex');
  return `${salt}.${hash}`;
};

export const matchesResetCode = (userId, code, storedHash) => {
  const [salt, expectedHex, ...extra] = String(storedHash || '').split('.');
  if (!/^[a-f0-9]{32}$/i.test(salt || '') || !/^[a-f0-9]{64}$/i.test(expectedHex || '') || extra.length) return false;
  const actual = createHmac('sha256', serverKey('password-reset-code'))
    .update(`${salt}:${userId}:${code}`)
    .digest();
  const expected = Buffer.from(expectedHex, 'hex');
  return timingSafeEqual(actual, expected);
};

export const hashRequestIp = (ip) =>
  createHmac('sha256', serverKey('password-reset-ip')).update(String(ip || 'unknown')).digest('hex');

export const createResetToken = ({ userId, email, codeId }, now = Date.now()) => {
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    email,
    codeId,
    iat: Math.floor(now / 1000),
    exp: Math.floor(now / 1000) + 10 * 60,
    nonce: randomBytes(16).toString('hex'),
  })).toString('base64url');
  const signature = createHmac('sha256', serverKey('password-reset-token'))
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
};

export const verifyResetToken = (token, now = Date.now()) => {
  if (typeof token !== 'string' || token.length > 2048) return null;
  const [payload, signature, ...extra] = token.split('.');
  if (!payload || !signature || extra.length) return null;

  const expectedSignature = createHmac('sha256', serverKey('password-reset-token'))
    .update(payload)
    .digest();
  let claims;
  try {
    const actualSignature = Buffer.from(signature, 'base64url');
    if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) return null;
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (
    typeof claims.sub !== 'string' ||
    typeof claims.email !== 'string' ||
    typeof claims.codeId !== 'string' ||
    !Number.isInteger(claims.exp) ||
    claims.exp <= Math.floor(now / 1000)
  ) return null;
  return claims;
};

export const passwordMeetsResetRules = (password) =>
  typeof password === 'string' &&
  password.length >= 8 &&
  /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);

export const deriveEmailPayloadKey = () => serverKey('email-queue-password-otp');
