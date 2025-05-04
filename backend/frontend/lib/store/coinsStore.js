import { create } from 'zustand';
import axios from 'axios';
import Cookies from 'js-cookie';

const useCoinsStore = create((set, get) => ({
  coins: [],
  currentCoin: null,
  totalCoins: 0,
  currentPage: 1,
  totalPages: 1,
  filters: {
    keyword: '',
    emperor: '',
    date_range: '',
    material: '',
    sortBy: 'name',
    order: 'asc'
  },
  isLoading: false,
  error: null,

  // Fetch coins with optional filters
  fetchCoins: async (page = 1, limit = 20, filters = {}) => {
    set({ isLoading: true, error: null, currentPage: page });
    
    // Combine current filters with new filters
    const currentFilters = { ...get().filters, ...filters };
    set({ filters: currentFilters });
    
    // Build query parameters
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    
    Object.entries(currentFilters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    
    try {
      const response = await axios.get(`/api/coins?${params.toString()}`);
      set({ 
        coins: response.data.results, 
        totalCoins: response.data.total,
        totalPages: response.data.pages,
        isLoading: false 
      });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.msg || 'Errore nel caricamento delle monete', 
        isLoading: false 
      });
      return { results: [] };
    }
  },

  // Fetch a single coin by ID
  fetchCoinById: async (coinId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`/api/coins/${coinId}`);
      set({ currentCoin: response.data, isLoading: false });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.msg || 'Errore nel caricamento della moneta', 
        isLoading: false 
      });
      return null;
    }
  },

  // Update filters
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters }
    }));
  },

  // Reset filters
  resetFilters: () => {
    set({
      filters: {
        keyword: '',
        emperor: '',
        date_range: '',
        material: '',
        sortBy: 'name',
        order: 'asc'
      }
    });
  },

  // Clear errors
  clearErrors: () => set({ error: null })
}));

export default useCoinsStore; 