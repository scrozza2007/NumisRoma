import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';

const CoinDetail = ({ coinId }) => {
  const [coin, setCoin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCoinDetails = async () => {
    setLoading(true);
    try {
      // Verifica che il server sia in esecuzione sulla porta corretta
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
            {error}
          </div>
        ) : coin ? (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
              {/* Immagini */}
              <div className="space-y-8">
                <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden">
                  <img
                    src={coin.obverse?.image || '/images/coin-placeholder.jpg'}
                    alt={`Dritto - ${coin.name}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden">
                  <img
                    src={coin.reverse?.image || '/images/coin-placeholder.jpg'}
                    alt={`Rovescio - ${coin.name}`}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Dettagli */}
              <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-800">{coin.name}</h1>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h2 className="text-sm font-medium text-gray-500">Imperatore</h2>
                    <p className="mt-1 text-lg text-gray-900">{coin.authority?.emperor}</p>
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-gray-500">Dinastia</h2>
                    <p className="mt-1 text-lg text-gray-900">{coin.authority?.dynasty}</p>
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-gray-500">Periodo</h2>
                    <p className="mt-1 text-lg text-gray-900">{coin.description?.date_range}</p>
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-gray-500">Zecca</h2>
                    <p className="mt-1 text-lg text-gray-900">{coin.description?.mint}</p>
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-gray-500">Denominazione</h2>
                    <p className="mt-1 text-lg text-gray-900">{coin.description?.denomination}</p>
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-gray-500">Materiale</h2>
                    <p className="mt-1 text-lg text-gray-900">{coin.description?.material}</p>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Dritto</h2>
                    <p className="text-gray-600">{coin.obverse?.legend}</p>
                    <p className="text-gray-600">{coin.obverse?.type}</p>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Rovescio</h2>
                    <p className="text-gray-600">{coin.reverse?.legend}</p>
                    <p className="text-gray-600">{coin.reverse?.type}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h2 className="text-lg font-semibold text-gray-800 mb-2">Crediti</h2>
                  <p className="text-sm text-gray-600">Immagine dritto: {coin.obverse?.credits}</p>
                  <p className="text-sm text-gray-600">Immagine rovescio: {coin.reverse?.credits}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">Moneta non trovata</p>
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