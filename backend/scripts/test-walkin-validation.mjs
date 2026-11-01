// Offline tests for the strict walk-in customer rules. Run from /backend:  node scripts/test-walkin-validation.mjs
import assert from 'node:assert/strict';
import { validateWalkInCustomer, normalizeName, normalizePhone } from '../src/lib/walkInValidation.js';

const plan = { student_price: 70 };
const ok = { full_name: 'Mae Nebran', phone: '0968 576 8473', email: '', is_student: false };
const results = [];
const test = (name, fn) => { try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name, e.message]); } };
const fields = (body, opts = { plan }) => validateWalkInCustomer(body, opts).errors.map((e) => e.field);

test('valid customer passes and values are normalized', () => {
  const r = validateWalkInCustomer(ok, { plan });
  assert.equal(r.valid, true); assert.equal(r.values.phone, '09685768473'); assert.equal(r.values.full_name, 'Mae Nebran');
});
test('phone formats +63, 63 and 9XXXXXXXXX normalize to 09XXXXXXXXX', () => {
  assert.equal(normalizePhone('+63 968 576 8473'), '09685768473');
  assert.equal(normalizePhone('639685768473'), '09685768473');
  assert.equal(normalizePhone('9685768473'), '09685768473');
});
test('13-digit and short mobile numbers are rejected', () => {
  assert.deepEqual(fields({ ...ok, phone: '0932131321312' }), ['phone']);
  assert.deepEqual(fields({ ...ok, phone: '0968576' }), ['phone']);
});
test('placeholder / repetitive mobile numbers are rejected (09090909090, 09000000000, 09123456789)', () => {
  for (const phone of ['09090909090', '09000000000', '09111111111', '09123456789']) assert.deepEqual(fields({ ...ok, phone }), ['phone'], phone);
});
test('single names, digits, symbols, spam and placeholder names are rejected', () => {
  for (const full_name of ['Mae', 'Mae1 Nebran', 'Mae N3bran', 'Mae @Nebran', 'aaaaa bbbbb', 'Test Customer', 'asdf asdf', 'M N', '  ']) {
    assert.deepEqual(fields({ ...ok, full_name }), ['full_name'], full_name);
  }
});
test('real names with hyphen, apostrophe, accents and initials are accepted', () => {
  for (const full_name of ["Mary-Ann O'Brien", 'José Dela Cruz', 'Juan P. Santos', 'Ma. Cristina Reyes']) assert.equal(validateWalkInCustomer({ ...ok, full_name }, { plan }).valid, true, full_name);
});
test('all-lowercase and all-uppercase names are title-cased, mixed case is preserved', () => {
  assert.equal(normalizeName('mae   nebran'), 'Mae Nebran');
  assert.equal(normalizeName('MAE NEBRAN'), 'Mae Nebran');
  assert.equal(normalizeName("juan dela cruz-o'neil"), "Juan Dela Cruz-O'Neil");
  assert.equal(normalizeName('Mae McDonald'), 'Mae McDonald');
});
test('email is optional but strict when given; common typos are blocked with a suggestion', () => {
  assert.equal(validateWalkInCustomer({ ...ok, email: 'mae@example.com' }, { plan }).valid, true);
  assert.deepEqual(fields({ ...ok, email: 'mae@@example.com' }), ['email']);
  assert.deepEqual(fields({ ...ok, email: 'mae example.com' }), ['email']);
  const typo = validateWalkInCustomer({ ...ok, email: 'mae@gmial.com' }, { plan });
  assert.equal(typo.errors[0].suggestion, 'mae@gmail.com');
});
test('student rate needs a confirmed student ID and a student price', () => {
  assert.deepEqual(fields({ ...ok, is_student: true }), ['student_id_checked']);
  assert.equal(validateWalkInCustomer({ ...ok, is_student: true, student_id_checked: true }, { plan }).valid, true);
  assert.deepEqual(fields({ ...ok, is_student: true, student_id_checked: true }, { plan: { student_price: null } }), ['is_student']);
});
test('notes are cleaned and limited; promo code format is checked', () => {
  assert.equal(validateWalkInCustomer({ ...ok, notes: 'line1\n\tline2' }, { plan }).values.notes, 'line1 line2');
  assert.deepEqual(fields({ ...ok, notes: 'x'.repeat(201) }), ['notes']);
  assert.deepEqual(fields({ ...ok, promo_code: '!!' }), ['promo_code']);
});
test('all problems are reported together (not one at a time)', () => {
  assert.deepEqual(fields({ full_name: 'x', phone: '1', email: 'bad', is_student: true }), ['full_name', 'phone', 'email', 'student_id_checked']);
});

for (const [s, n, m] of results) console.log(`${s}  ${n}${m ? `\n      -> ${m}` : ''}`);
process.exit(results.some(([s]) => s === 'FAIL') ? 1 : 0);
