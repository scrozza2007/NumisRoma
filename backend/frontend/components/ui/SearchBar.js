'use client';

import { useState } from 'react';

export default function SearchBar({ defaultValue = '', onSearch }) {
  const [searchTerm, setSearchTerm] = useState(defaultValue);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex">
      <div className="relative flex-grow">
        <input
          type="text"
          className="input pr-10"
          placeholder="Cerca monete per nome, imperatore, periodo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Cerca monete"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <svg 
            className="h-5 w-5 text-gray-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
            />
          </svg>
        </div>
      </div>
      <button 
        type="submit" 
        className="ml-2 btn-primary"
      >
        Cerca
      </button>
    </form>
  );
} 