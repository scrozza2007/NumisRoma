import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';
import { fmt, fmtPeriod, fmtReference } from '../utils/formatters';
import CoinImagePlaceholder from '../components/CoinImagePlaceholder';

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

const emptyEditDetails = {
  weight: '', diameter: '', axis: '', thickness: '', shape: '', grade: '',
  patina: '', conditionNotes: '', rarity: '', authenticityStatus: 'Unknown',
  acquisitionDate: '', purchasePrice: '', estimatedValue: '', seller: '',
  auctionHouse: '', lotNumber: '', invoiceReferenceNumber: '', sourceType: '',
  provenance: '', storageLocation: '', tags: '', notes: '', otherReferences: ''
};

const nonNegativeFields = new Set(['weight', 'diameter', 'thickness', 'purchasePrice', 'estimatedValue']);

const getUserId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value._id || value.id || null;
};

const CollectionCoinDetail = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useContext(AuthContext);
  const currency = 'EUR';
  const { id, collectionId, entryId } = router.query;

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

  const [editDetails, setEditDetails] = useState(emptyEditDetails);

  const [showImageEditModal, setShowImageEditModal] = useState(false);
  const [selectedObverseImage, setSelectedObverseImage] = useState(null);
  const [selectedReverseImage, setSelectedReverseImage] = useState(null);
  const [obversePreview, setObversePreview] = useState(null);
  const [reversePreview, setReversePreview] = useState(null);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [dragActiveObverse, setDragActiveObverse] = useState(false);
  const [dragActiveReverse, setDragActiveReverse] = useState(false);
  const [imageResetLoading, setImageResetLoading] = useState(false);
  const [imageModalError, setImageModalError] = useState(null);

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

  const getCurrentEntry = useCallback(() => {
    const entries = collectionData?.coins || [];
    return entries.find(e => e._id === entryId) || entries.find(e => (e.coin?._id || e.coin) === id) || null;
  }, [collectionData, entryId, id]);

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
    if (!isOwner) {
      setNotification({ show: true, type: 'error', message: 'Only the collection owner can edit this coin.' });
      return;
    }
    const entry = getCurrentEntry();
    setEditDetails({
      ...emptyEditDetails,
      weight: entry?.weight ?? '',
      diameter: entry?.diameter ?? '',
      axis: entry?.axis || '',
      thickness: entry?.thickness ?? '',
      shape: entry?.shape || '',
      grade: entry?.grade || '',
      patina: entry?.patina || '',
      conditionNotes: entry?.conditionNotes || '',
      rarity: entry?.rarity || '',
      authenticityStatus: entry?.authenticityStatus || 'Unknown',
      acquisitionDate: entry?.acquisitionDate ? new Date(entry.acquisitionDate).toISOString().slice(0, 10) : '',
      purchasePrice: entry?.purchasePrice?.amount ?? '',
      estimatedValue: entry?.estimatedValue?.amount ?? '',
      seller: entry?.seller || '',
      auctionHouse: entry?.auctionHouse || '',
      lotNumber: entry?.lotNumber || '',
      invoiceReferenceNumber: entry?.invoiceReferenceNumber || '',
      sourceType: entry?.sourceType || '',
      provenance: entry?.provenance || '',
      storageLocation: entry?.storageLocation || '',
      tags: (entry?.tags || []).join(', '),
      notes: entry?.notes || '',
      otherReferences: entry?.catalogReferences?.other || ''
    });
    setShowEditModal(true);
  };

  const handleEditFieldChange = (name, value) => {
    if (nonNegativeFields.has(name) && Number(value) < 0) return;
    setEditDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    if (!coin || !coin._id || !isOwner) return;
    const targetId = entryId || coin._id;
    setEditLoading(true);
    try {
      await apiClient.put(`/api/collections/${collectionId}/coins/${targetId}`, {
        ...editDetails,
        purchasePrice: editDetails.purchasePrice ? { amount: Number(editDetails.purchasePrice), currency } : undefined,
        estimatedValue: editDetails.estimatedValue ? { amount: Number(editDetails.estimatedValue), currency } : undefined,
        catalogReferences: editDetails.otherReferences ? { other: editDetails.otherReferences } : undefined
      });
      setShowEditModal(false);
      await fetchCollectionData();
      await fetchCustomImages();
      setNotification({ show: true, type: 'success', message: 'Data updated successfully' });
      router.replace({
        pathname: router.pathname,
        query: { id, collectionId, entryId }
      }, undefined, { shallow: true });
    } catch (err) {
      setNotification({ show: true, type: 'error', message: err.message || 'Error while updating' });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteCoin = async () => {
    if (!isOwner) {
      setNotification({ show: true, message: 'Only the collection owner can remove this coin.', type: 'error' });
      return;
    }
    setDeleteLoading(true);
    try {
      await apiClient.delete(`/api/collections/${collectionId}/coins/${entryId || id}`);
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
    setImageModalError(null);
    if (!file.type.startsWith('image/')) {
      setImageModalError('Unsupported file type. Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setImageModalError('File is too large. Please upload an image under 15 MB.');
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
    if (!isOwner || (!selectedObverseImage && !selectedReverseImage)) return;
    setImageUploadLoading(true);
    setImageModalError(null);
    try {
      const formData = new FormData();
      if (selectedObverseImage) formData.append('obverse', selectedObverseImage);
      if (selectedReverseImage) formData.append('reverse', selectedReverseImage);
      await apiClient.postFormData(`/api/coins/entry/${entryId}/images`, formData);
      setNotification({ show: true, message: 'Images uploaded successfully!', type: 'success' });
      setShowImageEditModal(false);
      setImageModalError(null);
      setSelectedObverseImage(null); setSelectedReverseImage(null);
      setObversePreview(null); setReversePreview(null);
      await fetchCustomImages();
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } catch (err) {
      setImageModalError(err.message || 'Upload failed. Please try again.');
    } finally {
      setImageUploadLoading(false);
    }
  };

  const handleImageReset = async () => {
    if (!isOwner) {
      setNotification({ show: true, message: 'Only the collection owner can edit images.', type: 'error' });
      return;
    }
    setImageResetLoading(true);
    try {
      await apiClient.delete(`/api/coins/entry/${entryId}/images`);
      setNotification({ show: true, message: 'Custom images removed successfully!', type: 'success' });
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

  const specimens = coin ? buildSpecimens([], customImages) : [];
  const active = specimens[activeIdx] || null;
  const collectionEntry = getCurrentEntry();
  const isOwner = Boolean(
    user &&
    collectionData?.user &&
    String(getUserId(user)) === String(getUserId(collectionData.user))
  );

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
        <div className={`fixed top-6 right-6 z-50 p-3.5 flex items-start gap-2 font-sans text-sm rounded border max-w-[320px] ${
          notification.type === 'success'
            ? 'bg-success-bg border-success-border text-success-text'
            : 'bg-error-bg border-error-border text-error-text'
        }`}>
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
            <Link
              href={`/coin-detail?id=${coin._id}`}
              className="flex items-center gap-1.5 px-3 py-2 font-sans text-sm border border-amber rounded bg-amber-bg text-amber hover:bg-amber hover:text-canvas transition-colors duration-150"
              title="View matching catalog record"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5h5m0 0v5m0-5L10 14M5 7v12h12v-5" />
              </svg>
              View in Catalog
            </Link>
            {isOwner && (
              <>
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
              </>
            )}
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
                <div className="group relative cursor-zoom-in bg-surface"
                  onClick={() => setZoomed(true)}>
                  {sp.unified ? (
                    <div className="flex min-h-[260px] items-center justify-center bg-surface">
                      <img src={sp.unified} alt={sp.label}
                        className="w-full max-h-[420px] object-contain p-8 mix-blend-multiply transition-transform duration-300 group-hover:scale-[1.02]"
                        onError={e => { e.currentTarget.src = '/images/coin-placeholder.svg'; }} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 bg-surface">
                      {sp.obverse && (
                        <div className="flex min-h-[260px] items-center justify-center bg-surface border-r border-border">
                          <img src={sp.obverse} alt="Obverse"
                            className="w-full max-h-[420px] object-contain p-8 mix-blend-multiply transition-transform duration-300 group-hover:scale-[1.02]"
                            onError={e => { e.currentTarget.src = '/images/coin-placeholder.svg'; }} />
                        </div>
                      )}
                      {sp.reverse && (
                        <div className="flex min-h-[260px] items-center justify-center bg-surface">
                          <img src={sp.reverse} alt="Reverse"
                            className="w-full max-h-[420px] object-contain p-8 mix-blend-multiply transition-transform duration-300 group-hover:scale-[1.02]"
                            onError={e => { e.currentTarget.src = '/images/coin-placeholder.svg'; }} />
                        </div>
                      )}
                    </div>
                  )}
                  {/* Zoom hint */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-between px-4">
                    <div />
                    <span className="font-sans text-xs px-3 py-1.5 rounded-full text-canvas bg-[rgba(46,40,32,0.55)]">Click to zoom</span>
                    <div />
                  </div>
                  {specimens.length > 1 && (
                    <>
                      <button className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full pointer-events-auto z-10 transition-opacity opacity-0 group-hover:opacity-100 bg-card border border-border text-text-secondary"
                        onClick={e => { e.stopPropagation(); setActiveIdx(i => (i - 1 + specimens.length) % specimens.length); }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                      </button>
                      <button className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full pointer-events-auto z-10 transition-opacity opacity-0 group-hover:opacity-100 bg-card border border-border text-text-secondary"
                        onClick={e => { e.stopPropagation(); setActiveIdx(i => (i + 1) % specimens.length); }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                      </button>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Filmstrip + metadata bar */}
            <div className="border-t border-border flex items-stretch">
              {specimens.length > 1 && (
                <div className="flex gap-0 overflow-x-auto shrink-0 border-r border-border">
                  {specimens.map((sp, i) => {
                    const thumb = sp.obverse || sp.unified || sp.reverse;
                    return (
                      <button key={i} onClick={() => setActiveIdx(i)}
                        className={`relative w-[72px] h-[72px] shrink-0 bg-surface transition-opacity ${
                          i < specimens.length - 1 ? 'border-r border-border' : ''
                        } ${i === activeIdx ? 'opacity-100 outline-2 -outline-offset-2 outline-amber' : 'opacity-55 outline-none'}`}>
                        {thumb && (
                          <img src={thumb} alt={sp.label} className="w-full h-full object-contain p-1.5 mix-blend-multiply"
                            onError={e => { e.currentTarget.style.display = 'none'; }} />
                        )}
                        {sp.isCustom && (
                          <span className="absolute bottom-1 left-0 right-0 text-center font-sans text-[8px] text-amber">Custom</span>
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
                        <span className="font-sans text-xs font-medium text-text-muted">{sp?.label}</span>
                        {sp?.meta?.copyright_holder && <span className="font-sans text-xs text-text-muted">© {sp.meta.copyright_holder}</span>}
                        {sp?.meta?.license && <span className="font-sans text-xs text-text-muted">{sp.meta.license}</span>}
                        {specimens.length > 1 && (
                          <span className="font-sans text-xs tabular-nums ml-auto text-text-muted">{activeIdx + 1} / {specimens.length}</span>
                        )}
                      </>
                    );
                  })()}
                </div>
                {isOwner && (
                  <button
                    onClick={() => setShowImageEditModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 font-sans text-xs font-semibold rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150 shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit Images
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* No-image placeholder when no custom images have been uploaded */}
        {specimens.length === 0 && (
          <div className="bg-card border border-border rounded-md mb-6 min-h-[200px] p-8 flex flex-col items-center justify-center gap-3">
            <CoinImagePlaceholder className="w-44 h-44 rounded" />
            {isOwner && (
              <button
                onClick={() => setShowImageEditModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 font-sans text-sm font-semibold rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150"
              >
                Upload Your Own
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {collectionEntry && (
            <div className="p-5 bg-card border border-border rounded-md">
              <h2 className="font-display font-semibold text-xl mb-4 text-text-primary">Your Details</h2>
              <div className="grid grid-cols-2 gap-3">
                {renderField('Weight', collectionEntry.weight ? `${collectionEntry.weight} g` : null)}
                {renderField('Diameter', collectionEntry.diameter ? `${collectionEntry.diameter} mm` : null)}
                {renderField('Thickness', collectionEntry.thickness ? `${collectionEntry.thickness} mm` : null)}
                {renderField('Axis', collectionEntry.axis)}
                {renderField('Shape', fmt(collectionEntry.shape))}
                {renderField('Grade', fmt(collectionEntry.grade))}
                {renderField('Patina', fmt(collectionEntry.patina))}
                {renderField('Authenticity', fmt(collectionEntry.authenticityStatus))}
                {renderField('Rarity', fmt(collectionEntry.rarity))}
                {renderField('Purchase price', collectionEntry.purchasePrice?.amount ? `EUR ${collectionEntry.purchasePrice.amount}` : null)}
                {renderField('Estimated value', collectionEntry.estimatedValue?.amount ? `EUR ${collectionEntry.estimatedValue.amount}` : null)}
                {renderField('Acquisition date', collectionEntry.acquisitionDate ? new Date(collectionEntry.acquisitionDate).toLocaleDateString() : null)}
                {renderField('Seller', collectionEntry.seller)}
                {renderField('Auction house', collectionEntry.auctionHouse)}
                {renderField('Lot number', collectionEntry.lotNumber)}
                {renderField('Invoice/reference', collectionEntry.invoiceReferenceNumber)}
                {renderField('Source type', fmt(collectionEntry.sourceType))}
                {renderField('Storage location', collectionEntry.storageLocation)}
                {renderField('Tags', (collectionEntry.tags || []).map(fmt).join(', '))}
                {renderField('Condition notes', collectionEntry.conditionNotes)}
                {renderField('Provenance', collectionEntry.provenance)}
                {renderField('Personal notes', collectionEntry.notes)}
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

          {(coin.reference || coin.source_ocre_url) && (
            <div className="p-5 bg-card border border-border rounded-md">
              {coin.reference && (
                <>
                  <h2 className="font-display font-semibold text-xl mb-4 text-text-primary">Reference</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {renderField('Citation', fmtReference(coin.reference, coin.title?.en))}
                  </div>
                  {coin.references?.length > 1 && (
                    <div className="mt-3 space-y-1">
                      <p className="font-sans text-xs font-medium text-amber">Additional references</p>
                      {coin.references.slice(1).map((ref, i) => (
                        <p key={i} className="font-sans text-xs text-text-secondary">
                          {fmtReference(ref)}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              )}
              {coin.source_ocre_url && (
                <div className={coin.reference ? 'pt-4 mt-4 border-t border-border' : ''}>
                  <a href={coin.source_ocre_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-sans text-sm text-amber hover:text-amber-hover transition-colors">
                    View on OCRE
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          )}

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
          <div className="w-full max-w-3xl max-h-[88vh] overflow-y-auto bg-card border border-border rounded-md">
            <div className="p-5 border-b border-border">
              <h2 className="font-display font-semibold text-xl text-text-primary">Edit Coin Details</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ['weight', 'Weight (g)', 'number', '0.01'],
                  ['diameter', 'Diameter (mm)', 'number', '0.01'],
                  ['thickness', 'Thickness (mm)', 'number', '0.01'],
                  ['axis', 'Axis', 'text'],
                  ['shape', 'Shape', 'text'],
                  ['patina', 'Patina', 'text'],
                  ['rarity', 'Rarity', 'text'],
                  ['storageLocation', 'Storage', 'text']
                ].map(([name, label, type, step]) => (
                  <div key={label}>
                    <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">{label}</label>
                    <input
                      type={type}
                      step={step}
                      min={nonNegativeFields.has(name) ? '0' : undefined}
                      value={editDetails[name] || ''}
                      onChange={e => handleEditFieldChange(name, e.target.value)}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">Grade</label>
                  <select value={editDetails.grade} onChange={e => handleEditFieldChange('grade', e.target.value)} className={selectCls}>
                    <option value="">Select grade…</option>
                    {['Poor','Fair','About Good','Good','Very Good','Fine','Very Fine','Extremely Fine','About Uncirculated','Uncirculated'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">Source type</label>
                  <select value={editDetails.sourceType} onChange={e => handleEditFieldChange('sourceType', e.target.value)} className={selectCls}>
                    <option value="">Select source…</option>
                    {['Auction', 'Dealer', 'Private seller', 'Personally found', 'Inherited', 'Gift'].map(source => <option key={source} value={source}>{source}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">Authenticity</label>
                  <select value={editDetails.authenticityStatus} onChange={e => handleEditFieldChange('authenticityStatus', e.target.value)} className={selectCls}>
                    {['Unknown', 'Authentic', 'Likely authentic', 'Questionable', 'Replica', 'Forgery'].map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ['acquisitionDate', 'Acquisition date', 'date'],
                  ['purchasePrice', 'Purchase price', 'number'],
                  ['estimatedValue', 'Estimated value', 'number'],
                  ['seller', 'Seller', 'text'],
                  ['auctionHouse', 'Auction house', 'text'],
                  ['lotNumber', 'Lot number', 'text'],
                  ['invoiceReferenceNumber', 'Invoice/reference', 'text'],
                  ['tags', 'Tags', 'text']
                ].map(([name, label, type]) => (
                  <div key={name}>
                    <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">{label}</label>
                    <input
                      type={type}
                      min={nonNegativeFields.has(name) ? '0' : undefined}
                      step={type === 'number' ? '0.01' : undefined}
                      value={editDetails[name] || ''}
                      onChange={e => handleEditFieldChange(name, e.target.value)}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">Additional private references</label>
                <input value={editDetails.otherReferences} onChange={e => handleEditFieldChange('otherReferences', e.target.value)} className={inputCls} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">Condition notes</label>
                  <textarea value={editDetails.conditionNotes} onChange={e => handleEditFieldChange('conditionNotes', e.target.value)} rows={3} className={inputCls + ' resize-none'} />
                </div>
                <div>
                  <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">Provenance</label>
                  <textarea value={editDetails.provenance} onChange={e => handleEditFieldChange('provenance', e.target.value)} rows={3} className={inputCls + ' resize-none'} />
                </div>
              </div>

              <div>
                <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">Notes</label>
                <textarea value={editDetails.notes} onChange={e => handleEditFieldChange('notes', e.target.value)} rows={3} className={inputCls + ' resize-none'} />
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
              onClick={() => { setShowImageEditModal(false); setImageModalError(null); }}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-surface-alt text-text-secondary hover:bg-border transition-colors duration-150"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-6">
              <h2 className="font-display font-semibold text-2xl mb-1 text-text-primary">Edit Coin Images</h2>
              <p className="font-sans text-sm mb-4 text-text-muted">Upload your own photos of this coin. Min 600×600px · JPEG, PNG, WebP · Max 15 MB.</p>

              {imageModalError && (
                <div className="flex items-start gap-2.5 p-3 mb-4 rounded-md text-sm font-sans bg-error-bg border border-error-border text-error-text">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-semibold mb-0.5">Photo not accepted</p>
                    <p>{imageModalError}</p>
                  </div>
                  <button onClick={() => setImageModalError(null)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                {[
                  { side: 'obverse', label: 'Obverse (Front)', preview: obversePreview, dragActive: dragActiveObverse, setDragActive: setDragActiveObverse },
                  { side: 'reverse', label: 'Reverse (Back)', preview: reversePreview, dragActive: dragActiveReverse, setDragActive: setDragActiveReverse },
                ].map(({ side, label, preview, dragActive: da, setDragActive: sda }) => (
                  <div key={side}>
                    <h3 className="font-sans font-semibold text-sm mb-2 text-text-primary">{label}</h3>
                    <div
                      className={`relative p-5 text-center transition-colors duration-150 rounded border-2 border-dashed ${
                        da ? 'border-amber bg-amber-bg' : 'border-border bg-surface'
                      }`}
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
                          <p className="mt-2 font-sans text-xs font-medium text-success-text">Image selected</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <CoinImagePlaceholder className="w-24 h-24 rounded mb-2" />
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
                  {imageResetLoading ? 'Removing…' : 'Remove Custom Images'}
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowImageEditModal(false); setImageModalError(null); }}
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
        <div className="fixed inset-0 z-50 flex flex-col bg-surface" onClick={() => setZoomed(false)}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-border bg-card"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              {specimens.length > 1 && (
                <>
                  <button onClick={() => { setActiveIdx(i => (i - 1 + specimens.length) % specimens.length); handleZoomReset(); }}
                    className="w-8 h-8 flex items-center justify-center rounded border border-border text-text-secondary bg-canvas transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                  </button>
                  <button onClick={() => { setActiveIdx(i => (i + 1) % specimens.length); handleZoomReset(); }}
                    className="w-8 h-8 flex items-center justify-center rounded border border-border text-text-secondary bg-canvas transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                  </button>
                  <span className="font-sans text-xs ml-1 text-text-muted">{activeIdx + 1} / {specimens.length}</span>
                </>
              )}
              <span className="font-sans text-xs ml-2 text-text-secondary">{active.label}</span>
            </div>
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <button onClick={handleZoomOut} disabled={zoomScale <= 1}
                className="w-8 h-8 flex items-center justify-center rounded border border-border text-text-secondary bg-canvas disabled:opacity-30 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"/></svg>
              </button>
              <button onClick={handleZoomReset}
                className="font-sans text-xs min-w-[3rem] text-center tabular-nums px-2 py-1 rounded border border-border text-amber bg-canvas transition-colors">
                {Math.round(zoomScale * 100)}%
              </button>
              <button onClick={handleZoomIn} disabled={zoomScale >= 4}
                className="w-8 h-8 flex items-center justify-center rounded border border-border text-text-secondary bg-canvas disabled:opacity-30 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
              </button>
              <div className="w-px h-5 mx-1 bg-border" />
              <button onClick={() => setZoomed(false)}
                className="w-8 h-8 flex items-center justify-center rounded border border-border text-text-secondary bg-canvas transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          {/* Image area */}
          <div
            ref={zoomContainerRef}
            className={`flex-1 overflow-hidden flex items-center justify-center bg-surface ${zoomScale > 1 ? 'cursor-grab' : 'cursor-default'}`}
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
            }} className="w-full flex items-center justify-center bg-surface">
              {active.unified ? (
                <img src={active.unified} alt={active.label}
                  className="max-h-[80vh] max-w-full object-contain pointer-events-none mix-blend-multiply"
                  draggable={false}
                  onError={e => { e.currentTarget.src = '/images/coin-placeholder.svg'; }} />
              ) : (
                <div className="flex gap-8 items-center justify-center px-8 bg-surface">
                  {active.obverse && (
                    <img src={active.obverse} alt="Obverse"
                      className="max-h-[72vh] max-w-[44vw] object-contain pointer-events-none mix-blend-multiply"
                      draggable={false}
                      onError={e => { e.currentTarget.src = '/images/coin-placeholder.svg'; }} />
                  )}
                  {active.reverse && (
                    <img src={active.reverse} alt="Reverse"
                      className="max-h-[72vh] max-w-[44vw] object-contain pointer-events-none mix-blend-multiply"
                      draggable={false}
                      onError={e => { e.currentTarget.src = '/images/coin-placeholder.svg'; }} />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom license bar */}
          {(active.meta?.copyright_holder || active.meta?.license) && (
            <div className="shrink-0 px-5 py-2.5 flex flex-wrap gap-x-5 border-t border-border bg-card"
              onClick={e => e.stopPropagation()}>
              {active.meta.copyright_holder && <span className="font-sans text-xs text-text-muted">© {active.meta.copyright_holder}</span>}
              {active.meta.license && <span className="font-sans text-xs text-text-muted">{active.meta.license}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CollectionCoinDetail;
