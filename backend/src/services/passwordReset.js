import { randomInt } from 'node:crypto';
import {
  createResetToken,
  hashRequestIp,
  hashResetCode,
  matchesResetCode,
  passwordMeetsResetRules,
  verifyResetToken,
} from '../lib/passwordResetCrypto.js';

const CODE_TTL_MS = 10 * 60_000;
const RESEND_COOLDOWN_MS = 60_000;
const GENERIC_REQUEST_RESPONSE = Object.freeze({
  message: 'If an active account uses that email, a verification code will be sent.',
  resendAfter: 60,
});

export class PasswordResetError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = 'PasswordResetError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const validEmail = (email) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const invalidCode = () => new PasswordResetError('RESET_CODE_INVALID', 'Invalid or expired code.');
const expiredCode = () => new PasswordResetError('RESET_CODE_EXPIRED', 'This code has expired. Request a new one.');
const lockedCode = () => new PasswordResetError('RESET_CODE_LOCKED', 'Too many incorrect attempts. Request a new code.');

export const createPasswordResetService = ({
  repository,
  enqueueOtp,
  updatePassword,
  revokeSessions,
  writeAudit,
  sendPasswordChanged,
  now = () => Date.now(),
  generateCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0'),
}) => {
  const request = async ({ email, ip }) => {
    const normalizedEmail = normalizeEmail(email);
    if (!validEmail(normalizedEmail)) {
      throw new PasswordResetError('INVALID_EMAIL', 'Enter a valid email address.');
    }

    const profile = await repository.findActiveProfileByEmail(normalizedEmail);
    if (!profile) return { ...GENERIC_REQUEST_RESPONSE };

    const currentTime = now();
    const createdAt = new Date(currentTime).toISOString();
    const cooldownStart = new Date(currentTime - RESEND_COOLDOWN_MS).toISOString();
    const ipHash = hashRequestIp(ip);
    if (await repository.hasRecentRequest(profile.id, ipHash, cooldownStart)) {
      return { ...GENERIC_REQUEST_RESPONSE };
    }

    const code = generateCode();
    const inserted = await repository.createCode({
      user_id: profile.id,
      code_hash: hashResetCode(profile.id, code),
      expires_at: new Date(currentTime + CODE_TTL_MS).toISOString(),
      attempts: 0,
      created_at: createdAt,
      request_ip_hash: ipHash,
    });
    if (!inserted) return { ...GENERIC_REQUEST_RESPONSE };

    try {
      await enqueueOtp(profile.email, code);
    } catch {
      await repository.invalidateCode(inserted.id, createdAt);
      console.error('Password reset email queue failed.');
    }

    return { ...GENERIC_REQUEST_RESPONSE };
  };

  const verify = async ({ email, code }) => {
    const normalizedEmail = normalizeEmail(email);
    if (!validEmail(normalizedEmail) || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      throw invalidCode();
    }

    const profile = await repository.findActiveProfileByEmail(normalizedEmail);
    if (!profile) throw invalidCode();

    let resetCode = await repository.findLatestCode(profile.id);
    while (resetCode) {
      if (Number(resetCode.attempts) >= 5) throw lockedCode();
      if (resetCode.used_at) throw expiredCode();
      if (Date.parse(resetCode.expires_at) <= now()) throw expiredCode();

      if (matchesResetCode(profile.id, code, resetCode.code_hash)) {
        return {
          resetToken: createResetToken({
            userId: profile.id,
            email: normalizedEmail,
            codeId: resetCode.id,
          }, now()),
        };
      }

      const incremented = await repository.incrementAttempts(resetCode.id, resetCode.attempts);
      if (!incremented) {
        resetCode = await repository.findCodeById(resetCode.id);
        continue;
      }
      if (Number(resetCode.attempts) + 1 >= 5) throw lockedCode();
      throw invalidCode();
    }

    throw invalidCode();
  };

  const confirm = async ({ email, resetToken, newPassword }) => {
    const normalizedEmail = normalizeEmail(email);
    if (!validEmail(normalizedEmail) || !passwordMeetsResetRules(newPassword)) {
      throw new PasswordResetError('INVALID_RESET_INPUT', 'Password needs 8+ characters and a number or symbol.');
    }

    const claims = verifyResetToken(resetToken, now());
    if (!claims || claims.email !== normalizedEmail) throw expiredCode();

    const profile = await repository.findProfileById(claims.sub);
    if (!profile || profile.status !== 'active' || normalizeEmail(profile.email) !== normalizedEmail) throw expiredCode();

    const codeRow = await repository.findCodeById(claims.codeId);
    if (!codeRow || codeRow.user_id !== profile.id || codeRow.used_at || Number(codeRow.attempts) >= 5) throw expiredCode();

    const consumed = await repository.consumeCode(codeRow.id, profile.id, new Date(now()).toISOString());
    if (!consumed) throw expiredCode();

    try {
      await updatePassword(profile.id, newPassword);
    } catch {
      console.error('Password reset password update failed.');
      throw new PasswordResetError(
        'RESET_RESTART_REQUIRED',
        'Could not change your password. Request a new verification code and try again.',
        503,
      );
    }

    try {
      await revokeSessions(profile.id, normalizedEmail, newPassword);
      await writeAudit(profile.id);
      await sendPasswordChanged(profile.email);
    } catch {
      console.error('Password reset security follow-up failed.');
      throw new PasswordResetError(
        'PASSWORD_CHANGED_PARTIALLY',
        'Your password was changed, but security follow-up could not be completed. Sign in with your new password and contact the gym if you have trouble.',
        503,
      );
    }
    return { message: 'Password changed successfully.' };
  };

  return { request, verify, confirm };
};
