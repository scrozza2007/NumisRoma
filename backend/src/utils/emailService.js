const { Resend } = require('resend');
const logger = require('./logger');

let resend;

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
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ─── Brand tokens (mirrors globals.css / tailwind.config.js) ────────────────
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
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');

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
      .otp-code { font-size: 36px; letter-spacing: 8px; }
      h1 { font-size: 24px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">

      <div class="header">
        <div class="logo-text">NumisRoma</div>
        <div class="logo-sub">Ancient Roman Coin Collection</div>
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
      <a href="mailto:support@numisroma.com">Contact support</a>
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
    <p>Your account is ready, <strong>${username}</strong>. You've joined a growing community of collectors exploring and cataloging ancient Roman coins.</p>

    <p>Here's what you can do:</p>
    <ul>
      <li>Browse thousands of cataloged ancient Roman coins</li>
      <li>Build and share your personal collection</li>
      <li>Connect and message other collectors securely</li>
      <li>Track provenance, references, and auction history</li>
    </ul>

    <div class="cta-wrapper">
      <a href="${FRONTEND_URL}/browse" class="cta">Start exploring →</a>
    </div>

    <p>Questions or feedback? We're always happy to hear from you at <a href="mailto:support@numisroma.com">support@numisroma.com</a>.</p>
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

// ─── Send helpers ────────────────────────────────────────────────────────────

exports.sendOtpEmail = async ({ to, otp, expiryMinutes = 10 }) => {
  const client = getClient();
  const result = await client.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: 'Your NumisRoma verification code',
    html: otpEmailHtml(otp, expiryMinutes),
    text: `Your NumisRoma verification code is: ${otp}\n\nThis code expires in ${expiryMinutes} minutes and can only be used once.\n\nIf you did not request this, ignore this email.`
  });

  // Resend returns { data: { id }, error } — a non-null error means delivery failed
  if (result.error) {
    logger.error('Resend rejected OTP email', { to, resendError: result.error });
    const err = new Error(result.error.message || 'Resend API error');
    err.resendError = result.error;
    throw err;
  }

  logger.info('OTP email sent', { to, messageId: result.data?.id });
  return result;
};

exports.sendWelcomeEmail = async ({ to, username }) => {
  try {
    const client = getClient();
    const result = await client.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `Welcome to NumisRoma, ${username}!`,
      html: welcomeEmailHtml(username),
      text: `Welcome to NumisRoma, ${username}!\n\nYour account is ready. Start exploring at ${FRONTEND_URL}/browse\n\nNeed help? Contact us at support@numisroma.com`
    });
    logger.info('Welcome email sent', { to, messageId: result.data?.id });
    return result;
  } catch (err) {
    logger.error('Failed to send welcome email', { to, error: err.message });
    throw err;
  }
};

exports.sendPasswordResetEmail = async ({ to, resetUrl, expiryMinutes = 15 }) => {
  try {
    const client = getClient();
    const result = await client.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: 'Reset your NumisRoma password',
      html: passwordResetEmailHtml(resetUrl, expiryMinutes),
      text: `Reset your NumisRoma password\n\nClick the link below to set a new password. It expires in ${expiryMinutes} minutes.\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.`
    });
    logger.info('Password reset email sent', { to, messageId: result.data?.id });
    return result;
  } catch (err) {
    logger.error('Failed to send password reset email', { to, error: err.message });
    throw err;
  }
};
