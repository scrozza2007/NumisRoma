import { useEffect, useContext, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { AuthContext } from '../../context/AuthContext';

const ERROR_MESSAGES = {
  oauth_failed: 'The sign-in was cancelled or failed. Please try again.',
  server_error: 'A server error occurred during sign-in. Please try again.',
};

const OAuthCallback = () => {
  const router = useRouter();
  const { login } = useContext(AuthContext);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!router.isReady) return;

    const { token, isNew, error: oauthError } = router.query;

    if (oauthError) {
      setError(ERROR_MESSAGES[oauthError] || 'Sign-in failed. Please try again.');
      return;
    }

    if (!token) {
      setError('Sign-in failed: no token received. Please try again.');
      return;
    }

    login(token, null).then(() => {
      if (isNew === '1') {
        router.replace('/welcome');
      } else {
        router.replace('/');
      }
    });
  }, [router.isReady, router.query]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-canvas">
        <Head><title>Sign-in Error — NumisRoma</title></Head>
        <div className="w-full max-w-sm text-center">
          <div className="p-4 rounded bg-red-50 border border-red-200 text-red-700 text-sm font-sans mb-6">
            {error}
          </div>
          <button
            onClick={() => router.replace('/login')}
            className="font-sans text-sm font-medium text-amber hover:text-amber-hover transition-colors duration-200"
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <Head><title>Signing in… — NumisRoma</title></Head>
      <div className="flex flex-col items-center gap-4">
        <svg className="animate-spin h-8 w-8 text-amber" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="font-sans text-sm text-text-muted">Signing you in…</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
