import React, { useState, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Get user's initial for avatar fallback
  const getUserInitial = () => {
    if (!user?.username) return '?';
    return user.username.charAt(0).toUpperCase();
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="bg-yellow-500 shadow-md">
      <div className="container mx-auto flex justify-between items-center py-4 px-6">
        {/* Logo */}
        <Link href="/">
          <img src="/images/logo.png" alt="NumisRoma" className="h-10" />
        </Link>

        {/* Navigation Links */}
        <nav className="flex space-x-4">
          <Link href="/browse" className="text-white hover:underline">Browse</Link>
          <Link href="/search" className="text-white hover:underline">Search</Link>
          <Link href="/community" className="text-white hover:underline">Community</Link>
          <Link href="/resources" className="text-white hover:underline">Resources</Link>
          <Link href="/symbols" className="text-white hover:underline">Symbols</Link>
          <Link href="/contact" className="text-white hover:underline">Contact</Link>
        </nav>

        {/* Auth Section */}
        <div className="flex items-center space-x-4">
          {user ? (
            // User is logged in - Show profile dropdown
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center focus:outline-none"
              >
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt="Profile"
                    className="w-10 h-10 rounded-full object-cover border-2 border-white"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-semibold">
                    {getUserInitial()}
                  </div>
                )}
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 transform transition-all duration-200 ease-in-out">
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    Profilo
                  </Link>
                  <Link
                    href="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    Impostazioni
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            // User is not logged in - Show login/register buttons
            <>
              <Link
                href="/login"
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-white text-black rounded hover:bg-gray-200 transition-colors duration-200"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar; 