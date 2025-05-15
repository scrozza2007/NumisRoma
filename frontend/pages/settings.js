import React, { useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

const Settings = () => {
  const { user, isLoading } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const router = useRouter();
  const [notifications, setNotifications] = useState({
    email: true,
    app: true,
    marketing: false
  });
  const [activeTab, setActiveTab] = useState('appearance');

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const handleNotificationChange = (type) => {
    setNotifications(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // If still loading or user not authenticated, show loading state
  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className={`container mx-auto px-4 py-8 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar navigation */}
        <div className={`md:col-span-1 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-5`}>
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('appearance')}
              className={`w-full text-left px-4 py-3 rounded-md flex items-center space-x-3 
                ${activeTab === 'appearance' 
                  ? (isDarkMode ? 'bg-gray-700 text-white' : 'bg-yellow-100 text-yellow-800') 
                  : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <span>Appearance</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('account')}
              className={`w-full text-left px-4 py-3 rounded-md flex items-center space-x-3 
                ${activeTab === 'account' 
                  ? (isDarkMode ? 'bg-gray-700 text-white' : 'bg-yellow-100 text-yellow-800') 
                  : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Account</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('notifications')}
              className={`w-full text-left px-4 py-3 rounded-md flex items-center space-x-3 
                ${activeTab === 'notifications' 
                  ? (isDarkMode ? 'bg-gray-700 text-white' : 'bg-yellow-100 text-yellow-800') 
                  : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span>Notifications</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('privacy')}
              className={`w-full text-left px-4 py-3 rounded-md flex items-center space-x-3 
                ${activeTab === 'privacy' 
                  ? (isDarkMode ? 'bg-gray-700 text-white' : 'bg-yellow-100 text-yellow-800') 
                  : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Privacy & Security</span>
            </button>
          </nav>
        </div>
        
        {/* Main content area */}
        <div className={`md:col-span-3 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6`}>
          {activeTab === 'appearance' && (
            <div>
              <h2 className="text-2xl font-semibold mb-6">Appearance</h2>
              
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">Theme</h3>
                <div className="flex items-center">
                  <button 
                    onClick={toggleTheme}
                    className={`relative inline-flex items-center h-8 rounded-full w-16 transition-colors ease-in-out duration-200 focus:outline-none 
                      ${isDarkMode ? 'bg-yellow-500' : 'bg-gray-300'}`}
                  >
                    <span 
                      className={`inline-block w-6 h-6 transform transition ease-in-out duration-200 rounded-full 
                        ${isDarkMode ? 'translate-x-9 bg-gray-800' : 'translate-x-1 bg-white'}`}
                    />
                  </button>
                  <span className="ml-3">
                    {isDarkMode ? 'Dark mode' : 'Light mode'}
                  </span>
                </div>
                <p className="text-sm mt-2 text-gray-500 dark:text-gray-400">
                  Choose between light and dark themes for the application interface.
                </p>
              </div>
              
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">Font Size</h3>
                <div className="flex items-center space-x-4">
                  <button className={`px-4 py-2 rounded-md ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}>Small</button>
                  <button className={`px-4 py-2 rounded-md ${isDarkMode ? 'bg-yellow-500 text-white' : 'bg-yellow-500 text-white'}`}>Medium</button>
                  <button className={`px-4 py-2 rounded-md ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}>Large</button>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Interface Density</h3>
                <div className="flex items-center space-x-4">
                  <button className={`px-4 py-2 rounded-md ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}>Compact</button>
                  <button className={`px-4 py-2 rounded-md ${isDarkMode ? 'bg-yellow-500 text-white' : 'bg-yellow-500 text-white'}`}>Normal</button>
                  <button className={`px-4 py-2 rounded-md ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}>Comfortable</button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'account' && (
            <div>
              <h2 className="text-2xl font-semibold mb-6">Account Settings</h2>
              
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm">Username</label>
                    <input 
                      type="text" 
                      value={user.username} 
                      className={`w-full px-3 py-2 border rounded-md
                        ${isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-yellow-500 focus:ring-yellow-500' 
                          : 'bg-white border-gray-300 focus:border-yellow-500 focus:ring-yellow-500'}`} 
                      readOnly
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm">Email</label>
                    <input 
                      type="email" 
                      value={user.email || 'email@example.com'} 
                      className={`w-full px-3 py-2 border rounded-md 
                        ${isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-yellow-500 focus:ring-yellow-500' 
                          : 'bg-white border-gray-300 focus:border-yellow-500 focus:ring-yellow-500'}`} 
                      readOnly
                    />
                  </div>
                </div>
              </div>
              
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">Change Password</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm">Current Password</label>
                    <input 
                      type="password" 
                      className={`w-full px-3 py-2 border rounded-md 
                        ${isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-yellow-500 focus:ring-yellow-500' 
                          : 'bg-white border-gray-300 focus:border-yellow-500 focus:ring-yellow-500'}`} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm">New Password</label>
                    <input 
                      type="password" 
                      className={`w-full px-3 py-2 border rounded-md 
                        ${isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-yellow-500 focus:ring-yellow-500' 
                          : 'bg-white border-gray-300 focus:border-yellow-500 focus:ring-yellow-500'}`} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm">Confirm New Password</label>
                    <input 
                      type="password" 
                      className={`w-full px-3 py-2 border rounded-md 
                        ${isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-yellow-500 focus:ring-yellow-500' 
                          : 'bg-white border-gray-300 focus:border-yellow-500 focus:ring-yellow-500'}`} 
                    />
                  </div>
                  
                  <button 
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium px-4 py-2 rounded-md transition-colors duration-200"
                  >
                    Update Password
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-2xl font-semibold mb-6">Notification Settings</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Email Notifications</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications via email</p>
                  </div>
                  <button 
                    onClick={() => handleNotificationChange('email')}
                    className={`relative inline-flex items-center h-6 rounded-full w-12 transition-colors ease-in-out duration-200 focus:outline-none 
                      ${notifications.email ? 'bg-yellow-500' : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}
                  >
                    <span 
                      className={`inline-block w-4 h-4 transform transition ease-in-out duration-200 rounded-full 
                        ${notifications.email ? 'translate-x-7 bg-white' : 'translate-x-1 bg-white'}`}
                    />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">App Notifications</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Receive in-app notifications</p>
                  </div>
                  <button 
                    onClick={() => handleNotificationChange('app')}
                    className={`relative inline-flex items-center h-6 rounded-full w-12 transition-colors ease-in-out duration-200 focus:outline-none 
                      ${notifications.app ? 'bg-yellow-500' : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}
                  >
                    <span 
                      className={`inline-block w-4 h-4 transform transition ease-in-out duration-200 rounded-full 
                        ${notifications.app ? 'translate-x-7 bg-white' : 'translate-x-1 bg-white'}`}
                    />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Marketing Emails</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Receive promotional content</p>
                  </div>
                  <button 
                    onClick={() => handleNotificationChange('marketing')}
                    className={`relative inline-flex items-center h-6 rounded-full w-12 transition-colors ease-in-out duration-200 focus:outline-none 
                      ${notifications.marketing ? 'bg-yellow-500' : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}
                  >
                    <span 
                      className={`inline-block w-4 h-4 transform transition ease-in-out duration-200 rounded-full 
                        ${notifications.marketing ? 'translate-x-7 bg-white' : 'translate-x-1 bg-white'}`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'privacy' && (
            <div>
              <h2 className="text-2xl font-semibold mb-6">Privacy & Security</h2>
              
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">Two-Factor Authentication</h3>
                <p className="mb-4 text-gray-500 dark:text-gray-400">
                  Add an extra layer of security to your account by enabling two-factor authentication.
                </p>
                <button className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium px-4 py-2 rounded-md transition-colors duration-200">
                  Enable 2FA
                </button>
              </div>
              
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">Session Management</h3>
                <p className="mb-4 text-gray-500 dark:text-gray-400">
                  Review and manage your active sessions.
                </p>
                <div className={`p-4 rounded-md mb-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Current Session</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Windows · Chrome · Last active now</p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Data & Privacy</h3>
                <div className="space-y-4">
                  <button className={`block w-full text-left px-4 py-3 rounded-md ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors duration-200`}>
                    Download my data
                  </button>
                  <button className={`block w-full text-left px-4 py-3 rounded-md ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors duration-200`}>
                    Manage cookies
                  </button>
                  <button className="block w-full text-left px-4 py-3 rounded-md bg-red-100 text-red-800 hover:bg-red-200 transition-colors duration-200">
                    Delete account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;