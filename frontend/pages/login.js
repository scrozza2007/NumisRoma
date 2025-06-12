import React, { useState, useContext, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';
import Image from 'next/image';

const Login = () => {
  const router = useRouter();
  const { login } = useContext(AuthContext);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (router.query.message) {
      setStatusMessage(router.query.message);
      const params = new URLSearchParams(window.location.search);
      params.delete('message');
      router.replace(
        {
          pathname: router.pathname,
          query: Object.fromEntries(params)
        },
        undefined,
        { shallow: true }
      );
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    // Custom validation for empty fields
    if (!identifier || !password) {
      setErrors({ identifier: 'Please enter both email/username and password.' });
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.token) {
          login(data.token, data.user || data);
          router.push('/');
        } else {
          setErrors({ server: 'Invalid response from server' });
        }
      } else {
        setErrors({ server: data.msg || 'Invalid credentials' });
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrors({ server: 'Network error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white">
      <Head>
        <title>Sign In - NumisRoma</title>
        <meta name="description" content="Sign in to your NumisRoma account" />
      </Head>

      <div className="flex-grow flex items-center justify-center p-4 py-12">
        <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md transform hover:scale-[1.02] transition-all duration-300">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-6">
              <Image src="/images/logo.png" alt="NumisRoma" width={250} height={250} priority sizes="250px" />
            </Link>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Welcome Back</h2>
            <p className="text-gray-600">Sign in to access your NumisRoma account</p>
          </div>

          {statusMessage && (
            <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-md">
              <p className="flex items-center">
                <svg className="h-5 w-5 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {statusMessage}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="identifier" className="block text-gray-700 font-medium mb-2">Email or Username</label>
              <div className="relative">
                <input
                  type="text"
                  id="identifier"
                  placeholder="Enter your email or username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="mt-1 text-sm text-gray-500">You can sign in using your email address or username</p>
            </div>
            <div>
              <label htmlFor="password" className="block text-gray-700 font-medium mb-2">Password</label>
              <div className="relative">
                <input
                  type="password"
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
                              className="group w-full bg-gradient-to-r from-gray-800 to-black text-white py-3.5 rounded-xl hover:from-gray-900 hover:to-gray-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {Object.keys(errors).map((key) => (
            <div key={key} className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl animate-fade-in flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errors[key]}</span>
            </div>
          ))}

          <div className="mt-6 text-center">
            <Link href="/forgot-password" className="text-yellow-600 hover:text-yellow-700 transition-colors duration-200 font-medium">
              Forgot your password?
            </Link>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-600 mb-8">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-blue-600 hover:text-blue-800">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;