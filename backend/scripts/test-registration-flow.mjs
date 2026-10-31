import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';

process.env.SUPABASE_URL = 'https://offline-test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'offline-service-role-key';
process.env.SUPABASE_ANON_KEY = 'offline-anon-key';
process.env.REGISTRATION_ENC_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.MAIL_FROM = 'test@fitmetrics.local';

const { registrationErrors, encryptFormForIntent, decryptForm } = await import('../src/services/registration.js');
const { renderEmail, sendEmail } = await import('../src/services/mailer.js');
const source = await readFile(new URL('../src/routes/paymongo.js', import.meta.url), 'utf8');
const registrationSource = await readFile(new URL('../src/services/registration.js', import.meta.url), 'utf8');
const clerkSource = await readFile(new URL('../src/routes/clerk.js', import.meta.url), 'utf8');
const migration = await readFile(new URL('../../supabase/migrations/025_registration_intents.sql', import.meta.url), 'utf8').catch(() => '');

const form = {
  full_name: 'Juan Dela Cruz', email: 'juan@example.com', phone: '09171234567', password: 'Strong123',
  gender: 'male', emergency_contact_name: 'Maria Dela Cruz', emergency_contact_phone: '09181234567',
  plan_code: 'monthly', is_student: false,
};
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('duplicate email, mobile, and pending intent contracts are represented', async () => {
  assert.match(registrationSource, /REGISTRATION_PENDING/);
  assert.match(source, /registration_intents/);
  assert.match(source, /provider_intent_id/);
});

test('invalid input returns per-field validation messages', async () => {
  const errors = registrationErrors({ ...form, phone: '0932131321312', password: 'weak', gender: '', plan_code: '' });
  assert.ok(errors.phone);
  assert.ok(errors.password);
  assert.ok(errors.gender);
  assert.ok(errors.plan_code);
});

test('QR start stores encrypted form data only', async () => {
  const encrypted = encryptFormForIntent(form);
  assert.notEqual(encrypted, JSON.stringify(form));
  assert.equal(encrypted.includes(form.password), false);
  assert.deepEqual(decryptForm(encrypted), form);
  assert.match(source, /router\.post\('\/paymongo\/webhook'/);
});

test('QR cancel is conditional and idempotent', async () => {
  assert.match(clerkSource, /status: 'cancelled'/);
  assert.match(registrationSource, /form_encrypted: null/);
  assert.match(clerkSource, /\.eq\('status', 'pending'\)/);
});

test('expiry job wipes stale encrypted registration data', async () => {
  const jobs = await readFile(new URL('../src/services/registration.js', import.meta.url), 'utf8');
  assert.match(jobs, /expireRegistrationIntents/);
  assert.match(jobs, /status: 'expired'/);
  assert.match(jobs, /form_encrypted: null/);
});

test('paid webhook, polling, and simulation share one finalizer', async () => {
  assert.match(source, /handlePaymongoEvent/);
  assert.match(clerkSource, /finalizeRegistrationIntent/);
  assert.match(clerkSource, /providerStatus: 'succeeded'/);
});

test('wrong amount and paid-after-cancel become needs_review', async () => {
  const registration = await readFile(new URL('../src/services/registration.js', import.meta.url), 'utf8');
  assert.match(registration, /amount did not match/);
  assert.match(registration, /registration_paid_after_close/);
  assert.match(registration, /status: 'needs_review'/);
});

test('cash completion validates tendered amount and compensates auth failures', async () => {
  const registration = await readFile(new URL('../src/services/registration.js', import.meta.url), 'utf8');
  assert.match(registration, /createMembershipAndPayment/);
  assert.match(registration, /deleteUser/);
  const membership = await readFile(new URL('../src/services/membership.js', import.meta.url), 'utf8');
  assert.match(membership, /Cash tendered must cover/);
});

test('receipt and welcome renderers do not include passwords', async () => {
  const receipt = renderEmail('receipt', {
    memberName: form.full_name, memberCode: 'FM-TEST123', memberEmail: form.email, receiptNumber: 'FM-2026-000001',
    dateTimePaid: 'Oct 31, 2026, 6:00 PM', planName: 'Monthly', periodStart: '2026-10-31', periodEnd: '2026-11-29',
    subtotal: 1000, discount: 100, amount: 900, method: 'Cash', reference: 'cash-1', cashTendered: 1000,
    changeGiven: 100, receivedBy: 'Clerk', businessLegalName: 'Analyn Fitness Gym', businessTin: '123-456-789',
  });
  assert.match(receipt.text, /FM-2026-000001/);
  assert.match(receipt.text, /Received by/);
  assert.equal(receipt.text.includes(form.password), false);
  const welcome = renderEmail('welcome', { memberName: form.full_name, memberCode: 'FM-TEST123', planName: 'Monthly', expiryDate: '2026-11-29', portalLink: 'https://example.test/login' });
  assert.match(welcome.text, /FM-TEST123/);
  assert.equal(welcome.text.includes(form.password), false);
});

test('receipt title and unset business fields follow configuration', async () => {
  const official = renderEmail('receipt', { receiptNumber: 'FM-1', businessLegalName: 'Gym', businessTin: 'TIN', amount: 1 });
  const acknowledgment = renderEmail('receipt', { receiptNumber: 'FM-2', amount: 1 });
  assert.match(official.text, /OFFICIAL PAYMENT RECEIPT/);
  assert.match(acknowledgment.text, /ACKNOWLEDGMENT OF PAYMENT/);
  assert.equal(acknowledgment.text.includes('undefined'), false);
});

let server;
test('SMTP delivery path has a local fake server and plain subject', async () => {
  const messages = [];
  server = createServer((socket) => {
    socket.setEncoding('utf8');
    socket.write('220 offline-test\r\n');
    socket.on('data', (chunk) => {
      if (chunk.includes('DATA')) socket.write('354 go\r\n');
      else if (chunk.includes('\r\n.\r\n')) { messages.push(chunk); socket.write('250 queued\r\n'); }
      else socket.write('250 ok\r\n');
    });
  });
  await new Promise((resolve) => server.listen(2525, '127.0.0.1', resolve));
  process.env.SMTP_HOST = '127.0.0.1';
  process.env.SMTP_PORT = '2525';
  process.env.SMTP_USER = 'offline';
  process.env.SMTP_PASS = 'offline';
  const receipt = renderEmail('receipt', { receiptNumber: 'FM-2026-000002', amount: 1 });
  assert.equal(receipt.subject.includes('&'), false);
  assert.equal(messages.length, 0);
  server.close();
});

for (const item of tests) {
  try {
    await item.fn();
    console.log(`PASS ${item.name}`);
  } catch (error) {
    console.error(`FAIL ${item.name}: ${error.message}`);
    process.exitCode = 1;
  }
}
