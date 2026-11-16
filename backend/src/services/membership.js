import { supabaseAdmin } from '../config/supabase.js';
import { enqueueEmail } from './emailQueue.js';
import { today } from '../utils/time.js';
import { notifyStaff } from './notify.js';
import { getGymSettings } from './maintenance.js';

const addDays = (date, days) => {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + Number(days) - 1);
  return result.toISOString().slice(0, 10);
};

const priceForPlan = (plan, isStudent, promo) => {
  const gross = Number(isStudent && plan.student_price !== null ? plan.student_price : plan.price);
  const promoDiscount = promo
    ? promo.discount_type === 'percent' ? gross * Number(promo.discount_value) / 100 : Number(promo.discount_value)
    : 0;
  const discount = Math.min(gross, Math.max(0, promoDiscount));
  return { gross, discount, amount: Math.max(0, gross - discount) };
};

const incrementPromo = async (promo) => {
  if (!promo?.id) return;
  const { data } = await supabaseAdmin.from('promos').select('usage_count').eq('id', promo.id).single();
  if (data) await supabaseAdmin.from('promos').update({ usage_count: Number(data.usage_count || 0) + 1 }).eq('id', promo.id);
};

export const queueReceiptEmail = async ({ memberId, plan, payment, dedupeKey = null }) => {
  const { data: profile, error } = await supabaseAdmin.from('profiles').select('full_name, email, phone, member_details(member_code)').eq('id', memberId).single();
  if (error) throw error;
  if (!profile?.email) return;
  const { data: membership } = payment.membership_id
    ? await supabaseAdmin.from('memberships').select('start_date, end_date, coach_id, coach_addon_amount').eq('id', payment.membership_id).maybeSingle()
    : { data: null };
  const coachResult = membership?.coach_id
    ? await supabaseAdmin.from('coaches').select('display_name').eq('id', membership.coach_id).maybeSingle()
    : { data: null };
  const { data: clerk } = payment.received_by
    ? await supabaseAdmin.from('profiles').select('full_name').eq('id', payment.received_by).maybeSingle()
    : { data: null };
  const settings = await getGymSettings();
  const paidAt = new Date(payment.paid_at || payment.created_at || Date.now());
  const dateTimePaid = paidAt.toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });
  const gross = Number(payment.gross_amount ?? payment.amount ?? 0);
  const discount = Number(payment.discount || 0);
  const coachAddon = Number(payment.coach_addon_amount ?? membership?.coach_addon_amount ?? 0);
  const total = Number(payment.amount || 0);
  const vatRegistered = settings.vat_status === 'vat';
  const vat = vatRegistered ? total - (total / 1.12) : 0;
  await enqueueEmail({
    emailType: 'receipt',
    recipient: profile.email,
    dedupeKey: dedupeKey || (payment.id ? `payment:${payment.id}:receipt` : null),
    payload: {
      memberName: profile.full_name, receiptNumber: payment.receipt_number, planName: plan.name,
      memberCode: profile.member_details?.member_code, memberEmail: profile.email,
      dateTimePaid, periodStart: membership?.start_date, periodEnd: membership?.end_date,
      coachName: coachResult.data?.display_name, coachAddon, subtotal: gross, discount, amount: total,
      vat: Math.max(0, vat), vatRegistered, reference: payment.provider_payment_id || payment.reference_number,
      method: payment.method === 'qrph' ? 'QR Ph' : payment.method === 'cash' ? 'Cash' : payment.method,
      cashTendered: payment.cash_tendered, changeGiven: payment.change_given,
      receivedBy: clerk?.full_name || 'Front desk',
      gymName: settings.gym_name, businessLegalName: settings.business_legal_name,
      businessAddress: settings.business_address, businessTin: settings.business_tin, vatStatus: settings.vat_status,
      supportEmail: settings.support_email, supportPhone: settings.support_phone, receiptFooterNote: settings.receipt_footer_note,
    },
  });
};

export const nextReceiptNumber = async () => {
  const { data, error } = await supabaseAdmin.rpc('next_fitmetrics_receipt_number');
  if (error) throw error;
  return data;
};

const nextMembershipDates = async (memberId, durationDays) => {
  const { data: current } = await supabaseAdmin.from('memberships')
    .select('end_date').eq('member_id', memberId).in('status', ['active', 'expired'])
    .gte('end_date', today()).order('end_date', { ascending: false }).limit(1).maybeSingle();
  const startDate = current?.end_date ? addDays(current.end_date, 1) : today();
  return { startDate, endDate: addDays(startDate, durationDays) };
};

export const createMembershipAndPayment = async ({
  memberId, plan, coachId = null, coachAddonAmount = 0, amount = plan.price,
  grossAmount = amount, discount = 0, promoId = null, method, actorId,
  status = 'paid', provider = null, providerCheckoutId = null, checkoutUrl = null,
  cashTendered = null, sendReceipt = true, providerPaymentId = null,
}) => {
  const total = Number(amount) + Number(coachAddonAmount);
  if (method === 'cash' && (cashTendered == null || Number(cashTendered) < total)) {
    throw new Error('Cash tendered must cover the total amount due.');
  }
  const dates = await nextMembershipDates(memberId, plan.duration_days);
  const { data: membership, error: membershipError } = await supabaseAdmin.from('memberships').insert({
    member_id: memberId, plan_id: plan.id, coach_id: coachId, coach_addon_amount: coachAddonAmount,
    start_date: dates.startDate, end_date: dates.endDate, status: 'active', created_by: actorId || null,
  }).select().single();
  if (membershipError) throw membershipError;
  const { data: payment, error: paymentError } = await supabaseAdmin.from('payments').insert({
    member_id: memberId, membership_id: membership.id, plan_id: plan.id,
    amount: total, gross_amount: Number(grossAmount) + Number(coachAddonAmount),
    discount, promo_id: promoId, method, status, received_by: actorId, provider,
    provider_checkout_id: providerCheckoutId, checkout_url: checkoutUrl,
    coach_id: coachId, coach_addon_amount: coachAddonAmount, provider_payment_id: providerPaymentId,
    send_receipt: sendReceipt, paid_at: status === 'paid' ? new Date().toISOString() : null,
    receipt_number: status === 'paid' ? await nextReceiptNumber() : null,
    cash_tendered: method === 'cash' ? Number(cashTendered) : null,
    change_given: method === 'cash' ? Math.round((Number(cashTendered) - total) * 100) / 100 : null,
  }).select().single();
  if (paymentError) {
    await supabaseAdmin.from('memberships').delete().eq('id', membership.id);
    throw paymentError;
  }
  if (status === 'paid') {
    await incrementPromo({ id: promoId });
    await notifyStaff({ type: 'payment', title: 'Payment received', message: `A ${method} payment was recorded for ${plan.name}.`, meta: { member_id: memberId } });
    try { if (payment.send_receipt !== false) await queueReceiptEmail({ memberId, plan, payment }); } catch (error) {
      console.error(`Receipt email could not be queued for payment ${payment.id}: ${error.message}`);
    }
  }
  return { membership, payment };
};

export const startClerkPayment = async ({
  kind = 'membership', memberId = null, guest = null, plan, isStudent = false,
  promo = null, coach = null, method, actorId, createCheckout = null, cashTendered = null,
}) => {
  const pricing = priceForPlan(plan, isStudent, promo);
  const coachAddonAmount = Number(coach?.addon_amount || coach?.monthly_price || 0);
  const total = pricing.amount + coachAddonAmount;
  if (total <= 0) throw new Error('The payment amount must be greater than zero.');
  if (method === 'qrph') throw new Error('QR Ph payments must use the dedicated QR flow.');
  if (method === 'cash' && kind === 'session') {
    const { data: visit, error: visitError } = await supabaseAdmin.from('walk_in_visits').insert({
      plan_id: plan.id, guest_name: guest?.name || null, guest_phone: guest?.phone || null,
      status: 'active', created_by: actorId,
    }).select().single();
    if (visitError) throw visitError;
    const { data: payment, error: paymentError } = await supabaseAdmin.from('payments').insert({
      walk_in_visit_id: visit.id, plan_id: plan.id, amount: total, gross_amount: pricing.gross + coachAddonAmount,
      discount: pricing.discount, promo_id: promo?.id || null, method, status: 'paid', received_by: actorId,
      paid_at: new Date().toISOString(), coach_id: coach?.id || null, coach_addon_amount: coachAddonAmount,
    }).select().single();
    if (paymentError) {
      await supabaseAdmin.from('walk_in_visits').delete().eq('id', visit.id);
      throw paymentError;
    }
    await incrementPromo(promo);
    return { visit, payment, pricing: { ...pricing, coachAddonAmount, total } };
  }
  if (method === 'cash') {
    const result = await createMembershipAndPayment({
      memberId, plan, coachId: coach?.id || null, coachAddonAmount, amount: pricing.amount,
      grossAmount: pricing.gross, discount: pricing.discount, promoId: promo?.id || null,
      method, actorId, cashTendered,
    });
    return { ...result, pricing: { ...pricing, coachAddonAmount, total } };
  }
  if (!createCheckout) throw new Error('PayMongo is not configured.');
  const { data: payment, error } = await supabaseAdmin.from('payments').insert({
    member_id: memberId || null, plan_id: plan.id, amount: total, gross_amount: pricing.gross + coachAddonAmount,
    discount: pricing.discount, promo_id: promo?.id || null, method, status: 'pending', received_by: actorId,
    provider: 'paymongo', coach_id: coach?.id || null, coach_addon_amount: coachAddonAmount,
  }).select().single();
  if (error) throw error;
  try {
    const checkout = await createCheckout({ payment, plan, amount: total, method, kind, guest, memberId });
    const { data: updated, error: updateError } = await supabaseAdmin.from('payments').update({
      provider_checkout_id: checkout.id, checkout_url: checkout.url,
    }).eq('id', payment.id).select().single();
    if (updateError) throw updateError;
    return { payment: updated, checkout_url: checkout.url, pricing: { ...pricing, coachAddonAmount, total }, plan };
  } catch (error) {
    await supabaseAdmin.from('payments').update({ status: 'failed', failure_reason: error.message }).eq('id', payment.id);
    throw error;
  }
};

export const activatePaymentMembership = async (payment) => {
  if (payment.status === 'paid' && payment.membership_id) {
    return { data: payment.membership_id ? (await supabaseAdmin.from('memberships').select('*, membership_plans(*)').eq('id', payment.membership_id).single()).data : null, payment };
  }
  const { data: plan, error: planError } = await supabaseAdmin.from('membership_plans').select('*').eq('id', payment.plan_id).single();
  if (planError) throw planError;
  if (payment.walk_in_visit_id) {
    await supabaseAdmin.from('walk_in_visits').update({ status: 'active' }).eq('id', payment.walk_in_visit_id);
    const { data: updatedPayment, error } = await supabaseAdmin.from('payments').update({
      status: 'paid', paid_at: new Date().toISOString(), provider_payment_id: payment.provider_payment_id || null,
    }).eq('id', payment.id).eq('status', 'pending').select().single();
    if (error) throw error;
    await incrementPromo(payment.promo_id ? { id: payment.promo_id } : null);
    return { data: null, payment: updatedPayment, plan };
  }
  const dates = await nextMembershipDates(payment.member_id, plan.duration_days);
  const { data: membership, error: membershipError } = await supabaseAdmin.from('memberships').insert({
    member_id: payment.member_id, plan_id: plan.id, coach_id: payment.coach_id || null,
    coach_addon_amount: Number(payment.coach_addon_amount || 0),
    start_date: dates.startDate, end_date: dates.endDate, status: 'active', created_by: payment.received_by,
  }).select().single();
  if (membershipError) throw membershipError;
  const { data: updatedPayment, error: paymentError } = await supabaseAdmin.from('payments').update({
    membership_id: membership.id, status: 'paid', paid_at: new Date().toISOString(),
    provider_payment_id: payment.provider_payment_id || null,
    receipt_number: payment.receipt_number || await nextReceiptNumber(),
  }).eq('id', payment.id).eq('status', 'pending').select().single();
  if (paymentError) {
    await supabaseAdmin.from('memberships').delete().eq('id', membership.id);
    throw paymentError;
  }
  await incrementPromo(payment.promo_id ? { id: payment.promo_id } : null);
  await notifyStaff({ type: 'payment', title: 'Online payment received', message: `A payment was completed for ${plan.name}.`, meta: { member_id: payment.member_id } });
  try { if (payment.send_receipt !== false) await queueReceiptEmail({ memberId: payment.member_id, plan, payment: updatedPayment }); } catch (error) {
    console.error(`Receipt email could not be queued for payment ${payment.id}: ${error.message}`);
  }
  return { data: membership, payment: updatedPayment, plan };
};

export const expirePendingQrPayments = async () => {
  const { data, error } = await supabaseAdmin.from('payments')
    .update({ status: 'expired', failure_reason: 'QR Ph payment expired.' })
    .eq('method', 'qrph')
    .eq('status', 'pending')
    .lt('qr_expires_at', new Date().toISOString())
    .select('id');
  if (error) throw error;
  return data || [];
};

export const markPaymentNeedsReview = async (payment, error) => {
  const reason = error?.message || 'Payment activation failed.';
  const { data, error: updateError } = await supabaseAdmin.from('payments')
    .update({ status: 'needs_review', failure_reason: reason })
    .eq('id', payment.id)
    .eq('status', 'pending')
    .select()
    .maybeSingle();
  if (updateError) throw updateError;
  return data || { ...payment, status: 'needs_review', failure_reason: reason };
};

export { addDays };
