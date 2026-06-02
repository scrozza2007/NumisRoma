import React, { useState, useContext, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { CircleAlert, Eye, EyeOff, Info, LoaderCircle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { getCsrfHeader } from '../utils/csrf';
import BrandLockup from '../components/BrandLockup';

const Login = () => {
  const router = useRouter();
  const { login } = useContext(AuthContext);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (router.query.message) {
      setStatusMessage(router.query.message);
      const params = new URLSearchParams(window.location.search);
      params.delete('message');
      router.replace({ pathname: router.pathname, query: Object.fromEntries(params) }, undefined, { shallow: true });
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    if (!identifier || !password) {
      setErrors({ identifier: 'Please enter both email/username and password.' });
      setIsSubmitting(false);
      return;
    }

    try {
      const csrfHeader = await getCsrfHeader('POST');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeader },
        body: JSON.stringify({ identifier, password, rememberMe }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.authenticated && data.user) { await login(data.user); router.push('/'); }
        else setErrors({ server: 'Invalid response from server' });
      } else {
        setErrors({ server: data.msg || 'Invalid credentials' });
      }
    } catch {
      setErrors({ server: 'Network error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-canvas">
      <Head>
        <title>Sign In — NumisRoma</title>
        <meta name="description" content="Sign in to your NumisRoma account" />
      </Head>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <BrandLockup stacked priority />
          </Link>
          <h2 className="font-display font-semibold text-3xl mb-2 text-text-primary">Welcome back</h2>
          <p className="font-sans text-sm text-text-muted">Your collection is waiting.</p>
        </div>

        {statusMessage && (
          <div className="mb-6 p-3.5 rounded flex items-start gap-3 text-sm bg-amber-bg border border-amber text-amber-hover animate-fade-in">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-sans">{statusMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="identifier" className="block font-sans text-sm font-medium mb-1.5 text-text-primary">
              Email or Username
            </label>
            <input
              type="text"
              id="identifier"
              placeholder="you@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-3.5 py-2.5 font-sans text-sm bg-card text-text-primary border border-border rounded outline-none focus:border-amber transition-colors duration-200"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block font-sans text-sm font-medium text-text-primary">
                Password
              </label>
              <Link href="/forgot-password" className="font-sans text-xs text-text-muted hover:text-amber transition-colors duration-200">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 pr-10 font-sans text-sm bg-card text-text-primary border border-border rounded outline-none focus:border-amber transition-colors duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors duration-150"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-2.5 font-sans text-sm text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-amber"
            />
            <span>Keep me signed in on this device for 30 days</span>
          </label>

          {Object.keys(errors).length > 0 && (
            <div className="p-3.5 rounded flex items-start gap-3 text-sm animate-fade-in bg-red-50 border border-red-200 text-red-700">
              <CircleAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-sans">{Object.values(errors)[0]}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 font-sans text-sm font-semibold rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="animate-spin h-4 w-4" />
                <span>Signing in…</span>
              </>
            ) : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 border-t border-border" />
          <span className="font-sans text-xs text-text-muted shrink-0">or continue with</span>
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
          No account?{' '}
          <Link href="/register" className="font-medium text-amber hover:text-amber-hover transition-colors duration-200">
            Create one free →
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
