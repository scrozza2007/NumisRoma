import { create } from 'zustand';
import axios from 'axios';
import Cookies from 'js-cookie';

const useCollectionsStore = create((set, get) => ({
  collections: [],
  currentCollection: null,
  isLoading: false,
  error: null,

  // Fetch user's collections
  fetchCollections: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get('/api/collections', {
        headers: {
          Authorization: `Bearer ${Cookies.get('authToken')}`
        }
      });
      set({ collections: response.data, isLoading: false });
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.msg || 'Errore nel caricamento delle collezioni',
        isLoading: false
      });
      return [];
    }
  },

  // Create a new collection
  createCollection: async (collectionData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post('/api/collections', collectionData, {
        headers: {
          Authorization: `Bearer ${Cookies.get('authToken')}`
        }
      });
      set((state) => ({
        collections: [...state.collections, response.data],
        isLoading: false
      }));
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.msg || 'Errore nella creazione della collezione',
        isLoading: false
      });
      return null;
    }
  },

  // Add coin to collection
  addCoinToCollection: async (collectionId, coinData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`/api/collections/${collectionId}/coins`, coinData, {
        headers: {
          Authorization: `Bearer ${Cookies.get('authToken')}`
        }
      });
      
      // Update the collections list with the updated collection
      set((state) => ({
        collections: state.collections.map(coll => 
          coll._id === collectionId ? response.data : coll
        ),
        isLoading: false
      }));
      
      // If the current collection is the one being updated, update it too
      if (get().currentCollection && get().currentCollection._id === collectionId) {
        set({ currentCollection: response.data });
      }
      
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.msg || 'Errore nell\'aggiungere la moneta alla collezione',
        isLoading: false
      });
      return null;
    }
  },

  // Set current collection
  setCurrentCollection: (collection) => {
    set({ currentCollection: collection });
  },

  // Clear errors
  clearErrors: () => set({ error: null })
}));

export default useCollectionsStore; 