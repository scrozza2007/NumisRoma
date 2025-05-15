import { useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import ConversationList from './ConversationList';
import ChatBox from './ChatBox';

const MessageContainer = () => {
  const { user, isLoading } = useContext(AuthContext);
  const router = useRouter();

  // Reindirizza alla pagina di login se l'utente non è autenticato
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login?redirect=/messages');
    }
  }, [user, isLoading, router]);

  // Mostra un loader durante il caricamento dell'autenticazione
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Passa il controllo al router per la redirezione se l'utente non è autenticato
  if (!user) {
    return null;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-100">
      <div className="w-full md:w-1/3 lg:w-1/4 h-full">
        <ConversationList />
      </div>
      <div className="hidden md:block md:w-2/3 lg:w-3/4 h-full">
        <ChatBox />
      </div>
    </div>
  );
};

export default MessageContainer; 