import React, { useContext, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';
import { fmt } from '../utils/formatters';

export default function WishlistPage() {
  const router = useRouter();
  const { user, isLoading } = useContext(AuthContext);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [isLoading, user, router]);

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/api/wishlist?status=Wanted');
      setEntries(data.entries || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchWishlist().catch(() => setLoading(false));
  }, [user]);

  const handleEntryClick = (entry) => {
    if (entry.coinId) router.push(`/coin-detail?id=${entry.coinId}`);
  };

  const removeEntry = async (event, entryId) => {
    event.stopPropagation();
    await apiClient.delete(`/api/wishlist/${entryId}`);
    await fetchWishlist();
  };

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-canvas">
      <Head>
        <title>Wishlist — NumisRoma</title>
        <meta name="description" content="Wanted coins saved to your NumisRoma wishlist" />
      </Head>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <p className="font-sans text-xs font-medium tracking-widest uppercase mb-3 text-amber">Wishlist</p>
          <h1 className="font-display font-semibold text-3xl text-text-primary">Wanted coins</h1>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber border-t-transparent" />
          </div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center bg-card border border-border rounded-md">
            <h2 className="font-display font-semibold text-xl mb-2 text-text-primary">No wanted coins yet</h2>
            <p className="font-sans text-sm mb-6 text-text-muted">Add coins from the catalog to build your wishlist.</p>
            <button
              onClick={() => router.push('/browse')}
              className="px-5 py-2.5 font-sans text-sm font-semibold rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors"
            >
              Browse coins
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entries.map(entry => {
              const details = [entry.emperor, entry.mint, entry.denomination, entry.material].filter(Boolean).map(fmt).join(' · ');
              const isLinked = Boolean(entry.coinId);

              return (
                <div
                  key={entry._id}
                  role={isLinked ? 'link' : undefined}
                  tabIndex={isLinked ? 0 : undefined}
                  onClick={() => handleEntryClick(entry)}
                  onKeyDown={event => {
                    if (isLinked && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      handleEntryClick(entry);
                    }
                  }}
                  className={`p-5 bg-card border border-border rounded-md transition-colors duration-150 ${
                    isLinked
                      ? 'cursor-pointer hover:border-amber focus-visible:border-amber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/25'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-display font-semibold text-lg leading-tight text-text-primary">{entry.name}</h2>
                      <p className="font-sans text-sm mt-1 text-text-secondary">{details || 'Catalog details unavailable'}</p>
                      {entry.references && (
                        <p className="font-sans text-xs mt-2 line-clamp-1 text-text-muted">{entry.references.split('\n')[0]}</p>
                      )}
                    </div>
                    <button
                      onClick={event => removeEntry(event, entry._id)}
                      className="shrink-0 px-3 py-1.5 font-sans text-xs border border-red-200 rounded text-red-700 hover:bg-red-50 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
