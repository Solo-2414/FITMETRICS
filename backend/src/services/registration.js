import crypto from 'node:crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { createMembershipAndPayment, nextReceiptNumber } from './membership.js';
import { notifyStaff } from './notify.js';
import { enqueueEmail } from './emailQueue.js';
import { getGymSettings } from './maintenance.js';
import { today } from '../utils/time.js';

const KEY_LENGTH = 32;
const registrationKey = () => {
  const raw = process.env.REGISTRATION_ENC_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, /^[0-9a-f]{64}$/i.test(raw) ? 'hex' : 'base64');
  return key.length === KEY_LENGTH ? key : null;
};

export const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
export const normalizePhone = (value) => {
  const compact = String(value || '').replace(/[\s-]/g, '');
  return compact.startsWith('+63') ? `0${compact.slice(3)}` : compact;
};

export const normalizedDuplicateFields = ({ email, phone } = {}) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  return [
    ...(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ? [{ field: 'email', value: normalizedEmail }] : []),
    ...(/^09\d{9}$/.test(normalizedPhone) ? [{ field: 'phone', value: normalizedPhone }] : []),
  ];
};

export const isCurrentDuplicateValue = (currentValue, requestedValue) => currentValue === requestedValue;

export const registrationErrors = (form = {}) => {
  const errors = {};
  const name = String(form.full_name || '').trim();
  if (!name) errors.full_name = 'Enter the member\'s full name.';
  else if (name.length < 2 || name.length > 80 || !/^[\p{L} .'-]+$/u.test(name)) errors.full_name = 'Enter a name using letters, spaces, periods, hyphens, or apostrophes.';
  const email = normalizeEmail(form.email);
  if (!email) errors.email = 'Enter an email address.';
  else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email, for example name@example.com.';
  const phone = normalizePhone(form.phone);
  const emergencyPhone = normalizePhone(form.emergency_contact_phone);
  if (!/^09\d{9}$/.test(phone)) errors.phone = 'Enter an 11-digit Philippine mobile number.';
  if (!String(form.password || '') || String(form.password).length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) errors.password = 'Use at least 8 characters with at least one letter and one number.';
  if (!['male', 'female', 'other'].includes(form.gender)) errors.gender = 'Choose the member\'s gender.';
  if (!String(form.emergency_contact_name || '').trim()) errors.emergency_contact_name = 'Enter an emergency contact name.';
  if (!/^09\d{9}$/.test(emergencyPhone)) errors.emergency_contact_phone = 'Enter an 11-digit Philippine mobile number.';
  if (!form.plan_code) errors.plan_code = 'Please choose a membership plan to continue.';
  return errors;
};

const encryptForm = (form) => {
  const key = registrationKey();
  if (!key) {
    const error = new Error('Registration encryption is not configured.');
    error.statusCode = 503;
    throw error;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(form), 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${encrypted.toString('base64')}`;
};

export const encryptFormForIntent = encryptForm;

export const decryptForm = (value) => {
  const key = registrationKey();
  if (!key) throw new Error('Registration encryption is not configured.');
  const [ivValue, tagValue, encryptedValue] = String(value || '').split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64')), decipher.final()]).toString('utf8'));
};

const memberSummary = (profile, details) => ({
  id: profile.id,
  full_name: profile.full_name,
  member_code: details?.member_code || null,
  status: profile.status,
});

export const findRegistrationConflict = async ({ email, phone }, excludeIntentId = null) => {
  const conflicts = await findRegistrationConflicts({ email, phone }, excludeIntentId);
  return conflicts[0] || null;
};

export const findRegistrationConflicts = async ({ email, phone }, excludeIntentId = null) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  const fields = normalizedDuplicateFields({ email: normalizedEmail, phone: normalizedPhone });
  if (!fields.length) return [];
  const { data: profiles, error } = await supabaseAdmin.from('profiles')
    .select('id, full_name, email, phone, status, role, member_details(member_code)');
  if (error) throw error;
  const results = [];
  for (const { field, value } of fields) {
    const profile = (profiles || []).find((item) => field === 'email'
      ? normalizeEmail(item.email) === value
      : normalizePhone(item.phone) === value);
    if (profile) {
      results.push({
        code: 'MEMBER_EXISTS',
        field,
        member: profile.role === 'member' ? memberSummary(profile, profile.member_details) : null,
        staff: profile.role !== 'member',
      });
      continue;
    }
    if (field === 'email') {
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (authError) throw authError;
      const authUser = authUsers.users.find((user) => normalizeEmail(user.email) === value);
      if (authUser) {
        const profileResult = await supabaseAdmin.from('profiles').select('id, full_name, status, role, member_details(member_code)').eq('id', authUser.id).maybeSingle();
        if (profileResult.error) throw profileResult.error;
        const authProfile = profileResult.data || { ...authUser, role: 'member' };
        results.push({
          code: 'MEMBER_EXISTS',
          field,
          member: authProfile.role === 'member' ? memberSummary({ ...authUser, ...authProfile }, authProfile.member_details) : null,
          staff: authProfile.role !== 'member',
        });
      }
    }
  }
  const pendingFields = fields.map(({ field }) => field);
  let intentQuery = supabaseAdmin.from('registration_intents')
    .select('id, expires_at, email_normalized, phone_normalized, created_by')
    .eq('status', 'pending');
  if (excludeIntentId) intentQuery = intentQuery.neq('id', excludeIntentId);
  const { data: intents, error: intentError } = await intentQuery.order('created_at', { ascending: false }).limit(20);
  if (intentError) throw intentError;
  for (const intent of intents || []) {
    const field = pendingFields.find((candidate) => candidate === 'email'
      ? intent.email_normalized === normalizedEmail
      : intent.phone_normalized === normalizedPhone);
    if (field) results.push({ code: 'REGISTRATION_PENDING', field, expires_at: intent.expires_at, intent_id: intent.id, resumable: intent.created_by });
  }
  return results;
};

const cleanupAuthUser = async (id) => {
  const result = await supabaseAdmin.auth.admin.deleteUser(id);
  if (result.error) console.error(`Could not compensate registration auth user ${id}: ${result.error.message}`);
};

export const completeRegistration = async ({ form, plan, coach, amount, grossAmount, discount, actorId, method, cashTendered, sendReceipt, providerPaymentId = null }) => {
  const normalized = { ...form, email: normalizeEmail(form.email), phone: normalizePhone(form.phone), emergency_contact_phone: normalizePhone(form.emergency_contact_phone) };
  const { data: auth, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: normalized.email, password: normalized.password, email_confirm: true,
    user_metadata: normalized, app_metadata: { role: 'member' },
  });
  if (authError) {
    const error = new Error(authError.message);
    error.statusCode = /already|registered|exists|unique/i.test(authError.message) ? 409 : 400;
    error.code = error.statusCode === 409 ? 'MEMBER_EXISTS' : undefined;
    throw error;
  }
  const memberId = auth.user.id;
  try {
    const { error: detailError } = await supabaseAdmin.from('member_details').insert({
      member_id: memberId, member_code: `FM-${memberId.slice(0, 8).toUpperCase()}`,
      is_student: Boolean(normalized.is_student), join_date: new Date().toISOString().slice(0, 10),
    });
    if (detailError) throw detailError;
    const result = await createMembershipAndPayment({
      memberId, plan, coachId: coach?.id || null, coachAddonAmount: Number(coach?.addon_amount || coach?.monthly_price || 0),
      amount, grossAmount, discount, method, actorId, cashTendered, sendReceipt,
      providerPaymentId,
    });
    if (sendReceipt) {
      try {
        await enqueueEmail({
          emailType: 'welcome',
          recipient: normalized.email,
          dedupeKey: `member:${memberId}:welcome`,
          payload: { memberName: normalized.full_name, memberCode: `FM-${memberId.slice(0, 8).toUpperCase()}`, planName: plan.name, expiryDate: result.membership.end_date, portalLink: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login` },
        });
      } catch (emailError) {
        console.error(`Welcome email could not be queued for member ${memberId}: ${emailError.message}`);
      }
    }
    await notifyStaff({ type: 'registration', title: 'New member registered', message: `${normalized.full_name} registered for ${plan.name}.`, meta: { member_id: memberId } });
    return { ...result, member: { id: memberId, full_name: normalized.full_name, email: normalized.email } };
  } catch (error) {
    await supabaseAdmin.from('payments').delete().eq('member_id', memberId);
    await supabaseAdmin.from('memberships').delete().eq('member_id', memberId);
    await supabaseAdmin.from('member_details').delete().eq('member_id', memberId);
    await cleanupAuthUser(memberId);
    throw error;
  }
};

export const clearIntentForm = async (id, status) => {
  const { data, error } = await supabaseAdmin.from('registration_intents')
    .update({ status, form_encrypted: null }).eq('id', id).eq('status', 'pending').select().maybeSingle();
  if (error) throw error;
  return data;
};

export const expireRegistrationIntents = async () => {
  const { data, error } = await supabaseAdmin.from('registration_intents')
    .update({ status: 'expired', form_encrypted: null })
    .eq('status', 'pending').lt('expires_at', new Date().toISOString()).select('id');
  if (error) throw error;
  return data || [];
};

export const finalizeIntent = async (intent, {
  providerStatus,
  providerIntentId,
  providerPaymentId = null,
  paidAmount = null,
  source = 'unknown',
  actorId = null,
  getPlan,
  getCoach,
}) => {
  const paid = ['succeeded', 'paid'].includes(providerStatus);
  if (intent.status === 'paid') return intent;
  if (['cancelled', 'expired', 'failed'].includes(intent.status)) {
    if (paid) {
      const { data, error } = await supabaseAdmin.from('registration_intents')
        .update({ status: 'needs_review', form_encrypted: null }).eq('id', intent.id).select().single();
      if (error) throw error;
      await notifyStaff({ type: 'payment', title: 'Payment received after registration closed', message: `Refund in PayMongo or register the member again. Intent ${intent.id}.`, meta: { registration_intent_id: intent.id } });
      await supabaseAdmin.from('audit_log').insert({ actor_id: actorId, action: 'registration_paid_after_close', entity_type: 'registration_intent', entity_id: intent.id, details: { previous_status: intent.status } });
      return data;
    }
    return intent;
  }
  if (!paid) {
    if (!['failed', 'expired'].includes(providerStatus)) return intent;
    const { data, error } = await supabaseAdmin.from('registration_intents')
      .update({ status: providerStatus, form_encrypted: null }).eq('id', intent.id).eq('status', 'pending').select().maybeSingle();
    if (error) throw error;
    return data || intent;
  }
  if (providerIntentId && intent.provider_intent_id !== providerIntentId) {
    const error = new Error('PayMongo intent id does not match the registration intent.');
    error.statusCode = 422;
    throw error;
  }
  if (paidAmount != null && Number(paidAmount) !== Number(intent.amount_total)) {
    const { data, error } = await supabaseAdmin.from('registration_intents')
      .update({ status: 'needs_review', form_encrypted: null }).eq('id', intent.id).select().single();
    if (error) throw error;
    await notifyStaff({ type: 'payment', title: 'Registration payment needs review', message: `The paid amount did not match registration intent ${intent.id}.`, meta: { registration_intent_id: intent.id } });
    await supabaseAdmin.from('audit_log').insert({ actor_id: actorId, action: 'registration_amount_mismatch', entity_type: 'registration_intent', entity_id: intent.id, details: { expected: Number(intent.amount_total), actual: paidAmount, source } });
    return data;
  }
  const { data: processing, error: processingError } = await supabaseAdmin.from('registration_intents')
    .update({ status: 'processing' }).eq('id', intent.id).eq('status', 'pending').select().maybeSingle();
  if (processingError) throw processingError;
  if (!processing) return (await supabaseAdmin.from('registration_intents').select('*').eq('id', intent.id).single()).data;
  try {
    const form = decryptForm(intent.form_encrypted);
    if (intent.kind === 'walkin') {
      const plan = await getPlan('session', { allowSession: true });
      const expected = Number(intent.amount_total);
      if (paidAmount != null && Number(paidAmount) !== expected) {
        const { data, error } = await supabaseAdmin.from('registration_intents').update({ status: 'needs_review', form_encrypted: null }).eq('id', intent.id).select().single();
        if (error) throw error;
        await notifyStaff({ type: 'payment', title: 'Walk-in payment needs review', message: `The paid amount did not match walk-in intent ${intent.id}.`, meta: { registration_intent_id: intent.id } });
        return data;
      }
      const phone = normalizePhone(form.phone);
      const email = normalizeEmail(form.email);
      const existing = await supabaseAdmin.from('walk_in_customers').select('*').eq('phone_normalized', phone).maybeSingle();
      if (existing.error) throw existing.error;
      let customer = existing.data;
      if (!customer) {
        const created = await supabaseAdmin.from('walk_in_customers').insert({
          full_name: String(form.full_name).trim(), phone_normalized: phone, email_normalized: email || null,
          is_student: Boolean(form.is_student), notes: form.notes || null,
        }).select().single();
        if (created.error) throw created.error;
        customer = created.data;
      }
      const visit = await supabaseAdmin.from('walk_in_visits').insert({
        customer_id: customer.id, guest_name: String(form.full_name).trim(), guest_phone: phone,
        guest_email: email || null, is_student: Boolean(form.is_student), notes: form.notes || null,
        plan_id: plan.id, status: 'active', valid_until: `${today()}T23:59:59+08:00`,
        created_by: intent.created_by,
      }).select().single();
      if (visit.error) throw visit.error;
      const payment = await supabaseAdmin.from('payments').insert({
        walk_in_visit_id: visit.data.id, plan_id: plan.id, amount: expected, gross_amount: expected,
        method: 'qrph', status: 'paid', received_by: intent.created_by, provider: 'paymongo',
        provider_intent_id: intent.provider_intent_id, provider_payment_id: providerPaymentId,
        receipt_number: await nextReceiptNumber(), paid_at: new Date().toISOString(),
      }).select().single();
      if (payment.error) throw payment.error;
      const updatedVisit = await supabaseAdmin.from('walk_in_visits').update({
        payment_id: payment.data.id, checked_in_at: form.check_in_now === false ? null : new Date().toISOString(),
      }).eq('id', visit.data.id).select().single();
      if (updatedVisit.error) throw updatedVisit.error;
      if (form.check_in_now !== false) {
        const attendance = await supabaseAdmin.from('attendance').insert({ walk_in_visit_id: visit.data.id, method: 'manual', recorded_by: intent.created_by });
        if (attendance.error) throw attendance.error;
      }
      const customerUpdate = await supabaseAdmin.from('walk_in_customers').update({
        last_visit_at: new Date().toISOString(), visit_count: Number(customer.visit_count || 0) + 1,
      }).eq('id', customer.id);
      if (customerUpdate.error) throw customerUpdate.error;
      if (email) {
        const settings = await getGymSettings();
        await enqueueEmail({
          emailType: 'receipt', recipient: email, dedupeKey: `payment:${payment.data.id}:receipt`,
          payload: {
            memberName: form.full_name, memberEmail: email, receiptNumber: payment.data.receipt_number,
            dateTimePaid: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }),
            planName: plan.name, amount: expected, subtotal: expected, method: 'QR Ph',
            reference: providerPaymentId || intent.provider_intent_id, receivedBy: 'Front desk',
            validUntil: '11:59 PM', isWalkIn: true, gymName: settings.gym_name,
            businessLegalName: settings.business_legal_name, businessAddress: settings.business_address,
            businessTin: settings.business_tin, vatStatus: settings.vat_status, supportEmail: settings.support_email,
            supportPhone: settings.support_phone, receiptFooterNote: settings.receipt_footer_note,
          },
        });
      }
      const paidIntent = await supabaseAdmin.from('registration_intents').update({
        status: 'paid', form_encrypted: null, completed_at: new Date().toISOString(),
      }).eq('id', intent.id).eq('status', 'processing').select().single();
      if (paidIntent.error) throw paidIntent.error;
      await supabaseAdmin.from('audit_log').insert({ actor_id: actorId, action: 'walkin_payment_completed', entity_type: 'payment', entity_id: payment.data.id, details: { walk_in_visit_id: visit.data.id } });
      return { ...paidIntent.data, customer, visit: updatedVisit.data, payment: payment.data };
    }
    const conflict = await findRegistrationConflict(form, intent.id);
    if (conflict) throw Object.assign(new Error('A duplicate member was found after payment.'), { needsReview: true });
    const plan = await getPlan(form.plan_code);
    const coach = await getCoach(form.coach_id);
    const pricing = Number(intent.amount_total);
    const result = await completeRegistration({
      form, plan, coach, amount: pricing, grossAmount: Number(plan.price) + Number(coach?.addon_amount || coach?.monthly_price || 0),
      discount: 0, actorId: intent.created_by, method: 'qrph', sendReceipt: intent.send_receipt, providerPaymentId,
    });
    const { data: paidIntent, error: paidError } = await supabaseAdmin.from('registration_intents').update({
      status: 'paid', form_encrypted: null, member_id: result.member.id, completed_at: new Date().toISOString(),
    }).eq('id', intent.id).select().single();
    if (paidError) throw paidError;
    await supabaseAdmin.from('audit_log').insert({ actor_id: actorId, action: 'registration_completed', entity_type: 'registration_intent', entity_id: intent.id, details: { member_id: result.member.id } });
    return { ...paidIntent, member: result.member, payment: result.payment };
  } catch (error) {
    await supabaseAdmin.from('registration_intents').update({ status: 'needs_review', form_encrypted: null }).eq('id', intent.id);
    await notifyStaff({ type: 'registration', title: 'Paid registration needs review', message: error.message, meta: { registration_intent_id: intent.id } });
    await supabaseAdmin.from('audit_log').insert({ actor_id: actorId, action: 'registration_needs_review', entity_type: 'registration_intent', entity_id: intent.id, details: { error: error.message } });
    return { ...intent, status: 'needs_review' };
  }
};

export const finalizeRegistrationIntent = (intent, context) => finalizeIntent(intent, context);
