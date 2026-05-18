import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';
import { semantic } from '../utils/tokens';
import { fmt, fmtPeriod } from '../utils/formatters';

const buildSpecimens = (images = [], customImages = {}) => {
  const specs = images.map((img, idx) => {
    const num = idx + 1;
    if (img.layout === 'split') {
      return { label: `Specimen ${num}`, meta: img, obverse: img.files?.obverse || null, reverse: img.files?.reverse || null, unified: null };
    }
    return { label: `Specimen ${num}`, meta: img, obverse: null, reverse: null, unified: img.files?.unified || null };
  }).filter(s => s.obverse || s.reverse || s.unified);

  // Prepend a custom-image specimen if any custom images exist
  if (customImages.obverse || customImages.reverse) {
    specs.unshift({ label: 'Your Image', meta: {}, obverse: customImages.obverse || null, reverse: customImages.reverse || null, unified: null, isCustom: true });
  }
  return specs;
};

const CollectionCoinDetail = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useContext(AuthContext);
  const { id, collectionId, entryId, weight, diameter, grade, notes } = router.query;

  const [coin, setCoin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collectionData, setCollectionData] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 });
  const zoomContainerRef = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [editWeight, setEditWeight] = useState('');
  const [editDiameter, setEditDiameter] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const [showImageEditModal, setShowImageEditModal] = useState(false);
  const [selectedObverseImage, setSelectedObverseImage] = useState(null);
  const [selectedReverseImage, setSelectedReverseImage] = useState(null);
  const [obversePreview, setObversePreview] = useState(null);
  const [reversePreview, setReversePreview] = useState(null);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [dragActiveObverse, setDragActiveObverse] = useState(false);
  const [dragActiveReverse, setDragActiveReverse] = useState(false);
  const [imageResetLoading, setImageResetLoading] = useState(false);

  const [customImages, setCustomImages] = useState({ obverse: null, reverse: null });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?message=You must be logged in to access collection features');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    document.body.style.overflow = zoomed || showEditModal || showDeleteModal || showImageEditModal ? 'hidden' : '';
    if (!zoomed) { setZoomScale(1); setZoomOffset({ x: 0, y: 0 }); }
    return () => { document.body.style.overflow = ''; };
  }, [zoomed, showEditModal, showDeleteModal, showImageEditModal]);

  const handleZoomIn  = () => setZoomScale(s => Math.min(s + 0.5, 4));
  const handleZoomOut = () => setZoomScale(s => { const n = Math.max(s - 0.5, 1); if (n === 1) setZoomOffset({ x: 0, y: 0 }); return n; });
  const handleZoomReset = () => { setZoomScale(1); setZoomOffset({ x: 0, y: 0 }); };

  const onMouseDown = (e) => {
    if (zoomScale <= 1) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y };
  };
  const onMouseMove = (e) => {
    if (!isDragging.current) return;
    const x = e.clientX - dragStart.current.x;
    const y = e.clientY - dragStart.current.y;
    dragOffset.current = { x, y };
    setZoomOffset({ x, y });
  };
  const onMouseUp = () => { isDragging.current = false; };
  const onWheelZoom = (e) => { e.preventDefault(); if (e.deltaY < 0) handleZoomIn(); else handleZoomOut(); };

  const fetchCoinDetails = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get(`/api/coins/${id}`);
      setCoin(data);
    } catch {
      setError('An error occurred while loading the coin. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchCollectionData = useCallback(async () => {
    try {
      const data = await apiClient.get(`/api/collections/${collectionId}`);
      setCollectionData(data);
    } catch {}
  }, [collectionId]);

  const fetchCustomImages = useCallback(async () => {
    if (!entryId) return;
    try {
      const customImageData = await apiClient.get(`/api/coins/entry/${entryId}/images`);
      if (customImageData) {
        const bust = customImageData.updatedAt ? `?v=${new Date(customImageData.updatedAt).getTime()}` : '';
        setCustomImages({
          obverse: customImageData.obverseImage ? `${process.env.NEXT_PUBLIC_API_URL}${customImageData.obverseImage}${bust}` : null,
          reverse: customImageData.reverseImage ? `${process.env.NEXT_PUBLIC_API_URL}${customImageData.reverseImage}${bust}` : null
        });
      } else {
        setCustomImages({ obverse: null, reverse: null });
      }
    } catch {
      setCustomImages({ obverse: null, reverse: null });
    }
  }, [entryId]);

  useEffect(() => {
    if (router.query.id && collectionId) {
      setCustomImages({ obverse: null, reverse: null });
      fetchCoinDetails();
      fetchCollectionData();
      if (entryId) fetchCustomImages();
    }
    // fetchCustomImages is excluded intentionally — it changes when entryId changes,
    // which is already in deps, avoiding a double-fire loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.id, collectionId, entryId]);

  const handleEditCoin = () => {
    setEditWeight(weight || '');
    setEditDiameter(diameter || '');
    setEditGrade(grade || '');
    setEditNotes(notes || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!coin || !coin._id) return;
    try {
      await apiClient.put(`/api/collections/${collectionId}/coins/${coin._id}`, {
        weight: editWeight || undefined,
        diameter: editDiameter || undefined,
        grade: editGrade || undefined,
        notes: editNotes || undefined
      });
      setShowEditModal(false);
      await fetchCustomImages();
      setNotification({ type: 'success', message: 'Data updated successfully' });
      router.replace({
        pathname: router.pathname,
        query: { id, collectionId, weight: editWeight || undefined, diameter: editDiameter || undefined, grade: editGrade || undefined, notes: editNotes || undefined }
      }, undefined, { shallow: true });
    } catch {
      setNotification({ type: 'error', message: 'Error while updating' });
    }
  };

  const handleDeleteCoin = async () => {
    setDeleteLoading(true);
    try {
      await apiClient.delete(`/api/collections/${collectionId}/coins/${id}`);
      router.push(`/collection-detail?id=${collectionId}`);
    } catch (err) {
      setNotification({ show: true, message: err.message || 'Error removing coin from collection', type: 'error' });
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    }
  };

  const handleImageChange = (file, type) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setNotification({ show: true, message: 'File size must be less than 5MB', type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === 'obverse') { setSelectedObverseImage(file); setObversePreview(e.target.result); }
      else { setSelectedReverseImage(file); setReversePreview(e.target.result); }
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async () => {
    if (!selectedObverseImage && !selectedReverseImage) return;
    setImageUploadLoading(true);
    try {
      const formData = new FormData();
      if (selectedObverseImage) formData.append('obverse', selectedObverseImage);
      if (selectedReverseImage) formData.append('reverse', selectedReverseImage);
      await apiClient.postFormData(`/api/coins/entry/${entryId}/images`, formData);
      setNotification({ show: true, message: 'Images uploaded successfully!', type: 'success' });
      setShowImageEditModal(false);
      setSelectedObverseImage(null); setSelectedReverseImage(null);
      setObversePreview(null); setReversePreview(null);
      await fetchCustomImages();
    } catch (err) {
      setNotification({ show: true, message: err.message || 'Error uploading images', type: 'error' });
    } finally {
      setImageUploadLoading(false);
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    }
  };

  const handleImageReset = async () => {
    setImageResetLoading(true);
    try {
      await apiClient.delete(`/api/coins/entry/${entryId}/images`);
      setNotification({ show: true, message: 'Images reset to catalog defaults successfully!', type: 'success' });
      setShowImageEditModal(false);
      setSelectedObverseImage(null); setSelectedReverseImage(null);
      setObversePreview(null); setReversePreview(null);
      await fetchCustomImages();
    } catch (err) {
      setNotification({ show: true, message: err.message || 'Error resetting images', type: 'error' });
    } finally {
      setImageResetLoading(false);
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    }
  };

  const specimens = coin ? buildSpecimens(coin.images || [], customImages) : [];
  const active = specimens[activeIdx] || null;

  const hasValidData = (data) => data && data !== '' && data !== 'N/A' && data !== 'n/a' && data !== null && data !== undefined;

  const renderField = (label, value) => {
    if (!hasValidData(value)) return null;
    return (
      <div key={label} className="p-3 rounded bg-surface-alt border border-border">
        <dt className="font-sans text-xs font-medium mb-0.5 text-text-muted">{label}</dt>
        <dd className="font-sans text-sm font-medium text-text-primary">{value}</dd>
      </div>
    );
  };

  const inputCls = 'w-full px-3 py-2 font-sans text-sm bg-surface border border-border rounded outline-none focus:border-amber transition-colors duration-150 text-text-primary';
  const selectCls = inputCls + ' cursor-pointer';

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  if (error || !coin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-center">
          <p className="font-display font-semibold text-2xl mb-4 text-text-primary">Coin not found</p>
          <Link href={`/collection-detail?id=${collectionId}`} className="font-sans text-sm text-amber hover:text-amber-hover transition-colors">Back to Collection</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Head>
        <title>{coin.title?.en} — NumisRoma</title>
        <meta name="description" content={`Detailed view of ${coin.title?.en} in your collection`} />
      </Head>

      {notification.show && (
        <div className="fixed top-6 right-6 z-50 p-3.5 flex items-start gap-2 font-sans text-sm rounded"
          style={{ backgroundColor: notification.type === 'success' ? semantic.success.bg : semantic.error.bg, border: `1px solid ${notification.type === 'success' ? semantic.success.border : semantic.error.border}`, color: notification.type === 'success' ? semantic.success.text : semantic.error.text, maxWidth: 320 }}>
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={notification.type === 'success' ? 'M5 13l4 4L19 7' : 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'} />
          </svg>
          {notification.message}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Breadcrumb + actions */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <nav className="flex items-center gap-2 font-sans text-sm text-text-muted">
            <Link href="/" className="text-text-secondary hover:text-amber transition-colors duration-150">Home</Link>
            <span>/</span>
            <Link href={`/profile?id=${user._id}`} className="text-text-secondary hover:text-amber transition-colors duration-150">Collections</Link>
            {collectionData && (
              <>
                <span>/</span>
                <Link href={`/collection-detail?id=${collectionId}`} className="text-text-secondary hover:text-amber transition-colors duration-150">{collectionData.name}</Link>
              </>
            )}
            <span>/</span>
            <span className="text-text-primary">{coin.title?.en}</span>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={`/collection-detail?id=${collectionId}`}
              className="flex items-center gap-1.5 px-4 py-2 font-sans text-sm border border-border rounded bg-card text-text-secondary hover:border-border-strong transition-colors duration-150"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </Link>
            <button
              onClick={handleEditCoin}
              className="flex items-center gap-1.5 px-3 py-2 font-sans text-sm border border-border rounded bg-card text-text-secondary hover:border-amber transition-colors duration-150"
              title="Edit coin details"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 font-sans text-sm border border-red-200 rounded bg-red-50 text-red-700 hover:bg-red-100 transition-colors duration-150"
              title="Remove from collection"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remove
            </button>
          </div>
        </div>

        {/* Main card */}
        <div className="p-6 mb-6 bg-card border border-border rounded-md">
          <h1 className="font-display font-semibold text-3xl mb-3 text-text-primary">{coin.title?.en}</h1>
          {collectionData && (
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-sans text-xs px-2 py-0.5 rounded bg-amber-bg text-amber border border-amber-light">
                {collectionData.name}
              </span>
              {fmtPeriod(coin.coinage?.date) && (
                <span className="font-sans text-xs px-2 py-0.5 rounded bg-surface-alt text-text-secondary border border-border">
                  {fmtPeriod(coin.coinage.date)}
                </span>
              )}
              {hasValidData(coin.classification?.material) && (
                <span className="font-sans text-xs px-2 py-0.5 rounded bg-surface-alt text-text-secondary border border-border">
                  {fmt(coin.classification.material)}
                </span>
              )}
              {hasValidData(coin.classification?.denomination) && (
                <span className="font-sans text-xs px-2 py-0.5 rounded bg-surface-alt text-text-secondary border border-border">
                  {fmt(coin.classification.denomination)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Gallery ── */}
        {specimens.length > 0 && (
          <div className="bg-card border border-border rounded-md overflow-hidden mb-6">
            {/* Main viewer */}
            {(() => {
              const sp = specimens[activeIdx] || specimens[0];
              return (
                <div className="group relative cursor-zoom-in" style={{ backgroundColor: '#faf4ea' }}
                  onClick={() => setZoomed(true)}>
                  {sp.unified ? (
                    <div className="flex items-center justify-center" style={{ minHeight: 260, backgroundColor: '#faf4ea' }}>
                      <img src={sp.unified} alt={sp.label}
                        className="w-full object-contain p-8 transition-transform duration-300 group-hover:scale-[1.02]"
                        style={{ maxHeight: 420, mixBlendMode: 'multiply' }}
                        onError={e => { e.currentTarget.src = '/images/coin-placeholder.svg'; }} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2" style={{ backgroundColor: '#faf4ea' }}>
                      {sp.obverse && (
                        <div className="flex items-center justify-center" style={{ borderRight: '1px solid #e8e0d0', minHeight: 260, backgroundColor: '#faf4ea' }}>
                          <img src={sp.obverse} alt="Obverse"
                            className="w-full object-contain p-8 transition-transform duration-300 group-hover:scale-[1.02]"
                            style={{ maxHeight: 420, mixBlendMode: 'multiply' }}
                            onError={e => { e.currentTarget.src = '/images/coin-placeholder.svg'; }} />
                        </div>
                      )}
                      {sp.reverse && (
                        <div className="flex items-center justify-center" style={{ minHeight: 260, backgroundColor: '#faf4ea' }}>
                          <img src={sp.reverse} alt="Reverse"
                            className="w-full object-contain p-8 transition-transform duration-300 group-hover:scale-[1.02]"
                            style={{ maxHeight: 420, mixBlendMode: 'multiply' }}
                            onError={e => { e.currentTarget.src = '/images/coin-placeholder.svg'; }} />
                        </div>
                      )}
                    </div>
                  )}
                  {/* Zoom hint */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-between px-4">
                    <div />
                    <span className="font-sans text-xs px-3 py-1.5 rounded-full" style={{ color: '#fdf8f0', backgroundColor: 'rgba(46,40,32,0.55)' }}>Click to zoom</span>
                    <div />
                  </div>
                  {specimens.length > 1 && (
                    <>
                      <button className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full pointer-events-auto z-10 transition-opacity opacity-0 group-hover:opacity-100"
                        style={{ backgroundColor: '#fefcf8', border: '1px solid #e8e0d0', color: '#5a5040' }}
                        onClick={e => { e.stopPropagation(); setActiveIdx(i => (i - 1 + specimens.length) % specimens.length); }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                      </button>
                      <button className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full pointer-events-auto z-10 transition-opacity opacity-0 group-hover:opacity-100"
                        style={{ backgroundColor: '#fefcf8', border: '1px solid #e8e0d0', color: '#5a5040' }}
                        onClick={e => { e.stopPropagation(); setActiveIdx(i => (i + 1) % specimens.length); }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                      </button>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Filmstrip + metadata bar */}
            <div className="border-t flex items-stretch" style={{ borderColor: '#e8e0d0' }}>
              {specimens.length > 1 && (
                <div className="flex gap-0 overflow-x-auto shrink-0" style={{ borderRight: '1px solid #e8e0d0' }}>
                  {specimens.map((sp, i) => {
                    const thumb = sp.obverse || sp.unified || sp.reverse;
                    return (
                      <button key={i} onClick={() => setActiveIdx(i)}
                        className="relative shrink-0 transition-opacity"
                        style={{ width: 72, height: 72, backgroundColor: '#faf4ea', borderRight: i < specimens.length - 1 ? '1px solid #e8e0d0' : 'none', opacity: i === activeIdx ? 1 : 0.55, outline: i === activeIdx ? '2px solid #b8843a' : 'none', outlineOffset: -2 }}>
                        {thumb && (
                          <img src={thumb} alt={sp.label} className="w-full h-full object-contain p-1.5"
                            style={{ mixBlendMode: 'multiply' }}
                            onError={e => { e.currentTarget.style.display = 'none'; }} />
                        )}
                        {sp.isCustom && (
                          <span className="absolute bottom-1 left-0 right-0 text-center font-sans" style={{ fontSize: 8, color: '#b8843a' }}>Custom</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex-1 flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex items-center gap-4 flex-wrap">
                  {(() => {
                    const sp = specimens[activeIdx] || specimens[0];
                    return (
                      <>
                        <span className="font-sans text-xs font-medium" style={{ color: '#9a8e80' }}>{sp?.label}</span>
                        {sp?.meta?.copyright_holder && <span className="font-sans text-xs" style={{ color: '#9a8e80' }}>© {sp.meta.copyright_holder}</span>}
                        {sp?.meta?.license && <span className="font-sans text-xs" style={{ color: '#9a8e80' }}>{sp.meta.license}</span>}
                        {specimens.length > 1 && (
                          <span className="font-sans text-xs tabular-nums ml-auto" style={{ color: '#9a8e80' }}>{activeIdx + 1} / {specimens.length}</span>
                        )}
                      </>
                    );
                  })()}
                </div>
                <button
                  onClick={() => setShowImageEditModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 font-sans text-xs font-semibold rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150 shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit Images
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No-image placeholder when catalog has no images */}
        {specimens.length === 0 && (
          <div className="bg-card border border-border rounded-md mb-6 p-8 flex flex-col items-center justify-center gap-3" style={{ minHeight: 200 }}>
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#9a8e80' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="font-sans text-sm text-text-muted">No catalog images</p>
            <button
              onClick={() => setShowImageEditModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 font-sans text-sm font-semibold rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150"
            >
              Upload Your Own
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {(weight || diameter || grade || notes) && (
            <div className="p-5 bg-card border border-border rounded-md">
              <h2 className="font-display font-semibold text-xl mb-4 text-text-primary">Your Details</h2>
              <div className="grid grid-cols-2 gap-3">
                {renderField('Weight', weight ? `${weight} g` : null)}
                {renderField('Diameter', diameter ? `${diameter} mm` : null)}
                {renderField('Grade', grade)}
                {renderField('Notes', notes)}
              </div>
            </div>
          )}

          <div className="p-5 bg-card border border-border rounded-md">
            <h2 className="font-display font-semibold text-xl mb-4 text-text-primary">Authority</h2>
            <div className="grid grid-cols-2 gap-3">
              {renderField('Issuer',  fmt(coin.authority?.issuer))}
              {renderField('Dynasty', fmt(coin.authority?.dynasty))}
              {renderField('Period', fmtPeriod(coin.coinage?.date))}
            </div>
          </div>

          <div className="p-5 bg-card border border-border rounded-md">
            <h2 className="font-display font-semibold text-xl mb-4 text-text-primary">Classification</h2>
            <div className="grid grid-cols-2 gap-3">
              {renderField('Denomination', fmt(coin.classification?.denomination))}
              {renderField('Material',     fmt(coin.classification?.material))}
              {renderField('Mint',         fmt(coin.classification?.mint))}
            </div>
          </div>

          {['obverse', 'reverse'].map(side => {
            const desc = coin.descriptions?.[side];
            if (!desc) return null;
            return (
              <div key={side} className="p-5 bg-card border border-border rounded-md">
                <h2 className="font-display font-semibold text-xl mb-4 text-text-primary capitalize">{side}</h2>
                <div className="space-y-2">
                  {renderField('Legend',  desc?.legend)}
                  {renderField('Type',    desc?.type)}
                  {renderField('Portrait', fmt(desc?.portrait))}
                </div>
              </div>
            );
          })}
        </div>

        {coin.subjects?.length > 0 && (
          <div className="p-5 bg-card border border-border rounded-md mb-6">
            <h2 className="font-display font-semibold text-xl mb-3 text-text-primary">Subjects</h2>
            <div className="flex flex-wrap gap-2">
              {coin.subjects.map(s => (
                <span key={s} className="font-sans text-xs px-2.5 py-1 rounded-full bg-surface-alt border border-border text-text-secondary">{fmt(s)}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(46,40,32,0.6)]">
          <div className="w-full max-w-md bg-card border border-border rounded-md">
            <div className="p-5 border-b border-border">
              <h2 className="font-display font-semibold text-xl text-text-primary">Edit Coin Details</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Weight (g)', value: editWeight, setter: setEditWeight, type: 'number', step: '0.01' },
                  { label: 'Diameter (mm)', value: editDiameter, setter: setEditDiameter, type: 'number', step: '0.1' },
                ].map(({ label, value, setter, type, step }) => (
                  <div key={label}>
                    <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">{label}</label>
                    <input type={type} step={step} value={value} onChange={e => setter(e.target.value)} className={inputCls} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">Grade</label>
                <select value={editGrade} onChange={e => setEditGrade(e.target.value)} className={selectCls}>
                  <option value="">Select grade…</option>
                  {['Poor (P)','Fair (F)','Very Good (VG)','Fine (F)','Very Fine (VF)','Extremely Fine (EF)','About Uncirculated (AU)','Uncirculated (UNC)'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">Notes</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} className={inputCls + ' resize-none'} />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2 font-sans text-sm border border-border rounded bg-card text-text-secondary hover:border-border-strong transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit} disabled={editLoading}
                  className="flex-1 py-2 font-sans text-sm font-semibold rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150 disabled:opacity-50"
                >
                  {editLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(46,40,32,0.6)]">
          <div className="w-full max-w-md p-6 bg-card border border-border rounded-md">
            <h2 className="font-display font-semibold text-xl mb-3 text-text-primary">Remove from Collection</h2>
            <p className="font-sans text-sm mb-6 text-text-secondary">
              Are you sure you want to remove &quot;{coin.title?.en}&quot; from your collection? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 font-sans text-sm border border-border rounded bg-card text-text-secondary hover:border-border-strong transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCoin} disabled={deleteLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 font-sans text-sm font-semibold rounded bg-red-700 text-white hover:bg-red-800 transition-colors duration-150 disabled:opacity-50"
              >
                {deleteLoading ? (
                  <><div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-t-transparent border-white" />Removing…</>
                ) : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Edit Modal */}
      {showImageEditModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-[rgba(46,40,32,0.8)]"
          onClick={e => e.target === e.currentTarget && setShowImageEditModal(false)}
        >
          <div className="relative w-full max-w-2xl my-4 bg-card border border-border rounded-md">
            <button
              onClick={() => setShowImageEditModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-surface-alt text-text-secondary hover:bg-border transition-colors duration-150"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-6">
              <h2 className="font-display font-semibold text-2xl mb-1 text-text-primary">Edit Coin Images</h2>
              <p className="font-sans text-sm mb-5 text-text-muted">Upload custom images for this coin in your collection</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                {[
                  { side: 'obverse', label: 'Obverse (Front)', preview: obversePreview, dragActive: dragActiveObverse, setDragActive: setDragActiveObverse },
                  { side: 'reverse', label: 'Reverse (Back)', preview: reversePreview, dragActive: dragActiveReverse, setDragActive: setDragActiveReverse },
                ].map(({ side, label, preview, dragActive: da, setDragActive: sda }) => (
                  <div key={side}>
                    <h3 className="font-sans font-semibold text-sm mb-2 text-text-primary">{label}</h3>
                    <div
                      className="relative p-5 text-center transition-colors duration-150 rounded"
                      style={{
                        border: `2px dashed ${da ? '#b8843a' : '#e8e0d0'}`,
                        backgroundColor: da ? '#f0e8d4' : '#faf4ea',
                      }}
                      onDragEnter={e => { e.preventDefault(); sda(true); }}
                      onDragLeave={e => { e.preventDefault(); sda(false); }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault(); sda(false);
                        if (e.dataTransfer.files.length > 0) handleImageChange(e.dataTransfer.files[0], side);
                      }}
                    >
                      <input
                        type="file" accept="image/*"
                        onChange={e => handleImageChange(e.target.files[0], side)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      {preview ? (
                        <div>
                          <img src={preview} alt={`${side} preview`} className="w-full h-28 object-contain mx-auto rounded" />
                          <p className="mt-2 font-sans text-xs font-medium" style={{ color: semantic.success.text }}>Image selected</p>
                        </div>
                      ) : (
                        <div>
                          <svg className="w-10 h-10 mx-auto mb-2 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="font-sans text-xs text-text-muted">Click or drag to upload {side} image</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <button
                  onClick={handleImageReset} disabled={imageUploadLoading || imageResetLoading}
                  className="px-4 py-2 font-sans text-sm border border-border rounded bg-card text-text-secondary hover:border-border-strong transition-colors duration-150 disabled:opacity-50"
                >
                  {imageResetLoading ? 'Resetting…' : 'Reset to Catalog Images'}
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowImageEditModal(false)}
                    className="px-4 py-2 font-sans text-sm border border-border rounded bg-card text-text-secondary hover:border-border-strong transition-colors duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImageUpload}
                    disabled={imageUploadLoading || (!selectedObverseImage && !selectedReverseImage)}
                    className="px-5 py-2 font-sans text-sm font-semibold rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {imageUploadLoading ? 'Uploading…' : 'Upload Images'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Modal */}
      {zoomed && active && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: '#faf4ea' }} onClick={() => setZoomed(false)}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b"
            style={{ backgroundColor: '#fefcf8', borderColor: '#e8e0d0' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              {specimens.length > 1 && (
                <>
                  <button onClick={() => { setActiveIdx(i => (i - 1 + specimens.length) % specimens.length); handleZoomReset(); }}
                    className="w-8 h-8 flex items-center justify-center rounded border transition-colors"
                    style={{ borderColor: '#e8e0d0', color: '#5a5040', backgroundColor: '#fdf8f0' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                  </button>
                  <button onClick={() => { setActiveIdx(i => (i + 1) % specimens.length); handleZoomReset(); }}
                    className="w-8 h-8 flex items-center justify-center rounded border transition-colors"
                    style={{ borderColor: '#e8e0d0', color: '#5a5040', backgroundColor: '#fdf8f0' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                  </button>
                  <span className="font-sans text-xs ml-1" style={{ color: '#9a8e80' }}>{activeIdx + 1} / {specimens.length}</span>
                </>
              )}
              <span className="font-sans text-xs ml-2" style={{ color: '#5a5040' }}>{active.label}</span>
            </div>
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <button onClick={handleZoomOut} disabled={zoomScale <= 1}
                className="w-8 h-8 flex items-center justify-center rounded border disabled:opacity-30 transition-colors"
                style={{ borderColor: '#e8e0d0', color: '#5a5040', backgroundColor: '#fdf8f0' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"/></svg>
              </button>
              <button onClick={handleZoomReset}
                className="font-sans text-xs min-w-[3rem] text-center tabular-nums px-2 py-1 rounded border transition-colors"
                style={{ borderColor: '#e8e0d0', color: '#b8843a', backgroundColor: '#fdf8f0' }}>
                {Math.round(zoomScale * 100)}%
              </button>
              <button onClick={handleZoomIn} disabled={zoomScale >= 4}
                className="w-8 h-8 flex items-center justify-center rounded border disabled:opacity-30 transition-colors"
                style={{ borderColor: '#e8e0d0', color: '#5a5040', backgroundColor: '#fdf8f0' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
              </button>
              <div className="w-px h-5 mx-1" style={{ backgroundColor: '#e8e0d0' }} />
              <button onClick={() => setZoomed(false)}
                className="w-8 h-8 flex items-center justify-center rounded border transition-colors"
                style={{ borderColor: '#e8e0d0', color: '#5a5040', backgroundColor: '#fdf8f0' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          {/* Image area */}
          <div
            ref={zoomContainerRef}
            className="flex-1 overflow-hidden flex items-center justify-center"
            style={{ cursor: zoomScale > 1 ? 'grab' : 'default', backgroundColor: '#faf4ea' }}
            onClick={e => e.stopPropagation()}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onWheel={onWheelZoom}
          >
            <div style={{
              transform: `scale(${zoomScale}) translate(${zoomOffset.x / zoomScale}px, ${zoomOffset.y / zoomScale}px)`,
              transformOrigin: 'center center',
              transition: isDragging.current ? 'none' : 'transform 0.15s ease-out',
              userSelect: 'none',
              backgroundColor: '#faf4ea',
            }} className="w-full flex items-center justify-center">
              {active.unified ? (
                <img src={active.unified} alt={active.label}
                  className="max-h-[80vh] max-w-full object-contain pointer-events-none"
                  style={{ mixBlendMode: 'multiply' }}
                  draggable={false}
                  onError={e => { e.currentTarget.src = '/images/coin-placeholder.svg'; }} />
              ) : (
                <div className="flex gap-8 items-center justify-center px-8" style={{ backgroundColor: '#faf4ea' }}>
                  {active.obverse && (
                    <img src={active.obverse} alt="Obverse"
                      className="max-h-[72vh] max-w-[44vw] object-contain pointer-events-none"
                      style={{ mixBlendMode: 'multiply' }}
                      draggable={false}
                      onError={e => { e.currentTarget.src = '/images/coin-placeholder.svg'; }} />
                  )}
                  {active.reverse && (
                    <img src={active.reverse} alt="Reverse"
                      className="max-h-[72vh] max-w-[44vw] object-contain pointer-events-none"
                      style={{ mixBlendMode: 'multiply' }}
                      draggable={false}
                      onError={e => { e.currentTarget.src = '/images/coin-placeholder.svg'; }} />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom license bar */}
          {(active.meta?.copyright_holder || active.meta?.license) && (
            <div className="shrink-0 px-5 py-2.5 flex flex-wrap gap-x-5 border-t"
              style={{ backgroundColor: '#fefcf8', borderColor: '#e8e0d0' }}
              onClick={e => e.stopPropagation()}>
              {active.meta.copyright_holder && <span className="font-sans text-xs" style={{ color: '#9a8e80' }}>© {active.meta.copyright_holder}</span>}
              {active.meta.license && <span className="font-sans text-xs" style={{ color: '#9a8e80' }}>{active.meta.license}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CollectionCoinDetail;
