import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

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
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      logState('After login with user data');
    } else {
      await fetchUserData(newToken);
    }
  };

  const logout = () => {
    console.log('[AuthContext] Logout called');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    logState('After logout');
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
        error: 'Errore durante il cambio password'
      };
    }
  };

  // Log state changes
  useEffect(() => {
    logState('State changed');
  }, [token, user, isLoading]);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isLoading, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};