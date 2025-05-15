const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`
  };
};

// Ottieni tutte le conversazioni dell'utente
export const getConversations = async () => {
  try {
    const response = await fetch(`${API_URL}/api/messages/conversations`, {
      method: 'GET',
      headers: getAuthHeader()
    });
    
    if (!response.ok) {
      throw new Error(`Errore: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Errore nel recupero delle conversazioni:', error);
    throw error;
  }
};

// Crea una nuova conversazione
export const createConversation = async (recipientId) => {
  try {
    const response = await fetch(`${API_URL}/api/messages/conversations`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ recipientId })
    });
    
    if (!response.ok) {
      throw new Error(`Errore: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Errore nella creazione della conversazione:', error);
    throw error;
  }
};

// Ottieni i messaggi di una conversazione
export const getMessages = async (conversationId) => {
  try {
    const response = await fetch(
      `${API_URL}/api/messages/conversations/${conversationId}/messages`, {
        method: 'GET',
        headers: getAuthHeader()
      }
    );
    
    if (!response.ok) {
      throw new Error(`Errore: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Errore nel recupero dei messaggi:', error);
    throw error;
  }
};

// Invia un nuovo messaggio
export const sendMessage = async (conversationId, content, image = null) => {
  try {
    const response = await fetch(
      `${API_URL}/api/messages/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, image })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Errore: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Errore nell\'invio del messaggio:', error);
    throw error;
  }
};

// Ottieni utenti con cui si può iniziare una conversazione
export const getAvailableUsers = async () => {
  try {
    const response = await fetch(`${API_URL}/api/messages/users`, {
      method: 'GET',
      headers: getAuthHeader()
    });
    
    if (!response.ok) {
      throw new Error(`Errore: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Errore nel recupero degli utenti disponibili:', error);
    throw error;
  }
}; 