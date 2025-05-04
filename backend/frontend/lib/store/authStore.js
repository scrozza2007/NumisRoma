import { create } from 'zustand';
import Cookies from 'js-cookie';
import axios from 'axios';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Initialize auth from cookie on app load
  initialize: () => {
    const token = Cookies.get('authToken');
    if (token) {
      set({ token, isAuthenticated: true });
    }
  },

  // Login
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { token } = response.data;
      
      // Set cookie with token (7 days expiry)
      Cookies.set('authToken', token, { expires: 7 });
      
      set({ 
        token, 
        isAuthenticated: true, 
        isLoading: false 
      });
      
      return true;
    } catch (error) {
      set({ 
        error: error.response?.data?.msg || 'Errore durante il login', 
        isLoading: false 
      });
      return false;
    }
  },

  // Register
  register: async (username, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post('/api/auth/register', { 
        username, 
        email, 
        password 
      });
      const { token } = response.data;
      
      // Set cookie with token
      Cookies.set('authToken', token, { expires: 7 });
      
      set({ 
        token, 
        isAuthenticated: true, 
        isLoading: false 
      });
      
      return true;
    } catch (error) {
      set({ 
        error: error.response?.data?.msg || 'Errore durante la registrazione', 
        isLoading: false 
      });
      return false;
    }
  },

  // Logout
  logout: () => {
    Cookies.remove('authToken');
    set({ 
      user: null, 
      token: null, 
      isAuthenticated: false 
    });
  },

  // Clear errors
  clearErrors: () => set({ error: null })
}));

export default useAuthStore; 