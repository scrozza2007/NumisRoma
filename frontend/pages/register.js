import React, { useState, useContext } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';
import Image from 'next/image';
import { getCsrfHeader } from '../utils/csrf';

const Register = () => {
  const router = useRouter();
  const { login } = useContext(AuthContext);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const passwordChecks = {
    length:    formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    number:    /[0-9]/.test(formData.password),
    special:   /[!@#$%^&*]/.test(formData.password),
  };

  const validateField = (name, value) => {
    switch (name) {
      case 'username':
        if (value.length < 3) return 'Username must be at least 3 characters long';
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
        break;
      case 'password':
        if (value.length < 8) return 'Password must be at least 8 characters long';
        if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
        if (!/[0-9]/.test(value)) return 'Password must contain at least one number';
        if (!/[!@#$%^&*]/.test(value)) return 'Password must contain at least one special character (!@#$%^&*)';
        break;
      case 'confirmPassword':
        if (value !== formData.password) return 'Passwords do not match';
        break;
    }
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name]) setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    if (name === 'password' && touched.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: formData.confirmPassword !== value ? 'Passwords do not match' : '' }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const validateForm = () => {
    const newErrors = {};
    Object.keys(formData).forEach(key => { const e = validateField(key, formData[key]); if (e) newErrors[key] = e; });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setErrors({});
    try {
      const csrfHeader = await getCsrfHeader('POST');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeader },
        body: JSON.stringify({ username: formData.username, email: formData.email, password: formData.password }),
      });
      let data;
      try { data = await res.json(); } catch { setErrors({ form: 'Server returned invalid JSON.' }); setIsLoading(false); return; }
      if (!res.ok) {
        if (res.status === 409) { setErrors({ [data.field]: data.error }); setIsLoading(false); return; }
        if (res.status === 400) {
          if (data.details?.length) { const e = {}; data.details.forEach(d => { e[d.field] = d.message; }); setErrors(e); }
          else setErrors({ form: data.error || 'Validation failed' });
          setIsLoading(false); return;
        }
        throw new Error(data.message || 'Registration failed');
      }
      if (data.token && data.user) { await login(data.token, data.user); router.push('/welcome'); }
      else { setErrors({ form: 'Registration successful but missing login data. Please log in manually.' }); setIsLoading(false); }
    } catch (err) {
      if (err.message && typeof err.message === 'object') setErrors({ [err.message.field]: err.message.message });
      else setErrors({ form: err.message || 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (hasError) =>
    `w-full px-3.5 py-2.5 font-sans text-sm bg-card text-text-primary border rounded outline-none focus:border-amber transition-colors duration-150 ${
      hasError ? 'border-red-300' : 'border-border'
    }`;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-canvas">
      <Head>
        <title>Create Account — NumisRoma</title>
        <meta name="description" content="Create a NumisRoma account" />
      </Head>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <Image src="/images/logo.png" alt="NumisRoma" width={120} height={40} priority sizes="120px" className="h-10 w-auto mx-auto" />
          </Link>
          <h2 className="font-display font-semibold text-3xl mb-2 text-text-primary">Start building your collection</h2>
          <p className="font-sans text-sm text-text-muted">Join thousands of collectors cataloging ancient Roman coins. Free, always.</p>
        </div>

        {errors.form && (
          <div className="mb-5 p-3.5 rounded flex items-start gap-3 text-sm animate-fade-in bg-red-50 border border-red-200 text-red-700">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-sans">{errors.form}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block font-sans text-sm font-medium mb-1.5 text-text-primary">Username</label>
            <input type="text" id="username" name="username" placeholder="Choose a username"
              value={formData.username} onChange={handleChange} onBlur={handleBlur} required
              className={inputClass(errors.username)} />
            {errors.username && <p className="mt-1 font-sans text-xs text-red-600">{errors.username}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block font-sans text-sm font-medium mb-1.5 text-text-primary">Email address</label>
            <input type="email" id="email" name="email" placeholder="you@example.com"
              value={formData.email} onChange={handleChange} onBlur={handleBlur} required
              className={inputClass(errors.email)} />
            {errors.email && <p className="mt-1 font-sans text-xs text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block font-sans text-sm font-medium mb-1.5 text-text-primary">Password</label>
            <input type="password" id="password" name="password" placeholder="Create a password"
              value={formData.password} onChange={handleChange} onBlur={handleBlur} required
              className={inputClass(touched.password && errors.password)} />
            {formData.password.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-1">
                {[
                  { key: 'length',    label: '8+ characters'    },
                  { key: 'uppercase', label: 'Uppercase letter'  },
                  { key: 'number',    label: 'Number'            },
                  { key: 'special',   label: 'Special character' },
                ].map(({ key, label }) => (
                  <div key={key} className={`flex items-center gap-1 font-sans text-xs ${passwordChecks[key] ? 'text-green-600' : 'text-text-muted'}`}>
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {passwordChecks[key]
                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        : <circle cx="12" cy="12" r="2" fill="currentColor" />}
                    </svg>
                    {label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block font-sans text-sm font-medium mb-1.5 text-text-primary">Confirm password</label>
            <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Repeat your password"
              value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur} required
              className={inputClass(errors.confirmPassword)} />
            {errors.confirmPassword && <p className="mt-1 font-sans text-xs text-red-600">{errors.confirmPassword}</p>}
          </div>

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
                <span>Creating account…</span>
              </>
            ) : 'Create account'}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 border-t border-border" />
          <span className="font-sans text-xs text-text-muted shrink-0">or sign up with</span>
          <div className="flex-1 border-t border-border" />
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL}/api/auth/oauth/google`}
            className="flex items-center justify-center gap-3 w-full py-2.5 px-4 font-sans text-sm font-medium rounded border border-border bg-card text-text-primary hover:bg-canvas transition-colors duration-200"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </a>

        </div>

        <p className="mt-6 text-center font-sans text-sm text-text-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-amber hover:text-amber-hover transition-colors duration-200">Sign in →</Link>
        </p>
        <p className="mt-4 text-center font-sans text-xs text-text-muted">
          By creating an account you agree to our{' '}
          <Link href="/terms" className="underline hover:no-underline text-text-muted">Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" className="underline hover:no-underline text-text-muted">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
};

export default Register;
