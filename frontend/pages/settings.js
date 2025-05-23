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
  const { user, isLoading, changePassword, deleteAccount, logout, changeUsername, updateProfile, checkUsernameAvailability, sessions, sessionsLoading, fetchSessions, terminateSession, terminateAllOtherSessions, setSessions } = useContext(AuthContext);
  const router = useRouter();
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Validation states
  const [errors, setErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [usernameErrors, setUsernameErrors] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0); // 0-4 scale
  
  const [notifications, setNotifications] = useState({
    email: true,
    app: true,
    marketing: false
  });
  const [activeTab, setActiveTab] = useState('account');
  const [successMessage, setSuccessMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  
  // Aggiungi stato per la gestione delle sessioni
  const [terminatingSession, setTerminatingSession] = useState(null);
  const [terminatingAllSessions, setTerminatingAllSessions] = useState(false);
  
  // Initialize form values from user data or localStorage
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      
      // Aggiornamento dai dati utente attuali
      setName(user.fullName || '');
      setEmail(user.email || '');
      setLocation(user.location || '');
      setUsername(user.username || '');
      
      console.log('User data loaded from context:', { 
        fullName: user.fullName, 
        email: user.email, 
        location: user.location, 
        username: user.username 
      });
      
      // Try to get saved form data from localStorage only for notifications
      const savedFormData = localStorage.getItem('settingsFormData');
      
      if (savedFormData) {
        const parsedData = JSON.parse(savedFormData);
        
        // Only use localStorage data for notifications
        if (parsedData.notifications) {
          setNotifications(parsedData.notifications);
        }
      }
    };
    
    loadUserData();
  }, [user]);

  // Add an additional effect to refresh user data when the page is loaded
  useEffect(() => {
    const refreshUserData = async () => {
      // Skip if no user is logged in or user is still loading
      if (!user || isLoading) return;
      
      try {
        // Fetch fresh user data from the API
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('Refreshed user data from API:', userData);
          
          // Update the form values with the latest data
          setName(userData.fullName || '');
          setEmail(userData.email || '');
          setLocation(userData.location || '');
          setUsername(userData.username || '');
        } else {
          console.error('Failed to refresh user data:', await response.text());
        }
      } catch (error) {
        console.error('Error refreshing user data:', error);
      }
    };
    
    refreshUserData();
  }, [user, isLoading]);

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

  // Carica le sessioni quando si seleziona la tab privacy
  useEffect(() => {
    if (activeTab === 'privacy' && user) {
      fetchSessions();
      // Reset any session errors when changing tabs
      setErrors(prev => ({ ...prev, sessions: null }));
    }
  }, [activeTab, user]); // eslint-disable-line react-hooks/exhaustive-deps
  // Intentionally omitting fetchSessions from dependencies to prevent infinite loop

  const handleNotificationChange = (type) => {
    const updatedNotifications = {
      ...notifications,
      [type]: !notifications[type]
    };
    
    setNotifications(updatedNotifications);
    
    // Don't save to localStorage here anymore, just track changes
    // This way the comparison in notificationsChanged will work correctly
    console.log(`${type} notification toggled:`, !notifications[type]);
  };

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  // Check if any field has been changed
  const hasChanges = () => {
    return (
      (name !== '' && name !== user.fullName) || 
      (email !== '' && email !== user.email) || 
      (location !== '' && location !== user.location) || 
      (username !== '' && username !== user.username)
    ); 
  };

  // Check if password fields have been changed
  const hasPasswordChanges = () => {
    return currentPassword && newPassword && confirmPassword;
  };

  // Check if the individual field has been changed and show appropriate message
  const hasFieldChanged = (field, userField) => {
    return field && field !== userField;
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

  const handleNameChange = (e) => {
    const value = e.target.value;
    setName(value);
    
    // Real-time validation
    if (value.trim() === '') {
      setNameError('Name cannot be empty');
    } else if (value.length < 2) {
      setNameError('Name must be at least 2 characters');
    } else if (value.length > 50) {
      setNameError('Name must be less than 50 characters');
    } else {
      setNameError('');
    }
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    
    // Real-time validation with regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value.trim() === '') {
      setEmailError('Email cannot be empty');
    } else if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
      
      // Don't check availability if the email hasn't changed
      if (value === user.email) {
        return;
      }
      
      // Check email availability with debounce
      const timer = setTimeout(async () => {
        try {
          // Only check if the email is valid and not empty
          if (value.trim() !== '' && emailRegex.test(value)) {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/check-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({ email: value })
            });
            
            const data = await response.json();
            
            if (!response.ok || !data.available) {
              setEmailError('This email is already registered to another account');
            }
          }
        } catch (error) {
          console.error('Error checking email availability:', error);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  };

  const handleLocationChange = (e) => {
    const value = e.target.value;
    setLocation(value);
    
    // Simple validation
    if (value.length > 100) {
      setLocationError('Location must be less than 100 characters');
    } else {
      setLocationError('');
    }
  };

  const handleUsernameChange = async (e) => {
    const newUsername = e.target.value;
    setUsername(newUsername);
    
    // Basic validation
    if (newUsername.trim() === '') {
      setUsernameErrors('Username cannot be empty');
      return;
    }
    
    if (newUsername.length < 3) {
      setUsernameErrors('Username must be at least 3 characters');
      return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      setUsernameErrors('Username can only contain letters, numbers and underscores');
      return;
    }
    
    // Check if username is the same as current username
    if (newUsername === user.username) {
      setUsernameErrors('');
      return;
    }
    
    // Debounce username check for new usernames
    const timer = setTimeout(async () => {
      setIsCheckingUsername(true);
      const result = await checkUsernameAvailability(newUsername);
      setIsCheckingUsername(false);
      
      if (!result.available) {
        setUsernameErrors(result.error || 'Username is already taken');
      } else {
        setUsernameErrors('');
      }
    }, 500);
    
    return () => clearTimeout(timer);
  };

  const handleCurrentPasswordChange = (e) => {
    const value = e.target.value;
    setCurrentPassword(value);
    
    if (value.trim() === '') {
      setCurrentPasswordError('Current password is required');
    } else {
      setCurrentPasswordError('');
    }
  };

  const calculatePasswordStrength = (password) => {
    // Basic password strength algorithm
    let score = 0;
    
    // Length check
    if (password.length >= 8) score++;
    
    // Contains uppercase
    if (/[A-Z]/.test(password)) score++;
    
    // Contains lowercase
    if (/[a-z]/.test(password)) score++;
    
    // Contains number
    if (/[0-9]/.test(password)) score++;
    
    // Contains special character
    if (/[!@#$%^&*]/.test(password)) score++;
    
    return score;
  };

  const handleNewPasswordChange = (e) => {
    const value = e.target.value;
    setNewPassword(value);
    
    // Valuta i singoli requisiti in tempo reale
    const validationErrors = validatePassword(value);
    
    // Aggiorna lo stato della validazione
    setPasswordErrors(prev => ({
      ...prev,
      validation: validationErrors
    }));
    
    // Calcola password strength immediatamente
    const strength = calculatePasswordStrength(value);
    setPasswordStrength(strength);
    
    if (Object.keys(validationErrors).length > 0) {
      setNewPasswordError('Please ensure password meets all requirements');
    } else {
      setNewPasswordError('');
    }
    
    // Check if new password is same as current (if current is provided)
    if (currentPassword && value === currentPassword) {
      setNewPasswordError('New password must be different from current password');
    }
    
    // Check if confirm password needs updating
    if (confirmPassword && value !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
    } else if (confirmPassword) {
      setConfirmPasswordError('');
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    
    if (value !== newPassword) {
      setConfirmPasswordError('Passwords do not match');
    } else {
      setConfirmPasswordError('');
    }
  };

  // Aggiungiamo uno stile CSS globale per prevenire l'evidenziazione blu persistente
  useEffect(() => {
    // Crea uno stile globale per sovrascrivere i bordi blu di focus dopo l'autocompletamento
    const style = document.createElement('style');
    style.textContent = `
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      input:-webkit-autofill:active {
        -webkit-box-shadow: 0 0 0 30px white inset !important;
        -webkit-text-fill-color: inherit !important;
        transition: background-color 5000s ease-in-out 0s;
      }
      
      input.no-focus-outline:focus {
        outline: none !important;
        box-shadow: none !important;
        border-color: #d1d5db !important; /* gray-300 */
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Aggiungi una funzione per rimuovere i bordi blu dopo il salvataggio
  const removeAllFocusStates = () => {
    setTimeout(() => {
      // Aggiungi la classe no-focus-outline a tutti gli input
      const inputs = document.querySelectorAll('input');
      inputs.forEach(input => {
        input.classList.add('no-focus-outline');
        
        // Forza il blur
        input.blur();
      });
      
      // Rimuovi la classe dopo un po' per permettere future interazioni
      setTimeout(() => {
        inputs.forEach(input => {
          input.classList.remove('no-focus-outline');
        });
      }, 1000);
    }, 0);
  };

  const handleSaveChanges = async () => {
    setIsSubmitting(true);
    setErrors({});
    
    // Rimuovi focus e stili persistenti
    removeAllFocusStates();
    
    // Validate passwords if trying to change them
    if (hasPasswordChanges()) {
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
    
    try {
      // Check if profile data has changed
      const profileChanged = name !== user.fullName || email !== user.email || location !== user.location;
      
      if (profileChanged) {
        // Update profile only if something changed
        const profileResult = await updateProfile({
          fullName: name,
          email,
          location
        });
        
        if (!profileResult.success) {
          console.log('Profile update failed:', profileResult);
          
          // Check for specific email error
          if (profileResult.error === 'Email already registered' || 
              (profileResult.field === 'email') ||
              (profileResult.details && profileResult.details.email)) {
            setEmailError('This email is already registered to another account');
          } else {
            // For other errors, store in the errors state
            setErrors(profileResult.details || { general: profileResult.error || 'Error updating profile' });
          }
          
          setIsSubmitting(false);
          return;
        }
      } else {
        console.log('Profile data unchanged, skipping update');
      }
      
      // Check if username has changed and is valid
      if (username !== user.username) {
        // If there are username validation errors, don't proceed
        if (usernameErrors) {
          setIsSubmitting(false);
          return;
        }
        
        // Update username
        const usernameResult = await changeUsername(username);
        
        if (!usernameResult.success) {
          setUsernameErrors(usernameResult.error || 'Error updating username');
          setIsSubmitting(false);
          return;
        }
      } else {
        // Username hasn't changed, don't try to update it
        console.log('Username unchanged, skipping update');
      }
      
      // Save form data to localStorage to persist between page reloads
      const formData = {
        name,
        email,
        location,
        username,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem('settingsFormData', JSON.stringify(formData));
      
      setIsSubmitting(false);
      setIsEditing(false);
      showSuccessMessage('Settings saved successfully!');
      
      // Rimuovi focus e stili persistenti di nuovo dopo il salvataggio
      removeAllFocusStates();
    } catch (error) {
      console.error('Error saving changes:', error);
      setErrors({ general: 'An unexpected error occurred' });
      setIsSubmitting(false);
    }
  };
  
  // Check if notification settings changed
  const notificationsChanged = () => {
    const formData = JSON.parse(localStorage.getItem('settingsFormData') || '{}');
    
    // If notifications settings don't exist in localStorage, only return true if user has changed defaults
    if (!formData.notifications) {
      // Compare with default values
      return notifications.email !== true || 
             notifications.app !== true || 
             notifications.marketing !== false;
    }
    
    // Explicitly convert values to booleans to ensure proper comparison
    const currentEmail = Boolean(notifications.email);
    const currentApp = Boolean(notifications.app);
    const currentMarketing = Boolean(notifications.marketing);
    
    const savedEmail = Boolean(formData.notifications.email);
    const savedApp = Boolean(formData.notifications.app);
    const savedMarketing = Boolean(formData.notifications.marketing);
    
    // Compare current settings with saved settings
    const hasChanged = (
      currentEmail !== savedEmail ||
      currentApp !== savedApp ||
      currentMarketing !== savedMarketing
    );
    
    return hasChanged;
  };

  const handleSaveNotifications = () => {
    setIsSubmitting(true);
    
    // Rimuovi focus e stili persistenti
    removeAllFocusStates();
    
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
      
      // Rimuovi focus e stili persistenti di nuovo dopo il salvataggio
      removeAllFocusStates();
    }, 800);
  };

  // Formatta l'ultima attività di una sessione
  const formatLastActive = (lastActiveDate) => {
    try {
      const date = new Date(lastActiveDate);
      const now = new Date();
      const diffMillis = now - date;
      const diffMinutes = Math.floor(diffMillis / (1000 * 60));
      const diffHours = Math.floor(diffMillis / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMillis / (1000 * 60 * 60 * 24));
      
      if (diffMinutes < 1) {
        return 'a few seconds ago';
      } else if (diffMinutes < 60) {
        return `${diffMinutes} minutes ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hours ago`;
      } else {
        return `${diffDays} days ago`;
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'unknown date';
    }
  };
  
  // Handle terminating a single session
  const handleTerminateSession = async (sessionId) => {
    setTerminatingSession(sessionId);
    try {
      const result = await terminateSession(sessionId);
      
      if (result.success) {
        showSuccessMessage('Session terminated successfully. The device will be logged out.');
        // Update sessions locally instead of fetching again
        setSessions(prevSessions => prevSessions.filter(session => session._id !== sessionId));
      } else {
        console.error('Error terminating session:', result.error);
        // Show error message to user
        setSuccessMessage(null);
        const errorMessage = result.error || 'Error terminating session';
        setErrors(prev => ({ ...prev, sessions: errorMessage }));
        setTimeout(() => {
          setErrors(prev => ({ ...prev, sessions: null }));
        }, 3000);
      }
    } catch (error) {
      console.error('Error terminating session:', error);
      setErrors(prev => ({ ...prev, sessions: 'A network error occurred' }));
      setTimeout(() => {
        setErrors(prev => ({ ...prev, sessions: null }));
      }, 3000);
    } finally {
      setTerminatingSession(null);
    }
  };
  
  // Handle terminating all other sessions
  const handleTerminateAllSessions = async () => {
    setTerminatingAllSessions(true);
    try {
      const result = await terminateAllOtherSessions();
      
      if (result.success) {
        showSuccessMessage('All other sessions have been terminated. Devices will be logged out.');
        // Update sessions locally to only include the current session
        setSessions(prevSessions => prevSessions.filter(session => session.isCurrentSession));
      } else {
        console.error('Error terminating sessions:', result.error);
        // Show error message to user
        setSuccessMessage(null);
        const errorMessage = result.error || 'Error terminating sessions';
        setErrors(prev => ({ ...prev, sessions: errorMessage }));
        setTimeout(() => {
          setErrors(prev => ({ ...prev, sessions: null }));
        }, 3000);
      }
    } catch (error) {
      console.error('Error terminating all sessions:', error);
      setErrors(prev => ({ ...prev, sessions: 'A network error occurred' }));
      setTimeout(() => {
        setErrors(prev => ({ ...prev, sessions: null }));
      }, 3000);
    } finally {
      setTerminatingAllSessions(false);
    }
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
                  {/* Removing general error message here */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="name">
                        Name
                      </label>
                      <div className="relative">
                        <input 
                          type="text" 
                          id="name" 
                          className={`w-full px-4 py-3 pl-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all duration-200
                            ${isEditing ? 'border-gray-300' : 'border-gray-300 bg-gray-50 cursor-not-allowed'}
                            ${nameError ? 'border-red-500' : ''}`}
                          value={name}
                          onChange={handleNameChange}
                          placeholder="Your full name"
                          disabled={!isEditing}
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      
                      {nameError && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {nameError}
                        </p>
                      )}
                      
                      {name === user.fullName && isEditing && !nameError && (
                        <p className="mt-2 text-sm text-yellow-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          This is your current name
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="username">
                        Username
                      </label>
                      <div className="relative">
                        <input 
                          type="text" 
                          id="username" 
                          className={`w-full px-4 py-3 pl-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all duration-200
                            ${isEditing ? 'border-gray-300' : 'border-gray-300 bg-gray-50 cursor-not-allowed'}
                            ${usernameErrors ? 'border-red-500' : ''}`}
                          value={username}
                          onChange={handleUsernameChange}
                          placeholder="Your username"
                          disabled={!isEditing}
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      {usernameErrors && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {usernameErrors}
                        </p>
                      )}
                      {username === user.username && isEditing && !usernameErrors && (
                        <p className="mt-2 text-sm text-yellow-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          This is your current username
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="email">
                        Email
                      </label>
                      <div className="relative">
                        <input 
                          type="email" 
                          id="email" 
                          className={`w-full px-4 py-3 pl-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all duration-200
                            ${isEditing ? 'border-gray-300' : 'border-gray-300 bg-gray-50 cursor-not-allowed'}
                            ${emailError ? 'border-red-500' : ''}`}
                          value={email}
                          onChange={handleEmailChange}
                          placeholder="your.email@example.com"
                          disabled={!isEditing}
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      
                      {emailError && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{emailError}</span>
                        </p>
                      )}
                      
                      {email === user.email && isEditing && !emailError && (
                        <p className="mt-2 text-sm text-yellow-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          This is your current email
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="location">
                        Location
                      </label>
                      <div className="relative">
                        <input 
                          type="text" 
                          id="location" 
                          className={`w-full px-4 py-3 pl-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all duration-200
                            ${isEditing ? 'border-gray-300' : 'border-gray-300 bg-gray-50 cursor-not-allowed'}
                            ${locationError ? 'border-red-500' : ''}`}
                          value={location}
                          onChange={handleLocationChange}
                          placeholder="City, Country"
                          disabled={!isEditing}
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                        
                      {locationError && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {locationError}
                        </p>
                      )}

                      {location === user.location && isEditing && !locationError && (
                        <p className="mt-2 text-sm text-yellow-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          This is your current location
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-4">
                    {isEditing ? (
                      <>
                        <button 
                          onClick={() => {
                            // Reset form fields to original values
                            setName(user.fullName || '');
                            setEmail(user.email || '');
                            setLocation(user.location || '');
                            setUsername(user.username || '');
                            // Clear all validation errors
                            setNameError('');
                            setEmailError('');
                            setLocationError('');
                            setUsernameErrors('');
                            setErrors({});
                            setIsEditing(false);
                          }}
                          disabled={isSubmitting}
                          className={`px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-[1.02] font-medium flex items-center justify-center
                            ${isSubmitting ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span>Cancel</span>
                        </button>
                        
                        <button 
                          onClick={handleSaveChanges}
                          disabled={isSubmitting || !hasChanges()}
                          className={`px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-[1.02] font-medium flex items-center justify-center
                            ${isSubmitting || !hasChanges()
                              ? 'bg-gray-400 text-white cursor-not-allowed' 
                              : 'bg-yellow-600 text-white hover:bg-yellow-700 shadow-sm hover:shadow'}`}
                          title={!hasChanges() ? "No changes to save" : "Save your changes"}
                        >
                          {isSubmitting ? (
                            <>
                              <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Saving...</span>
                            </>
                          ) : !hasChanges() ? (
                            <>
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>No Changes</span>
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
                      </>
                    ) : (
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-[1.02] font-medium flex items-center justify-center bg-yellow-600 text-white hover:bg-yellow-700 shadow-sm hover:shadow"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <span>Edit</span>
                      </button>
                    )}
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
                            ${passwordErrors.currentPassword || currentPasswordError ? 'border-red-500' : 'border-gray-300'}
                            ${!isEditingPassword ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                          value={currentPassword}
                          onChange={handleCurrentPasswordChange}
                          placeholder="Enter your current password"
                          disabled={!isEditingPassword}
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      {(passwordErrors.currentPassword || currentPasswordError) && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {passwordErrors.currentPassword || currentPasswordError}
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
                              ${passwordErrors.newPassword || newPasswordError || (passwordErrors.validation && Object.keys(passwordErrors.validation).length > 0) 
                                ? 'border-red-500' : 'border-gray-300'}
                              ${!isEditingPassword ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                            value={newPassword}
                            onChange={handleNewPasswordChange}
                            placeholder="Create new password"
                            disabled={!isEditingPassword}
                          />
                          <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </div>
                        {(passwordErrors.newPassword || newPasswordError) && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {passwordErrors.newPassword || newPasswordError}
                          </p>
                        )}
                        
                        {/* Password strength indicator */}
                        {newPassword && isEditingPassword && (
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
                              ${passwordErrors.confirmPassword || confirmPasswordError ? 'border-red-500' : 'border-gray-300'}
                              ${!isEditingPassword ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                            value={confirmPassword}
                            onChange={handleConfirmPasswordChange}
                            placeholder="Confirm your new password"
                            disabled={!isEditingPassword}
                          />
                          <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        {(passwordErrors.confirmPassword || confirmPasswordError) && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {passwordErrors.confirmPassword || confirmPasswordError}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="pt-2 flex flex-wrap justify-end space-x-4">
                      {isEditingPassword ? (
                        <>
                          <button 
                            onClick={() => {
                              // Reset password fields
                              setCurrentPassword('');
                              setNewPassword('');
                              setConfirmPassword('');
                              // Clear ALL password related errors
                              setPasswordErrors({});
                              setCurrentPasswordError('');
                              setNewPasswordError('');
                              setConfirmPasswordError('');
                              setPasswordStrength(0);
                              setIsEditingPassword(false);
                            }}
                            disabled={isSubmitting}
                            className={`md:w-auto px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-[1.02] font-medium flex items-center justify-center
                              ${isSubmitting 
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>Cancel</span>
                          </button>
                          
                          <button 
                            onClick={handleSaveChanges}
                            disabled={isSubmitting || !hasPasswordChanges()}
                            className={`md:w-auto px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-[1.02] font-medium flex items-center justify-center
                              ${isSubmitting || !hasPasswordChanges()
                                ? 'bg-gray-400 text-white cursor-not-allowed' 
                                : 'bg-yellow-600 text-white hover:bg-yellow-700 shadow-sm hover:shadow'}`}
                            title={!hasPasswordChanges() ? "Fill all password fields" : "Update your password"}
                          >
                            {isSubmitting ? (
                              <>
                                <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Updating Password...</span>
                              </>
                            ) : !hasPasswordChanges() ? (
                              <>
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span>Fill Password Fields</span>
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
                        </>
                      ) : (
                        <button 
                          onClick={() => setIsEditingPassword(true)}
                          className="px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-[1.02] font-medium flex items-center justify-center bg-yellow-600 text-white hover:bg-yellow-700 shadow-sm hover:shadow"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          <span>Edit</span>
                        </button>
                      )}
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
                
                <div className="flex justify-end space-x-4 border-t border-gray-100 pt-6">
                  <button 
                    onClick={() => {
                      // Reset notifications from localStorage
                      const formData = JSON.parse(localStorage.getItem('settingsFormData') || '{}');
                      if (formData.notifications) {
                        setNotifications(formData.notifications);
                      } else {
                        // Reset to default values
                        setNotifications({
                          email: true,
                          app: true,
                          marketing: false
                        });
                      }
                    }}
                    disabled={isSubmitting || !notificationsChanged()}
                    className={`px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-[1.02] font-medium flex items-center justify-center
                      ${isSubmitting 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : !notificationsChanged()
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Reset Preferences</span>
                  </button>
                  
                  <button 
                    onClick={handleSaveNotifications}
                    disabled={isSubmitting || !notificationsChanged()}
                    className={`px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-[1.02] font-medium flex items-center justify-center
                      ${isSubmitting || !notificationsChanged()
                        ? 'bg-gray-400 text-white cursor-not-allowed' 
                        : 'bg-yellow-600 text-white hover:bg-yellow-700 shadow-sm hover:shadow'}`}
                    title={!notificationsChanged() ? "No changes to notification preferences" : "Save your notification preferences"}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Saving...</span>
                      </>
                    ) : !notificationsChanged() ? (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>No Changes</span>
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
                    When enabled, you&apos;ll need to enter a code from your authentication app each time you log in.
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
                  Manage your active sessions and log out from other devices. We&apos;ll notify you if we detect unusual activity.
                </p>
                
                {errors?.sessions && (
                  <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-sm animate-fade-in flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>{errors.sessions}</p>
                  </div>
                )}
                
                {sessionsLoading ? (
                  <div className="flex justify-center items-center p-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
                  </div>
                ) : sessions && sessions.length > 0 ? (
                  <div className="bg-gray-50 rounded-lg overflow-hidden divide-y divide-gray-200">
                    {sessions.map(session => (
                      <div key={session._id} className="p-4 flex justify-between items-center">
                        <div className="flex items-start space-x-4">
                          <div className={`${
                            session.deviceInfo.type === 'mobile' 
                              ? 'bg-blue-100' 
                              : session.deviceInfo.type === 'tablet' 
                              ? 'bg-green-100' 
                              : 'bg-gray-100'
                            } p-2 rounded-lg`}
                          >
                            {session.deviceInfo.type === 'mobile' ? (
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            ) : session.deviceInfo.type === 'tablet' ? (
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {session.isCurrentSession ? 'Current Session' : session.deviceInfo.deviceName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {session.deviceInfo.operatingSystem} • {session.deviceInfo.browser} • 
                              {session.isCurrentSession 
                                ? ' Active now' 
                                : ` Last activity: ${formatLastActive(session.lastActive)}`
                              }
                            </p>
                            <p className="text-xs text-gray-400 mt-1">{session.location} • {session.ipAddress}</p>
                          </div>
                        </div>
                        
                        {session.isCurrentSession ? (
                          <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                            Active Now
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleTerminateSession(session._id)}
                            disabled={terminatingSession === session._id}
                            className={`px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium 
                              transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                              ${terminatingSession === session._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {terminatingSession === session._id ? (
                              <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Logging out...
                              </span>
                            ) : 'Logout'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <p className="text-gray-500">No active sessions found</p>
                  </div>
                )}
                
                <div className="mt-4 flex justify-end">
                  <button 
                    onClick={handleTerminateAllSessions}
                    disabled={terminatingAllSessions || !sessions || sessions.length <= 1}
                    className={`px-4 py-2 border border-purple-300 text-purple-700 rounded-lg 
                      ${(terminatingAllSessions || !sessions || sessions.length <= 1) 
                        ? 'bg-gray-100 opacity-50 cursor-not-allowed' 
                        : 'hover:bg-purple-50 transition-colors duration-200'} 
                      text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center`}
                  >
                    {terminatingAllSessions ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Logging out...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        Logout from all devices
                      </>
                    )}
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