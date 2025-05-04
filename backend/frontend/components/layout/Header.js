'use client';

import Link from 'next/link';
import { useState } from 'react';
import useAuthStore from '../../lib/store/authStore';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, logout } = useAuthStore();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-white dark:bg-slate-900 shadow-md">
      <div className="container mx-auto flex justify-between items-center py-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-2xl font-bold text-primary">NumisRoma</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-6 items-center">
          <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-primary">
            Catalogo
          </Link>
          
          {isAuthenticated ? (
            <>
              <Link href="/dashboard" className="text-gray-700 dark:text-gray-300 hover:text-primary">
                Le mie collezioni
              </Link>
              <button
                onClick={handleLogout}
                className="btn-outline"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-outline">
                Accedi
              </Link>
              <Link href="/register" className="btn-primary">
                Registrati
              </Link>
            </>
          )}
        </nav>

        {/* Mobile menu button */}
        <button 
          className="md:hidden rounded-md p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          onClick={toggleMenu}
          aria-label={isMenuOpen ? 'Chiudi menu' : 'Apri menu'}
          aria-expanded={isMenuOpen}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <nav className="md:hidden bg-white dark:bg-slate-900 px-4 pb-4 space-y-4">
          <Link 
            href="/" 
            className="block py-2 text-gray-700 dark:text-gray-300 hover:text-primary"
            onClick={() => setIsMenuOpen(false)}
          >
            Catalogo
          </Link>
          
          {isAuthenticated ? (
            <>
              <Link 
                href="/dashboard" 
                className="block py-2 text-gray-700 dark:text-gray-300 hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Le mie collezioni
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left block py-2 text-gray-700 dark:text-gray-300 hover:text-primary"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link 
                href="/login" 
                className="block py-2 text-gray-700 dark:text-gray-300 hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Accedi
              </Link>
              <Link 
                href="/register" 
                className="block py-2 text-gray-700 dark:text-gray-300 hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Registrati
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
} 