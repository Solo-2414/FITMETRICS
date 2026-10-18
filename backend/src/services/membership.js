import { supabaseAdmin } from '../config/supabase.js';
import { enqueueEmail } from './emailQueue.js';
import { today } from '../utils/time.js';
import { notifyStaff } from './notify.js';
const addDays = (date, days) => {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + Number(days) - 1);
  return result.toISOString().slice(0, 10);
};

export const queueReceiptEmail = async ({ memberId, plan, payment }) => {
  const { data: profile, error } = await supabaseAdmin.from('profiles').select('full_name, email').eq('id', memberId).single();
  if (error) throw error;
  if (!profile?.email) return;
  await enqueueEmail({
    emailType: 'receipt',
    recipient: profile.email,
    payload: {
      memberName: profile.full_name,
      receiptNumber: payment.receipt_number,
      planName: plan.name,
      amount: payment.amount,
      method: payment.method,
      date: new Date(payment.paid_at || payment.created_at).toLocaleDateString('en-PH'),
    },
  });
};

export const createMembershipAndPayment = async ({
  memberId,
  plan,
  coachId = null,
  coachAddonAmount = 0,
  amount = plan.price,
  grossAmount = amount,
  discount = 0,
  method,
  actorId,
  status = 'paid',
  provider = null,
  providerCheckoutId = null,
}) => {
  const { data: current } = await supabaseAdmin.from('memberships')
    .select('end_date')
    .eq('member_id', memberId)
    .eq('status', 'active')
    .gte('end_date', today())
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  const startDate = current?.end_date
    ? addDays(current.end_date, 2)
    : today();
  const endDate = addDays(startDate, plan.duration_days);
  const { data: membership, error: membershipError } = await supabaseAdmin.from('memberships').insert({
    member_id: memberId,
    plan_id: plan.id,
    coach_id: coachId,
    coach_addon_amount: coachAddonAmount,
    start_date: startDate,
    end_date: endDate,
    status: 'active',
    created_by: actorId || null,
  }).select().single();
  if (membershipError) throw membershipError;

  const { data: payment, error: paymentError } = await supabaseAdmin.from('payments').insert({
    member_id: memberId,
    membership_id: membership.id,
    plan_id: plan.id,
    amount: Number(amount) + Number(coachAddonAmount),
    gross_amount: Number(grossAmount) + Number(coachAddonAmount),
    discount,
    method,
    status,
    received_by: actorId,
    provider,
    provider_checkout_id: providerCheckoutId,
    paid_at: status === 'paid' ? new Date().toISOString() : null,
  }).select().single();
  if (paymentError) {
    await supabaseAdmin.from('memberships').delete().eq('id', membership.id);
    throw paymentError;
  }
  await notifyStaff({ type: 'payment', title: 'Payment received', message: `A ${method} payment was recorded for ${plan.name}.`, meta: { member_id: memberId } });
  if (status === 'paid') {
    try {
      await queueReceiptEmail({ memberId, plan, payment });
    } catch (error) {
      console.error(`Receipt email could not be queued for payment ${payment.id}: ${error.message}`);
    }
  }
  return { membership, payment };
};

export const activatePaymentMembership = async (payment) => {
  if (payment.membership_id) {
    return supabaseAdmin.from('memberships').select('*, membership_plans(*)').eq('id', payment.membership_id).single();
  }
  const { data: plan, error: planError } = await supabaseAdmin.from('membership_plans').select('*').eq('id', payment.plan_id).single();
  if (planError) throw planError;
  const { data: current } = await supabaseAdmin.from('memberships')
    .select('end_date')
    .eq('member_id', payment.member_id)
    .eq('status', 'active')
    .gte('end_date', today())
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  const startDate = current?.end_date ? addDays(current.end_date, 2) : today();
  const endDate = addDays(startDate, plan.duration_days);
  const { data: membership, error: membershipError } = await supabaseAdmin.from('memberships').insert({
    member_id: payment.member_id,
    plan_id: plan.id,
    start_date: startDate,
    end_date: endDate,
    status: 'active',
    created_by: payment.received_by,
  }).select().single();
  if (membershipError) throw membershipError;
  const { data: updatedPayment, error: paymentError } = await supabaseAdmin.from('payments').update({
    membership_id: membership.id,
    plan_id: plan.id,
    status: 'paid',
    paid_at: new Date().toISOString(),
    provider_payment_id: payment.provider_payment_id || null,
  }).eq('id', payment.id).select().single();
  if (paymentError) {
    await supabaseAdmin.from('memberships').delete().eq('id', membership.id);
    throw paymentError;
  }
  await notifyStaff({ type: 'payment', title: 'Online payment received', message: `An online payment was completed for ${plan.name}.`, meta: { member_id: payment.member_id } });
  try {
    await queueReceiptEmail({ memberId: payment.member_id, plan, payment: updatedPayment });
  } catch (error) {
    console.error(`Receipt email could not be queued for payment ${payment.id}: ${error.message}`);
  }
  return {
    data: membership,
    payment: updatedPayment,
    plan,
  };
};

export { addDays };
