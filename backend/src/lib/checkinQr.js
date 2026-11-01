import crypto from 'node:crypto';

const WINDOW_SECONDS = 60;

const secret = () => {
  const value = process.env.CHECKIN_QR_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    const error = new Error('Member QR check-in is not configured.');
    error.statusCode = 503;
    throw error;
  }
  return value;
};

const signatureFor = (window) => crypto.createHmac('sha256', secret()).update(String(window)).digest('base64url');

export const createCheckinToken = (now = Date.now()) => {
  const window = Math.floor(now / 1000 / WINDOW_SECONDS);
  return `${window}.${signatureFor(window)}`;
};

export const verifyCheckinToken = (token, now = Date.now()) => {
  if (typeof token !== 'string') return false;
  const [windowText, signature] = token.split('.');
  const window = Number(windowText);
  if (!Number.isInteger(window) || !signature) return false;
  const currentWindow = Math.floor(now / 1000 / WINDOW_SECONDS);
  if (window < currentWindow - 1 || window > currentWindow) return false;
  const expected = signatureFor(window);
  const actual = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  return actual.length === wanted.length && crypto.timingSafeEqual(actual, wanted);
};

export const checkinQrExpiry = (now = Date.now()) => {
  const currentWindow = Math.floor(now / 1000 / WINDOW_SECONDS);
  return new Date((currentWindow + 1) * WINDOW_SECONDS * 1000).toISOString();
};
