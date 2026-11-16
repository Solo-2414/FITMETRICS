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

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const escapeAttribute = (value) => escapeHtml(value).replaceAll('`', '&#096;');

const brandedShell = ({
  gymName,
  logoUrl,
  label,
  heading,
  content,
  button,
  footer = 'You are receiving this because you are a member of this gym.',
}) => {
  const logo = logoUrl
    ? `<img src="${escapeAttribute(logoUrl)}" alt="${gymName}" width="52" style="display:block;width:52px;height:52px;object-fit:contain;border-radius:12px;margin:0 auto 12px;">`
    : `<div style="font-size:24px;line-height:1;font-weight:800;letter-spacing:1px;color:#38bdf8;margin-bottom:12px;">AFG</div>`;
  const action =
    button?.url && /^https?:\/\//i.test(button.url)
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 4px;"><tr><td style="border-radius:8px;background:#38bdf8;"><a href="${escapeAttribute(button.url)}" style="display:inline-block;padding:13px 22px;color:#06111f;text-decoration:none;font-weight:700;font-size:14px;">${escapeHtml(button.label)}</a></td></tr></table>`
      : '';
  return `<!doctype html><html><body style="margin:0;background:#07111f;font-family:Arial,Helvetica,sans-serif;color:#dbeafe;"><div style="padding:24px 12px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:620px;margin:0 auto;background:#0d1b2e;border:1px solid #1e3a56;border-radius:16px;overflow:hidden;"><tr><td style="height:6px;background:#38bdf8;font-size:0;">&nbsp;</td></tr><tr><td style="padding:34px 32px 30px;text-align:center;">${logo}<div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;">${gymName}</div><div style="display:inline-block;margin-top:18px;padding:6px 10px;border:1px solid #28506e;border-radius:999px;color:#7dd3fc;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;">${escapeHtml(label)}</div><h1 style="margin:20px 0 14px;color:#f8fafc;font-size:28px;line-height:1.2;">${escapeHtml(heading)}</h1><div style="text-align:left;color:#cbd5e1;font-size:16px;line-height:1.75;">${content}</div>${action}</td></tr><tr><td style="padding:20px 32px;border-top:1px solid #1e3a56;text-align:center;color:#94a3b8;font-size:12px;line-height:1.6;">${footer}<br><span style="color:#64748b;">Please do not reply to this automated email.</span></td></tr></table></div></body></html>`;
};

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
    const textLink =
      typeof payload.link === 'string' && /^https?:\/\//i.test(payload.link)
        ? `\n\nView announcement: ${payload.link}`
        : '';
    return {
      subject: `${rawGymName}: ${rawTitle}`,
      text: `Hello ${payload.memberName || 'Member'},\n\n${rawTitle}\n\n${rawBody}${textLink}\n\nYou are receiving this because you are a member of ${rawGymName}.`,
      html: brandedShell({
        gymName,
        logoUrl,
        label: 'Gym announcement',
        heading: title,
        content: `<p style="margin:0;">${body}</p>`,
        button: { url: payload.link, label: 'View announcement' },
        footer: `You are receiving this because you are a member of ${gymName}.`,
      }),
    };
  }
  if (emailType === 'receipt') {
    const gymName = escapeHtml(payload.gymName || 'FITMETRICS');
    const official = payload.businessLegalName && payload.businessTin;
    const title = payload.isWalkIn
      ? 'Day Pass Receipt'
      : official
        ? 'OFFICIAL PAYMENT RECEIPT'
        : 'PAYMENT RECEIPT - ACKNOWLEDGMENT OF PAYMENT';
    const money = (value) =>
      `PHP ${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
    const rows = [
      ['Receipt number', payload.receiptNumber],
      ['Date and time paid', payload.dateTimePaid || payload.date],
      ['Business legal name', official ? payload.businessLegalName : null],
      ['Address', official ? payload.businessAddress : null],
      ['TIN', official ? payload.businessTin : null],
      ['VAT status', payload.vatRegistered ? 'VAT-registered' : null],
      ['Received from', `${payload.memberName || ''} (${payload.memberCode || 'No member code'})`],
      ['Email', payload.memberEmail],
      [
        'Plan and period',
        `${payload.planName || ''}${payload.isWalkIn ? ' (Valid today until 11:59 PM)' : payload.periodStart ? ` (${payload.periodStart} - ${payload.periodEnd})` : ''}`,
      ],
      ['Coach add-on', payload.coachAddon ? money(payload.coachAddon) : null],
      ['Subtotal', money(payload.subtotal)],
      ['Student/promo discount', payload.discount ? `-${money(payload.discount)}` : null],
      ['VAT', payload.vatRegistered ? money(payload.vat) : null],
      ['Total', money(payload.amount)],
      ['Payment method', payload.method],
      ['Reference', payload.reference],
      ['Cash tendered', payload.method === 'Cash' ? money(payload.cashTendered) : null],
      ['Change', payload.method === 'Cash' ? money(payload.changeGiven) : null],
      ['Received by', payload.receivedBy],
      ['Status', 'PAID'],
    ]
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(
        ([label, value]) =>
          `<tr><td style="padding:8px;border-bottom:1px solid #1e3a56;color:#94a3b8;">${escapeHtml(label)}</td><td style="padding:8px;border-bottom:1px solid #1e3a56;">${escapeHtml(value)}</td></tr>`,
      )
      .join('');
    const support = [payload.supportEmail, payload.supportPhone].filter(Boolean).join(' · ');
    const footer =
      [payload.receiptFooterNote, support].filter(Boolean).join(' | ') ||
      'This is a system-generated receipt.';
    return {
      subject:
        `${payload.businessLegalName || 'FITMETRICS'} payment receipt ${payload.receiptNumber || ''}`.trim(),
      text: `${title}\n\nHello ${payload.memberName || 'Member'}\nReceipt number: ${payload.receiptNumber || ''}\nDate and time paid: ${payload.dateTimePaid || payload.date || ''}\nReceived from: ${payload.memberName || ''} (${payload.memberCode || 'Walk-in'})\nPlan and period: ${payload.planName || ''} ${payload.isWalkIn ? 'Valid today until 11:59 PM' : `${payload.periodStart || ''} - ${payload.periodEnd || ''}`}\nSubtotal: ${money(payload.subtotal)}\nDiscount: ${money(payload.discount)}\nTotal: ${money(payload.amount)}\nPayment method: ${payload.method || ''}\nReference: ${payload.reference || ''}\nCash tendered: ${payload.method === 'Cash' ? money(payload.cashTendered) : ''}\nChange: ${payload.method === 'Cash' ? money(payload.changeGiven) : ''}\nReceived by: ${payload.receivedBy || ''}\nStatus: PAID\n\n${footer}`,
      html: brandedShell({
        gymName,
        logoUrl: payload.logoUrl || process.env.EMAIL_LOGO_URL,
        label: 'Payment receipt',
        heading: title,
        content: `<p>Hello ${name},</p><table role="presentation" width="100%" style="border-collapse:collapse;">${rows}</table>`,
        footer: escapeHtml(footer),
      }),
    };
  }
  if (emailType === 'information_overview') {
    const gymName = escapeHtml(payload.gymName || 'FITMETRICS');
    const logoUrl = payload.logoUrl || process.env.EMAIL_LOGO_URL;
    const planName = payload.planName || 'None';
    const expiryDate = payload.expiryDate || 'Not applicable';
    const details = [
      ['Member name', payload.memberName || 'Member'],
      ['Member ID', payload.memberCode || 'Not assigned'],
      ['Current plan', planName],
      ['Expiry date', expiryDate],
      ['Phone', payload.phone || 'Not provided'],
      [
        'Queued plan',
        payload.queuedPlanName
          ? `${payload.queuedPlanName} (starts ${payload.queuedStartDate})`
          : 'None',
      ],
    ]
      .map(
        ([label, value]) =>
          `<div style="padding:10px 12px;border:1px solid #1e3a56;"><strong style="display:block;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.5px;">${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`,
      )
      .join('');
    return {
      subject: 'Your FITMETRICS member information',
      text: `Hello ${payload.memberName || 'Member'},\n\nMember information\nMember name: ${payload.memberName || 'Member'}\nMember ID: ${payload.memberCode || 'Not assigned'}\nCurrent plan: ${planName}\nExpiry date: ${expiryDate}\nPhone: ${payload.phone || 'Not provided'}\nQueued plan: ${payload.queuedPlanName ? `${payload.queuedPlanName} (starts ${payload.queuedStartDate})` : 'None'}\n\nOpen your member portal: ${payload.portalLink || ''}`,
      html: brandedShell({
        gymName,
        logoUrl,
        label: 'Member information',
        heading: `Hello, ${name}`,
        content: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">${details}</div>`,
        button: { url: payload.portalLink, label: 'Open member portal' },
        footer: `You are receiving this because you are a member of ${gymName}.`,
      }),
    };
  }
  if (emailType === 'password_otp') {
    return {
      subject: 'Your FITMETRICS password reset code',
      text: `Your FITMETRICS password reset code is ${payload.otp}.`,
      html: `<p>Your FITMETRICS password reset code is <strong>${escapeHtml(payload.otp)}</strong>.</p>`,
    };
  }
  if (emailType === 'checkin_code') {
    const gymName = escapeHtml(payload.gymName || 'FITMETRICS');
    return {
      subject: `${payload.gymName || 'FITMETRICS'} check-in code`,
      text: `Your ${payload.gymName || 'FITMETRICS'} check-in code is ${payload.code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
      html: brandedShell({
        gymName,
        logoUrl: payload.logoUrl || process.env.EMAIL_LOGO_URL,
        label: 'Check-in code',
        heading: 'Your check-in code',
        content: `<p style="text-align:center;font-size:36px;letter-spacing:8px;font-weight:800;color:#f8fafc;">${escapeHtml(payload.code)}</p><p>This code expires in 10 minutes.</p><p>If you didn't request this, ignore this email.</p>`,
      }),
    };
  }
  if (emailType === 'welcome') {
    const gymName = escapeHtml(payload.gymName || 'FITMETRICS');
    return {
      subject: `${payload.gymName || 'FITMETRICS'} membership welcome`,
      text: `Welcome ${payload.memberName || 'Member'}.\n\nMember code: ${payload.memberCode || ''}\nPlan: ${payload.planName || ''}\nExpiry: ${payload.expiryDate || ''}\n\nLog in: ${payload.portalLink || ''}`,
      html: brandedShell({
        gymName,
        logoUrl: payload.logoUrl || process.env.EMAIL_LOGO_URL,
        label: 'Welcome',
        heading: `Welcome, ${name}`,
        content: `<p>Your membership is ready.</p><p><strong>Member code:</strong> ${escapeHtml(payload.memberCode)}<br><strong>Plan:</strong> ${escapeHtml(payload.planName)}<br><strong>Expiry:</strong> ${escapeHtml(payload.expiryDate)}</p>`,
        button: { url: payload.portalLink, label: 'Log in' },
        footer: `Welcome to ${gymName}.`,
      }),
    };
  }
  return {
    subject: `FITMETRICS membership expires on ${escapeHtml(payload.expiryDate)}`,
    text:
      payload.customMessage ||
      `Hello ${payload.memberName || 'Member'}, your ${payload.planName || 'membership'} expires on ${payload.expiryDate}. Please visit the front desk to renew.`,
    html: `<p>Hello ${name},</p><p>${escapeHtml(payload.customMessage || `Your ${payload.planName || 'membership'} expires on ${payload.expiryDate}. Please visit the front desk to renew.`)}</p>`,
  };
};

export const sendEmail = async ({ recipient, emailType, payload, providers = null }) => {
  if (!process.env.MAIL_FROM) throw new Error('SMTP is not configured. Missing: MAIL_FROM');
  const content = renderEmail(emailType, payload);
  const message = {
    from: process.env.MAIL_FROM,
    to: recipient,
    subject: content.subject,
    text: content.text,
    html: content.html,
  };
  if (payload.replyTo) message.replyTo = payload.replyTo;
  const configured = getTransports();
  if (!configured.primary && !configured.backup)
    throw new Error('SMTP is not configured. No primary or backup provider is available.');
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

export const sendRawHtmlEmail = async ({ to, subject, html, text = '' }) => {
  if (!process.env.MAIL_FROM) throw new Error('SMTP is not configured. Missing: MAIL_FROM');
  const message = {
    from: process.env.MAIL_FROM,
    to,
    subject,
    text: text || 'Please view this email in an HTML-compatible email client.',
    html,
  };
  const configured = getTransports();
  if (!configured.primary && !configured.backup) {
    throw new Error('SMTP is not configured. No primary or backup provider is available.');
  }
  const errors = [];
  for (const [provider, transport] of Object.entries(configured)) {
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
