'use client';

import Link from 'next/link';

export default function CoinCard({ coin }) {
  // Default image if not available
  const obverseImage = coin.obverse?.image || '/placeholder-coin.png';
  
  return (
    <Link 
      href={`/coin/${coin._id}`} 
      className="card hover:scale-[1.02] transition-transform duration-200"
    >
      <div className="relative pb-[100%]">
        {/* Image container with fixed aspect ratio */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden p-4 border-b border-gray-200 dark:border-slate-700">
          <img
            src={obverseImage}
            alt={`Moneta: ${coin.name} - Dritto`}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold truncate">{coin.name}</h3>
        
        <div className="mt-2 space-y-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            <span className="font-medium">Imperatore:</span> {coin.authority?.emperor || 'Sconosciuto'}
          </p>
          
          {coin.description?.date_range && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              <span className="font-medium">Periodo:</span> {coin.description.date_range}
            </p>
          )}
          
          {coin.description?.material && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              <span className="font-medium">Materiale:</span> {coin.description.material}
            </p>
          )}
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {coin.description?.denomination || 'Denominazione sconosciuta'}
          </span>
          
          <span 
            aria-label="Visualizza dettagli"
            className="text-primary dark:text-primary-300 flex items-center text-sm"
          >
            Dettagli
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
} 