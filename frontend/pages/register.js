import React, { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Add your registration logic here
    console.log('Registration attempt with:', { email, password });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Head>
        <title>Register - NumisRoma</title>
        <meta name="description" content="Create a NumisRoma account" />
      </Head>

      <header className="bg-yellow-500 shadow-md">
        <div className="container mx-auto flex justify-between items-center py-4 px-6">
          <Link href="/">
            <img src="/images/logo.png" alt="NumisRoma" className="h-10" />
          </Link>
          <nav className="flex space-x-4">
            <Link href="/browse" className="text-white hover:underline">Browse</Link>
            <Link href="/search" className="text-white hover:underline">Search</Link>
            <Link href="/community" className="text-white hover:underline">Community</Link>
            <Link href="/resources" className="text-white hover:underline">Resources</Link>
            <Link href="/symbols" className="text-white hover:underline">Symbols</Link>
            <Link href="/contact" className="text-white hover:underline">Contact</Link>
          </nav>
          <div className="flex space-x-4">
            <Link href="/login" className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors duration-200">Sign In</Link>
            <Link href="/register" className="px-4 py-2 bg-white text-black rounded hover:bg-gray-200 transition-colors duration-200">Register</Link>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-4">
        <div className="bg-white shadow-xl rounded-lg p-8 w-full max-w-md transform hover:scale-[1.02] transition-transform duration-200">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h2>
            <p className="text-gray-600">Join our community of numismatic enthusiasts</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-gray-700 font-medium mb-2">Email Address</label>
              <input
                type="email"
                id="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-gray-700 font-medium mb-2">Password</label>
              <input
                type="password"
                id="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-gray-700 font-medium mb-2">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-all duration-200 transform hover:scale-[1.02]"
            >
              Create Account
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-yellow-500 hover:text-yellow-600 transition-colors duration-200">
                Sign in here
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-yellow-500 hover:text-yellow-600 transition-colors duration-200">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-yellow-500 hover:text-yellow-600 transition-colors duration-200">
              Privacy Policy
            </Link>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-800">About NumisRoma</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Our Mission</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Research</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Publications</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Contributors</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-800">Resources</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Coin Database</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Historical Maps</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Timeline</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Bibliography</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-800">Community</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Forum</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Events</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Newsletter</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex justify-center space-x-4">
          <Link href="#" aria-label="Twitter" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">
            <img src="/images/twitter-icon.svg" alt="Twitter" className="h-6" />
          </Link>
          <Link href="#" aria-label="Instagram" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">
            <img src="/images/instagram-icon.svg" alt="Instagram" className="h-6" />
          </Link>
          <Link href="#" aria-label="YouTube" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">
            <img src="/images/youtube-icon.svg" alt="YouTube" className="h-6" />
          </Link>
          <Link href="#" aria-label="LinkedIn" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">
            <img src="/images/linkedin-icon.svg" alt="LinkedIn" className="h-6" />
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default Register;