import React, { useState, useContext, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const Navbar = () => {
  const { user, logout, isLoading } = useContext(AuthContext);
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    console.log('[Navbar] Auth state changed:', { 
      hasUser: !!user, 
      userData: user,
      isLoading 
    });
  }, [user, isLoading]);

  // Reset dropdown state when user changes
  useEffect(() => {
    setIsDropdownOpen(false);
  }, [user]);

  // Fetch unread messages count
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      // Aggiorna ogni 30 secondi
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/messages/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Errore nel recupero messaggi non letti:', error);
    }
  };

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

  // Funzione helper per navigazione sicura
  const safeNavigate = (href) => {
    if (router.asPath !== href) {
      router.push(href);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <header className="bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-xl backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-center h-32">
          <div className="absolute left-0">
            <Link href="/" className="flex items-center">
              <Image 
                src="/images/logo.png" 
                alt="NumisRoma" 
                width={250}
                height={250}
                priority
                sizes="250px"
                className="drop-shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:brightness-110" 
              />
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-xl backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-center h-32 relative">
        {/* Logo Section */}
        <div className="absolute left-0 flex items-center">
          <Link href="/" className="flex items-center group">
            <Image 
              src="/images/logo.png" 
              alt="NumisRoma" 
              width={250}
              height={250}
              priority
              sizes="250px"
              className="drop-shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:brightness-110" 
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
            <>
              {/* Icona Messaggi */}
              <button
                onClick={() => {
                  setUnreadCount(0);
                  safeNavigate('/messages');
                }}
                className="p-2 text-white hover:text-yellow-100 transition-colors duration-300 relative group"
                title="Messaggi"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {/* Badge per messaggi non letti */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <div 
                className="relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <div className="flex items-center focus:outline-none group cursor-pointer">
                  {user.profileImage ? (
                    <Image
                      src={user.profileImage}
                      alt="Profile"
                      width={56}
                      height={56}
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
                    className={`absolute right-0 mt-2 w-64 bg-white border-gray-100 rounded-xl shadow-2xl py-2 z-50 border transform transition-all duration-300 ease-in-out`}
                  >
                    <Link
                      href={`/profile/${user._id}`}
                      className={`flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 group`}
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <span className="group-hover:translate-x-1 transition-transform duration-200">Profile</span>
                    </Link>
                    <Link
                      href="/messages"
                      className={`flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 group`}
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setUnreadCount(0);
                        safeNavigate('/messages');
                      }}
                    >
                      <svg className="w-4 h-4 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="group-hover:translate-x-1 transition-transform duration-200 flex items-center">
                        Messaggi
                        {unreadCount > 0 && (
                          <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </span>
                    </Link>
                    <Link
                      href="/settings"
                      className={`flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 group`}
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <span className="group-hover:translate-x-1 transition-transform duration-200">Settings</span>
                    </Link>
                    <div className={`border-t border-gray-100 my-1`}></div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 group"
                    >
                      <span className="group-hover:translate-x-1 transition-transform duration-200">Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`px-6 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-300 font-medium text-lg hover:shadow-lg hover:scale-105`}
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className={`px-6 py-2.5 bg-white text-black rounded-lg hover:bg-gray-100 transition-all duration-300 font-medium text-lg hover:shadow-lg hover:scale-105`}
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