import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Image from 'next/image';

const CoinDetail = ({ coinId }) => {
  const router = useRouter();
  const [coin, setCoin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState('obverse');
  const [isZoomed, setIsZoomed] = useState(false);
  const [hasFilters, setHasFilters] = useState(false);

  const fetchCoinDetails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/coins/${coinId}`, {
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
  }, [coinId]);

  useEffect(() => {
    if (router.query.id) {
      fetchCoinDetails();
    }
    
    // Check if there are saved filters
    const savedFilters = localStorage.getItem('coinFilters');
    setHasFilters(!!savedFilters);
  }, [router.query.id, fetchCoinDetails]);

  const handleImageClick = (side) => {
    setActiveImage(side);
    setIsZoomed(true);
  };

  const handleZoomClose = () => {
    setIsZoomed(false);
  };

  // Handle back navigation while preserving filters
  const handleBackToResults = (e) => {
    e.preventDefault();
    // Set a flag that we're coming from a coin detail page
    localStorage.setItem('lastVisitedPage', 'coin-detail');
    // Navigate to the browse page
    router.push('/browse');
  };

  // Helper function to check if data exists and is not empty
  const hasValidData = (data) => {
    return data !== undefined && 
           data !== null && 
           data !== '' && 
           (typeof data !== 'object' || Object.keys(data).length > 0);
  };

  // Helper function to render field data if it exists
  const renderField = (label, value, className = "") => {
    if (!hasValidData(value)) return null;
    
    return (
      <div className={`bg-gray-50 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 ${className}`}>
        <h3 className="text-sm font-medium text-yellow-600">{label}</h3>
        <p className="mt-2 text-lg text-gray-900 font-medium">{value}</p>
      </div>
    );
  };

  // Helper function to render all valid fields from an object
  const renderObjectFields = (obj, excludeFields = []) => {
    if (!obj) return null;
    
    // Format field name from camelCase or snake_case to Title Case for display
    const formatFieldName = (fieldName) => {
      return fieldName
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
    };

    return Object.entries(obj)
      .filter(([key, value]) => 
        !excludeFields.includes(key) && 
        hasValidData(value) && 
        typeof value !== 'object'
      )
      .map(([key, value]) => renderField(formatFieldName(key), value, "mb-4"));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Head>
        <title>{coin ? `${coin.name} - NumisRoma` : 'Coin Details - NumisRoma'}</title>
        <meta name="description" content="Details of the Roman Imperial coin" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container mx-auto py-12 px-4 sm:px-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-xl flex items-center space-x-3 shadow-md">
            <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        ) : coin ? (
          <>
            {/* Breadcrumb */}
            <div className="mb-8 flex flex-wrap items-center justify-between">
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3 bg-white py-2 px-4 rounded-full shadow-sm">
                  <li className="inline-flex items-center">
                    <Link href="/" className="text-gray-600 hover:text-yellow-600 transition-colors duration-200 font-medium">
                      Home
                    </Link>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <Link href="/browse" className="ml-1 text-gray-600 hover:text-yellow-600 transition-colors duration-200 font-medium">
                        Browse
                      </Link>
                    </div>
                  </li>
                  <li aria-current="page">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="ml-1 text-gray-500 font-medium">{coin.name}</span>
                    </div>
                  </li>
                </ol>
              </nav>
              
              {hasFilters && (
                <button 
                  onClick={handleBackToResults}
                  className="mt-4 md:mt-0 bg-white hover:bg-gray-50 text-gray-800 px-5 py-2.5 rounded-full flex items-center transition-all duration-200 shadow-sm hover:shadow transform hover:-translate-y-1 font-medium"
                >
                  <svg className="w-5 h-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Results
                </button>
              )}
            </div>

            <div className="bg-white rounded-3xl shadow-xl overflow-hidden backdrop-blur-sm border border-gray-100">
              <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">{coin.name}</h1>
                <div className="flex flex-wrap items-center gap-4 text-gray-600 mt-2">
                  {hasValidData(coin.description?.date_range) && (
                    <span className="flex items-center bg-gray-50 px-3 py-1.5 rounded-full">
                      <svg className="w-5 h-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {coin.description.date_range}
                    </span>
                  )}
                  {hasValidData(coin.description?.material) && (
                    <span className="flex items-center bg-gray-50 px-3 py-1.5 rounded-full">
                      <svg className="w-5 h-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {coin.description.material}
                    </span>
                  )}
                  {hasValidData(coin.description?.denomination) && (
                    <span className="flex items-center bg-gray-50 px-3 py-1.5 rounded-full">
                      <svg className="w-5 h-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {coin.description.denomination}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Images Section */}
                  <div>
                    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                      <h2 className="text-2xl font-bold text-yellow-600 mb-6 flex items-center">
                        <svg className="w-6 h-6 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Coin Images
                      </h2>
                      <div className="grid grid-cols-2 gap-8 flex-grow">
                        <div 
                          className="group relative cursor-pointer aspect-square overflow-hidden rounded-xl bg-white transition-all duration-300 border border-gray-100 flex items-center justify-center"
                          onClick={() => handleImageClick('obverse')}
                        >
                          <Image
                            src={coin.obverse?.image || '/images/coin-placeholder.jpg'}
                            alt={`Obverse - ${coin.name}`}
                            width={400}
                            height={400}
                            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 transition-opacity duration-300 flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black bg-opacity-60 px-4 py-2 rounded-full text-sm font-medium">
                              Click to zoom
                            </span>
                          </div>
                        </div>
                        <div 
                          className="group relative cursor-pointer aspect-square overflow-hidden rounded-xl bg-white transition-all duration-300 border border-gray-100 flex items-center justify-center"
                          onClick={() => handleImageClick('reverse')}
                        >
                          <Image
                            src={coin.reverse?.image || '/images/coin-placeholder.jpg'}
                            alt={`Reverse - ${coin.name}`}
                            width={400}
                            height={400}
                            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 transition-opacity duration-300 flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black bg-opacity-60 px-4 py-2 rounded-full text-sm font-medium">
                              Click to zoom
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Information */}
                  <div>
                    {/* Imperial Information */}
                    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
                      <h2 className="text-2xl font-bold text-yellow-600 mb-6 flex items-center">
                        <svg className="w-6 h-6 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Imperial Information
                      </h2>
                      <div className="grid grid-cols-2 gap-6">
                        {renderField("Emperor", coin.authority?.emperor)}
                        {renderField("Dynasty", coin.authority?.dynasty)}
                        {renderField("Period", coin.description?.date_range)}
                        {renderField("Mint", coin.description?.mint)}
                        {/* Render any additional fields from authority */}
                        {Object.entries(coin.authority || {})
                          .filter(([key, value]) => 
                            !['emperor', 'dynasty'].includes(key) && 
                            hasValidData(value) && 
                            typeof value !== 'object'
                          )
                          .map(([key, value]) => {
                            const label = key
                              .replace(/_/g, ' ')
                              .replace(/([A-Z])/g, ' $1')
                              .replace(/^./, str => str.toUpperCase())
                              .trim();
                            return renderField(label, value);
                          })}
                      </div>
                    </div>

                    {/* Physical Characteristics */}
                    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 mt-8">
                      <h2 className="text-2xl font-bold text-yellow-600 mb-6 flex items-center">
                        <svg className="w-6 h-6 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Physical Characteristics
                      </h2>
                      <div className="grid grid-cols-2 gap-6">
                        {renderField("Denomination", coin.description?.denomination)}
                        {renderField("Material", coin.description?.material)}
                        {renderField("Weight", coin.description?.weight)}
                        {renderField("Diameter", coin.description?.diameter)}
                        {renderField("Axis", coin.description?.axis)}
                        {renderField("Edge", coin.description?.edge)}
                        {renderField("Shape", coin.description?.shape)}
                        
                        {/* Render any additional physical attributes from description */}
                        {Object.entries(coin.description || {})
                          .filter(([key, value]) => 
                            !['date_range', 'mint', 'denomination', 'material', 'weight', 'diameter', 'axis', 'edge', 'shape', 'notes'].includes(key) && 
                            hasValidData(value) && 
                            typeof value !== 'object'
                          )
                          .map(([key, value]) => {
                            const label = key
                              .replace(/_/g, ' ')
                              .replace(/([A-Z])/g, ' $1')
                              .replace(/^./, str => str.toUpperCase())
                              .trim();
                            return renderField(label, value);
                          })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                  {/* Obverse Details */}
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
                    <h2 className="text-2xl font-bold text-yellow-600 mb-6 flex items-center">
                      <svg className="w-6 h-6 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      Obverse Details
                    </h2>
                    <div className="space-y-4">
                      {/* Core fields first for consistent ordering */}
                      {renderField("Legend", coin.obverse?.legend)}
                      {renderField("Type", coin.obverse?.type)}
                      {renderField("Portrait", coin.obverse?.portrait)}
                      {renderField("Deity", coin.obverse?.deity)}
                      
                      {/* Render any additional fields from obverse */}
                      {Object.entries(coin.obverse || {})
                        .filter(([key, value]) => 
                          !['legend', 'type', 'portrait', 'deity', 'image', 'license', 'credits'].includes(key) && 
                          hasValidData(value) && 
                          typeof value !== 'object'
                        )
                        .map(([key, value]) => {
                          const label = key
                            .replace(/_/g, ' ')
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, str => str.toUpperCase())
                            .trim();
                          return renderField(label, value);
                        })}
                        
                      {/* Image attribution fields at the end */}
                      {renderField("Image Credits", coin.obverse?.credits)}
                      {renderField("Image License", coin.obverse?.license)}
                    </div>
                  </div>

                  {/* Reverse Details */}
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
                    <h2 className="text-2xl font-bold text-yellow-600 mb-6 flex items-center">
                      <svg className="w-6 h-6 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      Reverse Details
                    </h2>
                    <div className="space-y-4">
                      {/* Core fields first for consistent ordering */}
                      {renderField("Legend", coin.reverse?.legend)}
                      {renderField("Type", coin.reverse?.type)}
                      {renderField("Portrait", coin.reverse?.portrait)}
                      {renderField("Deity", coin.reverse?.deity)}
                      {renderField("Mintmark", coin.reverse?.mintmark)}
                      {renderField("Officina Mark", coin.reverse?.officinamark)}
                      
                      {/* Render any additional fields from reverse */}
                      {Object.entries(coin.reverse || {})
                        .filter(([key, value]) => 
                          !['legend', 'type', 'portrait', 'deity', 'mintmark', 'officinamark', 'image', 'license', 'credits'].includes(key) && 
                          hasValidData(value) && 
                          typeof value !== 'object'
                        )
                        .map(([key, value]) => {
                          const label = key
                            .replace(/_/g, ' ')
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, str => str.toUpperCase())
                            .trim();
                          return renderField(label, value);
                        })}
                        
                      {/* Image attribution fields at the end */}
                      {renderField("Image Credits", coin.reverse?.credits)}
                      {renderField("Image License", coin.reverse?.license)}
                    </div>
                  </div>
                </div>

                {/* Historical Context - Only show if notes exist */}
                {hasValidData(coin.description?.notes) && (
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 mt-8">
                    <h2 className="text-2xl font-bold text-yellow-600 mb-6 flex items-center">
                      <svg className="w-6 h-6 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Historical Context
                    </h2>
                    <div className="prose max-w-none bg-gray-50 p-6 rounded-xl shadow-sm border border-gray-200">
                      <p className="text-lg text-gray-800 leading-relaxed">{coin.description.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Image Zoom Modal */}
            {isZoomed && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                onClick={handleZoomClose}
              >
                <div className="relative max-w-4xl w-full bg-white rounded-2xl p-4 shadow-2xl transform animate-fade-in" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={handleZoomClose}
                    className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors duration-200 hover:rotate-90 transform border border-gray-200 z-10"
                  >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="flex items-center justify-center bg-white rounded-lg p-2">
                    <Image
                      src={activeImage === 'obverse' ? coin.obverse?.image || '/images/coin-placeholder.jpg' : coin.reverse?.image || '/images/coin-placeholder.jpg'}
                      alt={`${activeImage === 'obverse' ? 'Obverse' : 'Reverse'} - ${coin.name}`}
                      width={800}
                      height={800}
                      className="w-full h-auto object-contain max-h-[80vh]"
                    />
                  </div>
                </div>
              </div>
            )}
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