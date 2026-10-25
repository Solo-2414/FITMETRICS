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

const escapeAttribute = (value) => escapeHtml(value).replaceAll('`', '&#096;');

export const renderEmail = (emailType, payload = {}) => {
  const name = escapeHtml(payload.memberName || 'Member');
  if (emailType === 'announcement') {
    const rawGymName = payload.gymName || 'FITMETRICS';
    const rawTitle = payload.title || 'Announcement';
    const rawBody = String(payload.body || '');
    const gymName = escapeHtml(rawGymName);
    const title = escapeHtml(rawTitle);
    const body = escapeHtml(rawBody).replaceAll('\n', '<br>');
    const logoUrl = payload.logoUrl || process.env.EMAIL_LOGO_URL;
    const logo = logoUrl
      ? `<img src="${escapeAttribute(logoUrl)}" alt="${gymName}" width="52" style="display:block;width:52px;height:52px;object-fit:contain;border-radius:12px;margin:0 auto 12px;">`
      : `<div style="font-size:24px;line-height:1;font-weight:800;letter-spacing:1px;color:#38bdf8;margin-bottom:12px;">AFG</div>`;
    const link = typeof payload.link === 'string' && /^https?:\/\//i.test(payload.link)
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 4px;"><tr><td style="border-radius:8px;background:#38bdf8;"><a href="${escapeAttribute(payload.link)}" style="display:inline-block;padding:13px 22px;color:#06111f;text-decoration:none;font-weight:700;font-size:14px;">View announcement</a></td></tr></table>`
      : '';
    const textLink = link ? `\n\nView announcement: ${payload.link}` : '';
    return {
      subject: `${rawGymName}: ${rawTitle}`,
      text: `Hello ${payload.memberName || 'Member'},\n\n${rawTitle}\n\n${rawBody}${textLink}\n\nYou are receiving this because you are a member of ${rawGymName}.`,
      html: `<!doctype html><html><body style="margin:0;background:#07111f;font-family:Arial,Helvetica,sans-serif;color:#dbeafe;"><div style="padding:24px 12px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:620px;margin:0 auto;background:#0d1b2e;border:1px solid #1e3a56;border-radius:16px;overflow:hidden;"><tr><td style="height:6px;background:#38bdf8;font-size:0;">&nbsp;</td></tr><tr><td style="padding:34px 32px 30px;text-align:center;">${logo}<div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;">${gymName}</div><div style="display:inline-block;margin-top:18px;padding:6px 10px;border:1px solid #28506e;border-radius:999px;color:#7dd3fc;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;">Gym announcement</div><h1 style="margin:20px 0 14px;color:#f8fafc;font-size:28px;line-height:1.2;">${title}</h1><p style="margin:0;text-align:left;color:#cbd5e1;font-size:16px;line-height:1.75;">${body}</p>${link}</td></tr><tr><td style="padding:20px 32px;border-top:1px solid #1e3a56;text-align:center;color:#94a3b8;font-size:12px;line-height:1.6;">You are receiving this because you are a member of ${gymName}.<br><span style="color:#64748b;">Please do not reply to this automated announcement.</span></td></tr></table></div></body></html>`,
    };
  }
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
  if (payload.replyTo) message.replyTo = payload.replyTo;
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
