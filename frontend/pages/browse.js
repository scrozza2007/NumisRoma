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
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Head>
        <title>Browse Coins - NumisRoma</title>
        <meta name="description" content="Browse the comprehensive catalog of Roman Imperial coins" />
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

export default Browse;