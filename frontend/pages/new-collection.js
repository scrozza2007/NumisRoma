import React, { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { AuthContext } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';
import { semantic } from '../utils/tokens';

const inputCls = 'w-full px-3.5 py-2.5 font-sans text-sm bg-card border border-border rounded-md outline-none focus:border-amber transition-colors duration-150 text-text-primary';

const NewCollectionPage = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useContext(AuthContext);
  const { coinId } = router.query;

  useEffect(() => {
    if (!authLoading && !user) router.push('/login?message=You must be logged in to access community features');
  }, [user, authLoading, router]);

  const [formData, setFormData] = useState({ name: '', description: '', isPublic: true });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showNotification('Unsupported file type. Please upload a JPEG, PNG, or WebP image.', 'error'); return; }
    if (file.size > 15 * 1024 * 1024) { showNotification('File is too large. Please upload an image under 15 MB.', 'error'); return; }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    const fi = document.getElementById('image-upload');
    if (fi) fi.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { showNotification('Collection name is required', 'error'); return; }
    setLoading(true);
    try {
      let data;
      if (selectedImage) {
        const fd = new FormData();
        fd.append('name', formData.name);
        fd.append('description', formData.description);
        fd.append('isPublic', formData.isPublic);
        fd.append('image', selectedImage);
        data = await apiClient.postFormData('/api/collections', fd);
      } else {
        data = await apiClient.post('/api/collections', formData);
      }
      showNotification('Collection created successfully!', 'success');
      setTimeout(() => {
        router.push(coinId ? `/add-coin?id=${data._id}&coinId=${coinId}` : `/collection-detail?id=${data._id}`);
      }, 1500);
    } catch (err) {
      showNotification(err.message || 'Error creating collection. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber border-t-transparent" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-canvas">
      <Head>
        <title>New Collection — NumisRoma</title>
        <meta name="description" content="Create a new coin collection on NumisRoma" />
      </Head>

      {notification.show && (
        <div
          className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-md animate-fade-in shadow-md"
          style={{
            backgroundColor: notification.type === 'success' ? semantic.success.bg : semantic.error.bg,
            border: `1px solid ${notification.type === 'success' ? semantic.success.border : semantic.error.border}`,
            color: notification.type === 'success' ? semantic.success.text : semantic.error.text,
          }}
        >
          <span className="font-sans text-sm">{notification.message}</span>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 font-sans text-sm mb-8 text-text-muted">
          <Link href={`/profile?id=${user._id}`} className="text-text-muted hover:text-amber transition-colors duration-150">Collections</Link>
          <span>/</span>
          <span className="text-text-primary">New Collection</span>
        </nav>

        <div className="mb-8">
          <h1 className="font-display font-semibold text-4xl mb-2 text-text-primary">Create Collection</h1>
          <p className="font-sans text-sm text-text-muted">Organize your numismatic pieces into a named collection.</p>
        </div>

        <div className="bg-card border border-border rounded-lg">
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block font-sans text-sm font-medium mb-1.5 text-text-primary">
                Collection Name <span className="text-amber">*</span>
              </label>
              <input
                type="text" id="name" name="name" value={formData.name} onChange={handleInputChange}
                placeholder="e.g. Augustus Denarii" required className={inputCls}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block font-sans text-sm font-medium mb-1.5 text-text-primary">
                Description <span className="font-normal text-text-muted">(optional)</span>
              </label>
              <textarea
                id="description" name="description" value={formData.description} onChange={handleInputChange}
                rows={4} placeholder="Describe your collection…"
                className={`${inputCls} resize-vertical`}
              />
            </div>

            {/* Cover Image */}
            <div>
              <label className="block font-sans text-sm font-medium mb-1.5 text-text-primary">
                Cover Image <span className="font-normal text-text-muted">(optional)</span>
              </label>
              {imagePreview ? (
                <div className="relative">
                  <div className="w-full h-40 rounded-md overflow-hidden border border-border">
                    <Image src={imagePreview} alt="Preview" width={600} height={160} className="w-full h-full object-cover" />
                  </div>
                  <button
                    type="button" onClick={removeImage}
                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full"
                    style={{ backgroundColor: semantic.error.bg, border: '1px solid #fecaca', color: semantic.error.text }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                  <p className="mt-2 font-sans text-xs text-text-muted">{selectedImage.name} — {(selectedImage.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <label
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center h-32 cursor-pointer transition-colors duration-150 rounded-md hover:border-amber"
                  style={{ border: '2px dashed var(--color-border)', backgroundColor: 'var(--color-canvas)' }}
                >
                  <svg className="w-8 h-8 mb-2 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <p className="font-sans text-sm text-text-muted">Click to upload <span className="text-amber">or drag & drop</span></p>
                  <p className="font-sans text-xs mt-1 text-text-muted">JPEG, PNG, WebP · min 400×400px · max 15 MB</p>
                  <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
                </label>
              )}
            </div>

            {/* Visibility */}
            <div>
              <label className="block font-sans text-sm font-medium mb-3 text-text-primary">Visibility</label>
              <div className="space-y-3">
                {[
                  { val: true,  label: 'Public',  desc: 'Other users can view and discover your collection' },
                  { val: false, label: 'Private', desc: 'Only you can view this collection' },
                ].map(({ val, label, desc }) => (
                  <label key={label} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio" name="isPublic" checked={formData.isPublic === val}
                      onChange={() => setFormData(prev => ({ ...prev, isPublic: val }))}
                      className="mt-0.5 accent-amber"
                    />
                    <div>
                      <span className="font-sans text-sm font-medium text-text-primary">{label}</span>
                      <span className="font-sans text-sm text-text-muted"> — {desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Link
                href={`/profile?id=${user._id}`}
                className="px-5 py-2.5 font-sans text-sm border border-border rounded-md bg-card text-text-secondary hover:border-border-strong transition-colors duration-150"
              >
                Cancel
              </Link>
              <button
                type="submit" disabled={loading}
                className="flex-1 py-2.5 font-sans text-sm font-semibold flex items-center justify-center gap-2 rounded-md bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />Creating…</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>Create Collection</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewCollectionPage;
