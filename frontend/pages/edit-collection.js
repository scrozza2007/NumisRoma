import React, { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { AuthContext } from '../context/AuthContext';
import NotificationToast from '../components/NotificationToast';
import { apiClient } from '../utils/apiClient';
import { semantic } from '../utils/tokens';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const inputCls = 'w-full px-3.5 py-2.5 font-sans text-sm bg-canvas border border-border rounded-md outline-none focus:border-amber transition-colors duration-150 text-text-primary';

const EditCollectionPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, isLoading: authLoading } = useContext(AuthContext);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?message=You must be logged in to access community features');
    }
  }, [user, authLoading, router]);

  const [collection, setCollection] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', image: '', isPublic: true });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const fetchCollection = async () => {
      if (!id) return;
      try {
        const data = await apiClient.get(`/api/collections/${id}`);
        if (!user || data.user._id !== user.id) {
          setNotification({ show: true, message: 'You are not authorized to edit this collection', type: 'error' });
          setTimeout(() => router.push(`/collection-detail?id=${id}`), 2000);
          return;
        }
        setCollection(data);
        setCurrentImageUrl(data.image || '');
        setFormData({ name: data.name || '', description: data.description || '', image: data.image || '', isPublic: data.isPublic !== undefined ? data.isPublic : true });
      } catch {
        setNotification({ show: true, message: 'Error loading the collection', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchCollection();
  }, [id, user, router]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setNotification({ show: true, message: 'Unsupported file type. Please upload a JPEG, PNG, or WebP image.', type: 'error' });
        setTimeout(() => setNotification({ show: false, message: '', type: '' }), 5000);
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setNotification({ show: true, message: 'File is too large. Please upload an image under 15 MB.', type: 'error' });
        setTimeout(() => setNotification({ show: false, message: '', type: '' }), 5000);
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setCurrentImageUrl('');
    setFormData(prev => ({ ...prev, image: '' }));
    const fileInput = document.getElementById('image-upload');
    if (fileInput) fileInput.value = '';
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageChange({ target: { files: [e.dataTransfer.files[0]] } });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setNotification({ show: true, message: 'Collection name is required', type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
      return;
    }
    setSaving(true);
    try {
      if (selectedImage) {
        const submitData = new FormData();
        submitData.append('name', formData.name);
        submitData.append('description', formData.description);
        submitData.append('isPublic', formData.isPublic);
        submitData.append('image', selectedImage);
        await apiClient.postFormData(`/api/collections/${id}`, submitData, { method: 'PUT' });
      } else {
        const updateData = { name: formData.name, description: formData.description, isPublic: formData.isPublic };
        if (!currentImageUrl) updateData.image = '';
        await apiClient.put(`/api/collections/${id}`, updateData);
      }
      setNotification({ show: true, message: 'Collection updated successfully!', type: 'success' });
      setTimeout(() => router.push(`/collection-detail?id=${id}`), 1500);
    } catch (err) {
      setNotification({ show: true, message: err.message || 'Error updating the collection. Please try again.', type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } finally {
      setSaving(false);
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
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-center">
          <p className="font-display font-semibold text-2xl mb-4 text-text-primary">Collection not found</p>
          <Link href="/" className="font-sans text-sm text-amber hover:text-amber-hover">Back to Collections</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Edit {collection.name} — NumisRoma</title>
        <meta name="description" content={`Edit the collection ${collection.name}`} />
      </Head>

      <div className="min-h-screen py-16 bg-canvas">
        <div className="max-w-2xl mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display font-semibold text-3xl text-text-primary">Edit Collection</h1>
              <p className="font-sans text-sm mt-1 text-text-muted">Update your collection details</p>
            </div>
            <Link
              href={`/collection-detail?id=${id}`}
              className="flex items-center gap-1.5 px-4 py-2 font-sans text-sm border border-border rounded-md bg-card text-text-secondary hover:border-border-strong transition-colors duration-150"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Link>
          </div>

          {/* Form card */}
          <div className="p-6 bg-card border border-border rounded-lg">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block font-sans text-sm font-medium mb-1.5 text-text-primary">
                  Collection Name <span style={{ color: semantic.error.border }}>*</span>
                </label>
                <input
                  type="text" id="name" name="name" value={formData.name}
                  onChange={handleInputChange} required maxLength="100"
                  placeholder="Enter collection name"
                  className={inputCls}
                />
                <p className="mt-1 font-sans text-xs text-text-muted">{formData.name.length}/100 characters</p>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block font-sans text-sm font-medium mb-1.5 text-text-primary">Description</label>
                <textarea
                  id="description" name="description" value={formData.description}
                  onChange={handleInputChange} maxLength="1000" rows="4"
                  placeholder="Describe your collection (optional)"
                  className={`${inputCls} resize-none`}
                />
                <p className="mt-1 font-sans text-xs text-text-muted">{formData.description.length}/1000 characters</p>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block font-sans text-sm font-medium mb-1.5 text-text-primary">Cover Image</label>

                {(imagePreview || currentImageUrl) && (
                  <div className="mb-3 p-3 rounded-md bg-surface-alt border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-sans text-xs font-medium text-text-secondary">Current Image</p>
                      <button type="button" onClick={removeImage} className="font-sans text-xs" style={{ color: semantic.error.text }}>Remove</button>
                    </div>
                    <div className="w-full h-40 overflow-hidden rounded bg-canvas">
                      <Image
                        src={imagePreview || (currentImageUrl.startsWith('/') ? `${API_URL}${currentImageUrl}` : currentImageUrl)}
                        alt="Current image" width={400} height={160}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {selectedImage && (
                      <p className="mt-1.5 font-sans text-xs text-text-muted">
                        New: {selectedImage.name} ({(selectedImage.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                )}

                <div
                  className={`flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-colors duration-150 rounded-md ${dragActive ? 'border-amber bg-amber-bg' : 'hover:border-amber'}`}
                  style={{ border: `2px dashed var(--color-${dragActive ? 'amber' : 'border'})` }}
                  onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                >
                  <svg className={`w-10 h-10 mb-3 ${dragActive ? 'text-amber' : 'text-text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <label htmlFor="image-upload" className="cursor-pointer font-sans text-sm font-medium text-amber">
                    {currentImageUrl || imagePreview ? 'Change image' : 'Upload an image'}
                    <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
                  </label>
                  <p className="font-sans text-xs mt-1 text-text-muted">JPEG, PNG, WebP · min 400×400px · max 15 MB</p>
                  {dragActive && <p className="font-sans text-xs mt-1 font-medium text-amber">Drop your image here!</p>}
                </div>
              </div>

              {/* Visibility */}
              <div className="p-4 border border-border rounded-md">
                <h3 className="font-sans font-semibold text-sm mb-4 text-text-primary">Visibility</h3>
                <div className="space-y-3">
                  {[
                    { value: true, label: 'Public', desc: 'Visible to all users in the public collections section', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' },
                    { value: false, label: 'Private', desc: 'Visible only to you in your profile', icon: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z' },
                  ].map(({ value, label, desc, icon }) => (
                    <label key={label} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio" name="isPublic"
                        checked={formData.isPublic === value}
                        onChange={() => setFormData(prev => ({ ...prev, isPublic: value }))}
                        className="mt-0.5 accent-amber"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" style={{ color: value ? semantic.success.text : 'var(--color-text-muted)' }}>
                            <path d={icon} />
                          </svg>
                          <span className="font-sans text-sm font-medium text-text-primary">{label}</span>
                        </div>
                        <p className="font-sans text-xs mt-0.5 text-text-muted">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Link
                  href={`/collection-detail?id=${id}`}
                  className="px-4 py-2 font-sans text-sm border border-border rounded-md bg-card text-text-secondary hover:border-border-strong transition-colors duration-150"
                >
                  Cancel
                </Link>
                <button
                  type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 font-sans text-sm font-semibold rounded-md bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <><div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />Saving…</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Save Changes</>
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
