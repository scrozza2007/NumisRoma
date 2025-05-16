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

  const formatText = (text, isTitle = false) => {
    if (isTitle) {
      // Per il titolo, manteniamo la formattazione originale ma rimuoviamo solo gli spazi extra
      return text.replace(/\s+/g, ' ').trim();
    }
    // Per gli altri campi, aggiungiamo spazi dopo i due punti
    return text
      .replace(/\s+/g, ' ')
      .replace(/([^:]):/g, '$1: ')
      .trim();
  };

  const extractCoinData = (htmlContent) => {
    console.log('Inizio estrazione dati...');
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    const resultDivs = doc.querySelectorAll('div[class*="result"]');
    console.log('Numero di risultati trovati:', resultDivs.length);
    
    if (resultDivs.length === 0) {
      console.log('Nessun risultato trovato');
      return [];
    }

    const coins = [];
    
    resultDivs.forEach((div, index) => {
      const images = div.querySelectorAll('img');
      const obverseImg = images[0];
      const reverseImg = images[1];
      
      if (!obverseImg) {
        console.log(`Immagine dritto non trovata per il risultato ${index}`);
        return;
      }
      
      const text = div.textContent;
      console.log(`Processando risultato ${index}:`, text.substring(0, 200));
      
      // Estraiamo le informazioni usando regex migliorate
      const titleMatch = text.match(/RIC I \(second edition\) ([^\n]+)/);
      const dateMatch = text.match(/Date\s*:?\s*([^\n]+)/i);
      const denominationMatch = text.match(/Denomination\s*:?\s*([^\n]+)/i);
      const mintMatch = text.match(/Mint\s*:?\s*([^\n]+)/i);
      const obverseMatch = text.match(/Obverse\s*:?\s*([^\n]+)/i);
      const reverseMatch = text.match(/Reverse\s*:?\s*([^\n]+)/i);
      
      // Estraiamo solo il nome della moneta dal titolo, rimuovendo le informazioni aggiuntive
      let title = titleMatch?.[1] || '';
      
      // Rimuoviamo "object" o "objects" e tutto ciò che segue
      title = title.replace(/\s*objects?.*$/i, '');
      
      // Estraiamo il nome dell'imperatore e il numero della moneta
      const titleParts = title.match(/^([A-Za-z]+)\s+(\d+[A-Za-z]*)/);
      if (titleParts) {
        title = `${titleParts[1]} ${titleParts[2]}`;
      }
      
      console.log('Match trovati per risultato', index, {
        title: title,
        date: dateMatch?.[1],
        denomination: denominationMatch?.[1],
        mint: mintMatch?.[1],
        obverse: obverseMatch?.[1],
        reverse: reverseMatch?.[1]
      });
      
      // Formattiamo i dati estratti
      title = formatText(title, true);
      const date = formatText(dateMatch?.[1] || '');
      const denomination = formatText(denominationMatch?.[1] || '');
      const mint = formatText(mintMatch?.[1] || '');
      const obverse = formatText(obverseMatch?.[1] || '');
      const reverse = formatText(reverseMatch?.[1] || '');
      
      // Estraiamo l'imperatore dal titolo
      const emperor = title.split(' ')[0] || '';

      // Estraiamo l'ID dalla URL dell'immagine
      const imageUrl = obverseImg.src;
      console.log(`URL immagine per risultato ${index}:`, imageUrl);
      
      // Proviamo diversi pattern per estrarre l'ID
      let coinId = null;
      const patterns = [
        /\/(\d+)\//,  // numero tra slash
        /id=(\d+)/,   // numero dopo id=
        /record=(\d+)/ // numero dopo record=
      ];
      
      for (const pattern of patterns) {
        const match = imageUrl.match(pattern);
        if (match) {
          coinId = match[1];
          break;
        }
      }
      
      if (!coinId) {
        console.log(`ID non trovato per il risultato ${index}, uso l'indice come fallback`);
        coinId = index;
      }
      
      console.log(`ID estratto per risultato ${index}:`, coinId);
      
      coins.push({
        _id: coinId,
        name: title,
        authority: {
          emperor: emperor,
          dynasty: ''
        },
        description: {
          date_range: date,
          material: '',
          denomination: denomination,
          mint: mint
        },
        obverse: {
          image: obverseImg.src || '/images/coin-placeholder.jpg',
          legend: obverse,
          type: ''
        },
        reverse: {
          image: reverseImg?.src || '/images/coin-placeholder.jpg',
          legend: reverse,
          type: ''
        }
      });
    });
    
    console.log('Monete estratte:', coins.length);
    return coins;
  };

  const fetchCoins = async (page = 1, filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Inizio fetch monete...');
      const searchUrl = 'https://numismatics.org/ocre/results?';
      let searchParams = new URLSearchParams({
        page: page,
        limit: 12
      });

      if (filters.keyword) searchParams.append('q', filters.keyword);
      if (filters.material) searchParams.append('material', filters.material);
      if (filters.emperor) searchParams.append('authority', filters.emperor);
      if (filters.denomination) searchParams.append('denomination', filters.denomination);
      if (filters.mint) searchParams.append('mint', filters.mint);
      if (filters.date_range) searchParams.append('date', filters.date_range);

      const url = searchUrl + searchParams.toString();
      console.log('URL richiesta:', url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const htmlContent = await response.text();
      console.log('Lunghezza risposta HTML:', htmlContent.length);
      
      const parsedCoins = extractCoinData(htmlContent);
      console.log('Monete parsate:', parsedCoins.length);
      
      // Estraiamo il numero totale di pagine dal contenuto HTML
      const totalMatches = htmlContent.match(/Displaying records \d+ to \d+ of (\d+) total results/);
      const total = totalMatches ? parseInt(totalMatches[1]) : 0;
      console.log('Totale risultati:', total);
      
      setCoins(parsedCoins);
      setTotalPages(Math.ceil(total / 12));
      setCurrentPage(page);
    } catch (error) {
      console.error('Errore nel recupero delle monete:', error);
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
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Catalogo Monete Imperiali Romane - NumisRoma</title>
        <meta name="description" content="Esplora il catalogo completo delle monete imperiali romane" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container mx-auto py-12 px-4">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Catalogo Monete Imperiali Romane</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Esplora la nostra vasta collezione di monete imperiali romane con funzionalità avanzate di ricerca e filtro
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters */}
          <div className="bg-white p-8 rounded-2xl shadow-lg sticky top-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Filters</h2>
              <button
                onClick={handleFilterReset}
                className="text-yellow-600 hover:text-yellow-700 transition-colors duration-200 flex items-center space-x-1"
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
                  <select
                    id="material"
                    name="material"
                    value={filters.material}
                    onChange={handleFilterChange}
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 appearance-none"
                  >
                    <option value="">All Materials</option>
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="Bronze">Bronze</option>
                  </select>
                  <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <svg className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
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
                  <select
                    id="sortBy"
                    name="sortBy"
                    value={filters.sortBy}
                    onChange={handleSortChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="name">Name</option>
                    <option value="authority.emperor">Emperor</option>
                    <option value="description.date_range">Date</option>
                    <option value="description.material">Material</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="order" className="block text-gray-700 font-medium mb-2">Order</label>
                  <select
                    id="order"
                    name="order"
                    value={filters.order}
                    onChange={handleSortChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white py-3.5 rounded-xl hover:bg-gray-800 transition-all duration-200 transform hover:scale-[1.02] font-medium flex items-center justify-center space-x-2"
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
            ) : coins.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Nessuna moneta trovata</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {coins.map((coin) => (
                    <Link
                      key={coin._id}
                      href={`/coins/${coin._id}`}
                      className="bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col h-full"
                    >
                      <div className="aspect-[4/3] bg-gray-50 p-6">
                        <img
                          src={coin.obverse?.image || '/images/coin-placeholder.jpg'}
                          alt={coin.name}
                          className="w-full h-full object-contain mix-blend-multiply"
                        />
                      </div>
                      <div className="p-6 flex flex-col h-full">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{coin.name}</h3>
                        
                        {/* Dettagli principali */}
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          {coin.description?.date_range && (
                            <div className="flex items-start">
                              <span className="font-medium text-gray-700 w-20">Periodo:</span>
                              <span>{coin.description.date_range}</span>
                            </div>
                          )}
                          {coin.description?.denomination && (
                            <div className="flex items-start">
                              <span className="font-medium text-gray-700 w-20">Nominale:</span>
                              <span>{coin.description.denomination}</span>
                            </div>
                          )}
                          {coin.description?.mint && (
                            <div className="flex items-start">
                              <span className="font-medium text-gray-700 w-20">Zecca:</span>
                              <span>{coin.description.mint}</span>
                            </div>
                          )}
                          {coin.obverse?.legend && (
                            <div className="flex items-start">
                              <span className="font-medium text-gray-700 w-20">Dritto:</span>
                              <span className="line-clamp-2">{coin.obverse.legend}</span>
                            </div>
                          )}
                          {coin.reverse?.legend && (
                            <div className="flex items-start">
                              <span className="font-medium text-gray-700 w-20">Rovescio:</span>
                              <span className="line-clamp-2">{coin.reverse.legend}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center text-yellow-600 font-medium mt-auto">
                          <span>Vedi Dettagli</span>
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
                      className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Precedente
                    </button>
                    <span className="px-4 py-2 text-gray-700">
                      Pagina {currentPage} di {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Successiva
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