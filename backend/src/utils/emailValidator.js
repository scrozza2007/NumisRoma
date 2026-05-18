const logger = require('./logger');

/**
 * Verify a single email address using Abstract API Email Reputation.
 * https://app.abstractapi.com/api/email-reputation
 *
 * Returns true (allow) / false (reject).
 * Fails open if the API key is unset or the call errors — so a misconfigured
 * key never locks out legitimate registrations.
 */
exports.isDeliverableEmail = async (email) => {
  const apiKey = process.env.ABSTRACT_EMAIL_API_KEY;
  if (!apiKey) {
    logger.warn('ABSTRACT_EMAIL_API_KEY not set — skipping mailbox verification');
    return true;
  }

  try {
    const url = `https://emailreputation.abstractapi.com/v1/?api_key=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(email)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });

    if (!res.ok) {
      logger.warn('Abstract email reputation API error', { status: res.status });
      return true; // fail-open
    }

    const data = await res.json();

    if (data.error) {
      logger.warn('Abstract email reputation API returned error', { error: data.error });
      return true; // fail-open on API-level errors (e.g. invalid key)
    }

    logger.info('Abstract email reputation response', { email, data: JSON.stringify(data) });

    const deliverability = data.email_deliverability;
    const quality = data.email_quality;

    // Reject if the SMTP server says undeliverable
    if (deliverability?.status === 'undeliverable') return false;

    // Reject if MX records are missing
    if (deliverability?.is_mx_valid === false) return false;

    // Reject known disposable/throwaway addresses
    if (quality?.is_disposable === true) return false;

    // Reject high-risk addresses (covers reserved domains like example.com)
    if (data.email_risk?.address_risk_status === 'high') return false;

    return true;
  } catch (err) {
    logger.warn('Abstract email reputation request failed', { error: err.message });
    return true; // fail-open on timeout / network error
  }
};
