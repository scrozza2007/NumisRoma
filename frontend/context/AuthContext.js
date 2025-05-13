import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Leggi token salvato nel localStorage al caricamento
    const storedToken = localStorage.getItem('token');
    console.log('Stored token:', storedToken); // Log del token salvato
    
    if (storedToken) {
      setToken(storedToken);
      fetchUserData(storedToken);
    }
  }, []);

  const fetchUserData = async (authToken) => {
    try {
      console.log('Fetching user data with token:', authToken); // Log della chiamata
      
      const response = await fetch('http://localhost:4000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const userData = await response.json();
      console.log('User data response:', userData); // Log della risposta
      
      if (response.ok) {
        setUser(userData);
      } else {
        console.error('Error fetching user data:', userData);
        logout();
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      logout();
    }
  };

  const login = async (newToken, userData) => {
    console.log('Login called with:', { newToken, userData }); // Log dei dati di login
    
    if (!newToken) {
      console.error('No token provided to login');
      return;
    }

    localStorage.setItem('token', newToken);
    setToken(newToken);
    
    if (userData) {
      setUser(userData);
    } else {
      // Se non abbiamo i dati utente, li recuperiamo
      await fetchUserData(newToken);
    }
  };

  const logout = () => {
    console.log('Logout called'); // Log del logout
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // Log dello stato corrente
  console.log('Current auth state:', { token, user });

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};