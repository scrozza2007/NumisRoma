import React, { useState, useContext, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isLoading } = useContext(AuthContext);
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    console.log('[Navbar] Auth state changed:', { 
      hasUser: !!user, 
      userData: user,
      isLoading 
    });
  }, [user, isLoading]);

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

  // Handle mouse enter
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsDropdownOpen(true);
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 300); // 300ms delay before closing
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <header className="bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-xl backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-center h-24">
          <div className="absolute left-0">
            <Link href="/" className="flex items-center">
              <img 
                src="/images/logo.png" 
                alt="NumisRoma" 
                className="h-32 w-32 object-contain drop-shadow-xl hover:scale-105 transition-transform duration-300" 
              />
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-xl backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-center h-24 relative">
        {/* Logo Section */}
        <div className="absolute left-0 flex items-center">
          <Link href="/" className="flex items-center group">
            <img 
              src="/images/logo.png" 
              alt="NumisRoma" 
              className="h-42 w-42 object-contain drop-shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:brightness-110" 
            />
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex justify-center space-x-12">
          {['Browse', 'Search', 'Community', 'Resources', 'Symbols', 'Contact'].map((item) => (
            <Link 
              key={item}
              href={`/${item.toLowerCase()}`}
              className="text-white hover:text-yellow-100 font-medium transition-all duration-300 text-lg relative group"
            >
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
            </Link>
          ))}
        </nav>

        {/* Auth Section */}
        <div className="absolute right-0 flex items-center space-x-4">
          {user ? (
            <div 
              className="relative"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex items-center focus:outline-none group cursor-pointer">
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt="Profile"
                    className="w-14 h-14 rounded-full object-cover border-2 border-white transition-all duration-300 ease-in-out transform group-hover:scale-110 group-hover:border-yellow-300 group-hover:shadow-xl"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center font-semibold text-2xl transition-all duration-300 ease-in-out transform group-hover:scale-110 group-hover:bg-gray-100 group-hover:shadow-xl">
                    {getUserInitial()}
                  </div>
                )}
              </div>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl py-2 z-50 border border-gray-100 transform transition-all duration-300 ease-in-out"
                >
                  <Link
                    href="/profile"
                    className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 group"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-200">Profilo</span>
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 group"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-200">Impostazioni</span>
                  </Link>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-200">Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="px-6 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-300 font-medium text-lg hover:shadow-lg hover:scale-105"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-6 py-2.5 bg-white text-black rounded-lg hover:bg-gray-100 transition-all duration-300 font-medium text-lg hover:shadow-lg hover:scale-105"
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