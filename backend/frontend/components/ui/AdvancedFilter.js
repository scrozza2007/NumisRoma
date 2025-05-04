'use client';

import { useState, useEffect } from 'react';

export default function AdvancedFilter({ 
  initialFilters = {}, 
  onApplyFilters, 
  onResetFilters 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    emperor: '',
    date_range: '',
    material: '',
    mint: '',
    sortBy: 'name',
    order: 'asc',
    ...initialFilters
  });

  // Update local filters when initialFilters change
  useEffect(() => {
    setFilters(prev => ({ ...prev, ...initialFilters }));
  }, [initialFilters]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onApplyFilters(filters);
  };

  const handleReset = () => {
    const resetFilters = {
      emperor: '',
      date_range: '',
      material: '',
      mint: '',
      sortBy: 'name',
      order: 'asc'
    };
    setFilters(resetFilters);
    onResetFilters(resetFilters);
  };

  return (
    <div className="w-full bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left"
        aria-expanded={isOpen}
        aria-controls="filter-panel"
      >
        <span className="text-lg font-medium">Filtri Avanzati</span>
        <svg
          className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div id="filter-panel" className="mt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="emperor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Imperatore
                </label>
                <input
                  type="text"
                  id="emperor"
                  name="emperor"
                  value={filters.emperor}
                  onChange={handleInputChange}
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="date_range" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Periodo
                </label>
                <input
                  type="text"
                  id="date_range"
                  name="date_range"
                  value={filters.date_range}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="es. 100-200 d.C."
                />
              </div>

              <div>
                <label htmlFor="material" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Materiale
                </label>
                <select
                  id="material"
                  name="material"
                  value={filters.material}
                  onChange={handleInputChange}
                  className="input"
                >
                  <option value="">Tutti</option>
                  <option value="Oro">Oro</option>
                  <option value="Argento">Argento</option>
                  <option value="Bronzo">Bronzo</option>
                  <option value="Rame">Rame</option>
                </select>
              </div>

              <div>
                <label htmlFor="mint" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Zecca
                </label>
                <input
                  type="text"
                  id="mint"
                  name="mint"
                  value={filters.mint}
                  onChange={handleInputChange}
                  className="input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ordina per
                </label>
                <select
                  id="sortBy"
                  name="sortBy"
                  value={filters.sortBy}
                  onChange={handleInputChange}
                  className="input"
                >
                  <option value="name">Nome</option>
                  <option value="createdAt">Data di aggiunta</option>
                </select>
              </div>

              <div>
                <label htmlFor="order" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Direzione
                </label>
                <select
                  id="order"
                  name="order"
                  value={filters.order}
                  onChange={handleInputChange}
                  className="input"
                >
                  <option value="asc">Crescente</option>
                  <option value="desc">Decrescente</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="btn-outline"
              >
                Azzera filtri
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                Applica filtri
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
} 