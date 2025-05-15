import { useState, useEffect, useContext } from 'react';
import { MessageContext } from '../../context/MessageContext';
import * as messageService from '../../services/messageService';

const NewConversationModal = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { createNewConversation, selectConversation } = useContext(MessageContext);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await messageService.getAvailableUsers();
      setUsers(data);
    } catch (err) {
      setError('Errore nel caricamento degli utenti');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = async (userId) => {
    try {
      const newConversation = await createNewConversation(userId);
      selectConversation(newConversation);
      onClose();
    } catch (err) {
      setError('Errore nella creazione della conversazione');
      console.error(err);
    }
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Nuova conversazione</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-4">
            <input
              type="text"
              placeholder="Cerca utenti..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto p-2">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              Caricamento utenti...
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">
              {error}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchTerm ? "Nessun utente trovato" : "Nessun utente disponibile"}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <li
                  key={user._id}
                  className="p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleStartConversation(user._id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.username}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewConversationModal; 