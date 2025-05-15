import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import * as messageService from '../services/messageService';

export const MessageContext = createContext();

export const MessageProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState({});

  // Effetto per l'inizializzazione del socket
  useEffect(() => {
    if (user && token) {
      // Connessione al server Socket.IO
      const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
      
      // Gestione degli eventi Socket.IO
      socketInstance.on('connect', () => {
        console.log('Connesso al server Socket.IO');
        // Invia l'ID utente al server per associarlo al socket
        socketInstance.emit('login', user.userId);
      });
      
      socketInstance.on('disconnect', () => {
        console.log('Disconnesso dal server Socket.IO');
      });
      
      setSocket(socketInstance);
      
      // Chiudi la connessione quando il componente viene smontato
      return () => {
        socketInstance.disconnect();
      };
    }
  }, [user, token]);

  // Effetto per la gestione dei messaggi in arrivo
  useEffect(() => {
    if (socket) {
      socket.on('receiveMessage', (messageData) => {
        // Aggiorna i messaggi se la conversazione è attiva
        if (activeConversation && messageData.conversationId === activeConversation._id) {
          setMessages((prevMessages) => [...prevMessages, messageData]);
        }
        
        // Aggiorna le conversazioni
        updateConversationWithNewMessage(messageData);
        
        // Riproduci suono di notifica
        playNotificationSound();
      });
      
      socket.on('userTyping', ({ conversationId, userId }) => {
        setTypingUsers((prev) => ({
          ...prev,
          [conversationId]: userId
        }));
      });
      
      socket.on('userStopTyping', ({ conversationId }) => {
        setTypingUsers((prev) => {
          const updated = { ...prev };
          delete updated[conversationId];
          return updated;
        });
      });
    }
  }, [socket, activeConversation]);

  // Aggiorna una conversazione con un nuovo messaggio
  const updateConversationWithNewMessage = (message) => {
    setConversations((prevConversations) => {
      return prevConversations.map((conv) => {
        if (conv._id === message.conversationId) {
          return {
            ...conv,
            lastMessage: message,
            updatedAt: new Date().toISOString(),
            unreadCount: activeConversation && activeConversation._id === message.conversationId 
              ? 0 
              : (conv.unreadCount || 0) + 1
          };
        }
        return conv;
      });
    });
    
    // Aggiorna il conteggio totale dei messaggi non letti
    updateUnreadCount();
  };
  
  // Funzione per riprodurre un suono di notifica
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.play();
    } catch (err) {
      console.error('Errore nella riproduzione del suono:', err);
    }
  };

  // Carica tutte le conversazioni
  const loadConversations = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await messageService.getConversations();
      setConversations(data);
      updateUnreadCount(data);
    } catch (err) {
      setError('Errore nel caricamento delle conversazioni');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Carica i messaggi di una conversazione
  const loadMessages = useCallback(async (conversationId) => {
    if (!token || !conversationId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await messageService.getMessages(conversationId);
      setMessages(data);
      
      // Aggiorna lo stato di lettura nella conversazione locale
      setConversations((prevConversations) => {
        return prevConversations.map((conv) => {
          if (conv._id === conversationId) {
            return {
              ...conv,
              unreadCount: 0
            };
          }
          return conv;
        });
      });
      
      // Aggiorna il conteggio totale dei messaggi non letti
      updateUnreadCount();
    } catch (err) {
      setError('Errore nel caricamento dei messaggi');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Invia un nuovo messaggio
  const sendNewMessage = useCallback(async (conversationId, content, image = null) => {
    if (!token || !conversationId || !content.trim()) return;
    
    try {
      const newMessage = await messageService.sendMessage(conversationId, content, image);
      
      // Aggiorna lo stato locale dei messaggi
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      
      // Aggiorna le conversazioni con il nuovo messaggio
      setConversations((prevConversations) => {
        return prevConversations.map((conv) => {
          if (conv._id === conversationId) {
            return {
              ...conv,
              lastMessage: newMessage,
              updatedAt: new Date().toISOString()
            };
          }
          return conv;
        });
      });
      
      // Invia il messaggio tramite socket se il socket è disponibile
      if (socket) {
        const recipient = activeConversation?.participants.find(
          (p) => p._id !== user?.userId
        );
        
        if (recipient) {
          socket.emit('sendMessage', {
            ...newMessage,
            recipientId: recipient._id
          });
        }
      }
      
      return newMessage;
    } catch (err) {
      setError('Errore nell\'invio del messaggio');
      console.error(err);
      throw err;
    }
  }, [token, socket, activeConversation, user]);

  // Crea una nuova conversazione
  const createNewConversation = useCallback(async (recipientId) => {
    if (!token || !recipientId) return;
    
    try {
      const newConversation = await messageService.createConversation(recipientId);
      setConversations((prev) => [newConversation, ...prev]);
      return newConversation;
    } catch (err) {
      setError('Errore nella creazione della conversazione');
      console.error(err);
      throw err;
    }
  }, [token]);

  // Seleziona una conversazione attiva
  const selectConversation = useCallback(async (conversation) => {
    setActiveConversation(conversation);
    if (conversation) {
      await loadMessages(conversation._id);
    } else {
      setMessages([]);
    }
  }, [loadMessages]);

  // Aggiorna il conteggio totale dei messaggi non letti
  const updateUnreadCount = useCallback((convs = null) => {
    const conversationsToCount = convs || conversations;
    const count = conversationsToCount.reduce((total, conv) => {
      return total + (conv.unreadCount || 0);
    }, 0);
    setUnreadCount(count);
  }, [conversations]);

  // Gestione della digitazione
  const handleTyping = useCallback((isTyping) => {
    if (!socket || !activeConversation) return;
    
    const recipient = activeConversation?.participants.find(
      (p) => p._id !== user?.userId
    );
    
    if (!recipient) return;
    
    if (isTyping) {
      socket.emit('typing', {
        conversationId: activeConversation._id,
        userId: user?.userId,
        recipientId: recipient._id
      });
    } else {
      socket.emit('stopTyping', {
        conversationId: activeConversation._id,
        userId: user?.userId,
        recipientId: recipient._id
      });
    }
  }, [socket, activeConversation, user]);

  // Carica le conversazioni all'inizializzazione
  useEffect(() => {
    if (token) {
      loadConversations();
    }
  }, [token, loadConversations]);

  return (
    <MessageContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        loading,
        error,
        unreadCount,
        typingUsers,
        loadConversations,
        loadMessages,
        sendNewMessage,
        createNewConversation,
        selectConversation,
        handleTyping
      }}
    >
      {children}
    </MessageContext.Provider>
  );
}; 