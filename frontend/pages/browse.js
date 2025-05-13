import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';

const Browse = () => {
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

  const fetchCoins = async (page = 1, filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      // Costruiamo l'URL con i parametri di query
      let url = `http://localhost:4000/api/coins?page=${page}&limit=12`;
      
      // Aggiungiamo i filtri all'URL se presenti
      Object.keys(filters).forEach(key => {
        if (filters[key] && key !== 'sortBy' && key !== 'order') {
          // Assicuriamoci che il valore del materiale sia correttamente codificato
          const value = key === 'material' ? filters[key].trim() : filters[key];
          url += `&${key}=${encodeURIComponent(value)}`;
        }
      });

      // Aggiungiamo i parametri di ordinamento
      if (filters.sortBy) {
        url += `&sortBy=${encodeURIComponent(filters.sortBy)}`;
      }
      if (filters.order) {
        url += `&order=${encodeURIComponent(filters.order)}`;
      }
      
      console.log('Fetching URL:', url); // Per debug
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      setCoins(data.results);
      setTotalPages(data.pages);
      setCurrentPage(data.page);
    } catch (error) {
      console.error('Errore durante il recupero delle monete:', error);
      setError('Si è verificato un errore durante il caricamento delle monete. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoins(currentPage, filters);
  }, [currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo(0, 0);
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
    setCurrentPage(1);
    fetchCoins(1, filters);
  };

  const handleFilterReset = () => {
    setFilters({
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
    setCurrentPage(1);
    fetchCoins(1, {});
  };

  return (
    <>
      <Head>
        <title>Browse Coins - NumisRoma</title>
        <meta name="description" content="Browse the comprehensive catalog of Roman Imperial coins" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Roman Imperial Coins Catalog</h1>
          <p className="text-gray-600">Explore our vast collection of Roman Imperial coins</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Filters</h2>
            <form onSubmit={handleFilterSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="keyword" className="block text-gray-700 mb-1">Keyword</label>
                  <input
                    type="text"
                    id="keyword"
                    name="keyword"
                    value={filters.keyword}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Search..."
                  />
                </div>
                <div>
                  <label htmlFor="material" className="block text-gray-700 mb-1">Material</label>
                  <select
                    id="material"
                    name="material"
                    value={filters.material}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="">All</option>
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="Bronze">Bronze</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="emperor" className="block text-gray-700 mb-1">Emperor</label>
                  <input
                    type="text"
                    id="emperor"
                    name="emperor"
                    value={filters.emperor}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Ex. Augustus"
                  />
                </div>
                <div>
                  <label htmlFor="dynasty" className="block text-gray-700 mb-1">Dynasty</label>
                  <input
                    type="text"
                    id="dynasty"
                    name="dynasty"
                    value={filters.dynasty}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Ex. Julio-Claudian"
                  />
                </div>
                <div>
                  <label htmlFor="date_range" className="block text-gray-700 mb-1">Period</label>
                  <input
                    type="text"
                    id="date_range"
                    name="date_range"
                    value={filters.date_range}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Ex. 27 BC - 14 AD"
                  />
                </div>
                <div>
                  <label htmlFor="portrait" className="block text-gray-700 mb-1">Portrait Type</label>
                  <input
                    type="text"
                    id="portrait"
                    name="portrait"
                    value={filters.portrait}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Ex. Laureate head"
                  />
                </div>
                <div>
                  <label htmlFor="deity" className="block text-gray-700 mb-1">Deity</label>
                  <input
                    type="text"
                    id="deity"
                    name="deity"
                    value={filters.deity}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Ex. Jupiter"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="sortBy" className="block text-gray-700 mb-1">Sort by</label>
                    <select
                      id="sortBy"
                      name="sortBy"
                      value={filters.sortBy}
                      onChange={handleSortChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="name">Name</option>
                      <option value="authority.emperor">Emperor</option>
                      <option value="description.date_range">Date</option>
                      <option value="description.material">Material</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="order" className="block text-gray-700 mb-1">Order</label>
                    <select
                      id="order"
                      name="order"
                      value={filters.order}
                      onChange={handleSortChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="flex-1 bg-yellow-500 text-black py-2 px-4 rounded-md hover:bg-yellow-600 transition-colors duration-200"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={handleFilterReset}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors duration-200"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Coins Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
              </div>
            ) : error ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            ) : coins.length === 0 ? (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-md">
                No coins found with the selected filters.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {coins.map((coin) => (
                    <div key={coin._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
                      <div className="aspect-square">
                        <img
                          src={coin.obverse.image || '/images/coin-placeholder.jpg'}
                          alt={coin.name}
                          className="w-full h-full object-contain p-4"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">{coin.name}</h3>
                        <p className="text-gray-600 mb-1">{coin.authority.emperor}</p>
                        <p className="text-gray-500 text-sm mb-2">{coin.description.date_range}</p>
                        <p className="text-gray-500 text-sm mb-3">
                          {coin.description.material} • {coin.description.denomination}
                        </p>
                        <Link
                          href={`/coins/${coin._id}`}
                          className="text-yellow-500 hover:text-yellow-600 transition-colors duration-200"
                        >
                          View details →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="mt-8 flex justify-center">
                  <nav className="inline-flex rounded-md shadow">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded-l-md border ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Previous
                    </button>
                    <div className="px-4 py-2 bg-yellow-500 text-black border-t border-b">
                      Page {currentPage} of {totalPages}
                    </div>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 rounded-r-md border ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Browse;