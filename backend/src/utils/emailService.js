const { Resend } = require('resend');
const logger = require('./logger');

let resend;

const firstCsvValue = (value, fallback) => String(value || fallback)
  .split(',')
  .map(v => v.trim())
  .filter(Boolean)[0];

const stripTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

const extractEmailAddress = (value = '') => {
  const match = String(value).match(/<([^>]+)>/);
  return (match ? match[1] : value).trim();
};

const emailDomain = (value = '') => {
  const address = extractEmailAddress(value);
  const [, domain = ''] = address.split('@');
  return domain.toLowerCase();
};

const rootDomain = (hostname = '') => {
  const labels = String(hostname).toLowerCase().split('.').filter(Boolean);
  if (labels.length <= 2) return labels.join('.');
  return labels.slice(-2).join('.');
};

const getClient = () => {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || 'NumisRoma <noreply@numisroma.com>';
const FRONTEND_URL = stripTrailingSlash(firstCsvValue(process.env.FRONTEND_URL, 'http://localhost:3000'));
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || `support@${emailDomain(FROM_ADDRESS) || 'numisroma.com'}`;
const REPLY_TO_ADDRESS = process.env.RESEND_REPLY_TO_EMAIL || SUPPORT_EMAIL;
const EMAIL_LOGO_URL = process.env.EMAIL_LOGO_URL || `${FRONTEND_URL}/brand/numisroma-social-monogram-borderless.png`;

const warnIfLinkDomainDiffers = (url) => {
  try {
    const linkHost = new URL(url).hostname;
    const senderDomain = emailDomain(FROM_ADDRESS);
    if (
      senderDomain &&
      linkHost !== 'localhost' &&
      rootDomain(linkHost) !== rootDomain(senderDomain)
    ) {
      logger.warn('Email link domain differs from sender domain', {
        senderDomain,
        linkHost,
        url
      });
    }
  } catch {
    logger.warn('Email link is not an absolute URL', { url });
  }
};

const sendEmail = async (payload) => {
  [payload.html, payload.text].filter(Boolean).forEach(content => {
    const links = String(content).match(/https?:\/\/[^\s"'<>]+/g) || [];
    links.forEach(warnIfLinkDomainDiffers);
  });

  return getClient().emails.send({
    replyTo: REPLY_TO_ADDRESS,
    ...payload
  });
};

const handleResendError = (result, label, to) => {
  if (!result.error) return;
  logger.error(`Resend rejected ${label} email`, { to, resendError: result.error });
  const err = new Error(result.error.message || 'Resend API error');
  err.resendError = result.error;
  throw err;
};

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// ─── Brand tokens (mirrors frontend globals.css) ────────────────────────────
const C = {
  canvas:      '#fdf8f0',
  surface:     '#faf4ea',
  card:        '#fefcf8',
  border:      '#e8e0d0',
  amber:       '#b8843a',
  amberHover:  '#9a6e2e',
  amberBg:     '#f0e8d4',
  amberLight:  '#e8d8b0',
  textPrimary: '#2e2820',
  textSecond:  '#5a5040',
  textMuted:   '#9a8e80',
};

// ─── HTML email templates ────────────────────────────────────────────────────

const baseTemplate = (title, bodyHtml, footerNote = 'If you did not attempt to create an account, you can safely ignore this email.') => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: ${C.canvas};
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 15px;
      line-height: 1.625;
      color: ${C.textPrimary};
      -webkit-font-smoothing: antialiased;
    }
    .wrapper   { max-width: 580px; margin: 40px auto; padding: 0 16px 40px; }
    .card      { background: ${C.card}; border: 1px solid ${C.border}; border-radius: 8px; overflow: hidden; }

    /* Header bar */
    .header    { background: ${C.canvas}; border-bottom: 1px solid ${C.border}; padding: 24px 36px; }
    .brand-row { display: table; }
    .logo-cell { display: table-cell; vertical-align: middle; padding-right: 14px; }
    .text-cell { display: table-cell; vertical-align: middle; }
    .logo-image {
      display: block;
      width: 48px;
      height: 48px;
      border: 0;
      outline: none;
      text-decoration: none;
    }
    .logo-text {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 26px;
      font-weight: 700;
      color: ${C.amber};
      letter-spacing: 0.02em;
      text-decoration: none;
    }
    .logo-sub  { font-size: 11px; color: ${C.textMuted}; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 2px; }

    /* Body */
    .body      { padding: 36px 36px 32px; }
    h1 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 28px;
      font-weight: 600;
      color: ${C.textPrimary};
      line-height: 1.2;
      margin-bottom: 16px;
    }
    p { color: ${C.textSecond}; margin-bottom: 16px; font-size: 15px; line-height: 1.65; }
    p:last-child { margin-bottom: 0; }
    a { color: ${C.amber}; text-decoration: none; }
    a:hover { color: ${C.amberHover}; }
    ul { margin: 0 0 20px 0; padding-left: 20px; color: ${C.textSecond}; }
    li { margin-bottom: 6px; font-size: 15px; line-height: 1.6; }

    /* OTP box */
    .otp-wrapper { margin: 28px 0; text-align: center; }
    .otp-box {
      display: inline-block;
      background: ${C.amberBg};
      border: 2px solid ${C.amberLight};
      border-radius: 8px;
      padding: 24px 36px;
    }
    .otp-label { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: ${C.textMuted}; margin-bottom: 12px; }
    .otp-code  {
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      font-size: 44px;
      font-weight: 700;
      letter-spacing: 12px;
      color: ${C.amber};
      line-height: 1;
    }
    .otp-meta  { font-size: 12px; color: ${C.textMuted}; margin-top: 12px; }

    /* CTA button */
    .cta-wrapper { margin: 28px 0; }
    .cta {
      display: inline-block;
      background: ${C.amber};
      color: #ffffff !important;
      text-decoration: none;
      padding: 13px 32px;
      border-radius: 6px;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.01em;
      line-height: 1;
    }

    /* Divider */
    .divider { border: none; border-top: 1px solid ${C.border}; margin: 28px 0; }

    /* Footer note inside card */
    .note {
      font-size: 13px;
      color: ${C.textMuted};
      font-style: italic;
      line-height: 1.5;
    }

    /* Footer below card */
    .footer {
      text-align: center;
      padding: 20px 16px 0;
      font-size: 12px;
      color: ${C.textMuted};
      line-height: 1.6;
    }
    .footer a { color: ${C.textMuted}; text-decoration: underline; }

    /* Responsive */
    @media (max-width: 600px) {
      .header, .body { padding-left: 24px; padding-right: 24px; }
      .logo-image { width: 42px; height: 42px; }
      .otp-code { font-size: 36px; letter-spacing: 8px; }
      h1 { font-size: 24px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">

      <div class="header">
        <div class="brand-row">
          <div class="logo-cell">
            <img src="${EMAIL_LOGO_URL}" width="48" height="48" alt="NumisRoma" class="logo-image" />
          </div>
          <div class="text-cell">
            <div class="logo-text">NumisRoma</div>
            <div class="logo-sub">Ancient Roman Coin Collection</div>
          </div>
        </div>
      </div>

      <div class="body">
        ${bodyHtml}
        <hr class="divider" />
        <p class="note">${footerNote}</p>
      </div>

    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} NumisRoma &nbsp;&middot;&nbsp;
      <a href="${FRONTEND_URL}">Visit website</a> &nbsp;&middot;&nbsp;
      <a href="mailto:${SUPPORT_EMAIL}">Contact support</a>
    </div>
  </div>
</body>
</html>`;

const otpEmailHtml = (otp, expiryMinutes) =>
  baseTemplate(
    'Your NumisRoma verification code',
    `
    <h1>Verify your email</h1>
    <p>Use the code below to complete your NumisRoma registration. Enter it on the verification screen within <strong>${expiryMinutes} minutes</strong>.</p>

    <div class="otp-wrapper">
      <div class="otp-box">
        <div class="otp-label">Your verification code</div>
        <div class="otp-code">${otp}</div>
        <div class="otp-meta">Expires in ${expiryMinutes} minutes &nbsp;&middot;&nbsp; Single use only</div>
      </div>
    </div>

    <p>If you didn't request this, someone may have entered your email address by mistake — no account has been created.</p>
    `,
    'Never share this code with anyone. NumisRoma will never ask for it.'
  );

const welcomeEmailHtml = (username) =>
  baseTemplate(
    `Welcome to NumisRoma, ${username}!`,
    `
    <h1>Welcome to NumisRoma</h1>
    <p>Your account is ready, <strong>${username}</strong>. You've joined a growing community of collectors exploring and cataloging Roman Republican and Imperial coins.</p>

    <p>Here's what you can do:</p>
    <ul>
      <li>Browse cataloged Roman Republican and Imperial coins</li>
      <li>Build and share your personal collection</li>
      <li>Connect and message other collectors securely</li>
      <li>Track provenance, references, and auction history</li>
    </ul>

    <div class="cta-wrapper">
      <a href="${FRONTEND_URL}/browse" class="cta">Start exploring →</a>
    </div>

    <p>Questions or feedback? We're always happy to hear from you at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
    `,
    'You\'re receiving this because you just created a NumisRoma account.'
  );

const passwordResetEmailHtml = (resetUrl, expiryMinutes) =>
  baseTemplate(
    'Reset your NumisRoma password',
    `
    <h1>Reset your password</h1>
    <p>We received a request to reset the password for your NumisRoma account. Click the button below to choose a new password.</p>

    <div class="cta-wrapper">
      <a href="${resetUrl}" class="cta">Reset password →</a>
    </div>

    <p>This link expires in <strong>${expiryMinutes} minutes</strong> and can only be used once. If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>

    <p style="font-size:13px;color:${C.textMuted};">If the button doesn't work, copy and paste this link into your browser:<br/>
    <a href="${resetUrl}" style="color:${C.amber};word-break:break-all;">${resetUrl}</a></p>
    `,
    'If you did not request a password reset, no action is needed — your account is safe.'
  );

const accountDeletionEmailHtml = (username) =>
  baseTemplate(
    'Your NumisRoma account has been deleted',
    `
    <h1>Your account has been deleted</h1>
    <p>Hello <strong>${escapeHtml(username)}</strong>, your NumisRoma account has been permanently deleted as requested.</p>

    <p>Your profile and collection data are no longer available through NumisRoma. There is nothing else you need to do.</p>

    <p>If you did not request this deletion or believe it happened in error, please contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
    `,
    'This confirmation was sent because the NumisRoma account registered to this email address was deleted.'
  );

const securityAlertEmailHtml = ({ username, device, location, riskFlags }) =>
  baseTemplate(
    'Security alert for your NumisRoma account',
    `
    <h1>New sign-in noticed</h1>
    <p>Hello <strong>${escapeHtml(username)}</strong>, we noticed a sign-in that deserves your attention.</p>

    <ul>
      <li><strong>Device:</strong> ${escapeHtml(device)}</li>
      <li><strong>Approximate location:</strong> ${escapeHtml(location)}</li>
      <li><strong>Reason:</strong> ${escapeHtml(riskFlags.join(', ').replace(/_/g, ' '))}</li>
    </ul>

    <p>IP-based locations are approximate. If this was not you, open your security settings and revoke the unfamiliar session immediately, then change your password.</p>

    <div class="cta-wrapper">
      <a href="${FRONTEND_URL}/settings" class="cta">Review sessions</a>
    </div>
    `,
    'This automated security notice was sent because NumisRoma identified an unusual or new sign-in.'
  );

const dataExportReadyEmailHtml = ({ username, downloadUrl, expiresAt, fileSize }) =>
  baseTemplate(
    'Your NumisRoma data download is ready',
    `
    <h1>Your data download is ready</h1>
    <p>Hello <strong>${escapeHtml(username)}</strong>, the NumisRoma data archive you requested is ready.</p>

    <p>The ZIP archive contains structured JSON files for your profile, collections, saved coin entries, conversations, followers/following, support requests, and uploaded images available from NumisRoma storage.</p>

    <ul>
      <li><strong>File size:</strong> ${escapeHtml(formatBytes(fileSize))}</li>
      <li><strong>Expires:</strong> ${escapeHtml(formatDate(expiresAt))}</li>
      <li><strong>Link type:</strong> Single-use, signed download link</li>
    </ul>

    <div class="cta-wrapper">
      <a href="${downloadUrl}" class="cta">Download your archive</a>
    </div>

    <p style="font-size:13px;color:${C.textMuted};">If the button doesn't work, copy and paste this link into your browser:<br/>
    <a href="${downloadUrl}" style="color:${C.amber};word-break:break-all;">${downloadUrl}</a></p>

    <p>If you did not request this export, please review your active sessions and change your password.</p>
    `,
    'This email was sent because you requested a copy of your NumisRoma data.'
  );

const contactNotificationHtml = ({ name, email, subject, message, contactId }) =>
  baseTemplate(
    `New NumisRoma contact message: ${escapeHtml(subject)}`,
    `
    <h1>New contact message</h1>
    <p>A visitor submitted the NumisRoma contact form.</p>

    <ul>
      <li><strong>Name:</strong> ${escapeHtml(name)}</li>
      <li><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></li>
      <li><strong>Subject:</strong> ${escapeHtml(subject)}</li>
      <li><strong>Contact ID:</strong> ${escapeHtml(contactId)}</li>
    </ul>

    <hr class="divider" />

    <p style="white-space:pre-line;">${escapeHtml(message)}</p>
    `,
    'Reply directly to the sender from your support inbox.'
  );

// ─── Send helpers ────────────────────────────────────────────────────────────

exports.sendOtpEmail = async ({ to, otp, expiryMinutes = 10 }) => {
  const result = await sendEmail({
    from: FROM_ADDRESS,
    to,
    subject: 'Your NumisRoma verification code',
    html: otpEmailHtml(otp, expiryMinutes),
    text: `Your NumisRoma verification code is: ${otp}\n\nThis code expires in ${expiryMinutes} minutes and can only be used once.\n\nIf you did not request this, ignore this email.`
  });

  handleResendError(result, 'OTP', to);
  logger.info('OTP email sent', { to, messageId: result.data?.id });
  return result;
};

exports.sendWelcomeEmail = async ({ to, username }) => {
  try {
    const result = await sendEmail({
      from: FROM_ADDRESS,
      to,
      subject: `Welcome to NumisRoma, ${username}!`,
      html: welcomeEmailHtml(username),
      text: `Welcome to NumisRoma, ${username}!\n\nYour account is ready. Start exploring at ${FRONTEND_URL}/browse\n\nNeed help? Contact us at ${SUPPORT_EMAIL}`
    });
    handleResendError(result, 'welcome', to);
    logger.info('Welcome email sent', { to, messageId: result.data?.id });
    return result;
  } catch (err) {
    logger.error('Failed to send welcome email', { to, error: err.message });
    throw err;
  }
};

exports.sendPasswordResetEmail = async ({ to, resetUrl, expiryMinutes = 15 }) => {
  try {
    const result = await sendEmail({
      from: FROM_ADDRESS,
      to,
      subject: 'Reset your NumisRoma password',
      html: passwordResetEmailHtml(resetUrl, expiryMinutes),
      text: `Reset your NumisRoma password\n\nClick the link below to set a new password. It expires in ${expiryMinutes} minutes.\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.`
    });
    handleResendError(result, 'password reset', to);
    logger.info('Password reset email sent', { to, messageId: result.data?.id });
    return result;
  } catch (err) {
    logger.error('Failed to send password reset email', { to, error: err.message });
    throw err;
  }
};

exports.sendAccountDeletionEmail = async ({ to, username }) => {
  try {
    const result = await sendEmail({
      from: FROM_ADDRESS,
      to,
      subject: 'Your NumisRoma account has been deleted',
      html: accountDeletionEmailHtml(username),
      text: `Hello ${username},\n\nYour NumisRoma account has been permanently deleted as requested. Your profile and collection data are no longer available through NumisRoma.\n\nIf you did not request this deletion or believe it happened in error, contact us at ${SUPPORT_EMAIL}.`
    });

    handleResendError(result, 'account deletion', to);
    logger.info('Account deletion email sent', { to, messageId: result.data?.id });
    return result;
  } catch (err) {
    logger.error('Failed to send account deletion email', { to, error: err.message });
    throw err;
  }
};

exports.sendSecurityAlertEmail = async ({ to, username, device, location, riskFlags }) => {
  const reasons = riskFlags.map(flag => flag.replace(/_/g, ' ')).join(', ');
  const result = await sendEmail({
    from: FROM_ADDRESS,
    to,
    subject: 'Security alert: new sign-in to NumisRoma',
    html: securityAlertEmailHtml({ username, device, location, riskFlags }),
    text: `Hello ${username},\n\nWe noticed a sign-in to your NumisRoma account.\nDevice: ${device}\nApproximate location: ${location}\nReason: ${reasons}\n\nIP-based locations are approximate. Review active sessions at ${FRONTEND_URL}/settings and revoke any session you do not recognize.`
  });
  handleResendError(result, 'security alert', to);
  logger.info('Security alert email sent', { to, messageId: result.data?.id });
  return result;
};

const formatBytes = (bytes = 0) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
};

const formatDate = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '7 days from request';
  return d.toLocaleString('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short'
  });
};

exports.sendDataExportReadyEmail = async ({ to, username, downloadUrl, expiresAt, fileSize }) => {
  const result = await sendEmail({
    from: FROM_ADDRESS,
    to,
    subject: 'Your NumisRoma data download is ready',
    html: dataExportReadyEmailHtml({ username, downloadUrl, expiresAt, fileSize }),
    text: [
      `Hello ${username},`,
      '',
      'The NumisRoma data archive you requested is ready.',
      `Download link: ${downloadUrl}`,
      `Expires: ${formatDate(expiresAt)}`,
      `File size: ${formatBytes(fileSize)}`,
      '',
      'This is a single-use, signed download link. If you did not request this export, review your active sessions and change your password.'
    ].join('\n')
  });

  handleResendError(result, 'data export ready', to);
  logger.info('Data export ready email sent', { to, messageId: result.data?.id });
  return result;
};

exports.sendContactNotificationEmail = async ({ name, email, subject, message, contactId }) => {
  try {
    const result = await sendEmail({
      from: FROM_ADDRESS,
      to: SUPPORT_EMAIL,
      replyTo: email,
      subject: `[NumisRoma contact] ${subject}`,
      html: contactNotificationHtml({ name, email, subject, message, contactId }),
      text: [
        'New NumisRoma contact message',
        '',
        `Name: ${name}`,
        `Email: ${email}`,
        `Subject: ${subject}`,
        `Contact ID: ${contactId}`,
        '',
        message
      ].join('\n')
    });

    handleResendError(result, 'contact notification', SUPPORT_EMAIL);
    logger.info('Contact notification email sent', {
      to: SUPPORT_EMAIL,
      messageId: result.data?.id,
      contactId
    });
    return result;
  } catch (err) {
    logger.error('Failed to send contact notification email', {
      to: SUPPORT_EMAIL,
      contactId,
      error: err.message
    });
    throw err;
  }
};
