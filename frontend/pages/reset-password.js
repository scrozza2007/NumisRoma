import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getCsrfHeader } from '../utils/csrf';
import BrandLockup from '../components/BrandLockup';

const apiUrl = () => process.env.NEXT_PUBLIC_API_URL;

const passwordChecklist = (password) => ({
  length:    password.length >= 8,
  uppercase: /[A-Z]/.test(password),
  number:    /[0-9]/.test(password),
  special:   /[!@#$%^&*]/.test(password),
});

const ResetPassword = () => {
  const router = useRouter();
  const { token, email } = router.query;

  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirm]     = useState('');
  const [errors, setErrors]               = useState({});
  const [isLoading, setIsLoading]         = useState(false);
  const [success, setSuccess]             = useState(false);
  const [serverError, setServerError]     = useState('');
  const [invalidLink, setInvalidLink]     = useState(false);

  // Validate token + email presence once query params are ready
  useEffect(() => {
    if (!router.isReady) return;
    if (!token || !email) setInvalidLink(true);
  }, [router.isReady, token, email]);

  const checks = passwordChecklist(password);

  const validate = () => {
    const e = {};
    if (!password) { e.password = 'Password is required'; }
    else if (!checks.length)    { e.password = 'Must be at least 8 characters'; }
    else if (!checks.uppercase) { e.password = 'Must contain an uppercase letter'; }
    else if (!checks.number)    { e.password = 'Must contain a number'; }
    else if (!checks.special)   { e.password = 'Must contain a special character (!@#$%^&*)'; }
    if (!confirmPassword)          { e.confirmPassword = 'Please confirm your password'; }
    else if (password !== confirmPassword) { e.confirmPassword = 'Passwords do not match'; }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setIsLoading(true);
    setServerError('');
    setErrors({});

    try {
      const csrfHeader = await getCsrfHeader('POST');
      const res = await fetch(`${apiUrl()}/api/auth/reset-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeader },
        body: JSON.stringify({ email, token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'INVALID_TOKEN' || data.code === 'TOKEN_EXPIRED' || data.code === 'TOKEN_USED') {
          setInvalidLink(true);
          return;
        }
        if (data.field === 'password') {
          setErrors({ password: data.error });
          return;
        }
        setServerError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setSuccess(true);
    } catch {
      setServerError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (hasError) =>
    `w-full px-3.5 py-2.5 font-sans text-sm bg-canvas text-text-primary border rounded outline-none focus:border-amber transition-colors duration-150 ${hasError ? 'border-red-300' : 'border-border'}`;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-canvas">
      <Head>
        <title>Reset Password — NumisRoma</title>
        <meta name="description" content="Set a new password for your NumisRoma account" />
      </Head>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <BrandLockup stacked priority />
          </Link>
          <h2 className="font-display font-semibold text-3xl mb-2 text-text-primary">Choose a new password</h2>
        </div>

        {/* Invalid / expired link */}
        {invalidLink && (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 className="font-display font-semibold text-xl mb-2 text-text-primary">Link invalid or expired</h3>
            <p className="font-sans text-sm text-text-muted mb-6">
              This password reset link is invalid or has expired. Reset links are valid for 15 minutes and can only be used once.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block font-sans text-sm font-semibold px-6 py-2.5 rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-200"
            >
              Request a new link
            </Link>
          </div>
        )}

        {/* Success */}
        {!invalidLink && success && (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <div className="w-12 h-12 bg-amber/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-display font-semibold text-xl mb-2 text-text-primary">Password updated</h3>
            <p className="font-sans text-sm text-text-muted mb-6">
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
            <Link
              href="/login?message=Password reset successfully. Please sign in."
              className="inline-block font-sans text-sm font-semibold px-6 py-2.5 rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-200"
            >
              Sign in →
            </Link>
          </div>
        )}

        {/* Reset form */}
        {!invalidLink && !success && (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-8 space-y-5">
            <div>
              <label htmlFor="password" className="block font-sans text-sm font-medium mb-1.5 text-text-primary">
                New password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: '' })); }}
                placeholder="Create a strong password"
                required
                className={inputClass(errors.password)}
              />
              {password.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {[
                    { key: 'length',    label: '8+ characters'    },
                    { key: 'uppercase', label: 'Uppercase letter'  },
                    { key: 'number',    label: 'Number'            },
                    { key: 'special',   label: 'Special character' },
                  ].map(({ key, label }) => (
                    <div key={key} className={`flex items-center gap-1 font-sans text-xs ${checks[key] ? 'text-green-600' : 'text-text-muted'}`}>
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {checks[key]
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          : <circle cx="12" cy="12" r="2" fill="currentColor" />}
                      </svg>
                      {label}
                    </div>
                  ))}
                </div>
              )}
              {errors.password && <p className="mt-1 font-sans text-xs text-red-600">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block font-sans text-sm font-medium mb-1.5 text-text-primary">
                Confirm new password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={e => { setConfirm(e.target.value); setErrors(prev => ({ ...prev, confirmPassword: '' })); }}
                placeholder="Repeat your password"
                required
                className={inputClass(errors.confirmPassword)}
              />
              {errors.confirmPassword && <p className="mt-1 font-sans text-xs text-red-600">{errors.confirmPassword}</p>}
            </div>

            {serverError && (
              <div className="p-3.5 rounded flex items-start gap-3 text-sm bg-red-50 border border-red-200 text-red-700">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-sans">{serverError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 font-sans text-sm font-semibold rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Resetting…</span>
                </>
              ) : 'Reset password'}
            </button>

            <p className="text-center font-sans text-sm text-text-muted">
              <Link href="/login" className="text-amber hover:text-amber-hover transition-colors duration-200">
                ← Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
