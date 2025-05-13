import React, { useState, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  console.log('User data in Navbar:', user);

  // Get user's initial for avatar fallback
  const getUserInitial = () => {
    if (!user?.username) return '';
    return user.username.charAt(0).toUpperCase();
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-lg">
      <div className="container mx-auto flex justify-between items-center py-4 px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 hover:opacity-90 transition-opacity duration-200">
          <img src="/images/logo.png" alt="NumisRoma" className="h-12" />
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex space-x-6">
          <Link href="/browse" className="text-white hover:text-yellow-100 font-medium transition-colors duration-200">Browse</Link>
          <Link href="/search" className="text-white hover:text-yellow-100 font-medium transition-colors duration-200">Search</Link>
          <Link href="/community" className="text-white hover:text-yellow-100 font-medium transition-colors duration-200">Community</Link>
          <Link href="/resources" className="text-white hover:text-yellow-100 font-medium transition-colors duration-200">Resources</Link>
          <Link href="/symbols" className="text-white hover:text-yellow-100 font-medium transition-colors duration-200">Symbols</Link>
          <Link href="/contact" className="text-white hover:text-yellow-100 font-medium transition-colors duration-200">Contact</Link>
        </nav>

        {/* Auth Section */}
        <div className="flex items-center space-x-4">
          {user ? (
            // User is logged in - Show profile dropdown
            <div className="relative">
              <div 
                className="flex items-center focus:outline-none group cursor-pointer"
                onMouseEnter={() => setIsDropdownOpen(true)}
              >
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt="Profile"
                    className="w-12 h-12 rounded-full object-cover border-2 border-white transition-all duration-300 ease-in-out transform group-hover:scale-110 group-hover:border-yellow-300 group-hover:shadow-lg"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-700 text-white flex items-center justify-center font-semibold text-xl transition-all duration-300 ease-in-out transform group-hover:scale-110 group-hover:bg-gray-600 group-hover:shadow-lg">
                    {getUserInitial()}
                  </div>
                )}
              </div>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl py-2 z-50 border border-gray-100"
                  onMouseEnter={() => setIsDropdownOpen(true)}
                  onMouseLeave={() => setIsDropdownOpen(false)}
                >
                  <Link
                    href="/profile"
                    className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    Profilo
                  </Link>
                  <Link
                    href="/settings"
                    className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    Impostazioni
                  </Link>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
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
                className="px-5 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors duration-200 font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors duration-200 font-medium"
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