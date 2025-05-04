'use client';

import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import MainLayout from '../components/layout/MainLayout';
import SearchBar from '../components/ui/SearchBar';
import AdvancedFilter from '../components/ui/AdvancedFilter';
import CoinCard from '../components/coin/CoinCard';
import useCoinsStore from '../lib/store/coinsStore';

export default function HomePage() {
  const { 
    fetchCoins, 
    coins, 
    filters, 
    setFilters, 
    resetFilters, 
    totalCoins, 
    currentPage, 
    totalPages 
  } = useCoinsStore();
  
  const [isLoading, setIsLoading] = useState(true);

  // Load coins on mount and when filters change
  useEffect(() => {
    const loadInitialCoins = async () => {
      setIsLoading(true);
      await fetchCoins(1, 20, filters);
      setIsLoading(false);
    };
    
    loadInitialCoins();
  }, []);

  // Handle search
  const handleSearch = (keyword) => {
    setFilters({ keyword });
    fetchCoins(1, 20, { ...filters, keyword });
  };

  // Handle filter apply
  const handleApplyFilters = async (newFilters) => {
    setIsLoading(true);
    await fetchCoins(1, 20, newFilters);
    setIsLoading(false);
  };

  // Handle filter reset
  const handleResetFilters = async (resetFilters) => {
    setIsLoading(true);
    await fetchCoins(1, 20, resetFilters);
    setIsLoading(false);
  };

  // Handle pagination
  const handlePageChange = async (page) => {
    setIsLoading(true);
    await fetchCoins(page, 20);
    setIsLoading(false);
  };

  // Generate page buttons
  const renderPagination = () => {
    const pages = [];
    const maxVisible = 5;
    
    // Always show first page
    pages.push(
      <button
        key="first"
        onClick={() => handlePageChange(1)}
        className={`px-3 py-1 rounded-md ${currentPage === 1 ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-slate-700'}`}
        disabled={currentPage === 1}
        aria-label="Vai alla prima pagina"
      >
        1
      </button>
    );
    
    // Show ellipsis if needed
    if (currentPage > 3) {
      pages.push(
        <span key="ellipsis1" className="px-2">...</span>
      );
    }
    
    // Show pages around current page
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      if (i === 1 || i === totalPages) continue; // Skip first and last page as they're always shown
      
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 rounded-md ${currentPage === i ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-slate-700'}`}
          aria-label={`Vai alla pagina ${i}`}
        >
          {i}
        </button>
      );
    }
    
    // Show ellipsis if needed
    if (currentPage < totalPages - 2) {
      pages.push(
        <span key="ellipsis2" className="px-2">...</span>
      );
    }
    
    // Always show last page if more than 1 page
    if (totalPages > 1) {
      pages.push(
        <button
          key="last"
          onClick={() => handlePageChange(totalPages)}
          className={`px-3 py-1 rounded-md ${currentPage === totalPages ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-slate-700'}`}
          disabled={currentPage === totalPages}
          aria-label="Vai all'ultima pagina"
        >
          {totalPages}
        </button>
      );
    }
    
    return pages;
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Catalogo Monete Antiche Romane</h1>
        
        <section className="mb-8">
          <SearchBar 
            defaultValue={filters.keyword}
            onSearch={handleSearch} 
          />
        </section>
        
        <section className="mb-8">
          <AdvancedFilter 
            initialFilters={filters}
            onApplyFilters={handleApplyFilters}
            onResetFilters={handleResetFilters}
          />
        </section>
        
        <section>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : coins.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium">Nessuna moneta trovata</h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Prova a cambiare i filtri di ricerca</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-gray-600 dark:text-gray-400">
                  {totalCoins} monete trovate
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {coins.map(coin => (
                  <CoinCard key={coin._id} coin={coin} />
                ))}
              </div>
              
              {totalPages > 1 && (
                <div className="flex justify-center space-x-2 mt-8">
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-md bg-gray-200 dark:bg-slate-700 disabled:opacity-50"
                    aria-label="Pagina precedente"
                  >
                    &laquo;
                  </button>
                  
                  {renderPagination()}
                  
                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-md bg-gray-200 dark:bg-slate-700 disabled:opacity-50"
                    aria-label="Pagina successiva"
                  >
                    &raquo;
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </MainLayout>
  );
} 