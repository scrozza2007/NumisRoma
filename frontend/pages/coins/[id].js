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
        throw new Error('Response is not in JSON format!');
      }

      const data = await response.json();
      setCoin(data);
    } catch (error) {
      console.error('Error while retrieving the coin:', error);
      setError('An error occurred while loading the coin. Please verify that the server is running.');
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
        <title>{coin ? `${coin.name} - NumisRoma` : 'Coin Details - NumisRoma'}</title>
        <meta name="description" content="Details of the Roman Imperial coin" />
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
            <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                {/* Left Column - Images with Zoom */}
                <div className="flex flex-col">
                  <div className="text-center mb-6">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">{coin.name}</h1>
                  </div>
                  <div className="bg-white rounded-xl overflow-hidden p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-shadow duration-300 flex-grow">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                      <svg className="w-6 h-6 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Coin Images
                    </h2>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="group relative">
                        <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden">
                          <img
                            src={coin.obverse?.image || '/images/coin-placeholder.jpg'}
                            alt={`Obverse - ${coin.name}`}
                            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity duration-300 flex items-center justify-center">
                          <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black bg-opacity-50 px-4 py-2 rounded-full">
                            Click to zoom
                          </span>
                        </div>
                      </div>
                      <div className="group relative">
                        <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden">
                          <img
                            src={coin.reverse?.image || '/images/coin-placeholder.jpg'}
                            alt={`Reverse - ${coin.name}`}
                            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity duration-300 flex items-center justify-center">
                          <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black bg-opacity-50 px-4 py-2 rounded-full">
                            Click to zoom
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Basic Information */}
                <div className="flex flex-col space-y-8">
                  <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                      <svg className="w-6 h-6 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Imperial Information
                    </h2>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-500">Emperor</h3>
                        <p className="mt-2 text-lg text-gray-900">{coin.authority?.emperor || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-500">Dynasty</h3>
                        <p className="mt-2 text-lg text-gray-900">{coin.authority?.dynasty || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-500">Period</h3>
                        <p className="mt-2 text-lg text-gray-900">{coin.description?.date_range || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-500">Mint</h3>
                        <p className="mt-2 text-lg text-gray-900">{coin.description?.mint || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                      <svg className="w-6 h-6 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Physical Characteristics
                    </h2>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-500">Denomination</h3>
                        <p className="mt-2 text-lg text-gray-900">{coin.description?.denomination || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-500">Material</h3>
                        <p className="mt-2 text-lg text-gray-900">{coin.description?.material || 'N/A'}</p>
                      </div>
                      {coin.description?.weight && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-sm font-medium text-gray-500">Weight</h3>
                          <p className="mt-2 text-lg text-gray-900">{coin.description.weight}</p>
                        </div>
                      )}
                      {coin.description?.diameter && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-sm font-medium text-gray-500">Diameter</h3>
                          <p className="mt-2 text-lg text-gray-900">{coin.description.diameter}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    Obverse Details
                  </h2>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-500">Legend</h3>
                      <p className="mt-2 text-lg text-gray-900">{coin.obverse?.legend || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-500">Type</h3>
                      <p className="mt-2 text-lg text-gray-900">{coin.obverse?.type || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-500">Portrait</h3>
                      <p className="mt-2 text-lg text-gray-900">{coin.obverse?.portrait || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    Reverse Details
                  </h2>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-500">Legend</h3>
                      <p className="mt-2 text-lg text-gray-900">{coin.reverse?.legend || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-500">Type</h3>
                      <p className="mt-2 text-lg text-gray-900">{coin.reverse?.type || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-500">Deity</h3>
                      <p className="mt-2 text-lg text-gray-900">{coin.reverse?.deity || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Historical Context */}
              <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-lg hover:shadow-xl transition-shadow duration-300 mb-12">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Historical Context
                </h2>
                <div className="prose max-w-none">
                  {coin.description?.notes ? (
                    <p className="text-lg text-gray-700 leading-relaxed">{coin.description.notes}</p>
                  ) : (
                    <p className="text-lg text-gray-500 italic">No historical information available.</p>
                  )}
                </div>
              </div>

              {/* Related Coins */}
              <div className="bg-gray-50 rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <svg className="w-8 h-8 mr-3 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Related Coins
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="aspect-square bg-gray-100">
                        <img src="/images/coin-placeholder.jpg" alt="Related coin" className="w-full h-full object-cover" />
                      </div>
                      <div className="p-4">
                        <p className="text-lg font-medium text-gray-800 truncate">Similar Coin {item}</p>
                        <p className="text-base text-gray-500">Roman Period</p>
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
            <p className="text-xl text-gray-600 mt-4">Coin not found</p>
            <Link href="/browse" className="mt-4 inline-block px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors duration-200">
              Return to catalog
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