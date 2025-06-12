import React, { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { AuthContext } from '../context/AuthContext';
import NotificationToast from '../components/NotificationToast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const EditCollectionPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, isLoading: authLoading } = useContext(AuthContext);

  // Check authentication on startup
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?message=You must be logged in to access community features');
    }
  }, [user, authLoading, router]);
  
  const [collection, setCollection] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    isPublic: true
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Carica i dati della collezione
  useEffect(() => {
    const fetchCollection = async () => {
      if (!id) return;
      
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/collections/${id}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (!res.ok) {
          if (res.status === 403) {
            setNotification({
              show: true,
              message: 'Non sei autorizzato a modificare questa collezione',
              type: 'error'
            });
            setTimeout(() => router.push(`/collection-detail?id=${id}`), 2000);
            return;
          }
          throw new Error('Error loading the collection');
        }

        const data = await res.json();
        
        // Verifica che l'utente sia il proprietario
        if (!user || data.user._id !== user.id) {
          setNotification({
            show: true,
            message: 'You are not authorized to edit this collection',
            type: 'error'
          });
          setTimeout(() => router.push(`/collection-detail?id=${id}`), 2000);
          return;
        }

        setCollection(data);
        setFormData({
          name: data.name || '',
          description: data.description || '',
          image: data.image || '',
          isPublic: data.isPublic !== undefined ? data.isPublic : true
        });
      } catch (err) {
        console.error('Error loading collection:', err);
        setNotification({
          show: true,
          message: 'Error loading the collection',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCollection();
  }, [id, user, router]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setNotification({
        show: true,
        message: 'Collection name is required',
        type: 'error'
      });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication token not found. Please log in.');
      }

      const res = await fetch(`${API_URL}/api/collections/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.msg || 'Error updating the collection');
      }

      const data = await res.json();
      
      setNotification({
        show: true,
        message: 'Collection updated successfully!',
        type: 'success'
      });

      // Reindirizza alla collezione
      setTimeout(() => {
        router.push(`/collection-detail?id=${id}`);
      }, 1500);

    } catch (err) {
      console.error('Errore modifica collezione:', err);
      setNotification({
        show: true,
        message: err.message || 'Error updating the collection. Please try again.',
        type: 'error'
      });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Collezione non trovata</h2>
          <Link 
            href="/"
            className="text-yellow-600 hover:text-yellow-700 font-medium"
          >
            Back to Collections
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Edit {collection.name} - NumisRoma</title>
        <meta name="description" content={`Edit the collection ${collection.name}`} />
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Collection</h1>
                <p className="text-gray-600">Update your collection details</p>
              </div>
              <Link
                href={`/collection-detail?id=${id}`}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center cursor-pointer"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Back
              </Link>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome */}
              <div>
                <label htmlFor="name" className="block text-sm font-bold text-gray-900 mb-2">
                  Collection Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  maxLength="100"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Enter collection name"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {formData.name.length}/100 characters
                </p>
              </div>

              {/* Descrizione */}
              <div>
                <label htmlFor="description" className="block text-sm font-bold text-gray-900 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  maxLength="1000"
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                  placeholder="Describe your collection (optional)"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {formData.description.length}/1000 characters
                </p>
              </div>

              {/* Immagine */}
              <div>
                <label htmlFor="image" className="block text-sm font-bold text-gray-900 mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  id="image"
                  name="image"
                  value={formData.image}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="https://example.com/image.jpg (optional)"
                />
                <p className="text-sm text-gray-500 mt-1">
                  URL of a representative image for the collection (optional)
                </p>
              </div>

              {/* Anteprima immagine */}
              {formData.image && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-bold text-gray-900 mb-2">Image Preview</p>
                  <div className="relative w-32 h-24 bg-gray-100 rounded-lg overflow-hidden">
                    <img 
                      src={formData.image} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-500 text-sm" style={{display: 'none'}}>
                      Invalid image
                    </div>
                  </div>
                </div>
              )}

              {/* Visibilità */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Visibility</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <input
                      type="radio"
                      id="public"
                      name="isPublic"
                      checked={formData.isPublic === true}
                      onChange={() => setFormData(prev => ({ ...prev, isPublic: true }))}
                      className="mt-1 h-4 w-4 text-yellow-500 border-gray-300 focus:ring-yellow-500"
                    />
                    <div className="ml-3">
                      <label htmlFor="public" className="block font-medium text-gray-900">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                          Public
                        </div>
                      </label>
                      <p className="text-sm text-gray-500">
                        The collection will be visible to all users in the public collections section
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <input
                      type="radio"
                      id="private"
                      name="isPublic"
                      checked={formData.isPublic === false}
                      onChange={() => setFormData(prev => ({ ...prev, isPublic: false }))}
                      className="mt-1 h-4 w-4 text-yellow-500 border-gray-300 focus:ring-yellow-500"
                    />
                    <div className="ml-3">
                      <label htmlFor="private" className="block font-medium text-gray-900">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 mr-2 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                          </svg>
                          Private
                        </div>
                      </label>
                      <p className="text-sm text-gray-500">
                        The collection will be visible only to you in your profile
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pulsanti */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <Link
                  href={`/collection-detail?id=${id}`}
                                     className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium cursor-pointer"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center cursor-pointer"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {notification.show && (
        <NotificationToast
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ show: false, message: '', type: '' })}
        />
      )}
    </>
  );
};

export default EditCollectionPage;