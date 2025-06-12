import React, { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { AuthContext } from '../context/AuthContext';

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

  // Check authentication on startup
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?message=You must be logged in to access community features');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
                      if (!id || authLoading) return; // Don't make the request if auth is still loading
    fetchCollection();
      }, [id, user, authLoading]); // Wait for auth to finish loading

  const fetchCollection = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      console.log('fetchCollection - stato auth:', {
        authLoading,
        hasUser: !!user,
        hasToken: !!token,
        userId: user?._id || user?.id,
        collectionId: id
      });

      // DEBUG: Testiamo l'endpoint di debug
      if (token) {
        try {
          const debugRes = await fetch(`${API_URL}/api/collections/debug/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const debugData = await debugRes.json();
          console.log('DEBUG ENDPOINT RESPONSE:', debugData);
        } catch (debugErr) {
          console.log('DEBUG ENDPOINT ERROR:', debugErr);
        }
      }
      
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/api/collections/${id}`, { headers });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Collection not found');
        } else if (res.status === 403) {
          throw new Error('Not authorized to view this collection');
        }
        throw new Error('Error retrieving collection');
      }
      
      const data = await res.json();
      setCollection(data);
    } catch (err) {
      console.error('Error loading collection:', err);
      setNotification({
        show: true,
        message: err.message,
        type: 'error'
      });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCollection = async () => {
    if (!deletePassword.trim()) {
      setNotification({
        show: true,
        message: 'Password required to delete the collection',
        type: 'error'
      });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
      return;
    }

    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Prima verifichiamo la password dell'utente
      const authRes = await fetch(`${API_URL}/api/auth/verify-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ password: deletePassword })
      });

      if (!authRes.ok) {
        const authError = await authRes.json();
        throw new Error(authError.msg || 'Incorrect password');
      }

      // Se la password è corretta, procediamo con l'eliminazione
      const res = await fetch(`${API_URL}/api/collections/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Error deleting the collection');

      // Prima reindirizza alla pagina del profilo con un parametro per la notifica
      const userId = collection.user._id || collection.user;
      router.push(`/profile?id=${userId}&message=Collection deleted successfully&type=success`);

    } catch (err) {
      console.error('Error deleting:', err);
      setNotification({
        show: true,
        message: err.message || 'Error deleting the collection',
        type: 'error'
      });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
      setDeletePassword('');
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading collection...</p>
        </div>
      </div>
    );
  }

  // If there's no authenticated user, show nothing (will be redirected)
  if (!user) {
    return null;
  }

  if (!collection) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <svg className="w-20 h-20 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
        </svg>
        <p className="text-xl text-gray-700 font-medium">Collection not found</p>
        <p className="text-gray-500 mt-2">This collection doesn't exist or might have been removed.</p>
        <Link href="/" className="mt-6 group flex items-center px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-xl hover:from-amber-600 hover:to-yellow-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer">
          Back to Collections
        </Link>
      </div>
    );
  }

  const isOwner = user && collection.user && user._id === collection.user._id;

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{collection.name} - NumisRoma</title>
        <meta name="description" content={collection.description || `Collection ${collection.name} on NumisRoma`} />
      </Head>

      {notification.show && (
        <div className={`fixed top-6 right-6 p-4 rounded-xl shadow-xl z-50 ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white transition-all duration-300 transform animate-fade-in flex items-center`}>
          <div className={`mr-3 p-1 rounded-full ${notification.type === 'success' ? 'bg-green-400' : 'bg-red-400'}`}>
            {notification.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            )}
          </div>
          {notification.message}
        </div>
      )}

      {/* Spacer to maintain visual balance */}
      <div className="w-full h-32 md:h-40"></div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Collection Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">{collection.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-gray-600">
            {collection.user && (
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-yellow-50 flex items-center justify-center mr-2">
                  {collection.user.avatar ? (
                    <Image
                      src={collection.user.avatar}
                      alt={collection.user.username}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <span className="text-sm font-bold text-yellow-500">
                      {collection.user.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span>by {collection.user.username}</span>
              </div>
            )}
            <span>•</span>
            <span>{collection.coins?.length || 0} coins</span>
            {collection.isPublic ? (
              <>
                <span>•</span>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span className="text-green-600">Public</span>
                </div>
              </>
            ) : (
              <>
                <span>•</span>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                  </svg>
                  <span className="text-gray-600">Private</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Collection Info */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                {collection.description && (
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-3">Description</h2>
                    <p className="text-gray-700 leading-relaxed">{collection.description}</p>
                  </div>
                )}

                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">Collection Details</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-500">{collection.coins?.length || 0}</div>
                      <div className="text-sm text-gray-600">Coins</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold text-yellow-500">
                        {new Date(collection.createdAt).toLocaleDateString('en-US', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric' 
                        })}
                      </div>
                      <div className="text-sm text-gray-600">Creation date</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-500">
                        {new Date(collection.updatedAt).toLocaleDateString('en-US', { 
                          day: '2-digit', 
                          month: '2-digit' 
                        })}
                      </div>
                      <div className="text-sm text-gray-600">Last updated</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {isOwner && (
                <div className="flex flex-col space-y-3 md:ml-8">
                  <Link
                    href={`/edit-collection?id=${id}`}
                    className="group px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-xl hover:from-amber-600 hover:to-yellow-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center cursor-pointer"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                    </svg>
                    Edit
                  </Link>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="group px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center cursor-pointer"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coins Section */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Collection Coins</h2>
            {isOwner && (
              <Link
                href={`/add-coin?id=${id}`}
                className="group px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-xl hover:from-amber-600 hover:to-yellow-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center cursor-pointer"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Add Coin
              </Link>
            )}
          </div>

          {collection.coins && collection.coins.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {collection.coins.map((coinEntry, index) => (
                <Link
                  key={index}
                  href={`/coin-detail?id=${coinEntry.coin._id}&collectionId=${id}${
                    coinEntry.weight ? `&weight=${encodeURIComponent(coinEntry.weight)}` : ''
                  }${
                    coinEntry.diameter ? `&diameter=${encodeURIComponent(coinEntry.diameter)}` : ''
                  }${
                    coinEntry.grade ? `&grade=${encodeURIComponent(coinEntry.grade)}` : ''
                  }${
                    coinEntry.notes ? `&notes=${encodeURIComponent(coinEntry.notes)}` : ''
                  }`}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col h-full group"
                >
                  <div className="aspect-[4/3] bg-gray-50 p-6 relative">
                    <Image
                      src={coinEntry.coin.obverse?.image || '/images/coin-placeholder.jpg'}
                      alt={coinEntry.coin.name}
                      fill
                      className="object-contain mix-blend-multiply"
                    />
                  </div>
                  <div className="p-6 flex flex-col h-full bg-gradient-to-b from-white to-yellow-50">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{coinEntry.coin.name}</h3>
                    <p className="text-gray-700 mb-2 font-medium">{coinEntry.coin.authority?.emperor}</p>
                    <p className="text-gray-500 mb-2">
                      {typeof coinEntry.coin.description === 'string' 
                        ? coinEntry.coin.description 
                        : coinEntry.coin.description?.date_range || "Period not specified"}
                    </p>
                    
                    {/* Custom fields from collection - compact display */}
                    {coinEntry.notes && (
                      <div className="border-t border-gray-100 pt-3 mt-2 mb-4">
                        <div className="space-y-1 text-sm text-gray-600">
                          <div><span className="font-medium">Notes:</span> {coinEntry.notes.length > 30 ? coinEntry.notes.substring(0, 30) + '...' : coinEntry.notes}</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center text-yellow-600 font-medium mt-auto">
                      <span>View Details</span>
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-24 h-24 mx-auto bg-yellow-50 rounded-full flex items-center justify-center mb-6">
                <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No Coins</h3>
              <p className="text-gray-500 max-w-md mx-auto text-lg mb-6">
                {isOwner 
                  ? 'This collection is still empty. Start by adding your first coin!'
                  : 'This collection doesn\'t contain any coins yet.'}
              </p>
              {isOwner && (
                <Link
                  href={`/add-coin?id=${id}`}
                  className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-xl hover:from-amber-600 hover:to-yellow-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl font-medium cursor-pointer"
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
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Delete Collection</h3>
              </div>
              
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete the collection &quot;{collection.name}&quot;? 
                This action cannot be undone and all coins will be removed from the collection.
              </p>
              
              <div className="mb-6">
                <label htmlFor="deletePassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter your password to confirm:
                </label>
                <input
                  type="password"
                  id="deletePassword"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Password"
                  disabled={deleteLoading}
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                  }}
                  disabled={deleteLoading}
                  className="group px-6 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transform hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md font-medium cursor-pointer"
                >
                  Cancel
                </button>
                                  <button
                  onClick={handleDeleteCollection}
                  disabled={deleteLoading || !deletePassword.trim()}
                  className={`group px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 flex items-center ${
                    deleteLoading || !deletePassword.trim() ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  {deleteLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete Collection'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionDetailPage;