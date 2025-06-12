import React, { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const NewCollectionPage = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useContext(AuthContext);

  // Check authentication on startup
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?message=You must be logged in to access community features');
    }
  }, [user, authLoading, router]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    isPublic: true
  });
  
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

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

    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      if (!token) {
        throw new Error('Authentication token not found. Please log in.');
      }

      const res = await fetch(`${API_URL}/api/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.msg || 'Error creating collection');
      }

      const data = await res.json();
      
      setNotification({
        show: true,
        message: 'Collection created successfully!',
        type: 'success'
      });

      // Redirect to the new collection
      setTimeout(() => {
        router.push(`/collection-detail?id=${data._id}`);
      }, 1500);

    } catch (err) {
      console.error('Error creating collection:', err);
      setNotification({
        show: true,
        message: err.message || 'Error creating collection. Please try again.',
        type: 'error'
      });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>New Collection - NumisRoma</title>
        <meta name="description" content="Create a new coin collection on NumisRoma" />
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3 bg-white py-2 px-4 rounded-full shadow-sm border border-gray-100 mb-4">
              <li className="inline-flex items-center">
                <Link href={`/profile?id=${user._id}`} className="text-gray-600 hover:text-yellow-600 transition-colors duration-200 font-medium">
                  Collections
                </Link>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-1 text-gray-500 font-medium">New Collection</span>
                </div>
              </li>
            </ol>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Create Collection</h1>
              <p className="text-gray-600">Create a new collection to organize your numismatic treasures</p>
            </div>
            <Link
              href={`/profile?id=${user._id}`}
              className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 bg-yellow-500 border border-yellow-500 rounded-lg hover:bg-yellow-600 transition-colors text-white cursor-pointer"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Collections
            </Link>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Collection Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter collection name..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Describe your collection (optional)..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 resize-vertical"
                />
              </div>

              {/* Image URL */}
              <div>
                <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Image URL
                </label>
                <input
                  type="url"
                  id="image"
                  name="image"
                  value={formData.image}
                  onChange={handleInputChange}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                />
                {formData.image && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-600 mb-2">Image Preview:</p>
                    <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={formData.image}
                        alt="Preview"
                        width={400}
                        height={192}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="w-full h-full flex items-center justify-center text-gray-500 hidden">
                        Error loading image
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visibility
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="isPublic"
                      value={true}
                      checked={formData.isPublic === true}
                      onChange={(e) => setFormData(prev => ({ ...prev, isPublic: true }))}
                      className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 focus:ring-yellow-500 focus:ring-2"
                    />
                    <span className="ml-3 text-gray-700">
                      <span className="font-medium">Public</span> - Other users can view and discover your collection
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="isPublic"
                      value={false}
                      checked={formData.isPublic === false}
                      onChange={(e) => setFormData(prev => ({ ...prev, isPublic: false }))}
                      className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 focus:ring-yellow-500 focus:ring-2"
                    />
                    <span className="ml-3 text-gray-700">
                      <span className="font-medium">Private</span> - Only you can view this collection
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-yellow-500 text-white py-3 rounded-xl hover:bg-yellow-600 transition-all duration-200 transform hover:scale-[1.02] font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Create Collection</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewCollectionPage; 