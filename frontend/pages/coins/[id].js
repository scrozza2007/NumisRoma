import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';

const CoinDetail = ({ coinId }) => {
  const [coin, setCoin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState('obverse');

  const fetchCoinDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/api/coins/${coinId}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('La risposta non è in formato JSON!');
      }

      const data = await response.json();
      setCoin(data);
    } catch (error) {
      console.error('Errore durante il recupero della moneta:', error);
      setError('Si è verificato un errore durante il caricamento della moneta. Verifica che il server sia in esecuzione.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (coinId) {
      fetchCoinDetails();
    }
  }, [coinId]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Head>
        <title>{coin ? `${coin.name} - NumisRoma` : 'Dettagli Moneta - NumisRoma'}</title>
        <meta name="description" content="Dettagli della moneta romana imperiale" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-yellow-500 shadow-md">
        <div className="container mx-auto flex justify-between items-center py-4 px-6">
          <Link href="/">
            <img src="/images/logo.png" alt="NumisRoma Logo" className="h-10" />
          </Link>
          <nav className="flex space-x-4">
            <Link href="/browse" className="text-white hover:underline">Browse</Link>
            <Link href="/search" className="text-white hover:underline">Search</Link>
            <Link href="/community" className="text-white hover:underline">Community</Link>
            <Link href="/resources" className="text-white hover:underline">Resources</Link>
            <Link href="/symbols" className="text-white hover:underline">Symbols</Link>
            <Link href="/contact" className="text-white hover:underline">Contact</Link>
          </nav>
          <div className="flex space-x-4">
            <Link href="/login" className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors duration-200">Sign In</Link>
            <Link href="/register" className="px-4 py-2 bg-white text-black rounded hover:bg-gray-200 transition-colors duration-200">Register</Link>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto py-8 px-4">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">
            <div className="flex items-center">
              <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p>{error}</p>
            </div>
          </div>
        ) : coin ? (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h1 className="text-2xl font-medium text-gray-900">{coin.name}</h1>
              <div className="flex items-center mt-1">
                <span className="text-sm text-gray-600">
                  {coin.description?.date_range || 'Data sconosciuta'}
                </span>
              </div>
            </div>

            <div className="p-6">
              {/* Immagini e Dettagli Base */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Colonna Sinistra - Immagini */}
                <div>
                  <div className="bg-gray-50 rounded-lg overflow-hidden p-5 border border-gray-100 shadow-sm">
                    <div className="grid grid-cols-2 gap-5">
                      <div className="aspect-square flex items-center justify-center">
                        <img
                          src={coin.obverse?.image || '/images/coin-placeholder.jpg'}
                          alt={`Dritto - ${coin.name}`}
                          className="w-10/12 h-10/12 object-contain transition-all duration-300 hover:scale-105"
                        />
                      </div>
                      <div className="aspect-square flex items-center justify-center">
                        <img
                          src={coin.reverse?.image || '/images/coin-placeholder.jpg'}
                          alt={`Rovescio - ${coin.name}`}
                          className="w-10/12 h-10/12 object-contain transition-all duration-300 hover:scale-105"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Colonna Destra - Informazioni Base */}
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 shadow-sm">
                    <h2 className="text-base font-medium text-gray-900 mb-4">Informazioni Imperiali</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-xs font-medium text-gray-500">Imperatore</h3>
                        <p className="mt-1 text-sm text-gray-900">{coin.authority?.emperor || 'N/A'}</p>
                      </div>
                      <div>
                        <h3 className="text-xs font-medium text-gray-500">Dinastia</h3>
                        <p className="mt-1 text-sm text-gray-900">{coin.authority?.dynasty || 'N/A'}</p>
                      </div>
                      <div>
                        <h3 className="text-xs font-medium text-gray-500">Periodo</h3>
                        <p className="mt-1 text-sm text-gray-900">{coin.description?.date_range || 'N/A'}</p>
                      </div>
                      <div>
                        <h3 className="text-xs font-medium text-gray-500">Zecca</h3>
                        <p className="mt-1 text-sm text-gray-900">{coin.description?.mint || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 shadow-sm">
                    <h2 className="text-base font-medium text-gray-900 mb-4">Caratteristiche Fisiche</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-xs font-medium text-gray-500">Denominazione</h3>
                        <p className="mt-1 text-sm text-gray-900">{coin.description?.denomination || 'N/A'}</p>
                      </div>
                      <div>
                        <h3 className="text-xs font-medium text-gray-500">Materiale</h3>
                        <p className="mt-1 text-sm text-gray-900">{coin.description?.material || 'N/A'}</p>
                      </div>
                      {coin.description?.weight && (
                        <div>
                          <h3 className="text-xs font-medium text-gray-500">Peso</h3>
                          <p className="mt-1 text-sm text-gray-900">{coin.description.weight}</p>
                        </div>
                      )}
                      {coin.description?.diameter && (
                        <div>
                          <h3 className="text-xs font-medium text-gray-500">Diametro</h3>
                          <p className="mt-1 text-sm text-gray-900">{coin.description.diameter}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dettagli Dritto e Rovescio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 shadow-sm">
                  <h2 className="text-base font-medium text-gray-900 mb-4">Dettagli Dritto</h2>
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xs font-medium text-gray-500">Legenda</h3>
                      <p className="mt-1 text-sm text-gray-900">{coin.obverse?.legend || 'N/A'}</p>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium text-gray-500">Tipo</h3>
                      <p className="mt-1 text-sm text-gray-900">{coin.obverse?.type || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 shadow-sm">
                  <h2 className="text-base font-medium text-gray-900 mb-4">Dettagli Rovescio</h2>
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xs font-medium text-gray-500">Legenda</h3>
                      <p className="mt-1 text-sm text-gray-900">{coin.reverse?.legend || 'N/A'}</p>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium text-gray-500">Tipo</h3>
                      <p className="mt-1 text-sm text-gray-900">{coin.reverse?.type || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Spazio per la Storia delle Monete */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 shadow-sm">
                <h2 className="text-base font-medium text-gray-900 mb-4">Storia e Contesto</h2>
                <div className="prose max-w-none">
                  {coin.description?.notes ? (
                    <p className="text-sm text-gray-700 leading-relaxed">{coin.description.notes}</p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Nessuna informazione storica disponibile.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 border-t border-gray-200">
              <div className="container mx-auto">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Monete Correlate</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Placeholder per monete correlate */}
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-200">
                      <div className="aspect-square bg-gray-100">
                        <img src="/images/coin-placeholder.jpg" alt="Moneta correlata" className="w-full h-full object-cover" />
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium text-gray-800 truncate">Moneta Simile {item}</p>
                        <p className="text-xs text-gray-500">Periodo Romano</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xl text-gray-600 mt-4">Moneta non trovata</p>
            <Link href="/browse" className="mt-4 inline-block px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors duration-200">
              Torna al catalogo
            </Link>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-800">About NumisRoma</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Our Mission</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Research</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Publications</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Contributors</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-800">Resources</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Coin Database</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Historical Maps</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Timeline</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Bibliography</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-800">Community</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Forum</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Events</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Newsletter</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex justify-center space-x-4">
          <Link href="#" aria-label="Twitter" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">
            <img src="/images/twitter-icon.svg" alt="Twitter" className="h-6" />
          </Link>
          <Link href="#" aria-label="Instagram" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">
            <img src="/images/instagram-icon.svg" alt="Instagram" className="h-6" />
          </Link>
          <Link href="#" aria-label="YouTube" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">
            <img src="/images/youtube-icon.svg" alt="YouTube" className="h-6" />
          </Link>
          <Link href="#" aria-label="LinkedIn" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">
            <img src="/images/linkedin-icon.svg" alt="LinkedIn" className="h-6" />
          </Link>
        </div>
      </footer>
    </div>
  );
};

export async function getServerSideProps(context) {
  return {
    props: {
      coinId: context.params.id
    }
  };
}

export default CoinDetail;