import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionTerminated, setSessionTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState(null);

  // Debug function to log state changes
  const logState = (action) => {
    console.log(`[AuthContext] ${action}:`, {
      hasToken: !!token,
      hasUser: !!user,
      userData: user,
      isLoading,
      isInitialized
    });
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        console.log('[AuthContext] Initializing with stored data:', { 
          hasToken: !!storedToken, 
          hasUser: !!storedUser,
          storedUser: storedUser ? JSON.parse(storedUser) : null
        });

        if (storedToken) {
          setToken(storedToken);
          
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              console.log('[AuthContext] Setting initial user from storage:', parsedUser);
              setUser(parsedUser);
            } catch (e) {
              console.error('[AuthContext] Error parsing stored user data:', e);
            }
          }
          
          // Only fetch user data if we don't have it already
          if (!storedUser) {
            await fetchUserData(storedToken);
          }
        } else {
          console.log('[AuthContext] No stored token found');
        }
      } catch (error) {
        console.error('[AuthContext] Error during initialization:', error);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
        logState('After initialization');
      }
    };

    initializeAuth();
  }, []);

  const fetchUserData = async (authToken) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const userData = await response.json();
      if (response.ok) {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        logState('After setting user data');
      } else {
        // Only clear data if the token is actually invalid
        if (response.status === 401) {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
    } catch (error) {
      console.error('[AuthContext] Error fetching user data:', error);
      // Don't clear data on network errors
    }
  };

  const login = async (newToken, userData) => {
    console.log('[AuthContext] Login called with:', { hasToken: !!newToken, hasUserData: !!userData });
    
    if (!newToken) {
      console.error('[AuthContext] No token provided to login');
      return;
    }

    localStorage.setItem('token', newToken);
    setToken(newToken);
    
    if (userData) {
      console.log('[AuthContext] Setting user data from login:', userData);
      // Ensure consistent user ID field (some endpoints return _id, others return id)
      const normalizedUserData = {
        ...userData,
        _id: userData._id || userData.id, // Ensure _id exists
        id: userData._id || userData.id   // Ensure id exists
      };
      setUser(normalizedUserData);
      localStorage.setItem('user', JSON.stringify(normalizedUserData));
      logState('After login with user data');
    } else {
      await fetchUserData(newToken);
    }
  };

  // Funzione per verificare se una risposta indica che la sessione è stata terminata
  const isSessionTerminatedResponse = (response) => {
    if (response && response.status === 401) {
      return response.json().then(data => {
        return data && data.code === 'SESSION_TERMINATED';
      }).catch(() => false);
    }
    return false;
  };

  // Handle API requests with session verification
  const makeAuthenticatedRequest = async (url, options = {}) => {
    if (!token) {
      throw new Error('User not authenticated');
    }

    // Add authorization header to request if not already present
    const headers = options.headers || {};
    if (!headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      // Check if session was terminated
      if (response.status === 401) {
        const data = await response.json();
        if (data.code === 'SESSION_TERMINATED' || data.sessionTerminated) {
          console.log('[AuthContext] Session was terminated, logging out');
          // Forza il logout se la sessione è stata terminata
          const reason = 'Your session has been terminated from another device';
          setSessionTerminated(true);
          setTerminationReason(reason);
          await logout(true, reason);
          return { sessionTerminated: true, error: data.msg || 'Session terminated' };
        }
        
        return { error: data.msg || 'Unauthorized' };
      }
      
      return response;
    } catch (error) {
      console.error(`[AuthContext] Error making request to ${url}:`, error);
      throw error;
    }
  };

  // Aggiorna la funzione di logout per gestire la disconnessione forzata
  const logout = async (skipApiCall = false, logoutReason = null) => {
    console.log('[AuthContext] Logout called', { skipApiCall, logoutReason });
    
    try {
      if (!skipApiCall && token) {
        // Chiama l'API di logout per terminare la sessione server-side
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).catch(error => console.error('[AuthContext] Logout API error:', error));
      }
    } finally {
      // Pulisci lo storage e lo state indipendentemente dall'esito della chiamata API
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Se c'è un motivo di logout, salvalo
      if (logoutReason) {
        localStorage.setItem('logoutReason', logoutReason);
      } else {
        localStorage.removeItem('logoutReason');
      }
      
      setToken(null);
      setUser(null);
      setSessions([]);
      logState('After logout');
    }
  };

  // Verifica lo stato della sessione corrente
  const checkSession = async () => {
    if (!token || !user) return { active: false };
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/session-check`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        return { active: true };
      }
      
      // Check if session was terminated
      if (response.status === 401) {
        const data = await response.json();
        if (data.code === 'SESSION_TERMINATED' || data.sessionTerminated) {
          const reason = 'Your session has been terminated from another device';
          setSessionTerminated(true);
          setTerminationReason(reason);
          await logout(true, reason);
          return { active: false, terminated: true, reason: data.msg };
        }
        
        // Session is invalid for other reasons
        await logout(true);
        return { active: false, error: data.msg };
      }
      
      return { active: false };
    } catch (error) {
      console.error('[AuthContext] Session check error:', error);
      return { active: false, error: error.message };
    }
  };

  // Funzioni per la gestione delle sessioni
  const fetchSessions = async () => {
    if (!token || !user) return;
    
    setSessionsLoading(true);
    try {
      const response = await makeAuthenticatedRequest(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions`);
      
      // Se la sessione è stata terminata, la risposta conterrà sessionTerminated
      if (response.sessionTerminated) {
        setSessions([]);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        // Filtra solo le sessioni attive
        const activeSessions = data.sessions?.filter(session => session.isActive !== false) || [];
        setSessions(activeSessions);
      } else {
        console.error('[AuthContext] Error fetching sessions:', await response.text());
        setSessions([]);
      }
    } catch (error) {
      console.error('[AuthContext] Sessions API error:', error);
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };
  
  const terminateSession = async (sessionId) => {
    if (!token || !user) return { success: false, error: 'Not authenticated' };
    
    try {
      const response = await makeAuthenticatedRequest(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      
      // Se la sessione è stata terminata, la risposta conterrà sessionTerminated
      if (response.sessionTerminated) {
        return { success: false, error: 'Your session has been terminated' };
      }
      
      if (response.ok) {
        // Return success without fetching sessions again
        return { success: true };
      } else {
        const errorData = await response.json();
        return { 
          success: false, 
          error: errorData.error || 'Error terminating session' 
        };
      }
    } catch (error) {
      console.error('[AuthContext] Terminate session error:', error);
      return { success: false, error: 'Network error while terminating session' };
    }
  };
  
  const terminateAllOtherSessions = async () => {
    if (!token || !user) return { success: false, error: 'Not authenticated' };
    
    try {
      const response = await makeAuthenticatedRequest(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions`, {
        method: 'DELETE'
      });
      
      // Se la sessione è stata terminata, la risposta conterrà sessionTerminated
      if (response.sessionTerminated) {
        return { success: false, error: 'Your session has been terminated' };
      }
      
      if (response.ok) {
        // Return success without fetching sessions again
        return { success: true };
      } else {
        const errorData = await response.json();
        return { 
          success: false, 
          error: errorData.error || 'Error terminating sessions' 
        };
      }
    } catch (error) {
      console.error('[AuthContext] Terminate all sessions error:', error);
      return { success: false, error: 'Network error while terminating sessions' };
    }
  };

  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    try {
      if (!token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error,
          details: data.details
        };
      }

      return {
        success: true,
        message: data.message
      };
    } catch (error) {
      console.error('[AuthContext] Password change error:', error);
      return {
        success: false,
        error: 'Error during password change'
      };
    }
  };

  const deleteAccount = async (password) => {
    try {
      if (!token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password })
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error,
          details: data.details
        };
      }

      // Return success without auto logout
      // The calling component will handle redirection before calling logout
      return {
        success: true,
        message: data.message
      };
    } catch (error) {
      console.error('[AuthContext] Account deletion error:', error);
      return {
        success: false,
        error: 'Error deleting account'
      };
    }
  };

  const checkUsernameAvailability = async (username) => {
    try {
      if (!token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/check-username`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username })
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          available: false,
          error: data.error
        };
      }

      return {
        available: true
      };
    } catch (error) {
      console.error('[AuthContext] Username availability check error:', error);
      return {
        available: false,
        error: 'Error during username availability check'
      };
    }
  };

  const changeUsername = async (username) => {
    try {
      if (!token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/change-username`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username })
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error,
          field: data.field
        };
      }

      // Update user in context and localStorage
      const updatedUser = { ...user, username: data.user.username };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return {
        success: true,
        message: data.message,
        user: data.user
      };
    } catch (error) {
      console.error('[AuthContext] Username change error:', error);
      return {
        success: false,
        error: 'Error during username change'
      };
    }
  };

  const updateProfile = async (userData) => {
    try {
      if (!token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error,
          details: data.details
        };
      }

      // Update user in context and localStorage
      const updatedUser = { ...user, ...data.user };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return {
        success: true,
        message: data.message,
        user: data.user
      };
    } catch (error) {
      console.error('[AuthContext] Profile update error:', error);
      return {
        success: false,
        error: 'Error during profile update'
      };
    }
  };

  // Funzione per reimpostare lo stato di terminazione della sessione
  const resetSessionTermination = () => {
    setSessionTerminated(false);
    setTerminationReason(null);
  };

  // Log state changes
  useEffect(() => {
    logState('State changed');
  }, [token, user, isLoading]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      isLoading, 
      isInitialized, 
      login, 
      logout, 
      changePassword, 
      deleteAccount,
      checkUsernameAvailability,
      changeUsername,
      updateProfile,
      // Aggiungi le funzioni per la gestione delle sessioni
      sessions,
      sessionsLoading,
      fetchSessions,
      terminateSession,
      terminateAllOtherSessions,
      setSessions,
      checkSession,
      // Aggiungi lo stato di terminazione della sessione
      sessionTerminated,
      terminationReason,
      resetSessionTermination
    }}>
      {children}
    </AuthContext.Provider>
  );
};