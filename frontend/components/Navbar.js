import React, { useState, useContext, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isLoading } = useContext(AuthContext);
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    console.log('[Navbar] Auth state changed:', { 
      hasUser: !!user, 
      userData: user,
      isLoading 
    });
  }, [user, isLoading]);

  console.log('User data in Navbar:', user);

  // Get user's initial for avatar fallback
  const getUserInitial = () => {
    console.log('[Navbar] Getting user initial for:', user);
    if (!user?.username) {
      console.log('[Navbar] No username found');
      return '';
    }
    const initial = user.username.charAt(0).toUpperCase();
    console.log('[Navbar] Generated initial:', initial);
    return initial;
  };

  // Handle logout
  const handleLogout = async () => {
    console.log('[Navbar] Handling logout');
    await logout();
    router.push('/login');
  };

  // Render loading state
  if (isLoading) {
    console.log('[Navbar] Rendering loading state');
    return (
      <header className="bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-lg">
        <div className="container mx-auto flex items-center justify-center h-24 px-8">
          {/* Mostra solo il logo durante il caricamento */}
          <div className="absolute left-8">
            <Link href="/" className="flex items-center">
              <img 
                src="/images/logo.png" 
                alt="NumisRoma" 
                className="h-32 w-32 object-contain drop-shadow-lg" 
              />
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-lg">
      <div className="container mx-auto flex items-center justify-center h-24 px-8 relative">
        {/* Logo Section - Centered */}
        <div className="absolute left-8 flex items-center">
          <Link href="/" className="flex items-center hover:opacity-90 transition-all duration-300 transform hover:scale-105">
            <img 
              src="/images/logo.png" 
              alt="NumisRoma" 
              className="h-42 w-42 object-contain drop-shadow-lg" 
            />
          </Link>
        </div>

        {/* Navigation Links - Centered */}
        <nav className="flex justify-center space-x-10">
          <Link href="/browse" className="text-white hover:text-yellow-100 font-medium transition-colors duration-200 text-lg">Browse</Link>
          <Link href="/search" className="text-white hover:text-yellow-100 font-medium transition-colors duration-200 text-lg">Search</Link>
          <Link href="/community" className="text-white hover:text-yellow-100 font-medium transition-colors duration-200 text-lg">Community</Link>
          <Link href="/resources" className="text-white hover:text-yellow-100 font-medium transition-colors duration-200 text-lg">Resources</Link>
          <Link href="/symbols" className="text-white hover:text-yellow-100 font-medium transition-colors duration-200 text-lg">Symbols</Link>
          <Link href="/contact" className="text-white hover:text-yellow-100 font-medium transition-colors duration-200 text-lg">Contact</Link>
        </nav>

        {/* Auth Section - Right Aligned */}
        <div className="absolute right-8 flex items-center space-x-4">
          {user ? (
            <div className="relative">
              <div 
                className="flex items-center focus:outline-none group cursor-pointer"
                onMouseEnter={() => setIsDropdownOpen(true)}
              >
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover border-2 border-white transition-all duration-300 ease-in-out transform group-hover:scale-110 group-hover:border-yellow-300 group-hover:shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center font-semibold text-2xl transition-all duration-300 ease-in-out transform group-hover:scale-110 group-hover:bg-gray-100 group-hover:shadow-lg">
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
            <>
              <Link
                href="/login"
                className="px-6 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors duration-200 font-medium text-lg"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-6 py-2.5 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors duration-200 font-medium text-lg"
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