import React, { useState, useEffect, useCallback, useContext } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { AuthContext } from '../context/AuthContext';

const CoinDetail = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useContext(AuthContext);

  // Check authentication on startup
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?message=You must be logged in to access community features');
    }
  }, [user, authLoading, router]);
  const { id, collectionId, weight, diameter, grade, notes } = router.query;
  const [coin, setCoin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState('obverse');
  const [isZoomed, setIsZoomed] = useState(false);
  const [hasFilters, setHasFilters] = useState(false);
  const [collectionData, setCollectionData] = useState(null);
  
  // Stati per aggiungere a collezione
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [userCollections, setUserCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [coinWeight, setCoinWeight] = useState('');
  const [coinDiameter, setCoinDiameter] = useState('');
  const [coinGrade, setCoinGrade] = useState('');
  const [coinNotes, setCoinNotes] = useState('');
  const [addingToCollection, setAddingToCollection] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Blocca lo scroll quando il modale è aperto
  useEffect(() => {
    if (showAddToCollection) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup quando il componente viene smontato
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddToCollection]);

  // Check if this is a collection context (has collection-specific data)
  const isFromCollection = collectionId || weight || diameter || grade || notes;

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

    // Fetch collection data if collectionId is provided
    if (collectionId) {
      fetchCollectionData();
    }

    // Fetch user collections if user is logged in and not from collection
    if (user && !isFromCollection) {
      fetchUserCollections();
    }
  }, [router.query.id, fetchCoinDetails, collectionId, user, isFromCollection]);

  const fetchCollectionData = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/collections/${collectionId}`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setCollectionData(data);
      }
    } catch (error) {
      console.error('Error fetching collection data:', error);
    }
  };

  const fetchUserCollections = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/collections/user/${user._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUserCollections(data);
      }
    } catch (error) {
      console.error('Error fetching user collections:', error);
    }
  };

  const handleAddToCollection = async () => {
    if (!selectedCollection) {
      setNotification({
        show: true,
        message: 'Please select a collection',
        type: 'error'
      });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
      return;
    }

    setAddingToCollection(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/collections/${selectedCollection}/coins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          coinId: id,
          weight: coinWeight || undefined,
          diameter: coinDiameter || undefined,
          grade: coinGrade || undefined,
          notes: coinNotes || undefined
        })
      });

      if (response.ok) {
        setNotification({
          show: true,
          message: 'Coin added to collection successfully!',
          type: 'success'
        });
        setShowAddToCollection(false);
        // Reset form
        setSelectedCollection('');
        setCoinWeight('');
        setCoinDiameter('');
        setCoinGrade('');
        setCoinNotes('');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error adding the coin');
      }
    } catch (error) {
      console.error('Error adding coin to collection:', error);
      setNotification({
        show: true,
        message: error.message || 'Error adding coin to collection',
        type: 'error'
      });
    } finally {
      setAddingToCollection(false);
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    }
  };

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

      {notification.show && (
        <div className={`fixed top-6 right-6 p-4 rounded-xl shadow-xl z-50 ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white transition-all duration-300 transform animate-fade-in flex items-center`}>
          <div className={`mr-3 p-1 rounded-full ${notification.type === 'success' ? 'bg-green-400' : 'bg-red-400'}`}>
            {notification.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            )}
          </div>
          {notification.message}
        </div>
      )}

      <div className="container mx-auto py-12 px-4 sm:px-6">
        {loading || authLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-600"></div>
          </div>
        ) : !user ? (
          null
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
                  {isFromCollection && collectionData ? (
                    <>
                      <li>
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                          <Link href="/" className="ml-1 text-gray-600 hover:text-yellow-600 transition-colors duration-200 font-medium">
                            Collections
                          </Link>
                        </div>
                      </li>
                      <li>
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                          <Link href={`/collection-detail?id=${collectionId}`} className="ml-1 text-gray-600 hover:text-yellow-600 transition-colors duration-200 font-medium">
                            {collectionData.name}
                          </Link>
                        </div>
                      </li>
                    </>
                  ) : (
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
                  )}
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
              
              {hasFilters && !isFromCollection && (
                <button 
                  onClick={handleBackToResults}
                  className="mt-4 md:mt-0 bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-2.5 rounded-full flex items-center transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-1 border border-yellow-500 font-medium cursor-pointer"
                >
                                      <svg className="w-5 h-5 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Results
                  </button>
                )}
                
                {isFromCollection && collectionData && (
                  <Link 
                    href={`/collection-detail?id=${collectionId}`}
                    className="mt-4 md:mt-0 bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-2.5 rounded-full flex items-center transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-1 border border-yellow-500 font-medium cursor-pointer"
                  >
                    <svg className="w-5 h-5 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Collection
                </Link>
              )}

              {!isFromCollection && user && (
                <button 
                  onClick={() => setShowAddToCollection(true)}
                  className="mt-4 md:mt-0 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white px-6 py-2.5 rounded-full flex items-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-medium cursor-pointer"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Add to Collection
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

                {/* Collection Data - Only show if we have collection context and data */}
                {isFromCollection && (weight || diameter || grade || notes) && (
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-md mt-6 hover:border-yellow-200 transition-all duration-300">
                    <h2 className="text-2xl font-bold text-yellow-600 mb-6">
                      Additional Information
                    </h2>
                    <div className="grid grid-cols-2 gap-6">
                      {weight && renderField("Weight", `${weight}g`)}
                      {diameter && renderField("Diameter", `${diameter}mm`)}
                      {grade && renderField("Conservation Grade", grade)}
                      {notes && (
                        <div className="col-span-2 bg-white p-4 rounded-xl border border-gray-100 hover:border-yellow-200 transition-all duration-300 hover:shadow-md">
                          <h3 className="text-sm font-medium text-gray-500 mb-2">Personal Notes</h3>
                          <p className="text-lg text-gray-900 font-medium">{notes}</p>
                        </div>
                      )}
                    </div>
                    {collectionData && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Part of the collection:</span>{' '}
                          <Link 
                            href={`/collection-detail?id=${collectionId}`}
                            className="text-yellow-600 hover:text-yellow-700 font-medium transition-colors"
                          >
                            {collectionData.name}
                          </Link>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Add to Collection Modal */}
            {showAddToCollection && (
              <div 
                className="fixed inset-0 backdrop-blur-sm bg-white/20 z-50 flex items-center justify-center p-4"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowAddToCollection(false);
                  }
                }}
              >
                <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl transform animate-fade-in border border-white/20" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-gray-900">Add to Collection</h2>
                      <button
                        onClick={() => setShowAddToCollection(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-gray-600 mt-2">Add "{coin?.name}" to one of your collections</p>
                  </div>

                  <div className="p-6">
                    {userCollections.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                          </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No Collections</h3>
                        <p className="text-gray-600 mb-6">
                          You haven't created any collections yet. Create your first collection to start adding coins!
                        </p>
                        <Link
                          href="/new-collection"
                          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-xl hover:from-yellow-600 hover:to-amber-600 transition-all duration-200 font-medium cursor-pointer"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          </svg>
                                                      Create First Collection
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Seleziona Collezione</label>
                          <select
                            value={selectedCollection}
                            onChange={(e) => setSelectedCollection(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                          >
                            <option value="">Scegli una collezione...</option>
                            {userCollections.map((collection) => (
                              <option key={collection._id} value={collection._id}>
                                {collection.name} ({collection.coins?.length || 0} coins)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Peso (g)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={coinWeight}
                              onChange={(e) => setCoinWeight(e.target.value)}
                              placeholder="es. 3.2"
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Diametro (mm)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={coinDiameter}
                              onChange={(e) => setCoinDiameter(e.target.value)}
                              placeholder="es. 19.5"
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Grado di Conservazione</label>
                          <select
                            value={coinGrade}
                            onChange={(e) => setCoinGrade(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                          >
                            <option value="">Seleziona grado...</option>
                            <option value="Poor (P)">Poor (P)</option>
                            <option value="Fair (F)">Fair (F)</option>
                            <option value="Very Good (VG)">Very Good (VG)</option>
                            <option value="Fine (F)">Fine (F)</option>
                            <option value="Very Fine (VF)">Very Fine (VF)</option>
                            <option value="Extremely Fine (EF)">Extremely Fine (EF)</option>
                            <option value="About Uncirculated (AU)">About Uncirculated (AU)</option>
                            <option value="Uncirculated (UNC)">Uncirculated (UNC)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Note Personali</label>
                          <textarea
                            value={coinNotes}
                            onChange={(e) => setCoinNotes(e.target.value)}
                            placeholder="Add notes about the coin, provenance, condition..."
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                          />
                        </div>

                        <div className="flex space-x-4 pt-4">
                          <button
                            onClick={() => setShowAddToCollection(false)}
                            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium cursor-pointer"
                          >
                            Annulla
                          </button>
                          <button
                            onClick={handleAddToCollection}
                            disabled={addingToCollection || !selectedCollection}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-xl hover:from-yellow-600 hover:to-amber-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                          >
                            {addingToCollection ? (
                              <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                                Aggiungendo...
                              </>
                            ) : (
                              'Add to Collection'
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

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