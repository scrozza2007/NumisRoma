import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Image from 'next/image';

const CoinDetail = () => {
  const router = useRouter();
  const { id } = router.query;
  const [coin, setCoin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState('obverse');
  const [isZoomed, setIsZoomed] = useState(false);
  const [hasFilters, setHasFilters] = useState(false);

  const fetchCoinDetails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/coins/${id}`, {
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
  }, [id]);

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
      <div className={`bg-white p-4 rounded-xl border border-gray-100 hover:border-yellow-200 transition-all duration-300 hover:shadow-md ${className}`}>
        <h3 className="text-sm font-medium text-gray-500 mb-1">{label}</h3>
        <p className="text-lg text-gray-900 font-medium">{value}</p>
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
    <div className="min-h-screen bg-white">
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
                <ol className="inline-flex items-center space-x-1 md:space-x-3 bg-white py-2 px-4 rounded-full shadow-sm border border-gray-100">
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
                  className="mt-4 md:mt-0 bg-white hover:bg-gray-50 text-gray-800 px-5 py-2.5 rounded-full flex items-center transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-1 border border-gray-100 hover:border-yellow-200 font-medium"
                >
                  <svg className="w-5 h-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Results
                </button>
              )}
            </div>

            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 hover:border-yellow-200 transition-all duration-500">
              <div className="p-8 border-b border-gray-100 bg-white">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">{coin.name}</h1>
                <div className="flex flex-wrap items-center gap-4 text-gray-600 mt-2">
                  {hasValidData(coin.description?.date_range) && (
                    <span className="flex items-center bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                      {coin.description.date_range}
                    </span>
                  )}
                  {hasValidData(coin.description?.material) && (
                    <span className="flex items-center bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                      {coin.description.material}
                    </span>
                  )}
                  {hasValidData(coin.description?.denomination) && (
                    <span className="flex items-center bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                      {coin.description.denomination}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Images Section */}
                  <div>
                    <div className="bg-white rounded-2xl p-6 shadow-lg h-auto border border-gray-100 hover:border-yellow-200 transition-all duration-300">
                      <h2 className="text-2xl font-bold text-yellow-600 mb-6">
                        Coin Images
                      </h2>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="group relative cursor-pointer aspect-square overflow-hidden rounded-xl bg-white flex items-center justify-center shadow-md border border-gray-100 hover:border-yellow-200 transition-all duration-300"
                          onClick={() => handleImageClick('obverse')}
                        >
                          <Image
                            src={coin.obverse?.image || '/images/coin-placeholder.jpg'}
                            alt={`Obverse - ${coin.name}`}
                            width={400}
                            height={400}
                            className="w-full h-full object-contain transition-all duration-500 transform group-hover:scale-110"
                            priority
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black bg-opacity-60 px-4 py-2 rounded-full text-sm font-medium">
                              Click to zoom
                            </span>
                          </div>
                        </div>
                        <div className="group relative cursor-pointer aspect-square overflow-hidden rounded-xl bg-white flex items-center justify-center shadow-md border border-gray-100 hover:border-yellow-200 transition-all duration-300"
                          onClick={() => handleImageClick('reverse')}
                        >
                          <Image
                            src={coin.reverse?.image || '/images/coin-placeholder.jpg'}
                            alt={`Reverse - ${coin.name}`}
                            width={400}
                            height={400}
                            className="w-full h-full object-contain transition-all duration-500 transform group-hover:scale-110"
                            priority
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black bg-opacity-60 px-4 py-2 rounded-full text-sm font-medium">
                              Click to zoom
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 text-center text-sm text-gray-500">
                        <p>Tap or click images to view in larger size</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Information */}
                  <div>
                    {/* Imperial Information */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-md hover:border-yellow-200 transition-all duration-300">
                      <h2 className="text-2xl font-bold text-yellow-600 mb-6">
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
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-md mt-6 hover:border-yellow-200 transition-all duration-300">
                      <h2 className="text-2xl font-bold text-yellow-600 mb-6">
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
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-md hover:border-yellow-200 transition-all duration-300">
                    <h2 className="text-2xl font-bold text-yellow-600 mb-6">
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
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-md hover:border-yellow-200 transition-all duration-300">
                    <h2 className="text-2xl font-bold text-yellow-600 mb-6">
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
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-md mt-6 hover:border-yellow-200 transition-all duration-300">
                    <h2 className="text-2xl font-bold text-yellow-600 mb-6">
                      Historical Context
                    </h2>
                    <div className="prose max-w-none bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
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
                  <div className="flex items-center justify-center bg-white rounded-lg p-6 shadow-inner">
                    <Image
                      src={activeImage === 'obverse' ? coin.obverse?.image || '/images/coin-placeholder.jpg' : coin.reverse?.image || '/images/coin-placeholder.jpg'}
                      alt={`${activeImage === 'obverse' ? 'Obverse' : 'Reverse'} - ${coin.name}`}
                      width={800}
                      height={800}
                      className="w-full h-auto object-contain max-h-[80vh] drop-shadow-md"
                      priority
                    />
                  </div>
                  <div className="mt-4 text-center text-sm text-gray-700 font-medium bg-gray-50 py-2 rounded-lg">
                    {activeImage === 'obverse' ? 'Obverse' : 'Reverse'} view of {coin.name}
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