import { useState, useContext, useEffect } from 'react';
import { MessageContext } from '../../context/MessageContext';
import { AuthContext } from '../../context/AuthContext';
import NewConversationModal from './NewConversationModal';

const ConversationList = () => {
  const { conversations, selectConversation, activeConversation, loadConversations } = useContext(MessageContext);
  const { user } = useContext(AuthContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const getOtherParticipant = (conversation) => {
    if (!conversation || !conversation.participants) return { username: 'Utente sconosciuto' };
    
    const otherParticipant = conversation.participants.find(p => p._id !== user?.userId);
    return otherParticipant || { username: 'Utente sconosciuto' };
  };

  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      // Oggi - mostra solo l'ora
      return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      // Ieri
      return 'Ieri';
    } else if (diffInDays < 7) {
      // Questa settimana - mostra il giorno
      return date.toLocaleDateString('it-IT', { weekday: 'short' });
    } else {
      // Più di una settimana - mostra data completa
      return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
  };

  const getLastMessagePreview = (conversation) => {
    if (!conversation.lastMessage) return 'Nessun messaggio';
    return conversation.lastMessage.content.length > 25
      ? `${conversation.lastMessage.content.substring(0, 25)}...`
      : conversation.lastMessage.content;
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Messaggi</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2 rounded-full text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="mt-2">
          <input
            type="text"
            placeholder="Cerca conversazioni..."
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p>Nessuna conversazione attiva</p>
          </div>
        ) : (
          <ul>
            {conversations.map((conversation) => {
              const otherParticipant = getOtherParticipant(conversation);
              const isActive = activeConversation?._id === conversation._id;
              
              return (
                <li
                  key={conversation._id}
                  onClick={() => selectConversation(conversation)}
                  className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isActive ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
                        {otherParticipant.username?.charAt(0).toUpperCase()}
                      </div>
                      {conversation.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {otherParticipant.username}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {formatLastMessageTime(conversation.updatedAt)}
                        </span>
                      </div>
                      <p className={`text-sm ${conversation.unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-500'} truncate`}>
                        {getLastMessagePreview(conversation)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      
      <NewConversationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default ConversationList; 