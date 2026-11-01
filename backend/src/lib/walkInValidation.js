// Strict validation for walk-in (day pass) customers. Used by /clerk/walkins/validate, /cash and /qrph.
// The frontend mirrors these rules (frontend/src/lib/walkInRules.js); the server is the authority.

const NAME_PART = /^[\p{L}\p{M}]+(?:['’.-][\p{L}\p{M}]+)*\.?$/u;
const BLOCKED_NAME_WORDS = new Set(['test', 'tester', 'asdf', 'asdfgh', 'qwerty', 'xxx', 'none', 'unknown', 'guest', 'sample', 'name', 'fullname', 'customer', 'walkin', 'na', 'n/a']);
const EMAIL = /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;
const EMAIL_TYPOS = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.comm': 'gmail.com', 'gmail.cm': 'gmail.com',
  'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'hotmial.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'icloud.con': 'icloud.com',
};

export const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('63') && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.length === 10 && digits.startsWith('9')) return `0${digits}`;
  return digits;
};

export const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const titleCaseWord = (word) => word.toLowerCase().replace(/(^|['’.-])([\p{L}])/gu, (_m, sep, letter) => `${sep}${letter.toUpperCase()}`);

export const normalizeName = (value) => {
  const collapsed = String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim();
  const letters = collapsed.replace(/[^\p{L}]/gu, '');
  const allLower = letters && letters === letters.toLowerCase();
  const allUpper = letters && letters === letters.toUpperCase();
  return allLower || allUpper ? collapsed.split(' ').map(titleCaseWord).join(' ') : collapsed;
};

const validName = (name) => {
  if (!name) return 'Enter the customer\'s full name.';
  if (name.length < 5) return 'Enter the first and last name (at least 5 characters).';
  if (name.length > 80) return 'The name is too long (80 characters maximum).';
  if (/\d/.test(name)) return 'The name cannot contain numbers.';
  const parts = name.split(' ');
  if (parts.length < 2) return 'Enter both the first and last name.';
  for (const part of parts) {
    if (!NAME_PART.test(part)) return 'Use letters only (spaces, hyphens, apostrophes and periods are allowed).';
  }
  const letters = (part) => part.replace(/[^\p{L}]/gu, '');
  if (letters(parts[0]).length < 2 || letters(parts[parts.length - 1]).length < 2) return 'The first and last name must each have at least 2 letters.';
  if (/(.)\1{3,}/iu.test(name)) return 'That name looks incorrect. Check for repeated letters.';
  if (parts.some((part) => BLOCKED_NAME_WORDS.has(part.toLowerCase().replace(/\.$/, '')))) return 'Enter the customer\'s real name.';
  return null;
};

const validPhone = (phone) => {
  if (!phone) return 'Enter the mobile number.';
  if (!/^09\d{9}$/.test(phone)) return 'Enter a valid Philippine mobile number: 11 digits starting with 09 (for example 0917 123 4567).';
  if (new Set(phone).size <= 3) return 'That mobile number looks incorrect. Ask the customer to confirm it.';
  if (['09123456789', '09876543210', '09123456780'].includes(phone)) return 'That mobile number looks like a placeholder. Ask the customer to confirm it.';
  return null;
};

export const validateWalkInCustomer = (body = {}, { plan = null } = {}) => {
  const errors = [];
  const add = (field, message, extra = {}) => errors.push({ field, message, ...extra });

  const full_name = normalizeName(body.full_name);
  const phone = normalizePhone(body.phone);
  const email = normalizeEmail(body.email);
  const notes = String(body.notes || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  const promo_code = String(body.promo_code || '').trim().toUpperCase();
  const is_student = body.is_student === true || body.is_student === 'true';
  const student_id_checked = body.student_id_checked === true || body.student_id_checked === 'true';

  const nameError = validName(full_name);
  if (nameError) add('full_name', nameError);
  const phoneError = validPhone(phone);
  if (phoneError) add('phone', phoneError);

  if (email) {
    const domain = email.split('@')[1] || '';
    if (email.length > 254 || email.includes('..') || !EMAIL.test(email)) add('email', 'Enter a valid email address, for example name@example.com.');
    else if (EMAIL_TYPOS[domain]) add('email', `Did you mean ${email.split('@')[0]}@${EMAIL_TYPOS[domain]}?`, { suggestion: `${email.split('@')[0]}@${EMAIL_TYPOS[domain]}` });
  }

  if (notes.length > 200) add('notes', 'Notes can be 200 characters at most.');
  if (promo_code && !/^[A-Z0-9_-]{3,20}$/.test(promo_code)) add('promo_code', 'Promo codes use 3-20 letters, numbers, dashes or underscores.');

  if (is_student) {
    if (plan && plan.student_price == null) add('is_student', 'The day pass has no student price.');
    else if (!student_id_checked) add('student_id_checked', 'Confirm that you checked the customer\'s valid student ID.');
  }

  const values = { full_name, phone, email, notes: notes || null, promo_code: promo_code || null, is_student, student_id_checked };
  return { values, errors, valid: errors.length === 0 };
};

export const walkInValidationResponse = (errors) => ({ error: errors[0]?.message || 'Check the highlighted fields.', errors });
