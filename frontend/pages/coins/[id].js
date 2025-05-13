import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';

const CoinDetail = ({ coinId }) => {
  const [coin, setCoin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState('obverse');
  const [isZoomed, setIsZoomed] = useState(false);

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
      setError('An error occurred while loading the coin. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (coinId) {
      fetchCoinDetails();
    }
  }, [coinId]);

  const handleImageClick = (side) => {
    setActiveImage(side);
    setIsZoomed(true);
  };

  const handleZoomClose = () => {
    setIsZoomed(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{coin ? `${coin.name} - NumisRoma` : 'Coin Details - NumisRoma'}</title>
        <meta name="description" content="Details of the Roman Imperial coin" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container mx-auto py-12 px-4">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center space-x-2">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        ) : coin ? (
          <>
            {/* Breadcrumb */}
            <div className="mb-8">
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li className="inline-flex items-center">
                    <Link href="/" className="text-gray-600 hover:text-yellow-600 transition-colors duration-200">
                      Home
                    </Link>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <Link href="/browse" className="ml-1 text-gray-600 hover:text-yellow-600 transition-colors duration-200">
                        Browse
                      </Link>
                    </div>
                  </li>
                  <li aria-current="page">
                    <div className="flex items-center">
                      <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="ml-1 text-gray-500">{coin.name}</span>
                    </div>
                  </li>
                </ol>
              </nav>
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">{coin.name}</h1>
                <div className="flex items-center space-x-4 text-gray-600">
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {coin.description?.date_range}
                  </span>
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {coin.description?.material}
                  </span>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Left Column - Images */}
                  <div className="space-y-8">
                    <div className="bg-gray-50 rounded-xl p-8">
                      <div className="grid grid-cols-2 gap-8">
                        <div 
                          className="group relative cursor-pointer"
                          onClick={() => handleImageClick('obverse')}
                        >
                          <div className="aspect-square bg-white rounded-lg overflow-hidden shadow-md">
                            <img
                              src={coin.obverse?.image || '/images/coin-placeholder.jpg'}
                              alt={`Obverse - ${coin.name}`}
                              className="w-full h-full object-contain p-6 transition-transform duration-300 group-hover:scale-105"
                              style={{ backgroundColor: 'white' }}
                            />
                          </div>
                          <div className="absolute inset-0 group-hover:bg-opacity-10 transition-opacity duration-300 flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black bg-opacity-50 px-4 py-2 rounded-full">
                              Click to zoom
                            </span>
                          </div>
                        </div>
                        <div 
                          className="group relative cursor-pointer"
                          onClick={() => handleImageClick('reverse')}
                        >
                          <div className="aspect-square bg-white rounded-lg overflow-hidden shadow-md">
                            <img
                              src={coin.reverse?.image || '/images/coin-placeholder.jpg'}
                              alt={`Reverse - ${coin.name}`}
                              className="w-full h-full object-contain p-6 transition-transform duration-300 group-hover:scale-105"
                              style={{ backgroundColor: 'white' }}
                            />
                          </div>
                          <div className="absolute inset-0 group-hover:bg-opacity-10 transition-opacity duration-300 flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black bg-opacity-50 px-4 py-2 rounded-full">
                              Click to zoom
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Image Zoom Modal */}
                    {isZoomed && (
                      <div 
                        className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
                        onClick={handleZoomClose}
                      >
                        <div className="relative max-w-4xl w-full bg-white rounded-xl p-4">
                          <button
                            onClick={handleZoomClose}
                            className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors duration-200"
                          >
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <img
                            src={activeImage === 'obverse' ? coin.obverse?.image : coin.reverse?.image}
                            alt={`${activeImage === 'obverse' ? 'Obverse' : 'Reverse'} - ${coin.name}`}
                            className="w-full h-auto rounded-lg"
                            style={{ backgroundColor: 'white' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Information */}
                  <div className="space-y-8">
                    {/* Imperial Information */}
                    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-shadow duration-300">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
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

                    {/* Physical Characteristics */}
                    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-shadow duration-300">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
                  {/* Obverse Details */}
                  <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
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

                  {/* Reverse Details */}
                  <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
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
                <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-lg hover:shadow-xl transition-shadow duration-300 mt-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
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
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default CoinDetail;

export async function getServerSideProps(context) {
  return {
    props: {
      coinId: context.params.id
    }
  };
}