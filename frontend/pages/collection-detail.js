import React, { useEffect, useState, useContext, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { AuthContext } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';
import { semantic } from '../utils/tokens';
import { fmt, fmtPeriod } from '../utils/formatters';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const CollectionDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, isLoading: authLoading } = useContext(AuthContext);

  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [customImages, setCustomImages] = useState({});

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?message=You must be logged in to access community features');
    }
  }, [user, authLoading, router]);

  const fetchCustomImages = useCallback(async (collectionId) => {
    if (!collectionId || !user) return;
    try {
      const data = await apiClient.get(`/api/collections/${collectionId}/entry-images`);
      const imagesMap = {};
      for (const [entryId, img] of Object.entries(data)) {
        const bust = img.updatedAt ? `?v=${new Date(img.updatedAt).getTime()}` : '';
        imagesMap[entryId] = {
          obverse: img.obverseImage ? `${API_URL}${img.obverseImage}${bust}` : null,
          reverse: img.reverseImage ? `${API_URL}${img.reverseImage}${bust}` : null
        };
      }
      setCustomImages(imagesMap);
    } catch {}
  }, [user]);

  const fetchCollection = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get(`/api/collections/${id}`);
      setCollection(data);
      if (data.coins && data.coins.length > 0) {
        await fetchCustomImages(id);
      }
    } catch (err) {
      const msg = err.status === 404 ? 'Collection not found'
        : err.status === 403 ? 'Not authorized to view this collection'
        : err.message || 'Error retrieving collection';
      setNotification({ show: true, message: msg, type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } finally {
      setLoading(false);
    }
  }, [id, user, authLoading, fetchCustomImages]);

  useEffect(() => {
    if (!id || authLoading) return;
    fetchCollection();
  }, [id, user, authLoading, fetchCollection]);

  const handleDeleteCollection = async () => {
    if (!deletePassword.trim()) {
      setNotification({ show: true, message: 'Password required to delete the collection', type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
      return;
    }
    setDeleteLoading(true);
    try {
      await apiClient.post('/api/auth/verify-password', { password: deletePassword });
      await apiClient.delete(`/api/collections/${id}`);
      const userId = collection.user._id || collection.user;
      router.push(`/profile?id=${userId}&message=Collection deleted successfully&type=success`);
    } catch (err) {
      setNotification({ show: true, message: err.message || 'Error deleting the collection', type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
      setDeletePassword('');
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  if (!collection) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-canvas">
        <p className="font-display font-semibold text-2xl mb-2 text-text-primary">Collection not found</p>
        <p className="font-sans text-sm mb-6 text-text-muted">This collection doesn&apos;t exist or may have been removed.</p>
        <Link href="/" className="px-5 py-2.5 font-sans text-sm font-semibold rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150">
          Return home
        </Link>
      </div>
    );
  }

  const isOwner = user && collection.user && user._id === collection.user._id;

  return (
    <div className="min-h-screen bg-canvas">
      <Head>
        <title>{collection.name} — NumisRoma</title>
        <meta name="description" content={collection.description || `Collection ${collection.name} on NumisRoma`} />
      </Head>

      {notification.show && (
        <div className="fixed top-6 right-6 z-50 p-3.5 rounded flex items-start gap-2 font-sans text-sm"
          style={{ backgroundColor: notification.type === 'success' ? semantic.success.bg : semantic.error.bg, border: `1px solid ${notification.type === 'success' ? semantic.success.border : semantic.error.border}`, color: notification.type === 'success' ? semantic.success.text : semantic.error.text, maxWidth: 320 }}>
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={notification.type === 'success' ? 'M5 13l4 4L19 7' : 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'} />
          </svg>
          {notification.message}
        </div>
      )}

      <div className="w-full h-32 md:h-40" />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb + back */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <nav className="flex items-center gap-2 font-sans text-sm text-text-muted">
            <Link href="/" className="text-text-secondary hover:text-amber transition-colors duration-150">Home</Link>
            <span>/</span>
            <Link href={`/profile?id=${user._id}`} className="text-text-secondary hover:text-amber transition-colors duration-150">Collections</Link>
            <span>/</span>
            <span className="text-text-primary">{collection.name}</span>
          </nav>
          <Link
            href={`/profile?id=${user._id}`}
            className="flex items-center gap-1.5 px-4 py-2 font-sans text-sm border border-border rounded bg-card text-text-secondary hover:border-border-strong transition-colors duration-150"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Profile
          </Link>
        </div>

        {/* Collection header */}
        <div className="mb-6">
          <h1 className="font-display font-semibold mb-3 text-text-primary" style={{ fontSize: 'clamp(28px,5vw,42px)', lineHeight: 1.15 }}>{collection.name}</h1>
          <div className="flex flex-wrap items-center gap-3 font-sans text-sm text-text-secondary">
            {collection.user && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-amber-bg text-amber">
                  {collection.user.username?.charAt(0).toUpperCase()}
                </div>
                <span>{collection.user.username}</span>
              </div>
            )}
            <span className="text-border-strong">·</span>
            <span>{collection.coins?.length || 0} coins</span>
            <span className="text-border-strong">·</span>
            <span style={{ color: collection.isPublic ? semantic.success.text : undefined }} className={collection.isPublic ? '' : 'text-text-muted'}>
              {collection.isPublic ? 'Public' : 'Private'}
            </span>
          </div>
        </div>

        {/* Collection info card */}
        <div className="p-6 mb-8 bg-card border border-border rounded-md">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              {collection.description && (
                <div className="mb-6">
                  <h2 className="font-sans font-semibold text-sm uppercase tracking-wide mb-2 text-text-muted">Description</h2>
                  <p className="font-sans text-sm leading-relaxed text-text-secondary">{collection.description}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Coins', value: collection.coins?.length || 0 },
                  { label: 'Created', value: new Date(collection.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }) },
                  { label: 'Updated', value: new Date(collection.updatedAt).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' }) },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 text-center bg-surface-alt border border-border rounded">
                    <div className="font-display font-semibold text-xl text-amber">{value}</div>
                    <div className="font-sans text-xs mt-0.5 text-text-muted">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {isOwner && (
              <div className="flex flex-col gap-2">
                <Link
                  href={`/edit-collection?id=${id}`}
                  className="flex items-center justify-center gap-1.5 px-5 py-2.5 font-sans text-sm font-semibold rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit Collection
                </Link>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center justify-center gap-1.5 px-5 py-2.5 font-sans text-sm font-semibold rounded bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors duration-150"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Collection
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Coins section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-display font-semibold text-2xl text-text-primary">Coins</h2>
            {isOwner && (
              <Link
                href={`/add-coin?id=${id}`}
                className="flex items-center gap-1.5 px-4 py-2 font-sans text-sm font-semibold rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Coin
              </Link>
            )}
          </div>

          {collection.coins && collection.coins.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {collection.coins.map((coinEntry, index) => (
                <Link
                  key={coinEntry._id || index}
                  href={`/collection-coin-detail?id=${coinEntry.coin._id}&collectionId=${id}&entryId=${coinEntry._id}${coinEntry.weight ? `&weight=${encodeURIComponent(coinEntry.weight)}` : ''}${coinEntry.diameter ? `&diameter=${encodeURIComponent(coinEntry.diameter)}` : ''}${coinEntry.grade ? `&grade=${encodeURIComponent(coinEntry.grade)}` : ''}${coinEntry.notes ? `&notes=${encodeURIComponent(coinEntry.notes)}` : ''}`}
                  className="flex flex-col overflow-hidden rounded-md bg-card border border-border hover:border-amber transition-colors duration-200"
                >
                  <div className="aspect-square flex items-center justify-center" style={{ backgroundColor: '#faf4ea' }}>
                    {(() => {
                      const src = customImages[coinEntry._id]?.obverse;
                      return src ? (
                        <img
                          src={src}
                          alt={coinEntry.coin.title?.en || coinEntry.coin.name}
                          className="w-full h-full object-contain p-3 transition-transform duration-200 group-hover:scale-105"
                          style={{ mixBlendMode: 'multiply' }}
                          loading="lazy"
                          onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center" style={{ color: '#9a8e80' }}>
                          <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="font-sans text-xs">No image</p>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="p-4 flex flex-col gap-1">
                    <h3 className="font-display font-semibold text-base line-clamp-2 text-text-primary">{coinEntry.coin.title?.en || coinEntry.coin.name}</h3>
                    {coinEntry.coin.authority?.issuer && (
                      <p className="font-sans text-xs text-text-secondary">{fmt(coinEntry.coin.authority.issuer)}</p>
                    )}
                    <p className="font-sans text-xs text-text-muted">
                      {fmtPeriod(coinEntry.coin.coinage?.date) || 'Period not specified'}
                    </p>
                    {coinEntry.notes && (
                      <p className="font-sans text-xs mt-1 pt-2 text-text-muted border-t border-border">
                        {coinEntry.notes.length > 40 ? coinEntry.notes.substring(0, 40) + '…' : coinEntry.notes}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-2 font-sans text-xs font-medium text-amber">
                      View details
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-card border border-border rounded-md">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-amber-bg">
                <svg className="w-8 h-8 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="font-display font-semibold text-xl mb-2 text-text-primary">No coins yet</h3>
              <p className="font-sans text-sm mb-6 text-text-muted">
                {isOwner ? 'Start by adding your first coin to this collection.' : 'This collection has no coins yet.'}
              </p>
              {isOwner && (
                <Link
                  href={`/add-coin?id=${id}`}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 font-sans text-sm font-semibold rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150"
                >
                  Add First Coin
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(46,40,32,0.6)]">
          <div className="w-full max-w-md p-6 bg-card border border-border rounded-md">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 flex items-center justify-center rounded-full shrink-0 bg-red-50">
                <svg className="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg text-text-primary">Delete Collection</h3>
                <p className="font-sans text-sm mt-1 text-text-secondary">
                  Are you sure you want to delete &quot;{collection.name}&quot;? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mb-5">
              <label htmlFor="deletePassword" className="block font-sans text-sm font-medium mb-1.5 text-text-primary">
                Enter your password to confirm
              </label>
              <input
                type="password"
                id="deletePassword"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                placeholder="Password"
                disabled={deleteLoading}
                className="w-full px-3.5 py-2.5 font-sans text-sm bg-surface border border-border rounded outline-none focus:border-amber transition-colors duration-150 text-text-primary"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeletePassword(''); }}
                disabled={deleteLoading}
                className="px-4 py-2 font-sans text-sm border border-border rounded bg-card text-text-secondary hover:border-border-strong transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCollection}
                disabled={deleteLoading || !deletePassword.trim()}
                className="flex items-center gap-1.5 px-4 py-2 font-sans text-sm font-semibold rounded bg-red-700 text-white hover:bg-red-800 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? (
                  <><div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-t-transparent border-white" />Deleting…</>
                ) : 'Delete Collection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionDetailPage;
