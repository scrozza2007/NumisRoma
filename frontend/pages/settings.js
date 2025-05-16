import React, { useContext, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';

const CustomDropdown = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (value) => {
    onChange(value);
    setIsOpen(false);
  };

  const selectedOption = options.find(option => option.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 bg-white text-left"
      >
        {selectedOption ? selectedOption.label : placeholder}
      </button>
      
      <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
      </svg>
      <svg className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-auto">
          {options.map((option, index) => (
            <div
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`px-4 py-2 cursor-pointer hover:bg-yellow-50 transition-colors duration-150 ${
                option.value === value ? 'bg-yellow-100 text-yellow-800' : 'text-gray-800'
              } ${index === 0 ? 'rounded-t-xl' : ''} ${
                index === options.length - 1 ? 'rounded-b-xl' : ''
              }`}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Settings = () => {
  const { user, isLoading, changePassword, deleteAccount, logout } = useContext(AuthContext);
  const router = useRouter();
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Validation states
  const [errors, setErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  
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

  // On mount, restore activeTab from localStorage (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('settingsActiveTab');
      if (savedTab) setActiveTab(savedTab);
    }
  }, []);

  // Save activeTab to localStorage when it changes (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('settingsActiveTab', activeTab);
    }
  }, [activeTab]);

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

  // Password validation
  const validatePassword = (password) => {
    const errors = {};
    
    if (password.length < 8) {
      errors.length = 'Password must be at least 8 characters';
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.uppercase = 'Password must contain at least one uppercase letter';
    }
    
    if (!/[a-z]/.test(password)) {
      errors.lowercase = 'Password must contain at least one lowercase letter';
    }
    
    if (!/[0-9]/.test(password)) {
      errors.number = 'Password must contain at least one number';
    }
    
    if (!/[!@#$%^&*]/.test(password)) {
      errors.special = 'Password must contain at least one special character (!@#$%^&*)';
    }
    
    return errors;
  };

  const handleSaveChanges = () => {
    setIsSubmitting(true);
    
    // Validate passwords if trying to change them
    if (newPassword || confirmPassword || currentPassword) {
      // Reset previous errors
      setPasswordErrors({});
      let hasErrors = false;
      const newErrors = {};
      
      if (!currentPassword) {
        newErrors.currentPassword = 'Please enter your current password';
        hasErrors = true;
      }
      
      if (newPassword) {
        const validationErrors = validatePassword(newPassword);
        if (Object.keys(validationErrors).length > 0) {
          newErrors.validation = validationErrors;
          hasErrors = true;
        }
        
        // Check that the new password is different from the current password
        if (newPassword === currentPassword) {
          newErrors.newPassword = 'New password must be different from current password';
          hasErrors = true;
        }
      } else if (currentPassword) {
        newErrors.newPassword = 'Please enter a new password';
        hasErrors = true;
      }
      
      if (newPassword !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
        hasErrors = true;
      }
      
      if (hasErrors) {
        setPasswordErrors(newErrors);
        setIsSubmitting(false);
        return;
      }
      
      // If no errors, proceed with password change
      changePassword(currentPassword, newPassword, confirmPassword)
        .then(result => {
          if (result.success) {
            // Clear password fields
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            showSuccessMessage('Password changed successfully!');
          } else {
            // Handle API errors
            if (result.details) {
              const apiErrors = {};
              result.details.forEach(detail => {
                apiErrors[detail.field] = detail.message;
              });
              setPasswordErrors(apiErrors);
            } else if (result.error === 'Current password is incorrect') {
              setPasswordErrors({ currentPassword: 'Current password is incorrect' });
            } else {
              setPasswordErrors({ general: result.error || 'Error changing password' });
            }
          }
          setIsSubmitting(false);
        });
      return;
    }
    
    // Handle other profile changes (name, email, location)
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
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-5 inline-block w-full">
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
        </div>
        
        {/* Main content area */}
        <div className="md:col-span-3 bg-white rounded-lg shadow-md p-6">
          {activeTab === 'account' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Account Settings</h2>
              
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">Personal Information</h3>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="name">
                        Name
                      </label>
                      <div className="relative">
                        <input 
                          type="text" 
                          id="name" 
                          className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all duration-200"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your full name"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="username">
                        Username
                      </label>
                      <div className="relative">
                        <input 
                          type="text" 
                          id="username" 
                          className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-50 cursor-not-allowed"
                          defaultValue={user.username || 'johndoe'}
                          disabled
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">Username cannot be changed.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="email">
                        Email
                      </label>
                      <div className="relative">
                        <input 
                          type="email" 
                          id="email" 
                          className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all duration-200"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your.email@example.com"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="location">
                        Location
                      </label>
                      <div className="relative">
                        <input 
                          type="text" 
                          id="location" 
                          className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all duration-200"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="City, Country"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                    <button 
                      onClick={handleSaveChanges}
                      disabled={isSubmitting}
                      className={`px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-[1.02] font-medium flex items-center justify-center
                        ${isSubmitting 
                          ? 'bg-gray-400 text-white cursor-not-allowed' 
                          : 'bg-yellow-600 text-white hover:bg-yellow-700 shadow-sm hover:shadow'}`}
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 my-8"></div>
              
              <div className="mb-8">
                <h3 className="text-2xl font-semibold mb-6">Change Password</h3>
                
                {passwordErrors.general && (
                  <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-sm animate-fade-in flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>{passwordErrors.general}</p>
                  </div>
                )}
                
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="current-password">
                        Current Password
                      </label>
                      <div className="relative">
                        <input 
                          type="password" 
                          id="current-password" 
                          className={`w-full px-4 py-3 pl-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all duration-200
                            ${passwordErrors.currentPassword ? 'border-red-500' : 'border-gray-300'}`}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter your current password"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      {passwordErrors.currentPassword && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {passwordErrors.currentPassword}
                        </p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="new-password">
                          New Password
                        </label>
                        <div className="relative">
                          <input 
                            type="password" 
                            id="new-password" 
                            className={`w-full px-4 py-3 pl-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all duration-200
                              ${passwordErrors.newPassword || (passwordErrors.validation && Object.keys(passwordErrors.validation).length > 0) 
                                ? 'border-red-500' : 'border-gray-300'}`}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Create new password"
                          />
                          <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </div>
                        {passwordErrors.newPassword && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {passwordErrors.newPassword}
                          </p>
                        )}
                        
                        {/* Password requirements */}
                        {newPassword && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="text-sm font-medium text-gray-700 mb-2">Password requirements:</p>
                            <div className="space-y-2">
                              <p className={`text-xs flex items-center ${passwordErrors.validation?.length ? 'text-red-600' : 'text-green-600'}`}>
                                <span className="inline-block w-4 h-4 mr-2 rounded-full flex items-center justify-center bg-opacity-20 
                                  ${passwordErrors.validation?.length ? 'bg-red-200' : 'bg-green-200'}">
                                  {passwordErrors.validation?.length ? 
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg> : 
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                  }
                                </span>
                                At least 8 characters
                              </p>
                              <p className={`text-xs flex items-center ${passwordErrors.validation?.uppercase ? 'text-red-600' : 'text-green-600'}`}>
                                <span className="inline-block w-4 h-4 mr-2 rounded-full flex items-center justify-center bg-opacity-20 
                                  ${passwordErrors.validation?.uppercase ? 'bg-red-200' : 'bg-green-200'}">
                                  {passwordErrors.validation?.uppercase ? 
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg> : 
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                  }
                                </span>
                                At least one uppercase letter
                              </p>
                              <p className={`text-xs flex items-center ${passwordErrors.validation?.lowercase ? 'text-red-600' : 'text-green-600'}`}>
                                <span className="inline-block w-4 h-4 mr-2 rounded-full flex items-center justify-center bg-opacity-20 
                                  ${passwordErrors.validation?.lowercase ? 'bg-red-200' : 'bg-green-200'}">
                                  {passwordErrors.validation?.lowercase ? 
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg> : 
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                  }
                                </span>
                                At least one lowercase letter
                              </p>
                              <p className={`text-xs flex items-center ${passwordErrors.validation?.number ? 'text-red-600' : 'text-green-600'}`}>
                                <span className="inline-block w-4 h-4 mr-2 rounded-full flex items-center justify-center bg-opacity-20 
                                  ${passwordErrors.validation?.number ? 'bg-red-200' : 'bg-green-200'}">
                                  {passwordErrors.validation?.number ? 
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg> : 
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                  }
                                </span>
                                At least one number
                              </p>
                              <p className={`text-xs flex items-center ${passwordErrors.validation?.special ? 'text-red-600' : 'text-green-600'}`}>
                                <span className="inline-block w-4 h-4 mr-2 rounded-full flex items-center justify-center bg-opacity-20 
                                  ${passwordErrors.validation?.special ? 'bg-red-200' : 'bg-green-200'}">
                                  {passwordErrors.validation?.special ? 
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg> : 
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                  }
                                </span>
                                At least one special character (!@#$%^&*)
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="confirm-password">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <input 
                            type="password" 
                            id="confirm-password" 
                            className={`w-full px-4 py-3 pl-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all duration-200
                              ${passwordErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm your new password"
                          />
                          <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        {passwordErrors.confirmPassword && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {passwordErrors.confirmPassword}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <button 
                        onClick={handleSaveChanges}
                        disabled={isSubmitting}
                        className={`w-full md:w-auto px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-[1.02] font-medium flex items-center justify-center
                          ${isSubmitting 
                            ? 'bg-gray-400 text-white cursor-not-allowed' 
                            : 'bg-yellow-600 text-white hover:bg-yellow-700 shadow-sm hover:shadow'}`}
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Updating Password...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span>Update Password</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              

              
              <div className="border-t border-gray-200 mt-10 pt-6">
                <div className="flex items-center mb-6">
                  <div className="bg-yellow-100 p-2 rounded-lg mr-4">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold">Account Actions</h3>
                </div>
                
                <div className="space-y-6">
                  <p className="text-gray-600">
                    Manage your account data and settings. These actions allow you to control your data and account status.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <div className="flex items-center mb-3">
                        <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <h4 className="font-medium text-blue-800">Download Your Data</h4>
                      </div>
                      <p className="text-sm text-blue-700 mb-4">
                        Get a copy of all your personal data that we store, including your profile, activities, and preferences.
                      </p>
                      <button 
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center"
                        onClick={() => {
                          // Handle download data logic here
                          console.log('Download data clicked');
                        }}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Your Data
                      </button>
                    </div>
                    
                    <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                      <div className="flex items-center mb-3">
                        <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <h4 className="font-medium text-red-800">Delete Account</h4>
                      </div>
                      <p className="text-sm text-red-700 mb-4">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <button 
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center"
                        onClick={() => router.push('/delete-account')}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-2xl font-semibold mb-6">Notification Preferences</h2>
              
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="space-y-6 mb-6">
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
                
                <div className="flex justify-end border-t border-gray-100 pt-6">
                  <button 
                    onClick={handleSaveNotifications}
                    disabled={isSubmitting}
                    className={`px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-[1.02] font-medium flex items-center justify-center
                      ${isSubmitting 
                        ? 'bg-gray-400 text-white cursor-not-allowed' 
                        : 'bg-yellow-600 text-white hover:bg-yellow-700 shadow-sm hover:shadow'}`}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Save Preferences</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'privacy' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Privacy & Security</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center mb-4">
                    <div className="bg-yellow-100 p-2 rounded-lg mr-4">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold">Two-Factor Authentication</h3>
                  </div>
                  
                  <p className="text-gray-600 mb-6">
                    Add an extra layer of security to your account by requiring a verification code in addition to your password.
                  </p>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
                    <div>
                      <p className="font-medium">Status</p>
                      <p className="text-sm text-red-600">Not enabled</p>
                    </div>
                    <button 
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transform hover:scale-[1.02]"
                    >
                      Enable 2FA
                    </button>
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    When enabled, you'll need to enter a code from your authentication app each time you log in.
                  </p>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center mb-4">
                    <div className="bg-blue-100 p-2 rounded-lg mr-4">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold">Login Notifications</h3>
                  </div>
                  
                  <p className="text-gray-600 mb-6">
                    Get alerted when someone logs into your account from a new device or location.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Email Alerts</p>
                        <p className="text-xs text-gray-500">Receive email notifications for new logins</p>
                      </div>
                      <button 
                        className="relative inline-flex items-center h-6 rounded-full w-12 transition-colors ease-in-out duration-200 focus:outline-none bg-yellow-500"
                      >
                        <span className="inline-block w-4 h-4 transform transition ease-in-out duration-200 rounded-full translate-x-7 bg-white" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Push Notifications</p>
                        <p className="text-xs text-gray-500">Get push notifications on your devices</p>
                      </div>
                      <button 
                        className="relative inline-flex items-center h-6 rounded-full w-12 transition-colors ease-in-out duration-200 focus:outline-none bg-gray-300"
                      >
                        <span className="inline-block w-4 h-4 transform transition ease-in-out duration-200 rounded-full translate-x-1 bg-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
                <div className="flex items-center mb-6">
                  <div className="bg-purple-100 p-2 rounded-lg mr-4">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold">Session Management</h3>
                </div>
                
                <p className="text-gray-600 mb-6">
                  Manage your active sessions and sign out from other devices. We'll notify you if we detect any unusual activity.
                </p>
                
                <div className="bg-gray-50 rounded-lg overflow-hidden divide-y divide-gray-200">
                  <div className="p-4 flex justify-between items-center">
                    <div className="flex items-start space-x-4">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Current Session</p>
                        <p className="text-sm text-gray-500">Windows • Chrome • Rome, Italy</p>
                        <p className="text-xs text-gray-400 mt-1">Last access: Today, 14:32</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                      Active Now
                    </span>
                  </div>
                  
                  <div className="p-4 flex justify-between items-center">
                    <div className="flex items-start space-x-4">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Mobile Session</p>
                        <p className="text-sm text-gray-500">iOS • Safari • Last active: 2 days ago</p>
                        <p className="text-xs text-gray-400 mt-1">Rome, Italy • 192.168.1.1</p>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                      Sign Out
                    </button>
                  </div>
                  
                  <div className="p-4 flex justify-between items-center">
                    <div className="flex items-start space-x-4">
                      <div className="bg-gray-100 p-2 rounded-lg">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Unknown Device</p>
                        <p className="text-sm text-gray-500">Windows • Firefox • Last active: 7 days ago</p>
                        <p className="text-xs text-gray-400 mt-1">Milan, Italy • 87.23.45.67</p>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                      Sign Out
                    </button>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out All Devices
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