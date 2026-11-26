import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { deriveEmailPayloadKey } from './passwordResetCrypto.js';

const ENCRYPTED_PREFIX = 'encrypted-v1:';

export const protectEmailPayload = (emailType, payload) => {
  if (emailType !== 'password_otp') return payload;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveEmailPayloadKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);
  const encrypted = [
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
  return { encrypted_payload: `${ENCRYPTED_PREFIX}${encrypted}` };
};

export const revealEmailPayload = (emailType, payload) => {
  if (emailType !== 'password_otp') return payload;
  const encrypted = payload?.encrypted_payload;
  if (typeof encrypted !== 'string' || !encrypted.startsWith(ENCRYPTED_PREFIX)) {
    throw new Error('Password reset email payload is not encrypted.');
  }
  const [ivValue, tagValue, ciphertextValue, ...extra] = encrypted
    .slice(ENCRYPTED_PREFIX.length)
    .split('.');
  if (!ivValue || !tagValue || !ciphertextValue || extra.length) {
    throw new Error('Password reset email payload is malformed.');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    deriveEmailPayloadKey(),
    Buffer.from(ivValue, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
  return JSON.parse(plaintext);
};
