import React, { useState, useContext } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const { login } = useContext(AuthContext);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        login(data.token); // Save token in context and localStorage
        router.push('/');  // Redirect to home or dashboard
      } else {
        setError(data.msg || 'Invalid credentials');
      }
    } catch (err) {
      console.error(err);
      setError('Network error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Head>
        <title>Sign In - NumisRoma</title>
        <meta name="description" content="Sign in to your NumisRoma account" />
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
            <Link href="/login" className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">Sign In</Link>
            <Link href="/register" className="px-4 py-2 bg-white text-black rounded hover:bg-gray-200">Register</Link>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center">
        <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Sign In</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-gray-700 font-medium mb-2">Email</label>
              <input
                type="email"
                id="email"
                placeholder="Value"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="block text-gray-700 font-medium mb-2">Password</label>
              <input
                type="password"
                id="password"
                placeholder="Value"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800"
            >
              Sign In
            </button>
          </form>
          {error && (
            <p className="text-red-500 text-sm mt-4">{error}</p>
          )}
          <div className="mt-4 text-center">
            <Link href="/forgot-password" className="text-yellow-500 hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
      </main>

      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">Use cases</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="hover:underline">UI design</Link></li>
              <li><Link href="#" className="hover:underline">UX design</Link></li>
              <li><Link href="#" className="hover:underline">Wireframing</Link></li>
              <li><Link href="#" className="hover:underline">Diagramming</Link></li>
              <li><Link href="#" className="hover:underline">Brainstorming</Link></li>
              <li><Link href="#" className="hover:underline">Online whiteboard</Link></li>
              <li><Link href="#" className="hover:underline">Team collaboration</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">Explore</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="hover:underline">Design</Link></li>
              <li><Link href="#" className="hover:underline">Prototyping</Link></li>
              <li><Link href="#" className="hover:underline">Development features</Link></li>
              <li><Link href="#" className="hover:underline">Design systems</Link></li>
              <li><Link href="#" className="hover:underline">Collaboration features</Link></li>
              <li><Link href="#" className="hover:underline">Design process</Link></li>
              <li><Link href="#" className="hover:underline">Figma</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="hover:underline">Blog</Link></li>
              <li><Link href="#" className="hover:underline">Best practices</Link></li>
              <li><Link href="#" className="hover:underline">Colors</Link></li>
              <li><Link href="#" className="hover:underline">Color wheel</Link></li>
              <li><Link href="#" className="hover:underline">Support</Link></li>
              <li><Link href="#" className="hover:underline">Developers</Link></li>
              <li><Link href="#" className="hover:underline">Resource library</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex justify-center space-x-4">
          <Link href="#" aria-label="Twitter"><img src="/images/twitter-icon.svg" alt="Twitter" className="h-6" /></Link>
          <Link href="#" aria-label="Instagram"><img src="/images/instagram-icon.svg" alt="Instagram" className="h-6" /></Link>
          <Link href="#" aria-label="YouTube"><img src="/images/youtube-icon.svg" alt="YouTube" className="h-6" /></Link>
          <Link href="#" aria-label="LinkedIn"><img src="/images/linkedin-icon.svg" alt="LinkedIn" className="h-6" /></Link>
        </div>
      </footer>
    </div>
  );
};

export default Login;