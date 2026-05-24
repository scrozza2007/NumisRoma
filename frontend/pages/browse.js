import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import CustomDropdown from '../components/CustomDropdown';
import AutocompleteDropdown from '../components/AutocompleteDropdown';
import PeriodRangeSlider from '../components/PeriodRangeSlider';
import Image from 'next/image';
import { fmt, fmtPeriod } from '../utils/formatters';

// Returns the best image URL from the new images[] array.
// Prefers split layout obverse, falls back to unified, then null.
const getPrimaryImage = (coin) => {
  if (!coin.images || coin.images.length === 0) return null;
  const first = coin.images[0];
  if (first?.files?.obverse) return first.files.obverse;
  if (first?.files?.unified) return first.files.unified;
  return null;
};

const formatCoinCount = (count) => {
  if (!Number.isFinite(count)) return 'the full catalog';
  return `${count.toLocaleString()} documented coins`;
};

const defaultFilters = {
  keyword: '', material: '', issuer: '', dynasty: '',
  denomination: '', mint: '', portrait: '', subject: '',
  startYear: undefined, endYear: undefined, catalogEras: ['imperial', 'republican'], sortBy: 'title', order: 'asc'
};

const normalizeSavedFilters = (savedFilters) => {
  const parsed = { ...defaultFilters, ...savedFilters };
  if (!Array.isArray(parsed.catalogEras)) {
    parsed.catalogEras = parsed.era && parsed.era !== 'both'
      ? [parsed.era]
      : ['imperial', 'republican'];
  }
  delete parsed.era;
  return parsed;
};

const Browse = () => {
  const router = useRouter();
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [catalogTotal, setCatalogTotal] = useState(null);
  const [resultTotal, setResultTotal] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);
  const [filterOptions, setFilterOptions] = useState({
    materials: [], issuers: [], dynasties: [], denominations: [], mints: [], portraits: []
  });
  const [periodRange, setPeriodRange] = useState({ minYear: -31, maxYear: 491 });
  const isFirstLoadRef  = useRef(true);
  const debounceRef     = useRef(null);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const [optionsRes, dateRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/coins/filter-options`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/coins/date-ranges`)
      ]);
      if (optionsRes.ok) {
        const raw = await optionsRes.json();
        const toOptions = (arr) => (arr || []).map(v => ({ label: fmt(v), value: v }));
        setFilterOptions({
          materials:    toOptions(raw.materials),
          issuers:      toOptions(raw.issuers),
          dynasties:    toOptions(raw.dynasties),
          denominations: toOptions(raw.denominations),
          mints:        toOptions(raw.mints),
          portraits:    toOptions(raw.portraits),
        });
      }
      if (dateRes.ok) {
        const d = await dateRes.json();
        setPeriodRange({ minYear: d.minYear, maxYear: d.maxYear });
      }
    } catch {}
  }, []);

  const fetchCatalogTotal = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/coins?limit=1`);
      if (!res.ok) return;
      const data = await res.json();
      if (Number.isFinite(data.total)) setCatalogTotal(data.total);
    } catch {}
  }, []);

  const fetchCoins = useCallback(async (page = 1, filterParams = {}) => {
    setLoading(true);
    setError(null);
    try {
      let url = `${process.env.NEXT_PUBLIC_API_URL}/api/coins?page=${page}&limit=12`;
      const selectedEras = Array.isArray(filterParams.catalogEras) ? filterParams.catalogEras : defaultFilters.catalogEras;
      const skipKeys = new Set(['sortBy', 'order', 'catalogEras']);
      Object.keys(filterParams).forEach(key => {
        if (filterParams[key] !== undefined && filterParams[key] !== '' && !skipKeys.has(key)) {
          url += `&${key}=${encodeURIComponent(filterParams[key])}`;
        }
      });
      if (selectedEras.length === 1) url += `&era=${encodeURIComponent(selectedEras[0])}`;
      if (filterParams.sortBy) url += `&sortBy=${encodeURIComponent(filterParams.sortBy)}`;
      if (filterParams.order)  url += `&order=${encodeURIComponent(filterParams.order)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCoins(data.results);
      setTotalPages(data.pages);
      setCurrentPage(data.page);
      setResultTotal(data.total);
      const hasActiveFilters = Object.entries(filterParams).some(([key, value]) => {
        if (['sortBy', 'order'].includes(key)) return false;
        if (key === 'catalogEras') return Array.isArray(value) && value.length === 1;
        return value !== undefined && value !== '';
      });
      if (!hasActiveFilters && Number.isFinite(data.total)) setCatalogTotal(data.total);
    } catch {
      setError('An error occurred while loading the coins. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFilterOptions();
    fetchCatalogTotal();
  }, [fetchFilterOptions, fetchCatalogTotal]);

  useEffect(() => {
    const handleRouteChange = (url) => {
      if (url.startsWith('/coin-detail')) {
        localStorage.setItem('lastVisitedPage', 'coin-detail');
      } else if (url !== '/browse') {
        localStorage.removeItem('coinFilters');
        localStorage.removeItem('coinCurrentPage');
        localStorage.removeItem('lastVisitedPage');
      }
    };
    router.events.on('routeChangeStart', handleRouteChange);
    return () => router.events.off('routeChangeStart', handleRouteChange);
  }, [router]);

  useEffect(() => {
    const loadSavedFilters = async () => {
      try {
        const lastVisitedPage = localStorage.getItem('lastVisitedPage');
        const savedFilters    = localStorage.getItem('coinFilters');
        const savedPage       = localStorage.getItem('coinCurrentPage');
        if (lastVisitedPage === 'coin-detail' && savedFilters) {
          const parsedFilters = normalizeSavedFilters(JSON.parse(savedFilters));
          setFilters(parsedFilters);
          await fetchCoins(savedPage ? parseInt(savedPage, 10) : 1, parsedFilters);
        } else {
          localStorage.removeItem('coinFilters');
          localStorage.removeItem('coinCurrentPage');
          await fetchCoins(1, {});
        }
        localStorage.removeItem('lastVisitedPage');
      } catch {
        await fetchCoins(1, {});
      }
      isFirstLoadRef.current = false;
    };
    loadSavedFilters();
  }, [fetchCoins]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      localStorage.setItem('coinCurrentPage', newPage.toString());
      fetchCoins(newPage, filters);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const TEXT_FIELDS = new Set(['keyword', 'subject']);

  const applyFilters = useCallback((nextFilters, changedField) => {
    if (isFirstLoadRef.current) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      localStorage.setItem('coinFilters', JSON.stringify(nextFilters));
      localStorage.setItem('coinCurrentPage', '1');
      setCurrentPage(1);
      fetchCoins(1, nextFilters);
    }, TEXT_FIELDS.has(changedField) ? 350 : 0);
  }, [fetchCoins]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (name, value) => {
    const next = { ...filters, [name]: value };
    setFilters(next);
    applyFilters(next, name);
  };
  const handleSortChange = (name, value) => {
    const next = { ...filters, [name]: value };
    setFilters(next);
    applyFilters(next, name);
  };
  const handlePeriodRangeChange = ({ startYear, endYear }) => {
    const next = { ...filters, startYear, endYear };
    setFilters(next);
    applyFilters(next, 'period');
  };

  const handleEraToggle = (era) => {
    const current = Array.isArray(filters.catalogEras) ? filters.catalogEras : defaultFilters.catalogEras;
    const nextEras = current.includes(era)
      ? current.filter(item => item !== era)
      : [...current, era];
    const next = { ...filters, catalogEras: nextEras.length ? nextEras : defaultFilters.catalogEras };
    setFilters(next);
    applyFilters(next, 'catalogEras');
  };

  const handleFilterReset = () => {
    const reset = defaultFilters;
    setFilters(reset);
    setCurrentPage(1);
    localStorage.removeItem('coinFilters');
    localStorage.setItem('coinCurrentPage', '1');
    fetchCoins(1, {});
  };

  return (
    <div className="bg-canvas min-h-screen">
      <Head>
        <title>Browse Coins — NumisRoma</title>
        <meta name="description" content="Browse the comprehensive catalog of Roman Republican and Imperial coins" />
      </Head>

      <div className="max-w-7xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
        {/* Page header */}
        <div className="mb-10">
          <p className="font-sans text-xs font-medium tracking-widest uppercase mb-3 text-amber">
            The Catalog
          </p>
          <h1 className="font-display font-semibold text-3xl sm:text-4xl mb-2 text-text-primary">
            Roman Republican and Imperial Coins
          </h1>
          <p className="font-sans text-sm text-text-muted">
            Search and filter across {formatCoinCount(catalogTotal)}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar filters */}
          <div className="lg:col-span-1">
            {/* Mobile toggle */}
            <button
              onClick={() => setFiltersOpen(v => !v)}
              className="lg:hidden w-full flex items-center justify-between px-4 py-3 mb-3 font-sans text-sm font-semibold bg-card border border-border rounded-md text-text-secondary hover:border-amber transition-colors duration-150"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {filtersOpen ? 'Hide Filters' : 'Show Filters'}
              </span>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div className={`bg-card border border-border rounded-md overflow-hidden lg:block ${filtersOpen ? 'block' : 'hidden'}`}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display font-semibold text-xl text-text-primary">Filters</h2>
                  <button
                    onClick={handleFilterReset}
                    className="font-sans text-xs text-text-muted hover:text-amber transition-colors duration-150 flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset all
                  </button>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="font-sans text-sm font-medium text-text-primary block mb-2">Catalog</label>
                    <div className="grid grid-cols-2 gap-1 rounded-md bg-surface-alt border border-border p-1">
                      {[
                        { value: 'imperial', label: 'Imperial' },
                        { value: 'republican', label: 'Republican' },
                      ].map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleEraToggle(value)}
                          className={`px-2 py-2 rounded font-sans text-xs font-medium transition-colors duration-150 ${
                            filters.catalogEras.includes(value)
                              ? 'bg-card text-text-primary shadow-sm'
                              : 'text-text-muted hover:text-text-primary'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Keyword */}
                  <div>
                    <label className="font-sans text-sm font-medium text-text-primary block mb-1.5">Keyword</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={filters.keyword}
                        onChange={(e) => handleFilterChange('keyword', e.target.value)}
                        placeholder="Search all fields…"
                        className="w-full font-sans text-sm bg-card text-text-primary border border-border rounded px-3 py-2 pl-9 outline-none focus:border-amber transition-colors"
                      />
                      <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="font-sans text-xs mt-1 text-text-muted">Title, issuer, dynasty, mint, legend…</p>
                  </div>

                  <AutocompleteDropdown value={filters.material}     onChange={v => handleFilterChange('material', v)}     options={filterOptions.materials}     label="Material"      placeholder="Type material…" />
                  <AutocompleteDropdown value={filters.issuer}       onChange={v => handleFilterChange('issuer', v)}       options={filterOptions.issuers}       label="Issuer"        placeholder="Type issuer…" />
                  <AutocompleteDropdown value={filters.dynasty}      onChange={v => handleFilterChange('dynasty', v)}      options={filterOptions.dynasties}     label="Dynasty"       placeholder="Type dynasty…" />

                  <div className="border-t border-border pt-5">
                    <PeriodRangeSlider
                      startYear={filters.startYear}
                      endYear={filters.endYear}
                      onRangeChange={handlePeriodRangeChange}
                      minYear={periodRange.minYear}
                      maxYear={periodRange.maxYear}
                      label="Period Range"
                    />
                  </div>

                  <AutocompleteDropdown value={filters.denomination} onChange={v => handleFilterChange('denomination', v)} options={filterOptions.denominations} label="Denomination"  placeholder="Type denomination…" />
                  <AutocompleteDropdown value={filters.mint}         onChange={v => handleFilterChange('mint', v)}         options={filterOptions.mints}         label="Mint"          placeholder="Type mint…" />
                  <AutocompleteDropdown value={filters.portrait}     onChange={v => handleFilterChange('portrait', v)}     options={filterOptions.portraits}     label="Portrait"      placeholder="Type portrait…" />

                  <div>
                    <label className="font-sans text-sm font-medium text-text-primary block mb-1.5">Subject</label>
                    <input
                      type="text"
                      value={filters.subject}
                      onChange={(e) => handleFilterChange('subject', e.target.value)}
                      placeholder="e.g. victory, eagle…"
                      className="w-full font-sans text-sm bg-card text-text-primary border border-border rounded px-3 py-2 outline-none focus:border-amber transition-colors"
                    />
                  </div>

                  {/* Sort */}
                  <div className="border-t border-border pt-5 grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-sans text-sm font-medium text-text-primary block mb-1.5">Sort by</label>
                      <CustomDropdown
                        value={filters.sortBy}
                        onChange={v => handleSortChange('sortBy', v)}
                        options={[
                          { value: 'title',         label: 'Title' },
                          { value: 'issuer',        label: 'Issuer' },
                          { value: 'dynasty',       label: 'Dynasty' },
                          { value: 'chronological', label: 'Chronological' },
                          { value: 'denomination',  label: 'Denomination' },
                          { value: 'mint',          label: 'Mint' },
                          { value: 'material',      label: 'Material' },
                        ]}
                        placeholder="Sort by"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-sm font-medium text-text-primary block mb-1.5">Order</label>
                      <CustomDropdown
                        value={filters.order}
                        onChange={v => handleSortChange('order', v)}
                        options={[
                          { value: 'asc',  label: 'A → Z' },
                          { value: 'desc', label: 'Z → A' },
                        ]}
                        placeholder="Order"
                      />
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {!loading && !error && resultTotal !== null && (
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="font-sans text-sm text-text-muted">
                  {resultTotal.toLocaleString()} {resultTotal === 1 ? 'coin' : 'coins'} found
                </p>
                {filters.catalogEras.length === 1 && (
                  <span className="font-sans text-xs font-medium px-2.5 py-1 rounded bg-amber-bg text-amber">
                    {filters.catalogEras[0] === 'imperial' ? 'Imperial' : 'Republican'}
                  </span>
                )}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber border-t-transparent" />
              </div>
            ) : error ? (
              <div className="flex items-start gap-3 p-4 rounded bg-red-50 border border-red-200 text-red-700">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-sans text-sm">{error}</span>
              </div>
            ) : coins.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="font-display font-semibold text-2xl mb-2 text-text-primary">No coins found</p>
                <p className="font-sans text-sm text-text-muted">Try adjusting your filters or clearing the search.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {coins.map((coin) => {
                    const imgSrc = getPrimaryImage(coin) || '/images/coin-placeholder.svg';
                    const period = fmtPeriod(coin.coinage?.date);

                    return (
                      <Link
                        key={coin._id}
                        href={`/coin-detail?id=${coin._id}`}
                        className="group rounded-md overflow-hidden border border-border bg-card hover:shadow-md transition-shadow duration-200 flex flex-col"
                      >
                        <div className="aspect-square overflow-hidden flex items-center justify-center bg-surface">
                          <img
                            src={imgSrc}
                            alt={coin.title?.en || 'Coin'}
                            className="w-full h-full object-contain p-3 transition-transform duration-300 group-hover:scale-105 mix-blend-multiply"
                            onError={e => { e.currentTarget.src = '/images/coin-placeholder.svg'; }}
                          />
                        </div>
                        <div className="p-4 flex flex-col flex-1 border-t border-border">
                          <p className="font-sans text-xs font-medium uppercase tracking-wide mb-1 text-text-muted">
                            {fmt(coin.authority?.issuer)}
                          </p>
                          <h3 className="font-display font-semibold text-base leading-tight mb-1 line-clamp-2 flex-1 text-text-primary">
                            {coin.title?.en}
                          </h3>
                          {period && (
                            <p className="font-sans text-xs text-text-muted">{period}</p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-10 flex justify-center items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-4 py-2 font-sans text-sm border border-border rounded bg-card text-text-secondary hover:border-amber transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ← Previous
                    </button>
                    <span className="font-sans text-sm px-4 text-text-muted">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 font-sans text-sm border border-border rounded bg-card text-text-secondary hover:border-amber transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next →
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
