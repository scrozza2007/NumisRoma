import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import CustomDropdown from '../components/CustomDropdown';
import Image from 'next/image';

const Browse = () => {
  const router = useRouter();
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    keyword: '',
    material: '',
    emperor: '',
    dynasty: '',
    denomination: '',
    mint: '',
    date_range: '',
    portrait: '',
    deity: '',
    sortBy: 'name',
    order: 'asc'
  });
  
  // Flag to avoid double fetching on first load
  const isFirstLoadRef = useRef(true);

  const fetchCoins = useCallback(async (page = 1, filterParams = {}) => {
    setLoading(true);
    setError(null);
    try {
      let url = `${process.env.NEXT_PUBLIC_API_URL}/api/coins?page=${page}&limit=12`;
      
      Object.keys(filterParams).forEach(key => {
        if (filterParams[key] && key !== 'sortBy' && key !== 'order') {
          const value = key === 'material' ? filterParams[key].trim() : filterParams[key];
          url += `&${key}=${encodeURIComponent(value)}`;
        }
      });

      if (filterParams.sortBy) {
        url += `&sortBy=${encodeURIComponent(filterParams.sortBy)}`;
      }
      if (filterParams.order) {
        url += `&order=${encodeURIComponent(filterParams.order)}`;
      }
      
      console.log('Fetching with URL:', url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      setCoins(data.results);
      setTotalPages(data.pages);
      setCurrentPage(data.page);
    } catch (error) {
      console.error('Error fetching coins:', error);
      setError('An error occurred while loading the coins. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Save the current URL path when leaving the browse page
  // to check if we're coming from a coin detail page later
  useEffect(() => {
    const handleRouteChange = (url) => {
      if (url.startsWith('/coin-detail')) {
        localStorage.setItem('lastVisitedPage', 'coin-detail');
      } else if (url !== '/browse') {
        // Clear filters when navigating to a non-coin-detail page
        localStorage.removeItem('coinFilters');
        localStorage.removeItem('coinCurrentPage');
        localStorage.removeItem('lastVisitedPage');
      }
    };

    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router]);

  // Load saved filters and apply them on initial mount only if coming from a coin detail page
  useEffect(() => {
    const loadSavedFilters = async () => {
      try {
        const lastVisitedPage = localStorage.getItem('lastVisitedPage');
        const savedFilters = localStorage.getItem('coinFilters');
        const savedPage = localStorage.getItem('coinCurrentPage');
        
        // Only restore filters if coming from a coin detail page
        if (lastVisitedPage === 'coin-detail' && savedFilters) {
          const parsedFilters = JSON.parse(savedFilters);
          setFilters(parsedFilters);
          
          if (savedPage) {
            const pageNum = parseInt(savedPage, 10);
            setCurrentPage(pageNum);
            await fetchCoins(pageNum, parsedFilters);
          } else {
            await fetchCoins(1, parsedFilters);
          }
        } else {
          // Clear any saved filters if not coming from a coin detail page
          localStorage.removeItem('coinFilters');
          localStorage.removeItem('coinCurrentPage');
          await fetchCoins(1, {});
        }

        // Clear the last visited page marker
        localStorage.removeItem('lastVisitedPage');
      } catch (e) {
        console.error('Error in initial load:', e);
        await fetchCoins(1, {});
      }
      isFirstLoadRef.current = false;
    };
    
    loadSavedFilters();
  }, [fetchCoins]);

  // Handle page changes - only trigger when page changes, not when filters change
  useEffect(() => {
    if (!isFirstLoadRef.current) {
      localStorage.setItem('coinCurrentPage', currentPage.toString());
      fetchCoins(currentPage, filters);
    }
  }, [currentPage, fetchCoins]);

  // Handle filter changes - use a separate effect for filter changes
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  
  // Debounce filter changes to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [filters]);
  
  // Apply debounced filters
  useEffect(() => {
    if (!isFirstLoadRef.current) {
      localStorage.setItem('coinFilters', JSON.stringify(debouncedFilters));
      setCurrentPage(1); // Reset to first page when filters change
      fetchCoins(1, debouncedFilters);
    }
  }, [debouncedFilters, fetchCoins]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSortChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    // Save filters to localStorage and fetch results
    localStorage.setItem('coinFilters', JSON.stringify(filters));
    localStorage.setItem('coinCurrentPage', '1');
    setCurrentPage(1);
    fetchCoins(1, filters);
  };

  const handleFilterReset = () => {
    const resetFilters = {
      keyword: '',
      material: '',
      emperor: '',
      dynasty: '',
      denomination: '',
      mint: '',
      date_range: '',
      portrait: '',
      deity: '',
      sortBy: 'name',
      order: 'asc'
    };
    setFilters(resetFilters);
    setCurrentPage(1);
    // Clear filters from localStorage
    localStorage.removeItem('coinFilters');
    localStorage.setItem('coinCurrentPage', '1');
    fetchCoins(1, {});
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Browse Coins - NumisRoma</title>
        <meta name="description" content="Browse the comprehensive catalog of Roman Imperial coins" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container mx-auto py-12 px-4">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Roman Imperial Coins Catalog</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Explore our vast collection of Roman Imperial coins with advanced filtering and search capabilities
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters */}
          <div className="bg-white p-8 rounded-2xl shadow-lg sticky top-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Filters</h2>
              <button
                onClick={handleFilterReset}
                className="text-yellow-600 hover:text-yellow-700 transition-colors duration-200 flex items-center space-x-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Reset</span>
              </button>
            </div>

            <form onSubmit={handleFilterSubmit} className="space-y-6">
              <div>
                <label htmlFor="keyword" className="block text-gray-700 font-medium mb-2">Keyword</label>
                <div className="relative">
                  <input
                    type="text"
                    id="keyword"
                    name="keyword"
                    value={filters.keyword}
                    onChange={handleFilterChange}
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                    placeholder="Search..."
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              <div>
                <label htmlFor="material" className="block text-gray-700 font-medium mb-2">Material</label>
                <div className="relative">
                  <CustomDropdown
                    value={filters.material}
                    onChange={value => handleFilterChange({ target: { name: 'material', value } })}
                    options={[
                      { value: '', label: 'All Materials' },
                      { value: 'Gold', label: 'Gold' },
                      { value: 'Silver', label: 'Silver' },
                      { value: 'Bronze', label: 'Bronze' },
                    ]}
                    placeholder="Select material"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="emperor" className="block text-gray-700 font-medium mb-2">Emperor</label>
                <div className="relative">
                  <input
                    type="text"
                    id="emperor"
                    name="emperor"
                    value={filters.emperor}
                    onChange={handleFilterChange}
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                    placeholder="Ex. Augustus"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>

              <div>
                <label htmlFor="dynasty" className="block text-gray-700 font-medium mb-2">Dynasty</label>
                <div className="relative">
                  <input
                    type="text"
                    id="dynasty"
                    name="dynasty"
                    value={filters.dynasty}
                    onChange={handleFilterChange}
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                    placeholder="Ex. Julio-Claudian"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>

              <div>
                <label htmlFor="date_range" className="block text-gray-700 font-medium mb-2">Period</label>
                <div className="relative">
                  <input
                    type="text"
                    id="date_range"
                    name="date_range"
                    value={filters.date_range}
                    onChange={handleFilterChange}
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                    placeholder="Ex. 27 BC - 14 AD"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sortBy" className="block text-gray-700 font-medium mb-2">Sort by</label>
                  <CustomDropdown
                    value={filters.sortBy}
                    onChange={value => handleSortChange({ target: { name: 'sortBy', value } })}
                    options={[
                      { value: 'name', label: 'Name' },
                      { value: 'authority.emperor', label: 'Emperor' },
                      { value: 'description.date_range', label: 'Date' },
                    ]}
                    placeholder="Sort by"
                  />
                </div>
                <div>
                  <label htmlFor="order" className="block text-gray-700 font-medium mb-2">Order</label>
                  <CustomDropdown
                    value={filters.order}
                    onChange={value => handleSortChange({ target: { name: 'order', value } })}
                    options={[
                      { value: 'asc', label: 'Ascending' },
                      { value: 'desc', label: 'Descending' },
                    ]}
                    placeholder="Order"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white py-3.5 rounded-xl hover:bg-gray-800 transition-all duration-200 transform hover:scale-[1.02] font-medium flex items-center justify-center space-x-2 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Apply Filters</span>
              </button>
            </form>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
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
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {coins.map((coin) => (
                    <Link
                      key={coin._id}
                      href={`/coin-detail?id=${coin._id}`}
                      className="bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col h-full"
                    >
                      <div className="aspect-[4/3] bg-gray-50 p-6 relative">
                        <Image
                          src={coin.obverse?.image || '/images/coin-placeholder.jpg'}
                          alt={coin.name}
                          fill
                          className="object-contain mix-blend-multiply"
                        />
                      </div>
                      <div className="p-6 flex flex-col h-full bg-gradient-to-b from-white to-yello-50">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{coin.name}</h3>
                        <p className="text-gray-700 mb-2 font-medium">{coin.authority?.emperor}</p>
                        <p className="text-gray-500 mb-4">{coin.description?.date_range}</p>
                        <div className="flex items-center text-yellow-600 font-medium mt-auto">
                          <span>View Details</span>
                          <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-12 flex justify-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Browse;