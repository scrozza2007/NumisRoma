import React, { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Helper function to safely render coin description
const getCoinDescription = (coin) => {
  if (!coin) return 'Period not specified';
  
  // Se description è una stringa, usala direttamente
  if (typeof coin.description === 'string') {
    return coin.description;
  }
  
  // Se description è un oggetto, usa date_range
  if (coin.description && typeof coin.description === 'object') {
    return coin.description.date_range || 'Period not specified';
  }
  
  return 'Period not specified';
};

// Helper function to safely sanitize coin object for rendering
const sanitizeCoin = (coin) => {
  if (!coin || typeof coin !== 'object') return null;
  
  return {
    ...coin,
    name: typeof coin.name === 'string' ? coin.name : 'Name not available',
    description: getCoinDescription(coin),
    authority: coin.authority && typeof coin.authority === 'object' ? {
      emperor: typeof coin.authority.emperor === 'string' ? coin.authority.emperor : '',
      dynasty: typeof coin.authority.dynasty === 'string' ? coin.authority.dynasty : ''
    } : {},
    obverse: coin.obverse && typeof coin.obverse === 'object' ? coin.obverse : {},
    reverse: coin.reverse && typeof coin.reverse === 'object' ? coin.reverse : {}
  };
};

const AddCoinToCollectionPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, isLoading: authLoading } = useContext(AuthContext);

  // Check authentication on startup
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?message=You must be logged in to access community features');
    }
  }, [user, authLoading, router]);

  const [collection, setCollection] = useState(null);
  const [coins, setCoins] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coinsLoading, setCoinsLoading] = useState(false);
  const [addingCoin, setAddingCoin] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  
  const [coinDetails, setCoinDetails] = useState({
    weight: '',
    diameter: '',
    grade: '',
    notes: ''
  });

  // Fetch collection
  useEffect(() => {
    if (!id || !user) return;
    
    const fetchCollection = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_URL}/api/collections/${id}`, { headers });
        
        if (!res.ok) throw new Error('Collection not found');
        
        const data = await res.json();
        setCollection(data);
      } catch (err) {
        console.error('Error loading collection:', err);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    fetchCollection();
  }, [id, user, router]);

  // Search coins
  const searchCoins = async (term) => {
    if (!term.trim()) {
      setCoins([]);
      return;
    }

    setCoinsLoading(true);
    try {
      const searchUrl = `${API_URL}/api/coins?keyword=${encodeURIComponent(term)}&limit=20`;
      const res = await fetch(searchUrl);
      
      if (!res.ok) throw new Error('Search error');
      
      const data = await res.json();
      const coinsArray = data.results || [];
      
      // Filter only valid coins
      const validCoins = coinsArray.filter(coin => 
        coin && 
        coin._id && 
        typeof coin.name === 'string'
      );
      
      setCoins(validCoins);
    } catch (err) {
      console.error('Error searching coins:', err);
      setCoins([]);
    } finally {
      setCoinsLoading(false);
    }
  };

  // Handle search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchCoins(searchTerm);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Handle coin selection
  const handleCoinSelect = (coin) => {
    setSelectedCoin(coin);
    setCoinDetails({ weight: '', diameter: '', grade: '', notes: '' });
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCoinDetails(prev => ({ ...prev, [name]: value }));
  };

  // Add coin to collection
  const handleAddCoin = async (e) => {
    e.preventDefault();
    
    if (!selectedCoin) {
      setNotification({
        show: true,
        message: 'Please select a coin first',
        type: 'error'
      });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
      return;
    }

    setAddingCoin(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      if (!token) {
        throw new Error('Authentication token not found. Please log in.');
      }

      const requestBody = {
        coin: selectedCoin._id,
        weight: coinDetails.weight || undefined,
        diameter: coinDetails.diameter || undefined,
        grade: coinDetails.grade || undefined,
        notes: coinDetails.notes || undefined
      };

      const res = await fetch(`${API_URL}/api/collections/${id}/coins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.msg || 'Error adding coin');
      }

      setNotification({
        show: true,
        message: 'Coin added successfully!',
        type: 'success'
      });

      setTimeout(() => {
        router.push(`/collection-detail?id=${id}`);
      }, 1500);

    } catch (err) {
      console.error('Error adding coin:', err);
      setNotification({
        show: true,
        message: err.message || 'Error adding coin. Please try again.',
        type: 'error'
      });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } finally {
      setAddingCoin(false);
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedCoin(null);
    setCoinDetails({ weight: '', diameter: '', grade: '', notes: '' });
  };

  const getSafeDescription = (coin) => {
    if (!coin) return 'Period not specified';
    
    if (typeof coin.description === 'string') {
      return coin.description;
    }
    
    if (coin.description && typeof coin.description === 'object') {
      return coin.description.date_range || 'Period not specified';
    }
    
    return 'Period not specified';
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading collection...</p>
        </div>
      </div>
    );
  }

  // If there's no authenticated user, show nothing (will be redirected)
  if (!user) {
    return null;
  }

  if (!collection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">Collection not found</p>
                      <Link href="/" className="text-yellow-600 hover:text-yellow-700">
            Back to Collections
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Add Coin to {collection.name} - NumisRoma</title>
        <meta name="description" content={`Add a coin to ${collection.name} collection`} />
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

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3 bg-white py-2 px-4 rounded-full shadow-sm border border-gray-100 mb-4">
              <li className="inline-flex items-center">
                <Link href={`/collection-detail?id=${id}`} className="text-gray-600 hover:text-yellow-600 transition-colors duration-200 font-medium">
                  {collection.name}
                </Link>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-1 text-gray-500 font-medium">Add Coin</span>
                </div>
              </li>
            </ol>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Add Coin to Collection</h1>
              <p className="text-gray-600">Search and add a new coin to &quot;{collection.name}&quot;</p>
            </div>
            <Link
              href={`/collection-detail?id=${id}`}
              className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 bg-yellow-500 border border-yellow-500 rounded-lg hover:bg-yellow-600 transition-colors text-white cursor-pointer"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Collection
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Search Section */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Search Coins</h2>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, emperor, dynasty..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {coinsLoading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-yellow-500 border-t-transparent mx-auto mb-2"></div>
                  <p className="text-gray-600">Searching...</p>
                </div>
              ) : coins.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {coins.map((coin) => {
                    const safeCoin = sanitizeCoin(coin);
                    if (!safeCoin) return null;

                    return (
                      <div
                        key={safeCoin._id}
                        onClick={() => handleCoinSelect(safeCoin)}
                        className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedCoin?._id === safeCoin._id ? 'bg-yellow-50 border-l-4 border-yellow-500' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                            <Image
                              src={safeCoin.obverse?.image || '/images/coin-placeholder.jpg'}
                              alt={safeCoin.name}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 truncate">{safeCoin.name}</h3>
                            <p className="text-sm text-gray-600">{safeCoin.authority?.emperor || 'Unknown Emperor'}</p>
                            <p className="text-xs text-gray-500">{getSafeDescription(safeCoin)}</p>
                          </div>
                          {selectedCoin?._id === safeCoin._id && (
                            <div className="flex-shrink-0">
                              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : searchTerm ? (
                <div className="p-6 text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <p>No coins found matching &quot;{searchTerm}&quot;</p>
                  <p className="text-xs">Try different keywords or check spelling</p>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                  <p>Start typing to search for coins</p>
                </div>
              )}
            </div>
          </div>

          {/* Selected Coin Details */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Selected Coin</h2>
                {selectedCoin && (
                  <button
                    onClick={clearSelection}
                    className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {selectedCoin ? (
              <div className="p-6">
                {/* Selected coin preview */}
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 w-20 h-20 bg-white rounded-lg overflow-hidden shadow-sm">
                      <Image
                        src={selectedCoin.obverse?.image || '/images/coin-placeholder.jpg'}
                        alt={selectedCoin.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{selectedCoin.name}</h3>
                      <p className="text-gray-600">{selectedCoin.authority?.emperor || 'Unknown Emperor'}</p>
                      <p className="text-sm text-gray-500">{getSafeDescription(selectedCoin)}</p>
                    </div>
                  </div>
                </div>

                {/* Additional details form */}
                <form onSubmit={handleAddCoin} className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Add Collection Details (Optional)</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                        Weight (g)
                      </label>
                      <input
                        type="number"
                        id="weight"
                        name="weight"
                        value={coinDetails.weight}
                        onChange={handleInputChange}
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="diameter" className="block text-sm font-medium text-gray-700 mb-1">
                        Diameter (mm)
                      </label>
                      <input
                        type="number"
                        id="diameter"
                        name="diameter"
                        value={coinDetails.diameter}
                        onChange={handleInputChange}
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">
                      Grade/Condition
                    </label>
                    <select
                      id="grade"
                      name="grade"
                      value={coinDetails.grade}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    >
                      <option value="">Select grade...</option>
                      <option value="Poor">Poor</option>
                      <option value="Fair">Fair</option>
                      <option value="About Good">About Good</option>
                      <option value="Good">Good</option>
                      <option value="Very Good">Very Good</option>
                      <option value="Fine">Fine</option>
                      <option value="Very Fine">Very Fine</option>
                      <option value="Extremely Fine">Extremely Fine</option>
                      <option value="About Uncirculated">About Uncirculated</option>
                      <option value="Uncirculated">Uncirculated</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                      Personal Notes
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      value={coinDetails.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                      placeholder="Add personal notes about this coin..."
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={addingCoin}
                      className="w-full bg-yellow-500 text-white py-3 rounded-xl hover:bg-yellow-600 transition-all duration-200 transform hover:scale-[1.02] font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
                    >
                      {addingCoin ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                          <span>Adding...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          </svg>
                          <span>Add to Collection</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                </svg>
                <p className="text-lg">Select a coin to add</p>
                <p className="text-sm">Choose a coin from the search results to add it to your collection</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddCoinToCollectionPage;