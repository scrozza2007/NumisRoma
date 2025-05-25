import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import NotificationToast from '../components/NotificationToast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchUsers, setSearchUsers] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [lastMessageId, setLastMessageId] = useState(null);
  const pollingRef = useRef(null);
  const { user, isLoading: authLoading } = useContext(AuthContext);
  const router = useRouter();

  // Controlla autenticazione
  useEffect(() => {
    if (!authLoading && !user) {
      // Evita redirect multipli controllando la route corrente
      if (router.pathname !== '/login') {
        router.replace('/login');
      }
    }
  }, [user, authLoading, router]);

  // Gestione errori di navigazione
  useEffect(() => {
    const handleRouteError = (err) => {
      console.error('Errore di navigazione:', err);
      // Non fare nulla per errori di navigazione invariant
      if (err.message && err.message.includes('Invariant')) {
        return;
      }
    };

    router.events.on('routeChangeError', handleRouteError);
    
    return () => {
      router.events.off('routeChangeError', handleRouteError);
    };
  }, [router]);

  // Funzione per aggiungere notifiche
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    const notification = { id, message, type };
    setNotifications(prev => [...prev, notification]);
  };

  // Funzione per rimuovere notifiche
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  // Carica conversazioni
  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  // Polling per aggiornamenti in tempo reale
  useEffect(() => {
    if (user && selectedConversation) {
      // Polling ogni 3 secondi per nuovi messaggi
      pollingRef.current = setInterval(() => {
        fetchMessages(selectedConversation._id, true); // true = silent update
      }, 3000);

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    }
  }, [user, selectedConversation]);

  // Polling per aggiornamenti conversazioni
  useEffect(() => {
    if (user) {
      const conversationPolling = setInterval(() => {
        fetchConversations(true); // true = silent update
      }, 5000);

      return () => clearInterval(conversationPolling);
    }
  }, [user]);

  const fetchConversations = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/messages/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Errore nel caricamento conversazioni:', error);
      if (!silent) {
        addNotification('Errore nel caricamento conversazioni', 'error');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchMessages = async (conversationId, silent = false) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/messages/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Controlla se ci sono nuovi messaggi REALI (non solo conteggio)
        if (silent && data.length > 0) {
          const latestMessage = data[data.length - 1];
          
          // Verifica se è davvero un nuovo messaggio (ID diverso dall'ultimo)
          if (lastMessageId && latestMessage._id !== lastMessageId && latestMessage.sender._id !== user._id) {
            addNotification(`Nuovo messaggio da ${latestMessage.sender.username}`, 'message');
          }
          
          // Aggiorna l'ID dell'ultimo messaggio
          setLastMessageId(latestMessage._id);
        }
        
        setMessages(data);
        setLastMessageCount(data.length);
        
        // Aggiorna l'ID dell'ultimo messaggio anche per caricamenti non silenziosi
        if (!silent && data.length > 0) {
          setLastMessageId(data[data.length - 1]._id);
        }
        
        // Segna come letti solo se non è un aggiornamento silenzioso
        if (!silent) {
          markAsRead(conversationId);
        }
      }
    } catch (error) {
      console.error('Errore nel caricamento messaggi:', error);
      if (!silent) {
        addNotification('Errore nel caricamento messaggi', 'error');
      }
    }
  };

  const markAsRead = async (conversationId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/messages/${conversationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Errore nel segnare come letti:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/messages/${selectedConversation._id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          messageType: 'text'
        })
      });

      if (response.ok) {
        const message = await response.json();
        setMessages(prev => [...prev, message]);
        setNewMessage('');
        setLastMessageCount(prev => prev + 1);
        setLastMessageId(message._id); // Aggiorna l'ID dell'ultimo messaggio
        // Aggiorna la lista conversazioni
        fetchConversations(true);
      } else {
        addNotification('Errore nell\'invio del messaggio', 'error');
      }
    } catch (error) {
      console.error('Errore nell\'invio messaggio:', error);
      addNotification('Errore nell\'invio del messaggio', 'error');
    }
  };

  const searchUsersForChat = async (query) => {
    if (!query || query.length < 2) {
      setFoundUsers([]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/messages/search/users?query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFoundUsers(data);
      }
    } catch (error) {
      console.error('Errore nella ricerca utenti:', error);
      addNotification('Errore nella ricerca utenti', 'error');
    }
  };

  const startConversation = async (otherUserId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/messages/conversations/${otherUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const conversation = await response.json();
        setSelectedConversation(conversation);
        setLastMessageId(null); // Reset tracking quando si cambia conversazione
        setLastMessageCount(0); // Reset conteggio
        fetchMessages(conversation._id);
        fetchConversations();
        setShowUserSearch(false);
        setSearchUsers('');
        setFoundUsers([]);
        addNotification('Conversazione avviata', 'success');
      }
    } catch (error) {
      console.error('Errore nella creazione conversazione:', error);
      addNotification('Errore nella creazione conversazione', 'error');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getOtherUser = (conversation) => {
    return conversation.participants.find(p => p._id !== user._id);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Oggi';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ieri';
    } else {
      return date.toLocaleDateString('it-IT');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Messaggi - NumisRoma</title>
        <meta name="description" content="Messaggistica diretta tra collezionisti" />
      </Head>

      {/* Notifiche */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <NotificationToast
            key={notification.id}
            message={notification.message}
            type={notification.type}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden h-[calc(100vh-8rem)]">
            <div className="flex h-full">
              {/* Sidebar Conversazioni */}
              <div className="w-1/3 border-r border-gray-200 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-gray-900">Messaggi</h1>
                    <button
                      onClick={() => setShowUserSearch(!showUserSearch)}
                      className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  </div>

                  {/* Ricerca Utenti */}
                  {showUserSearch && (
                    <div className="mt-4">
                      <input
                        type="text"
                        placeholder="Cerca utenti..."
                        value={searchUsers}
                        onChange={(e) => {
                          setSearchUsers(e.target.value);
                          searchUsersForChat(e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      />
                      
                      {foundUsers.length > 0 && (
                        <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                          {foundUsers.map(foundUser => (
                            <div
                              key={foundUser._id}
                              onClick={() => startConversation(foundUser._id)}
                              className="p-3 hover:bg-gray-50 cursor-pointer flex items-center space-x-3"
                            >
                              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {foundUser.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{foundUser.username}</p>
                                {foundUser.fullName && (
                                  <p className="text-sm text-gray-500">{foundUser.fullName}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Lista Conversazioni */}
                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <p>Nessuna conversazione ancora.</p>
                      <p className="text-sm mt-1">Inizia una nuova conversazione!</p>
                    </div>
                  ) : (
                    conversations.map(conversation => {
                      const otherUser = getOtherUser(conversation);
                      return (
                        <div
                          key={conversation._id}
                          onClick={() => {
                            setSelectedConversation(conversation);
                            setLastMessageId(null); // Reset tracking quando si cambia conversazione
                            setLastMessageCount(0); // Reset conteggio
                            fetchMessages(conversation._id);
                          }}
                          className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedConversation?._id === conversation._id ? 'bg-yellow-50 border-yellow-200' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white font-medium">
                              {otherUser?.username?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {otherUser?.fullName || otherUser?.username}
                              </p>
                              {conversation.lastMessage && (
                                <p className="text-sm text-gray-500 truncate">
                                  {conversation.lastMessage.content}
                                </p>
                              )}
                            </div>
                            {conversation.lastActivity && (
                              <div className="text-xs text-gray-400">
                                {formatTime(conversation.lastActivity)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Area Chat */}
              <div className="flex-1 flex flex-col">
                {selectedConversation ? (
                  <>
                    {/* Header Chat */}
                    <div className="p-4 border-b border-gray-200 bg-white">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-medium">
                          {getOtherUser(selectedConversation)?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h2 className="font-medium text-gray-900">
                            {getOtherUser(selectedConversation)?.fullName || getOtherUser(selectedConversation)?.username}
                          </h2>
                          <p className="text-sm text-gray-500">
                            @{getOtherUser(selectedConversation)?.username}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Messaggi */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.map(message => (
                        <div
                          key={message._id}
                          className={`flex ${message.sender._id === user._id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender._id === user._id
                              ? 'bg-yellow-500 text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}>
                            <p className="text-sm">{message.content}</p>
                            <p className={`text-xs mt-1 ${
                              message.sender._id === user._id ? 'text-yellow-100' : 'text-gray-500'
                            }`}>
                              {formatTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Input Messaggio */}
                    <div className="p-4 border-t border-gray-200 bg-white">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Scrivi un messaggio..."
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        />
                        <button
                          onClick={sendMessage}
                          disabled={!newMessage.trim()}
                          className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Invia
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-lg font-medium">Seleziona una conversazione</p>
                      <p className="text-sm mt-1">Scegli una conversazione dalla lista o iniziane una nuova</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Messages;