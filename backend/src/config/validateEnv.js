/**
 * Boot-time environment validation.
 *
 * Rationale: production misconfigurations (missing JWT_SECRET, weak
 * CSRF_SECRET, unset MONGODB_URI) currently surface as runtime 500s
 * on the first request that needs them, or — worse — silently weaken
 * security. This module is imported at process start and fails fast.
 *
 * Called from `src/index.js` before the HTTP server starts listening.
 */

const logger = require('../utils/logger');

const MIN_SECRET_LENGTH = 32;

const firstCsvValue = (value) => String(value || '')
  .split(',')
  .map(v => v.trim())
  .filter(Boolean)[0] || '';

const extractEmailAddress = (value = '') => {
  const match = String(value).match(/<([^>]+)>/);
  return (match ? match[1] : value).trim();
};

const emailDomain = (value = '') => {
  const [, domain = ''] = extractEmailAddress(value).split('@');
  return domain.toLowerCase();
};

const rootDomain = (hostname = '') => {
  const labels = String(hostname).toLowerCase().split('.').filter(Boolean);
  if (labels.length <= 2) return labels.join('.');
  return labels.slice(-2).join('.');
};

const urlHostname = (value = '') => {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return '';
  }
};

/**
 * Validate a secret by length, complexity heuristics, and obvious
 * placeholder values. Returns an array of human-readable problems.
 */
const validateSecret = (name, value, { minLength = MIN_SECRET_LENGTH } = {}) => {
  const problems = [];
  if (!value || typeof value !== 'string') {
    problems.push(`${name} is missing`);
    return problems;
  }
  if (value.length < minLength) {
    problems.push(
      `${name} is too short (${value.length} chars, minimum ${minLength})`
    );
  }
  const placeholders = [
    'change', 'changeme', 'secret', 'password', 'default',
    'test', 'development', 'placeholder', 'your_', 'example'
  ];
  const lower = value.toLowerCase();
  if (placeholders.some(p => lower.includes(p))) {
    problems.push(`${name} looks like a placeholder value — rotate it`);
  }
  return problems;
};

const validateEnv = () => {
  const errors = [];
  const warnings = [];
  const isProd = process.env.NODE_ENV === 'production';

  // MongoDB is always required.
  if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
    errors.push('MONGODB_URI (or MONGO_URI) is required');
  }

  // JWT secret — always required (both dev and prod).
  errors.push(...validateSecret('JWT_SECRET', process.env.JWT_SECRET));

  // Refresh-token secret — required wherever tokenManager is used.
  errors.push(...validateSecret('REFRESH_TOKEN_SECRET', process.env.REFRESH_TOKEN_SECRET));

  // JWT and refresh secrets MUST differ.
  if (
    process.env.JWT_SECRET &&
    process.env.REFRESH_TOKEN_SECRET &&
    process.env.JWT_SECRET === process.env.REFRESH_TOKEN_SECRET
  ) {
    errors.push('JWT_SECRET and REFRESH_TOKEN_SECRET must be distinct values');
  }

  // CSRF secret: required in prod, recommended elsewhere. CSRF middleware
  // falls back to JWT_SECRET but we want them separate.
  if (isProd) {
    errors.push(...validateSecret('CSRF_SECRET', process.env.CSRF_SECRET));
    if (
      process.env.CSRF_SECRET &&
      process.env.JWT_SECRET &&
      process.env.CSRF_SECRET === process.env.JWT_SECRET
    ) {
      errors.push('CSRF_SECRET must not equal JWT_SECRET');
    }
  } else if (!process.env.CSRF_SECRET) {
    warnings.push('CSRF_SECRET is unset; falling back to JWT_SECRET in non-production only');
  }

  // FRONTEND_URL is required in production so CORS + cookie + CSP are tight.
  if (isProd && !process.env.FRONTEND_URL) {
    errors.push('FRONTEND_URL must be set in production (comma-separated origins allowed)');
  }

  // TRUST_PROXY should be explicit in production so req.ip, rate limits,
  // and cookie `secure` behave correctly behind a load balancer.
  if (isProd && process.env.TRUST_PROXY === undefined) {
    warnings.push('TRUST_PROXY is not set; set to "1" behind a single proxy / LB');
  }

  // ADMIN_API_KEY length check — only if set.
  if (process.env.ADMIN_API_KEY) {
    const adminProblems = validateSecret('ADMIN_API_KEY', process.env.ADMIN_API_KEY, {
      minLength: 32
    });
    errors.push(...adminProblems);
  }

  // Resend API key — required for OTP + welcome emails.
  if (!process.env.RESEND_API_KEY) {
    if (isProd) {
      errors.push('RESEND_API_KEY is required in production (email verification flow)');
    } else {
      warnings.push('RESEND_API_KEY is unset — email sending will fail; set it to test the registration flow');
    }
  } else if (!process.env.RESEND_API_KEY.startsWith('re_')) {
    warnings.push('RESEND_API_KEY does not look like a valid Resend key (expected prefix: re_)');
  }

  const resendFrom = process.env.RESEND_FROM_EMAIL || 'NumisRoma <noreply@numisroma.com>';
  const senderDomain = emailDomain(resendFrom);
  const frontendHost = urlHostname(firstCsvValue(process.env.FRONTEND_URL));
  const supportDomain = emailDomain(process.env.SUPPORT_EMAIL || `support@${senderDomain || 'numisroma.com'}`);

  if (isProd) {
    if (!senderDomain) {
      errors.push('RESEND_FROM_EMAIL must include an email address on your verified sending domain');
    }

    if (senderDomain && frontendHost && rootDomain(frontendHost) !== rootDomain(senderDomain)) {
      warnings.push('FRONTEND_URL root domain differs from RESEND_FROM_EMAIL; email links should align with the sending domain');
    }

    if (senderDomain && supportDomain && rootDomain(supportDomain) !== rootDomain(senderDomain)) {
      warnings.push('SUPPORT_EMAIL root domain differs from RESEND_FROM_EMAIL; prefer a mailbox on the same domain');
    }

    if (!process.env.EMAIL_DMARC_CONFIRMED) {
      warnings.push('EMAIL_DMARC_CONFIRMED is unset; confirm a valid _dmarc TXT record exists for the sending domain');
    }
  }

  // Google Vision API key — required for coin image AI validation.
  if (!process.env.GOOGLE_VISION_API_KEY) {
    warnings.push('GOOGLE_VISION_API_KEY is unset — AI coin detection will be skipped (uploads accepted without coin check)');
  }

  if (warnings.length > 0) {
    warnings.forEach(w => logger.warn(`[env] ${w}`));
  }

  if (errors.length > 0) {
    errors.forEach(e => logger.error(`[env] ${e}`));
    throw new Error(
      `Environment validation failed (${errors.length} error${errors.length > 1 ? 's' : ''}). ` +
      'Set the required variables and restart.'
    );
  }

  logger.info('[env] configuration validated', {
    NODE_ENV: process.env.NODE_ENV || 'development',
    hasRedis: Boolean(process.env.REDIS_URL || process.env.REDIS_HOST),
    adminKeyConfigured: Boolean(process.env.ADMIN_API_KEY)
  });
};

module.exports = { validateEnv };
