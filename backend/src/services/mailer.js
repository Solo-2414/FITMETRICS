import nodemailer from 'nodemailer';

let transports;

const createTransport = (prefix = 'SMTP') => {
  const host = process.env[`${prefix}_HOST`];
  const port = process.env[`${prefix}_PORT`];
  const user = process.env[`${prefix}_USER`];
  const pass = process.env[`${prefix}_PASS`];
  if (!host || !port || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    pool: false,
    connectionTimeout: 15_000,
    auth: { user, pass },
  });
};

const getTransports = () => {
  if (!transports) {
    transports = { primary: createTransport(), backup: createTransport('SMTP2') };
  }
  return transports;
};

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export const renderEmail = (emailType, payload = {}) => {
  const name = escapeHtml(payload.memberName || 'Member');
  if (emailType === 'receipt') {
    return {
      subject: `FITMETRICS payment receipt ${escapeHtml(payload.receiptNumber)}`,
      text: `Hello ${payload.memberName || 'Member'}, your payment of PHP ${payload.amount} for ${payload.planName} was received on ${payload.date}. Receipt: ${payload.receiptNumber}.`,
      html: `<p>Hello ${name},</p><p>Your payment of <strong>PHP ${escapeHtml(payload.amount)}</strong> for ${escapeHtml(payload.planName)} was received on ${escapeHtml(payload.date)}.</p><p>Receipt: <strong>${escapeHtml(payload.receiptNumber)}</strong><br>Method: ${escapeHtml(payload.method)}</p>`,
    };
  }
  if (emailType === 'information_overview') {
    return {
      subject: 'Your FITMETRICS member information',
      text: `Hello ${payload.memberName || 'Member'}, your member code is ${payload.memberCode || 'not assigned'}, your current plan is ${payload.planName || 'none'}, and it expires on ${payload.expiryDate || 'not applicable'}.`,
      html: `<p>Hello ${name},</p><p>Here is your FITMETRICS member information:</p><ul><li>Member code: ${escapeHtml(payload.memberCode || 'Not assigned')}</li><li>Current plan: ${escapeHtml(payload.planName || 'None')}</li><li>Expiry date: ${escapeHtml(payload.expiryDate || 'Not applicable')}</li><li>Phone: ${escapeHtml(payload.phone || 'Not provided')}</li></ul>`,
    };
  }
  if (emailType === 'password_otp') {
    return {
      subject: 'Your FITMETRICS password reset code',
      text: `Your FITMETRICS password reset code is ${payload.otp}.`,
      html: `<p>Your FITMETRICS password reset code is <strong>${escapeHtml(payload.otp)}</strong>.</p>`,
    };
  }
  return {
    subject: `FITMETRICS membership expires on ${escapeHtml(payload.expiryDate)}`,
    text: payload.customMessage || `Hello ${payload.memberName || 'Member'}, your ${payload.planName || 'membership'} expires on ${payload.expiryDate}. Please visit the front desk to renew.`,
    html: `<p>Hello ${name},</p><p>${escapeHtml(payload.customMessage || `Your ${payload.planName || 'membership'} expires on ${payload.expiryDate}. Please visit the front desk to renew.`)}</p>`,
  };
};

export const sendEmail = async ({ recipient, emailType, payload, providers = null }) => {
  if (!process.env.MAIL_FROM) throw new Error('SMTP is not configured. Missing: MAIL_FROM');
  const content = renderEmail(emailType, payload);
  const message = { from: process.env.MAIL_FROM, to: recipient, subject: content.subject, text: content.text, html: content.html };
  const configured = getTransports();
  if (!configured.primary && !configured.backup) throw new Error('SMTP is not configured. No primary or backup provider is available.');
  const errors = [];
  for (const [provider, transport] of Object.entries(configured)) {
    if (providers && !providers.includes(provider)) continue;
    if (!transport) continue;
    try {
      const result = await transport.sendMail(message);
      return { messageId: result.messageId, provider };
    } catch (error) {
      errors.push(`${provider}: ${error.message}`);
    }
  }
  throw new Error(`Email delivery failed. ${errors.join(' | ')}`);
};
