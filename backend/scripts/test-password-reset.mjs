import assert from 'node:assert/strict';
import { createPasswordResetService } from '../src/services/passwordReset.js';
import { protectEmailPayload, revealEmailPayload } from '../src/lib/emailPayload.js';
import { renderEmail } from '../src/services/mailer.js';

process.env.SUPABASE_SERVICE_ROLE_KEY = 'offline-password-reset-test-secret-0123456789abcdef';

let clock = Date.parse('2026-11-25T04:00:00.000Z');
let nextCodeId = 0;
const accounts = [
  { id: 'user-1', email: 'member@example.com', status: 'active' },
  { id: 'user-2', email: 'other@example.com', status: 'active' },
];
let codeRows = [];
const queuedEmails = [];
const effects = [];

const repository = {
  async findActiveProfileByEmail(email) {
    return accounts.find((account) => account.email === email && account.status === 'active') || null;
  },
  async findProfileById(userId) {
    return accounts.find((account) => account.id === userId) || null;
  },
  async hasRecentRequest(userId, ipHash, cutoff) {
    return codeRows.some((row) =>
      Date.parse(row.created_at) >= Date.parse(cutoff) &&
      (row.user_id === userId || row.request_ip_hash === ipHash));
  },
  async createCode(row) {
    const recent = await this.hasRecentRequest(
      row.user_id,
      row.request_ip_hash,
      new Date(clock - 60_000).toISOString(),
    );
    if (recent) return null;
    codeRows = codeRows.map((previous) =>
      previous.user_id === row.user_id && !previous.used_at
        ? { ...previous, used_at: row.created_at }
        : previous);
    const inserted = { ...row, id: `code-${++nextCodeId}`, used_at: null };
    codeRows.push(inserted);
    return { id: inserted.id };
  },
  async invalidateCode(codeId, usedAt) {
    codeRows = codeRows.map((row) => row.id === codeId ? { ...row, used_at: usedAt } : row);
  },
  async findLatestCode(userId) {
    return [...codeRows]
      .filter((row) => row.user_id === userId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at))[0] || null;
  },
  async findCodeById(codeId) {
    return codeRows.find((row) => row.id === codeId) || null;
  },
  async incrementAttempts(codeId, attempts) {
    const index = codeRows.findIndex((row) => row.id === codeId && row.attempts === attempts && !row.used_at);
    if (index < 0 || attempts >= 5) return false;
    codeRows[index] = { ...codeRows[index], attempts: attempts + 1 };
    return true;
  },
  async consumeCode(codeId, userId, usedAt) {
    const index = codeRows.findIndex((row) =>
      row.id === codeId && row.user_id === userId && !row.used_at && row.attempts < 5);
    if (index < 0) return false;
    codeRows[index] = { ...codeRows[index], used_at: usedAt };
    return true;
  },
};

const makeService = () => createPasswordResetService({
  repository,
  enqueueOtp: async (email, otp) => {
    queuedEmails.push({
      email,
      payload: protectEmailPayload('password_otp', { otp }),
    });
  },
  updatePassword: async (userId, password) => effects.push({ action: 'password-updated', userId, password }),
  revokeSessions: async (userId) => effects.push({ action: 'sessions-revoked', userId }),
  writeAudit: async (userId) => effects.push({ action: 'audit-written', userId }),
  sendPasswordChanged: async (email) => effects.push({ action: 'password-changed-email', email }),
  now: () => clock,
});

const expectCodeError = async (promise, code) => {
  await assert.rejects(promise, (error) => error.code === code);
};

const run = async () => {
  const service = makeService();
  const genericResponse = await service.request({ email: 'unknown@example.com', ip: '192.0.2.1' });
  assert.deepEqual(genericResponse, {
    message: 'If an active account uses that email, a verification code will be sent.',
    resendAfter: 60,
  });
  assert.deepEqual(
    await service.request({ email: 'MEMBER@example.com', ip: '192.0.2.1' }),
    genericResponse,
  );
  assert.equal(queuedEmails.length, 1);
  const firstCode = revealEmailPayload('password_otp', queuedEmails[0].payload).otp;
  assert.match(firstCode, /^\d{6}$/);

  const storedCode = codeRows[0];
  assert.equal(storedCode.code_hash.includes(firstCode), false);
  assert.equal(JSON.stringify(storedCode).includes(firstCode), false);
  assert.equal(JSON.stringify(queuedEmails[0].payload).includes(firstCode), false);
  assert.equal(JSON.stringify(genericResponse).includes(firstCode), false);
  assert.equal(revealEmailPayload('password_otp', queuedEmails[0].payload).otp, firstCode);

  const wrongCode = firstCode === '000000' ? '000001' : '000000';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await expectCodeError(
      service.verify({ email: 'member@example.com', code: wrongCode }),
      attempt === 4 ? 'RESET_CODE_LOCKED' : 'RESET_CODE_INVALID',
    );
  }
  assert.equal(codeRows[0].attempts, 5);
  await expectCodeError(
    service.verify({ email: 'member@example.com', code: firstCode }),
    'RESET_CODE_LOCKED',
  );

  clock += 61_000;
  const expiryResponse = await service.request({ email: 'member@example.com', ip: '192.0.2.1' });
  assert.deepEqual(expiryResponse, genericResponse);
  const expiredCode = revealEmailPayload('password_otp', queuedEmails.at(-1).payload).otp;
  clock += 10 * 60_000 + 1;
  await expectCodeError(
    service.verify({ email: 'member@example.com', code: expiredCode }),
    'RESET_CODE_EXPIRED',
  );

  clock += 61_000;
  await service.request({ email: 'member@example.com', ip: '192.0.2.1' });
  const usedCode = revealEmailPayload('password_otp', queuedEmails.at(-1).payload).otp;
  const { resetToken } = await service.verify({ email: 'member@example.com', code: usedCode });
  await service.confirm({
    email: 'member@example.com',
    resetToken,
    newPassword: 'newpassword123',
  });
  await expectCodeError(
    service.confirm({
      email: 'member@example.com',
      resetToken,
      newPassword: 'anotherpass123',
    }),
    'RESET_CODE_EXPIRED',
  );
  assert.deepEqual(effects.map((effect) => effect.action), [
    'password-updated',
    'sessions-revoked',
    'audit-written',
    'password-changed-email',
  ]);
  assert.equal(effects.some((effect) => JSON.stringify(effect).includes(usedCode)), false);

  clock += 61_000;
  const beforeResend = queuedEmails.length;
  await service.request({ email: 'member@example.com', ip: '192.0.2.1' });
  await service.request({ email: 'member@example.com', ip: '198.51.100.8' });
  assert.equal(queuedEmails.length, beforeResend + 1);
  const ipCooldownResult = await service.request({ email: 'other@example.com', ip: '192.0.2.1' });
  assert.deepEqual(ipCooldownResult, genericResponse);
  assert.equal(queuedEmails.length, beforeResend + 1);

  const loggedMessages = [];
  let failedQueueCode;
  const originalConsoleError = console.error;
  console.error = (...parts) => loggedMessages.push(parts.join(' '));
  try {
    const failingService = createPasswordResetService({
      repository,
      enqueueOtp: async (_email, code) => {
        failedQueueCode = code;
        throw new Error(`SMTP rejected code ${code}`);
      },
      updatePassword: async () => {},
      revokeSessions: async () => {},
      writeAudit: async () => {},
      sendPasswordChanged: async () => {},
      now: () => clock,
    });
    assert.deepEqual(
      await failingService.request({ email: 'other@example.com', ip: '203.0.113.9' }),
      genericResponse,
    );
  } finally {
    console.error = originalConsoleError;
  }
  assert.ok(failedQueueCode);
  assert.equal(loggedMessages.join('\n').includes(failedQueueCode), false);

  const otpEmail = renderEmail(
    'password_otp',
    revealEmailPayload('password_otp', queuedEmails[0].payload),
  );
  assert.ok(otpEmail.text.includes(firstCode));
  assert.ok(otpEmail.html.includes(firstCode));
  assert.match(otpEmail.html, /expires in 10 minutes/i);
  assert.match(otpEmail.html, /ignore this email/i);
  assert.throws(
    () => renderEmail('password_otp', {}),
    /requires a six-digit verification code/,
  );
  const changedEmail = renderEmail('password_changed');
  assert.match(changedEmail.subject, /password was changed/i);

  console.log('Password reset tests passed (generic response, attempts, expiry, one-time token, cooldown, encrypted OTP).');
};

await run();
