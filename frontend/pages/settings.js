import React, { useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';

const Settings = () => {
  const { user, isLoading } = useContext(AuthContext);
  const router = useRouter();
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [notifications, setNotifications] = useState({
    email: true,
    app: true,
    marketing: false
  });
  const [activeTab, setActiveTab] = useState('account');
  const [successMessage, setSuccessMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form values from user data or localStorage
  useEffect(() => {
    if (user) {
      // Try to get saved form data from localStorage first
      const savedFormData = localStorage.getItem('settingsFormData');
      
      if (savedFormData) {
        const parsedData = JSON.parse(savedFormData);
        setName(parsedData.name || user.fullName || 'John Doe');
        setEmail(parsedData.email || user.email || 'john.doe@example.com');
        setLocation(parsedData.location || user.location || 'Rome, Italy');
        
        if (parsedData.notifications) {
          setNotifications(parsedData.notifications);
        }
      } else {
        // Initialize from user data
        setName(user.fullName || 'John Doe');
        setEmail(user.email || 'john.doe@example.com');
        setLocation(user.location || 'Rome, Italy');
      }
    }
  }, [user]);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const handleNotificationChange = (type) => {
    const updatedNotifications = {
      ...notifications,
      [type]: !notifications[type]
    };
    
    setNotifications(updatedNotifications);
    
    // Save to localStorage
    const formData = JSON.parse(localStorage.getItem('settingsFormData') || '{}');
    localStorage.setItem('settingsFormData', JSON.stringify({
      ...formData,
      notifications: updatedNotifications
    }));
  };

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  const handleSaveChanges = () => {
    setIsSubmitting(true);
    
    // Validate passwords if trying to change them
    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        alert('Please enter your current password');
        setIsSubmitting(false);
        return;
      }
      
      if (newPassword !== confirmPassword) {
        alert("New passwords don't match");
        setIsSubmitting(false);
        return;
      }
    }
    
    // Simulate API call with a delay
    setTimeout(() => {
      // Save form data to localStorage to persist between page reloads
      const formData = {
        name,
        email,
        location,
        // Don't save passwords to localStorage for security
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem('settingsFormData', JSON.stringify(formData));
      
      // In a real application, you would update the AuthContext user here
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setIsSubmitting(false);
      showSuccessMessage('Settings saved successfully!');
    }, 800);
  };
  
  const handleSaveNotifications = () => {
    setIsSubmitting(true);
    
    // Simulate API call with a delay
    setTimeout(() => {
      // Save notification preferences to localStorage
      const formData = JSON.parse(localStorage.getItem('settingsFormData') || '{}');
      localStorage.setItem('settingsFormData', JSON.stringify({
        ...formData,
        notifications,
        lastUpdated: new Date().toISOString()
      }));
      
      setIsSubmitting(false);
      showSuccessMessage('Notification preferences saved!');
    }, 800);
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
    <div className="container mx-auto px-4 py-8 text-gray-800">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      {successMessage && (
        <div className="mb-6 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md animate-fade-in-down">
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
            </svg>
            <p>{successMessage}</p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar navigation */}
        <div className="md:col-span-1 bg-white rounded-lg shadow-md p-5">
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('account')}
              className={`w-full text-left px-4 py-3 rounded-md flex items-center space-x-3 
                ${activeTab === 'account' 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'text-gray-700 hover:bg-gray-100'}`}
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
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'text-gray-700 hover:bg-gray-100'}`}
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
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Privacy & Security</span>
            </button>
          </nav>
        </div>
        
        {/* Main content area */}
        <div className="md:col-span-3 bg-white rounded-lg shadow-md p-6">
          {activeTab === 'account' && (
            <div>
              <h2 className="text-2xl font-semibold mb-6">Account Settings</h2>
              
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">
                      Name
                    </label>
                    <input 
                      type="text" 
                      id="name" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">
                      Username
                    </label>
                    <input 
                      type="text" 
                      id="username" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-50"
                      defaultValue={user.username || 'johndoe'}
                      disabled
                    />
                    <p className="mt-1 text-xs text-gray-500">Username cannot be changed.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                      Email
                    </label>
                    <input 
                      type="email" 
                      id="email" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="location">
                      Location
                    </label>
                    <input 
                      type="text" 
                      id="location" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 my-8"></div>
              
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">Change Password</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="current-password">
                      Current Password
                    </label>
                    <input 
                      type="password" 
                      id="current-password" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="new-password">
                        New Password
                      </label>
                      <input 
                        type="password" 
                        id="new-password" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirm-password">
                        Confirm Password
                      </label>
                      <input 
                        type="password" 
                        id="confirm-password" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button 
                  onClick={handleSaveChanges}
                  disabled={isSubmitting}
                  className={`px-6 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2
                    ${isSubmitting 
                      ? 'bg-gray-400 text-white cursor-not-allowed' 
                      : 'bg-yellow-600 text-white hover:bg-yellow-700'}`}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-2xl font-semibold mb-6">Notification Preferences</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium">Email Notifications</h3>
                    <p className="text-sm text-gray-500">Receive email notifications about account activity</p>
                  </div>
                  <button 
                    onClick={() => handleNotificationChange('email')}
                    className={`relative inline-flex items-center h-6 rounded-full w-12 transition-colors ease-in-out duration-200 focus:outline-none 
                      ${notifications.email ? 'bg-yellow-500' : 'bg-gray-300'}`}
                  >
                    <span 
                      className={`inline-block w-4 h-4 transform transition ease-in-out duration-200 rounded-full 
                        ${notifications.email ? 'translate-x-7 bg-white' : 'translate-x-1 bg-white'}`}
                    />
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium">App Notifications</h3>
                    <p className="text-sm text-gray-500">Receive in-app notifications</p>
                  </div>
                  <button 
                    onClick={() => handleNotificationChange('app')}
                    className={`relative inline-flex items-center h-6 rounded-full w-12 transition-colors ease-in-out duration-200 focus:outline-none 
                      ${notifications.app ? 'bg-yellow-500' : 'bg-gray-300'}`}
                  >
                    <span 
                      className={`inline-block w-4 h-4 transform transition ease-in-out duration-200 rounded-full 
                        ${notifications.app ? 'translate-x-7 bg-white' : 'translate-x-1 bg-white'}`}
                    />
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium">Marketing Emails</h3>
                    <p className="text-sm text-gray-500">Receive updates about new features and promotions</p>
                  </div>
                  <button 
                    onClick={() => handleNotificationChange('marketing')}
                    className={`relative inline-flex items-center h-6 rounded-full w-12 transition-colors ease-in-out duration-200 focus:outline-none 
                      ${notifications.marketing ? 'bg-yellow-500' : 'bg-gray-300'}`}
                  >
                    <span 
                      className={`inline-block w-4 h-4 transform transition ease-in-out duration-200 rounded-full 
                        ${notifications.marketing ? 'translate-x-7 bg-white' : 'translate-x-1 bg-white'}`}
                    />
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end mt-8">
                <button 
                  onClick={handleSaveNotifications}
                  disabled={isSubmitting}
                  className={`px-6 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2
                    ${isSubmitting 
                      ? 'bg-gray-400 text-white cursor-not-allowed' 
                      : 'bg-yellow-600 text-white hover:bg-yellow-700'}`}
                >
                  {isSubmitting ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'privacy' && (
            <div>
              <h2 className="text-2xl font-semibold mb-6">Privacy & Security</h2>
              
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Add an extra layer of security to your account by requiring a verification code in addition to your password.
                </p>
                <button 
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                >
                  Enable Two-Factor Authentication
                </button>
              </div>
              
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">Session Management</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Manage your active sessions and sign out from other devices.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 divide-y divide-gray-200">
                  <div className="flex justify-between items-center pb-4">
                    <div>
                      <p className="font-medium text-gray-900">Current Session</p>
                      <p className="text-sm text-gray-500">Windows • Chrome • Rome, Italy</p>
                      <p className="text-xs text-gray-400 mt-1">Last access: Today, 14:32</p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Active Now
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-4">
                    <div>
                      <p className="font-medium text-gray-900">Mobile Session</p>
                      <p className="text-sm text-gray-500">iOS • Safari • Last active: 2 days ago</p>
                      <p className="text-xs text-gray-400 mt-1">Rome, Italy • 192.168.1.1</p>
                    </div>
                    <button className="text-red-600 hover:text-red-700 text-sm font-medium focus:outline-none">
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 mt-8 border-t border-gray-200">
                <h3 className="text-lg font-medium mb-4">Account Actions</h3>
                <div className="space-y-4">
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium self-start flex items-center focus:outline-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Your Data
                  </button>
                  <button className="text-red-600 hover:text-red-700 text-sm font-medium self-start flex items-center focus:outline-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Account
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