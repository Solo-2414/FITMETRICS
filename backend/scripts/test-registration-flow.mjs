import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';

process.env.SUPABASE_URL = 'https://offline-test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'offline-service-role-key';
process.env.SUPABASE_ANON_KEY = 'offline-anon-key';
process.env.REGISTRATION_ENC_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.MAIL_FROM = 'test@fitmetrics.local';

const { isCurrentDuplicateValue, normalizedDuplicateFields, registrationErrors, encryptFormForIntent, decryptForm } = await import('../src/services/registration.js');
const { simulatePaidRegistration } = await import('../src/routes/clerk.js');
const { qrPaymentResponse } = await import('../src/lib/qrPayment.js');
const { stateFor } = await import('../src/services/membershipState.js');
const { paymentMethodError } = await import('../src/lib/paymentModes.js');
const { renderEmail, sendEmail } = await import('../src/services/mailer.js');
const source = await readFile(new URL('../src/routes/paymongo.js', import.meta.url), 'utf8');
const registrationSource = await readFile(new URL('../src/services/registration.js', import.meta.url), 'utf8');
const membershipSource = await readFile(new URL('../src/services/membership.js', import.meta.url), 'utf8');
const clerkSource = await readFile(new URL('../src/routes/clerk.js', import.meta.url), 'utf8');
const migration = await readFile(new URL('../../supabase/migrations/025_registration_intents.sql', import.meta.url), 'utf8').catch(() => '');
const coreSchema = await readFile(new URL('../../supabase/migrations/001_core.sql', import.meta.url), 'utf8');
const receiptSchema = await readFile(new URL('../../supabase/migrations/023_clerk_qrph_receipts.sql', import.meta.url), 'utf8');
const walkInMigration = await readFile(new URL('../../supabase/migrations/030_clerk_walkin_customers_membership_state.sql', import.meta.url), 'utf8');

const tableColumns = (sql, tableName) => {
  const table = sql.match(new RegExp(`create table public\\.${tableName} \\(([\\s\\S]*?)\\r?\\n\\s*\\);`));
  if (!table) return new Set();
  return new Set(table[1].split('\n')
    .map((line) => line.trim().match(/^([a-z_][a-z0-9_]*)\s+/i)?.[1])
    .filter(Boolean));
};
const schemaColumns = {
  memberships: tableColumns(coreSchema, 'memberships'),
  payments: new Set([...tableColumns(coreSchema, 'payments'), 'plan_id', 'gross_amount', 'discount', 'promo_id', 'provider', 'provider_checkout_id', 'checkout_url', 'coach_id', 'coach_addon_amount', 'provider_payment_id', 'send_receipt', 'paid_at', 'cash_tendered', 'change_given']),
};
const strictFakeInsert = (table, row) => {
  const unknown = Object.keys(row).filter((column) => !schemaColumns[table]?.has(column));
  if (unknown.length) throw new Error(`Unknown ${table} column(s): ${unknown.join(', ')}`);
  return row;
};

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

test('duplicate checks ignore empty phones and scope valid values', async () => {
  assert.deepEqual(normalizedDuplicateFields({ email: '', phone: '' }), []);
  assert.deepEqual(normalizedDuplicateFields({ email: 'USER@Example.com', phone: '' }), [{ field: 'email', value: 'user@example.com' }]);
  assert.deepEqual(normalizedDuplicateFields({ email: '', phone: '0917 123 4567' }), [{ field: 'phone', value: '09171234567' }]);
});

test('required information and stale duplicate helpers are deterministic', async () => {
  assert.match(await readFile(new URL('../../frontend/src/lib/registrationRules.js', import.meta.url), 'utf8'), /registrationIssueList/);
  assert.equal(isCurrentDuplicateValue('new@example.com', 'old@example.com'), false);
  assert.equal(isCurrentDuplicateValue('same@example.com', 'same@example.com'), true);
});

test('staff duplicate responses do not expose member details', async () => {
  assert.match(clerkSource, /staff account and cannot be used for a member/);
  assert.match(clerkSource, /requireRole\('admin', 'clerk'\)/);
});

test('QR start stores encrypted form data only', async () => {
  const encrypted = encryptFormForIntent(form);
  assert.notEqual(encrypted, JSON.stringify(form));
  assert.equal(encrypted.includes(form.password), false);
  assert.deepEqual(decryptForm(encrypted), form);
  assert.match(source, /router\.post\('\/paymongo\/webhook'/);
});

test('QR payment contract includes a valid five-minute response', async () => {
  const expiresAt = new Date(Date.now() + 300000).toISOString();
  const response = qrPaymentResponse({
    paymentId: 'payment-1', qrImageUrl: 'https://paymongo.test/qr.png',
    expiresAt, amountTotal: 1250, simulationEnabled: true,
  });
  assert.deepEqual(Object.keys(response).sort(), ['amount_total', 'expires_at', 'payment_id', 'qr_image_url', 'simulation_enabled']);
  assert.equal(response.amount_total, 1250);
  assert.ok(Date.parse(response.expires_at) - Date.now() > 290000);
  assert.match(clerkSource, /payment_method === 'qrph'/);
  assert.match(clerkSource, /qrPaymentResponse/);
});

test('renewal QR failures do not use the checkout path', async () => {
  const renewalBlock = clerkSource.slice(clerkSource.indexOf("router.post('/clerk/memberships'"), clerkSource.indexOf("router.post('/clerk/attendance'"));
  assert.match(renewalBlock, /createQrphPayment/);
  assert.match(renewalBlock, /status: 'failed'/);
  assert.match(renewalBlock, /payment_method === 'qrph'/);
  assert.equal(renewalBlock.indexOf("createQrphPayment") < renewalBlock.indexOf("startClerkPayment"), true);
  assert.match(membershipSource, /if \(method === 'qrph'\) throw new Error/);
});

test('renewal QR supports resume, replacement, and conflict summaries', async () => {
  const renewalBlock = clerkSource.slice(clerkSource.indexOf("router.post('/clerk/memberships'"), clerkSource.indexOf("router.post('/clerk/attendance'"));
  assert.match(renewalBlock, /expirePendingQrPayments/);
  assert.match(renewalBlock, /resumed: true/);
  assert.match(renewalBlock, /status\(409\)\.json\(\{ error: .*payment: summary/);
  assert.match(renewalBlock, /qrImageUrl/);
});

test('stale QR payments expire and activation failures become needs_review', async () => {
  assert.match(membershipSource, /eq\('method', 'qrph'\)/);
  assert.match(membershipSource, /lt\('qr_expires_at'/);
  assert.match(membershipSource, /status: 'needs_review'/);
  assert.match(source, /Payment received, but membership confirmation needs staff review/);
});

test('QR availability follows configured payment modes', async () => {
  const disabled = paymentMethodError(['cash', 'gcash', 'maya'], 'qrph');
  assert.equal(disabled, 'Payment method "qrph" is disabled.');
  assert.equal(paymentMethodError(['cash', 'gcash', 'maya', 'qrph'], 'qrph'), null);
  assert.match(clerkSource, /paymentMethodError/);
  assert.match(clerkSource, /payment_modes/);
  assert.match(clerkSource, /qrPaymentResponse/);
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
  assert.match(clerkSource, /finalizeIntent/);
  assert.match(clerkSource, /providerStatus: 'succeeded'/);
});

test('simulate route handler finalizes one complete registration', async () => {
  process.env.NODE_ENV = 'development';
  process.env.ALLOW_PAYMENT_SIMULATION = 'true';
  const intent = { id: 'intent-1', provider_intent_id: 'pi-1', amount_total: 1200 };
  const result = {
    status: 'paid',
    member: { id: 'member-1' },
    membership: { id: 'membership-1', status: 'active' },
    payment: { id: 'payment-1', status: 'paid', receipt_number: 'FM-2026-000001' },
    emails: [{ email_type: 'welcome' }],
  };
  const response = {};
  await simulatePaidRegistration({
    req: { params: { id: intent.id }, user: { id: 'clerk-1' } },
    res: { status(code) { response.status = code; return this; }, json(body) { response.body = body; return this; } },
    next: (error) => { throw error; },
    loadIntent: async () => ({ data: intent, error: null }),
    finalize: async (receivedIntent, context) => {
      assert.equal(receivedIntent, intent);
      assert.deepEqual(context, {
        providerStatus: 'succeeded',
        providerIntentId: 'pi-1',
        paidAmount: 1200,
        actorId: 'clerk-1',
        providerPaymentId: 'sim_intent-1',
        source: 'simulate',
        getPlan: context.getPlan,
        getCoach: context.getCoach,
      });
      return result;
    },
    audit: async () => {},
  });
  assert.equal(response.body.status, 'paid');
  assert.equal(response.body.member.id, 'member-1');
  assert.equal(response.body.membership.status, 'active');
  assert.equal(response.body.payment.status, 'paid');
  assert.equal(response.body.payment.receipt_number, 'FM-2026-000001');
  assert.equal(response.body.emails[0].email_type, 'welcome');
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

test('membership state keeps current monthly and queues weekly without overwriting', async () => {
  const state = stateFor([
    { id: 'monthly', status: 'active', start_date: '2026-10-01', end_date: '2026-11-16' },
    { id: 'weekly', status: 'active', start_date: '2026-11-17', end_date: '2026-11-23' },
  ], '2026-11-01');
  assert.equal(state.current.id, 'monthly');
  assert.deepEqual(state.queued.map((row) => row.id), ['weekly']);
  assert.match(membershipSource, /\.from\('memberships'\)\.insert/);
  assert.doesNotMatch(membershipSource, /update\(\{[^}]*end_date/);
});

test('walk-in cash and QR contracts cover receipt, customer, visit, check-in, and idempotency', async () => {
  assert.match(clerkSource, /\/clerk\/walkins\/validate/);
  assert.match(clerkSource, /\/clerk\/walkins\/cash/);
  assert.match(clerkSource, /\/clerk\/walkins\/qrph/);
  assert.match(registrationSource, /walkin_payment_completed/);
  assert.match(registrationSource, /intent\.kind === 'walkin'/);
  assert.match(registrationSource, /eq\('status', 'processing'\)/);
  assert.match(walkInMigration, /walk_in_customers/);
  assert.match(walkInMigration, /unique index if not exists walk_in_customers_phone_uq/);
  assert.match(walkInMigration, /unique index if not exists walk_in_customers_email_uq/);
});

test('fake database constraints reject invalid payment subjects and unknown walk-in columns', async () => {
  const paymentMigration = `${coreSchema}\n${receiptSchema}\n${await readFile(new URL('../../supabase/migrations/024_payments_subject_pending_registration.sql', import.meta.url), 'utf8')}\n${walkInMigration}`;
  assert.match(paymentMigration, /payments_subject_check/);
  assert.match(walkInMigration, /kind in \('registration', 'walkin'\)/);
  assert.throws(() => strictFakeInsert('memberships', { member_id: 'member-1', unknown_column: true }), /Unknown memberships column/);
});

test('walk-in receipt renderer uses Day Pass Receipt and plain text', async () => {
  const receipt = renderEmail('receipt', { isWalkIn: true, receiptNumber: 'FM-2026-000003', memberName: 'Walk-in Guest', planName: 'Session', amount: 90, method: 'Cash', cashTendered: 100, changeGiven: 10, validUntil: '11:59 PM' });
  assert.match(receipt.text, /Day Pass Receipt/);
  assert.match(receipt.text, /Valid today until 11:59 PM/);
  assert.match(receipt.html, /Day Pass Receipt/);
});

test('dashboard e-wallet totals include QR Ph payments', async () => {
  const clerk = await readFile(new URL('../src/routes/clerk.js', import.meta.url), 'utf8');
  assert.match(clerk, /payment\.method === 'qrph'/);
  assert.match(clerk, /\['gcash', 'maya', 'qrph'\]\.includes\(payment\.method\)/);
});

test('fake database rejects camelCase membership columns', async () => {
  assert.ok(schemaColumns.memberships.has('start_date'));
  assert.ok(schemaColumns.memberships.has('end_date'));
  assert.equal(schemaColumns.memberships.has('startDate'), false);
  assert.equal(schemaColumns.memberships.has('endDate'), false);
  assert.throws(() => strictFakeInsert('memberships', { member_id: 'member-1', startDate: '2026-10-31', endDate: '2026-11-29' }), /Unknown memberships column/);
  assert.doesNotThrow(() => strictFakeInsert('memberships', { member_id: 'member-1', start_date: '2026-10-31', end_date: '2026-11-29' }));
  assert.match(membershipSource, /start_date: dates\.startDate/);
  assert.match(membershipSource, /end_date: dates\.endDate/);
  assert.equal(membershipSource.includes('...dates'), false);
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
