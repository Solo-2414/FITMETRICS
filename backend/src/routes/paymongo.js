import crypto from 'node:crypto';
import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { activatePaymentMembership } from '../services/membership.js';
import { enqueueEmail } from '../services/emailQueue.js';
import { notifyStaff } from '../services/notify.js';

const router = Router();
const paymongoUrl = 'https://api.paymongo.com/v1';

const assertConfig = () => {
  if (!process.env.PAYMONGO_SECRET_KEY || !process.env.PAYMONGO_WEBHOOK_SECRET) {
    const error = new Error('PayMongo is not configured.');
    error.statusCode = 503;
    throw error;
  }
};

const paymongoRequest = async (path, options = {}) => {
  assertConfig();
  const response = await fetch(`${paymongoUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.PAYMONGO_SECRET_KEY}:`).toString('base64')}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.errors?.[0]?.detail || 'PayMongo request failed.');
    error.statusCode = response.status >= 500 ? 502 : 400;
    throw error;
  }
  return body;
};

const getPlan = async (code) => {
  const { data, error } = await supabaseAdmin.from('membership_plans').select('*').eq('code', code).eq('active', true).eq('account_eligible', true).single();
  if (error || !data) throw new Error('The selected online membership plan is unavailable.');
  return data;
};

export const getPromo = async (code, planId) => {
  if (!code) return null;
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin.from('promos').select('*').eq('code', String(code).trim().toUpperCase()).eq('active', true).or(`valid_from.is.null,valid_from.lte.${now}`).or(`valid_until.is.null,valid_until.gte.${now}`).or(`applies_to_plan_id.is.null,applies_to_plan_id.eq.${planId}`).maybeSingle();
  if (error) throw error;
  if (!data || (data.usage_limit !== null && data.usage_count >= data.usage_limit)) return null;
  return data;
};

export const priceFor = (plan, isStudent, promo) => {
  const gross = Number(isStudent && plan.student_price !== null ? plan.student_price : plan.price);
  const promoDiscount = promo
    ? promo.discount_type === 'percent' ? gross * Number(promo.discount_value) / 100 : Number(promo.discount_value)
    : 0;
  const discount = Math.min(gross, Math.max(0, promoDiscount));
  return { gross, discount, amount: Math.max(0, gross - discount) };
};

router.post('/payments/online', requireAuth, requireRole('admin', 'clerk'), async (req, res, next) => {
  try {
    const { member_id, plan_code, is_student = false, promo_code = null, return_path = '/member/billing' } = req.body || {};
    if (!member_id || !plan_code) return res.status(400).json({ error: 'Member and plan are required.' });
    const safeReturnPath = typeof return_path === 'string' && return_path.startsWith('/') && !return_path.startsWith('//')
      ? return_path
      : '/member/billing';
    const plan = await getPlan(plan_code);
    const promo = await getPromo(promo_code, plan.id);
    const pricing = priceFor(plan, Boolean(is_student), promo);
    if (pricing.amount <= 0) return res.status(400).json({ error: 'The online payment amount must be greater than zero.' });

    const { data: payment, error: paymentError } = await supabaseAdmin.from('payments').insert({
      member_id,
      plan_id: plan.id,
      amount: pricing.amount,
      gross_amount: pricing.gross,
      discount: pricing.discount,
      promo_id: promo?.id || null,
      method: 'other',
      status: 'pending',
      received_by: req.user.id,
      provider: 'paymongo',
    }).select().single();
    if (paymentError) return next(paymentError);

    try {
      const checkout = await paymongoRequest('/checkout_sessions', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            attributes: {
              line_items: [{ currency: 'PHP', amount: Math.round(pricing.amount * 100), name: plan.name, quantity: 1 }],
              payment_method_types: ['card', 'gcash', 'paymaya', 'grab_pay'],
              success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}${safeReturnPath}?payment=success`,
              cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}${safeReturnPath}?payment=cancelled`,
              description: `FITMETRICS ${plan.name}`,
              metadata: { payment_id: payment.id, member_id, plan_id: plan.id },
            },
          },
        }),
      });

      router.post('/payments/:id/sync', requireAuth, requireRole('admin', 'clerk', 'member'), async (req, res, next) => {
        try {
          const { data: payment, error } = await supabaseAdmin.from('payments').select('*').eq('id', req.params.id).single();
          if (error || !payment) return res.status(404).json({ error: 'Payment not found.' });
          if (req.user.role === 'member' && payment.member_id !== req.user.id) return res.status(403).json({ error: 'You do not have permission to do this.' });
          if (!payment.provider_checkout_id) return res.status(400).json({ error: 'This payment has no PayMongo checkout session.' });
          if (payment.status === 'paid') return res.json(payment);
          const checkout = await paymongoRequest(`/checkout_sessions/${payment.provider_checkout_id}`);
          const attributes = checkout?.data?.attributes || {};
          const paid = attributes.status === 'paid' || attributes.payment_intent?.attributes?.status === 'succeeded';
          if (!paid) return res.json({ payment, status: attributes.status || payment.status });
          const result = await activatePaymentMembership(payment);
          res.json(result.payment);
        } catch (error) { next(error); }
      });
      const checkoutData = checkout.data;
      const { error: updateError } = await supabaseAdmin.from('payments').update({ provider_checkout_id: checkoutData.id }).eq('id', payment.id);
      if (updateError) return next(updateError);
      if (promo?.id) await supabaseAdmin.from('promos').update({ usage_count: Number(promo.usage_count || 0) + 1 }).eq('id', promo.id);
      res.status(201).json({
        payment: { ...payment, provider_checkout_id: checkoutData.id },
        checkout_url: checkoutData.attributes.checkout_url,
        pricing,
        plan,
      });
    } catch (error) {
      await supabaseAdmin.from('payments').update({ status: 'failed', failure_reason: error.message }).eq('id', payment.id);
      throw error;
    }
  } catch (error) { next(error); }
});

const signatureMatches = (rawBody, header) => {
  const values = Object.fromEntries(String(header || '').split(',').map((part) => part.split('=').map((value) => value.trim())).filter(([key, value]) => key && value));
  const timestamp = values.t;
  const signatures = [values.te, values.li].filter(Boolean);
  if (!timestamp || !signatures.length) return false;
  const signed = `${timestamp}.${rawBody.toString('utf8')}`;
  return signatures.some((signature) => {
    const expected = crypto.createHmac('sha256', process.env.PAYMONGO_WEBHOOK_SECRET).update(signed).digest('hex');
    const actual = Buffer.from(signature);
    const wanted = Buffer.from(expected);
    return actual.length === wanted.length && crypto.timingSafeEqual(actual, wanted);
  });
};

const findAttributeData = (event) => event?.data?.attributes?.data || event?.data?.attributes?.resource || event?.data;

router.post('/paymongo/webhook', async (req, res) => {
  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody) || !signatureMatches(rawBody, req.get('Paymongo-Signature'))) return res.status(400).json({ error: 'Invalid PayMongo signature.' });
  let event;
  try { event = JSON.parse(rawBody.toString('utf8')); } catch { return res.status(400).json({ error: 'Invalid webhook payload.' }); }
  const eventId = event?.data?.id;
  const eventType = event?.data?.attributes?.type || event?.data?.type;
  if (!eventId || !eventType) return res.status(400).json({ error: 'Webhook event is missing an id or type.' });

  const inserted = await supabaseAdmin.from('paymongo_webhook_events').insert({
    provider_event_id: eventId,
    event_type: eventType,
    payload: event,
    signature_valid: true,
  }).select('id').maybeSingle();
  if (inserted.error?.code === '23505') return res.json({ received: true, duplicate: true });
  if (inserted.error) return res.status(500).json({ error: 'Could not record webhook event.' });
  const eventRowId = inserted.data.id;
  try {
    const resource = findAttributeData(event);
    const attributes = resource?.attributes || {};
    const metadata = attributes.metadata || {};
    const paymentId = metadata.payment_id;
    const checkoutId = resource?.id || attributes.checkout_session_id;
    let query = supabaseAdmin.from('payments').select('*, membership_plans(*)');
    query = paymentId ? query.eq('id', paymentId) : query.eq('provider_checkout_id', checkoutId);
    const paymentResult = await query.maybeSingle();
    if (paymentResult.error) throw paymentResult.error;
    if (!paymentResult.data) throw new Error('No matching FITMETRICS payment for webhook.');
    const payment = paymentResult.data;
    const paid = /payment\.paid|checkout_session\.payment\.paid/.test(eventType);
    const failed = /payment\.failed|checkout_session\.payment\.failed/.test(eventType);
    const expired = /checkout_session\.expired|payment\.expired/.test(eventType);
    if (paid && payment.status === 'pending') {
      const providerPaymentId = attributes.payment_intent_id || attributes.payment_id || attributes.id || null;
      await activatePaymentMembership({ ...payment, provider_payment_id: providerPaymentId });
    } else if (failed || expired) {
      await supabaseAdmin.from('payments').update({ status: expired ? 'expired' : 'failed', failure_reason: attributes.failure_code || eventType }).eq('id', payment.id);
      await notifyStaff({ type: 'payment', title: expired ? 'Payment expired' : 'Payment failed', message: `PayMongo payment ${expired ? 'expired' : 'failed'} before completion.`, meta: { member_id: payment.member_id } });
    }
    await supabaseAdmin.from('paymongo_webhook_events').update({ processed_at: new Date().toISOString() }).eq('id', eventRowId);
    return res.json({ received: true });
  } catch (error) {
    await supabaseAdmin.from('paymongo_webhook_events').update({ processing_error: error.message }).eq('id', eventRowId);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }
});

export const paymongoWebhookRouter = router;
