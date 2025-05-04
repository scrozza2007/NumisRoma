import axios from 'axios';
import Cookies from 'js-cookie';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to inject auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// API endpoints
export const authAPI = {
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },
  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },
  getUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  }
};

export const coinsAPI = {
  getCoins: async (params = {}) => {
    const response = await apiClient.get('/coins', { params });
    return response.data;
  },
  getCoinById: async (id) => {
    const response = await apiClient.get(`/coins/${id}`);
    return response.data;
  }
};

export const collectionsAPI = {
  getCollections: async () => {
    const response = await apiClient.get('/collections');
    return response.data;
  },
  createCollection: async (collectionData) => {
    const response = await apiClient.post('/collections', collectionData);
    return response.data;
  },
  addCoinToCollection: async (collectionId, coinData) => {
    const response = await apiClient.post(`/collections/${collectionId}/coins`, coinData);
    return response.data;
  }
};

export default apiClient; 