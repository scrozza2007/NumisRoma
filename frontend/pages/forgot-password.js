import React, { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { getCsrfHeader } from '../utils/csrf';
import BrandLockup from '../components/BrandLockup';

const apiUrl = () => process.env.NEXT_PUBLIC_API_URL;

const ForgotPassword = () => {
  const [email, setEmail]         = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = (value) => {
    if (!value) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate(email);
    if (err) { setEmailError(err); return; }

    setIsLoading(true);
    setServerError('');
    try {
      const csrfHeader = await getCsrfHeader('POST');
      const res = await fetch(`${apiUrl()}/api/auth/forgot-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeader },
        body: JSON.stringify({ email }),
      });

      if (res.status === 429) {
        const data = await res.json();
        setServerError(data.error || 'Too many requests. Please wait before trying again.');
        return;
      }
      if (res.status === 502) {
        const data = await res.json();
        setServerError(data.error || 'Failed to send email. Please try again.');
        return;
      }

      // Always show success — don't leak whether email is registered
      setSubmitted(true);
    } catch {
      setServerError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-canvas">
      <Head>
        <title>Forgot Password — NumisRoma</title>
        <meta name="description" content="Reset your NumisRoma account password" />
      </Head>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <BrandLockup stacked priority />
          </Link>
          <h2 className="font-display font-semibold text-3xl mb-2 text-text-primary">Reset your password</h2>
          {!submitted && (
            <p className="font-sans text-sm text-text-muted">
              Enter your email and we'll send you a link to reset your password.
            </p>
          )}
        </div>

        {submitted ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <div className="w-12 h-12 bg-amber/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-display font-semibold text-xl mb-2 text-text-primary">Check your email</h3>
            <p className="font-sans text-sm text-text-muted mb-6">
              If an account exists for <strong className="text-text-primary">{email}</strong>, you'll receive a password reset link within a few minutes.
            </p>
            <p className="font-sans text-xs text-text-muted">
              Didn't receive it? Check your spam folder or{' '}
              <button
                onClick={() => setSubmitted(false)}
                className="text-amber hover:text-amber-hover underline transition-colors duration-150"
              >
                try again
              </button>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-8 space-y-5">
            <div>
              <label htmlFor="email" className="block font-sans text-sm font-medium mb-1.5 text-text-primary">
                Email address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailError(''); setServerError(''); }}
                onBlur={e => setEmailError(validate(e.target.value))}
                placeholder="you@example.com"
                required
                className={`w-full px-3.5 py-2.5 font-sans text-sm bg-canvas text-text-primary border rounded outline-none focus:border-amber transition-colors duration-150 ${emailError ? 'border-red-300' : 'border-border'}`}
              />
              {emailError && <p className="mt-1 font-sans text-xs text-red-600">{emailError}</p>}
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
                  <span>Sending…</span>
                </>
              ) : 'Send reset link'}
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

export default ForgotPassword;
