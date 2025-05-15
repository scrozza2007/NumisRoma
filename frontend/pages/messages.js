import Head from 'next/head';
import { useContext, useEffect, useState } from 'react';
import { MessageContext } from '../context/MessageContext';
import { AuthContext } from '../context/AuthContext';
import MessageContainer from '../components/messaging/MessageContainer';
import ChatBox from '../components/messaging/ChatBox';

export default function Messages() {
  const { unreadCount, activeConversation } = useContext(MessageContext);
  const { user } = useContext(AuthContext);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);

  // Effetto per gestire la visualizzazione su mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    // Imposta lo stato iniziale
    handleResize();

    // Aggiungi il listener per il ridimensionamento
    window.addEventListener('resize', handleResize);

    // Pulizia
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Mostra la chat quando viene selezionata una conversazione su mobile
  useEffect(() => {
    if (activeConversation && isMobileView) {
      setShowChatOnMobile(true);
    }
  }, [activeConversation, isMobileView]);

  return (
    <>
      <Head>
        <title>
          Messaggi{unreadCount > 0 ? ` (${unreadCount})` : ''} | NumisRoma
        </title>
        <meta name="description" content="Sistema di messaggistica di NumisRoma" />
      </Head>

      <main>
        {/* Visualizzazione Desktop */}
        <div className="hidden md:block">
          <MessageContainer />
        </div>

        {/* Visualizzazione Mobile */}
        <div className="md:hidden h-[calc(100vh-4rem)] bg-gray-100">
          {showChatOnMobile && activeConversation ? (
            <div className="h-full relative">
              <button
                onClick={() => setShowChatOnMobile(false)}
                className="absolute top-4 left-4 z-10 p-2 rounded-full bg-gray-200 text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <ChatBox />
            </div>
          ) : (
            <div className="h-full">
              <div className="h-full">
                <MessageContainer />
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
} 