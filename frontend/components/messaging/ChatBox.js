import { useState, useContext, useEffect, useRef } from 'react';
import { MessageContext } from '../../context/MessageContext';
import { AuthContext } from '../../context/AuthContext';

const ChatBox = () => {
  const { activeConversation, messages, sendNewMessage, typingUsers, handleTyping } = useContext(MessageContext);
  const { user } = useContext(AuthContext);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const messagesEndRef = useRef(null);

  // Effetto per lo scorrimento automatico
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Gestione digitazione
  useEffect(() => {
    if (newMessage.trim() && !isTyping) {
      setIsTyping(true);
      handleTyping(true);
    }

    // Cancella il timeout precedente se esiste
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Imposta un nuovo timeout
    const timeout = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        handleTyping(false);
      }
    }, 1000);

    setTypingTimeout(timeout);

    // Pulizia alla dismount
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [newMessage, isTyping, typingTimeout, handleTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !activeConversation) return;
    
    try {
      await sendNewMessage(activeConversation._id, newMessage);
      setNewMessage('');
      setIsTyping(false);
      handleTyping(false);
    } catch (err) {
      console.error('Errore nell\'invio del messaggio:', err);
    }
  };

  const getOtherParticipant = () => {
    if (!activeConversation || !activeConversation.participants) return { username: 'Utente' };
    
    const otherParticipant = activeConversation.participants.find(
      (p) => p._id !== user?.userId
    );
    
    return otherParticipant || { username: 'Utente' };
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  // Verifica se un messaggio è dell'utente corrente
  const isOwnMessage = (message) => {
    // Controllo stringente con log di debug
    if (!message || !message.sender || !user) {
      console.log('Messaggio non valido o utente non autenticato', { message, user });
      return false;
    }
    
    // Estrai gli ID e convertili in stringhe per un confronto affidabile
    const senderId = typeof message.sender === 'object' ? message.sender._id : message.sender;
    const currentUserId = user.userId;
    
    const isOwn = String(senderId) === String(currentUserId);
    
    // Log per debug
    console.log('Controllo messaggio:', { 
      messaggio: message.content?.substring(0, 15),
      senderId, 
      currentUserId,
      isOwn 
    });
    
    return isOwn;
  };

  // Verifica se l'altro utente sta digitando
  const isOtherUserTyping = () => {
    if (!activeConversation) return false;
    return typingUsers[activeConversation._id] !== undefined;
  };

  if (!activeConversation) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <p className="text-lg">Seleziona o crea una conversazione per iniziare</p>
        </div>
      </div>
    );
  }

  const otherParticipant = getOtherParticipant();

  return (
    <div className="h-full flex flex-col">
      {/* Header della chat */}
      <div className="p-4 border-b border-gray-200 bg-white flex items-center">
        <div className="flex-shrink-0 mr-3">
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
            {otherParticipant.username?.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900">
            {otherParticipant.username}
          </h3>
          {isOtherUserTyping() && (
            <p className="text-sm text-gray-500">Sta scrivendo...</p>
          )}
        </div>
      </div>
      
      {/* Area messaggi */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p>Nessun messaggio. Inizia la conversazione!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const own = isOwnMessage(message);
              
              return (
                <div
                  key={message._id}
                  className={`w-full flex ${own ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg ${
                      own ? 'bg-blue-500 text-white' : 'bg-white text-gray-800 border border-gray-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    <p
                      className={`text-xs mt-1 text-right ${
                        own ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {formatMessageTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            
            {/* Indicatore di digitazione */}
            {isOtherUserTyping() && (
              <div className="flex justify-start">
                <div className="px-4 py-2 rounded-lg bg-gray-200 text-gray-500 flex items-center">
                  <span className="typing-dots">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Form invio messaggi */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSendMessage} className="flex items-center">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Scrivi un messaggio..."
            className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>

      <style jsx>{`
        .typing-dots {
          display: flex;
          align-items: center;
        }
        .dot {
          width: 8px;
          height: 8px;
          margin: 0 2px;
          background-color: #6b7280;
          border-radius: 50%;
          display: inline-block;
          animation: typing-dot 1.4s infinite ease-in-out both;
        }
        .dot:nth-child(1) {
          animation-delay: -0.32s;
        }
        .dot:nth-child(2) {
          animation-delay: -0.16s;
        }
        @keyframes typing-dot {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ChatBox; 