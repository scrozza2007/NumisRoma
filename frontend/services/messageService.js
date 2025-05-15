import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

// Ottieni tutte le conversazioni dell'utente
export const getConversations = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/messages/conversations`, getAuthHeader());
    return response.data;
  } catch (error) {
    console.error('Errore nel recupero delle conversazioni:', error);
    throw error;
  }
};

// Crea una nuova conversazione
export const createConversation = async (recipientId) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/messages/conversations`,
      { recipientId },
      getAuthHeader()
    );
    return response.data;
  } catch (error) {
    console.error('Errore nella creazione della conversazione:', error);
    throw error;
  }
};

// Ottieni i messaggi di una conversazione
export const getMessages = async (conversationId) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/messages/conversations/${conversationId}/messages`,
      getAuthHeader()
    );
    return response.data;
  } catch (error) {
    console.error('Errore nel recupero dei messaggi:', error);
    throw error;
  }
};

// Invia un nuovo messaggio
export const sendMessage = async (conversationId, content, image = null) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/messages/conversations/${conversationId}/messages`,
      { content, image },
      getAuthHeader()
    );
    return response.data;
  } catch (error) {
    console.error('Errore nell\'invio del messaggio:', error);
    throw error;
  }
};

// Ottieni utenti con cui si può iniziare una conversazione
export const getAvailableUsers = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/messages/users`, getAuthHeader());
    return response.data;
  } catch (error) {
    console.error('Errore nel recupero degli utenti disponibili:', error);
    throw error;
  }
}; 