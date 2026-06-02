import React, { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { Check, ChevronLeft, CircleCheck, ImageUp, LockKeyhole, UsersRound } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import NotificationToast from '../components/NotificationToast';
import { apiClient } from '../utils/apiClient';

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
  const [formData, setFormData] = useState({ name: '', description: '', image: '', visibility: 'Private' });
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
        setFormData({ name: data.name || '', description: data.description || '', image: data.image || '', visibility: data.visibility || (data.isPublic ? 'Public' : 'Private') });
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
        submitData.append('visibility', formData.visibility);
        submitData.append('image', selectedImage);
        await apiClient.postFormData(`/api/collections/${id}`, submitData, { method: 'PUT' });
      } else {
        const updateData = { name: formData.name, description: formData.description, visibility: formData.visibility };
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
              <ChevronLeft className="w-4 h-4" />
              Back
            </Link>
          </div>

          {/* Form card */}
          <div className="p-6 bg-card border border-border rounded-lg">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block font-sans text-sm font-medium mb-1.5 text-text-primary">
                  Collection Name <span className="text-error-border">*</span>
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
                      <button type="button" onClick={removeImage} className="font-sans text-xs text-error-text">Remove</button>
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
                  className={`flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-colors duration-150 rounded-md border-2 border-dashed ${dragActive ? 'border-amber bg-amber-bg' : 'border-border hover:border-amber'}`}
                  onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                >
                  <ImageUp className={`w-10 h-10 mb-3 ${dragActive ? 'text-amber' : 'text-text-muted'}`} />
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
                    { value: 'Public', label: 'Public', desc: 'Visible to all users in the public collections section', Icon: CircleCheck },
                    { value: 'Private', label: 'Private', desc: 'Visible only to you in your profile', Icon: LockKeyhole },
                    { value: 'Shared', label: 'Shared', desc: 'Prepared for private sharing workflows', Icon: UsersRound },
                  ].map(({ value, label, desc, Icon }) => (
                    <label key={label} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio" name="isPublic"
                        checked={formData.visibility === value}
                        onChange={() => setFormData(prev => ({ ...prev, visibility: value }))}
                        className="mt-0.5 accent-amber"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Icon className={`w-4 h-4 ${value === 'Public' ? 'text-success-text' : 'text-text-muted'}`} />
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
                    <><Check className="w-4 h-4" />Save Changes</>
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
