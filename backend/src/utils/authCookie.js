/**
 * Centralized helpers for the httpOnly auth cookie.
 *
 * We use one cookie name ("token") across all auth endpoints to keep
 * set / clear behavior symmetric and to make the frontend integration
 * trivial (no cookie name per route).
 *
 * Security properties:
 *   - httpOnly: JS cannot read it → immune to localStorage-style XSS exfiltration.
 *   - secure:   required over HTTPS in production.
 *   - sameSite: 'lax' by default — protects against most CSRF while still
 *               permitting top-level navigation (useful for login redirects).
 *               Override to 'none' only when frontend is on a different
 *               cross-site origin and requires cross-site credentials.
 */

const AUTH_COOKIE_NAME = 'token';
const REFRESH_COOKIE_NAME = 'refreshToken';

// Auth cookie lifetime is deliberately longer than the short-lived access JWT:
// an expired cookie still identifies the browser while its scoped refresh cookie
// rotates a fresh access token. The JWT `exp` remains the authorization boundary.
const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Refresh token cookie lifetime — 7 days, matching the refresh JWT expiry.
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const REMEMBER_ME_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const getBaseCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  const sameSite = (process.env.AUTH_COOKIE_SAMESITE || 'lax').toLowerCase();

  const options = {
    httpOnly: true,
    secure: isProd,
    sameSite: ['lax', 'strict', 'none'].includes(sameSite) ? sameSite : 'lax',
    path: '/'
  };

  if (options.sameSite === 'none') {
    options.secure = true;
  }

  if (process.env.AUTH_COOKIE_DOMAIN) {
    options.domain = process.env.AUTH_COOKIE_DOMAIN;
  }

  return options;
};

const getAuthCookieOptions = (rememberMe = false) => ({
  ...getBaseCookieOptions(),
  maxAge: rememberMe ? REMEMBER_ME_COOKIE_MAX_AGE_MS : AUTH_COOKIE_MAX_AGE_MS
});

const getRefreshCookieOptions = (rememberMe = false) => ({
  ...getBaseCookieOptions(),
  maxAge: rememberMe ? REMEMBER_ME_COOKIE_MAX_AGE_MS : REFRESH_COOKIE_MAX_AGE_MS,
  path: '/api/auth' // scope refresh cookie to auth endpoints only
});

const setAuthCookie = (res, token, { rememberMe = false } = {}) => {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions(rememberMe));
};

const setRefreshCookie = (res, refreshToken, { rememberMe = false } = {}) => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions(rememberMe));
};

const clearAuthCookie = (res) => {
  const { httpOnly, secure, sameSite, path, domain } = getAuthCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, { httpOnly, secure, sameSite, path, ...(domain && { domain }) });
};

const clearRefreshCookie = (res) => {
  const { httpOnly, secure, sameSite, domain } = getBaseCookieOptions();
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly, secure, sameSite, path: '/api/auth', ...(domain && { domain })
  });
};

module.exports = {
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  AUTH_COOKIE_MAX_AGE_MS,
  REFRESH_COOKIE_MAX_AGE_MS,
  REMEMBER_ME_COOKIE_MAX_AGE_MS,
  getAuthCookieOptions,
  getRefreshCookieOptions,
  setAuthCookie,
  setRefreshCookie,
  clearAuthCookie,
  clearRefreshCookie
};
