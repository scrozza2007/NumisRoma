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

const DeleteAccount = () => {
  const { user, isLoading, deleteAccount } = useContext(AuthContext);
  const router = useRouter();
  
  const [password, setPassword] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const reasonOptions = [
    { value: 'no-longer-use', label: 'I no longer use this account' },
    { value: 'not-useful', label: 'I don\'t find the platform useful' },
    { value: 'too-expensive', label: 'The service is too expensive' },
    { value: 'found-alternative', label: 'I found a better alternative' },
    { value: 'other', label: 'Other reason' }
  ];

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!password) {
      setError('Password is required to delete your account.');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      console.log('Calling deleteAccount API...');
      const result = await deleteAccount(password, reason);
      console.log('API response:', result);
      
      if (result.success) {
        // Prima eliminiamo i dati dell'utente localmente
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Poi facciamo il redirect prima che il Navbar possa intercettare
        window.location.href = '/register';
        return; // Importante: interrompere l'esecuzione qui
      } else {
        setError(result.error || 'Failed to delete account. Please try again.');
      }
    } catch (error) {
      console.error('Error during account deletion:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/settings');
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
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto p-8 transform hover:scale-[1.01] transition-all duration-300">
        <form onSubmit={handleSubmit}>
          {/* Logo */}
          <div className="text-center mb-6">
            <img src="/images/logo.png" alt="NumisRoma" className="h-12 mx-auto mb-2" />
          </div>
          
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Delete Account</h2>
            <p className="text-gray-600">Please confirm your decision</p>
          </div>
          
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-200 text-red-700 rounded-xl animate-fade-in flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>This action cannot be undone. This will permanently delete your account and all your data.</span>
          </div>
          
          <p className="text-gray-700 mb-6">
            Please enter your password to confirm that you want to delete your account.
          </p>
          
          {/* Reason for deletion */}
          <div className="mb-6">
            <label htmlFor="reason" className="block text-gray-700 font-medium mb-2">
              Why are you deleting your account? <span className="text-gray-500 text-sm">(Optional)</span>
            </label>
            <CustomDropdown 
              value={reason}
              onChange={(value) => setReason(value)}
              options={reasonOptions}
              placeholder="Select a reason"
            />
            <p className="mt-2 text-xs text-gray-500">Your feedback helps us improve our service.</p>
          </div>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 font-medium mb-2">Password</label>
            <div className="relative">
              <input 
                type="password" 
                id="password" 
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`w-full px-4 py-3 pl-12 border ${error ? 'border-red-300' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-500' : 'focus:ring-yellow-500'} focus:border-transparent transition-all duration-200`}
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            )}
          </div>
          
          {/* Checkbox confirmation */}
          <div className="mb-8">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                className="h-5 w-5 text-yellow-600 rounded border-gray-300 focus:ring-yellow-500"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                required
              />
              <span className="text-gray-800">
                Yes, I want to delete my NumisRoma account. This action cannot be undone.
              </span>
            </label>
          </div>
          
          <div className="flex items-center justify-between space-x-4">
            <button 
              type="button"
              onClick={handleCancel}
              className="w-full bg-gray-200 text-gray-800 py-3.5 rounded-xl hover:bg-gray-300 transition-all duration-200 transform hover:scale-[1.02] font-medium"
            >
              Cancel
            </button>
            
            <button 
              type="submit"
              disabled={!password || !isConfirmed || isSubmitting}
              className={`w-full py-3.5 rounded-xl transition-all duration-200 transform hover:scale-[1.02] font-medium flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed
                ${!password || !isConfirmed || isSubmitting ? 'bg-red-300 text-white' : 'bg-red-600 text-white hover:bg-red-700'}`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Delete My Account</span>
              )}
            </button>
          </div>
          
          <div className="mt-6 text-center text-xs text-gray-500">
            If you need help, please contact <a href="mailto:support@numisroma.com" className="text-yellow-600 hover:text-yellow-700">support@numisroma.com</a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeleteAccount; 