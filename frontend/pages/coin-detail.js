import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';
import { fmt, fmtPeriod, fmtReference, fmtSource, hasVal } from '../utils/formatters';
import CoinImagePlaceholder from '../components/CoinImagePlaceholder';

// Build a list of specimens: each has { label, meta, obverse?, reverse?, unified? }
// Split images keep obverse + reverse together per specimen.
const buildSpecimens = (images = []) => {
  return images.map((img, idx) => {
    const num = idx + 1;
    if (img.layout === 'split') {
      return { label: `Specimen ${num}`, meta: img, obverse: img.files?.obverse || null, reverse: img.files?.reverse || null, unified: null };
    }
    return { label: `Specimen ${num}`, meta: img, obverse: null, reverse: null, unified: img.files?.unified || null };
  }).filter(s => s.obverse || s.reverse || s.unified);
};

const Field = ({ label, value }) => {
  if (!hasVal(value)) return null;
  return (
    <div className="p-3 rounded bg-surface-alt border border-border">
      <dt className="font-sans text-xs font-medium mb-0.5 text-amber">{label}</dt>
      <dd className="font-sans text-sm text-text-primary">{value}</dd>
    </div>
  );
};

const emptyCoinDetails = {
  weight: '', diameter: '', axis: '', thickness: '', shape: '', grade: '',
  patina: '', conditionNotes: '', rarity: '', authenticityStatus: 'Unknown',
  acquisitionDate: '', purchasePrice: '', estimatedValue: '', seller: '', auctionHouse: '', lotNumber: '',
  invoiceReferenceNumber: '', sourceType: '', provenance: '', storageLocation: '', tags: '', notes: '', otherReferences: ''
};

const nonNegativeFields = new Set(['weight', 'diameter', 'thickness', 'purchasePrice', 'estimatedValue']);

const CoinDetail = () => {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const currency = 'EUR';
  const { id } = router.query;

  const [coin, setCoin]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [specimens, setSpecimens] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomed, setZoomed]   = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 });
  const zoomContainerRef = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const [hasFilters, setHasFilters] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [userCollections, setUserCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [coinDetails, setCoinDetails] = useState(emptyCoinDetails);
  const [selectedObverseImage, setSelectedObverseImage] = useState(null);
  const [selectedReverseImage, setSelectedReverseImage] = useState(null);
  const [obversePreview, setObversePreview] = useState(null);
  const [reversePreview, setReversePreview] = useState(null);
  const [imageError, setImageError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [dragActiveObverse, setDragActiveObverse] = useState(false);
  const [dragActiveReverse, setDragActiveReverse] = useState(false);
  const [adding, setAdding]           = useState(false);
  const [addingWishlist, setAddingWishlist] = useState(false);
  const [notif, setNotif]             = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    document.body.style.overflow = showAddModal || zoomed ? 'hidden' : '';
    if (!zoomed) { setZoomScale(1); setZoomOffset({ x: 0, y: 0 }); }
    return () => { document.body.style.overflow = ''; };
  }, [showAddModal, zoomed]);

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

  const onWheelZoom = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) handleZoomIn();
    else handleZoomOut();
  };

  const fetchCoin = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get(`/api/coins/${id}`);
      setCoin(data);
      setSpecimens(buildSpecimens(data.images || []));
      setActiveIdx(0);
    } catch {
      setError('Could not load this coin. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchCollections = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiClient.get(`/api/collections/user/${user._id}`);
      setUserCollections(Array.isArray(res) ? res : (res.collections || []));
    } catch {}
  }, [user]);

  useEffect(() => {
    if (router.query.id) { fetchCoin(); }
    setHasFilters(!!localStorage.getItem('coinFilters'));
    if (user) fetchCollections();
  }, [router.query.id, fetchCoin, fetchCollections, user]);

  const handleAddToCollection = async () => {
    setAdding(true);
    setImageError(null);
    setFormError(null);
    try {
      if (selectedObverseImage || selectedReverseImage) {
        const validateForm = new FormData();
        if (selectedObverseImage) validateForm.append('obverse', selectedObverseImage);
        if (selectedReverseImage) validateForm.append('reverse', selectedReverseImage);
        try {
          await apiClient.postFormData('/api/coins/validate-images', validateForm);
        } catch (imgErr) {
          setImageError(imgErr.message || 'Image validation failed. Please check your photos and try again.');
          setAdding(false);
          return;
        }
      }

      const updatedCollection = await apiClient.post(`/api/collections/${selectedCollection}/coins`, {
        coin: id,
        ...coinDetails,
        purchasePrice: coinDetails.purchasePrice ? { amount: Number(coinDetails.purchasePrice), currency } : undefined,
        estimatedValue: coinDetails.estimatedValue ? { amount: Number(coinDetails.estimatedValue), currency } : undefined,
        catalogReferences: coinDetails.otherReferences ? { other: coinDetails.otherReferences } : undefined
      });

      if (selectedObverseImage || selectedReverseImage) {
        const entries = updatedCollection.coins?.filter(e => (e.coin?._id || e.coin) === id || e.coin?.toString() === id);
        const newEntry = entries?.[entries.length - 1];
        if (newEntry?._id) {
          const formData = new FormData();
          if (selectedObverseImage) formData.append('obverse', selectedObverseImage);
          if (selectedReverseImage) formData.append('reverse', selectedReverseImage);
          await apiClient.postFormData(`/api/coins/entry/${newEntry._id}/images`, formData);
        }
      }

      setNotif({ show: true, message: 'Coin added to collection!', type: 'success' });
      setShowAddModal(false);
      setSelectedCollection('');
      setCoinDetails(emptyCoinDetails);
      removeImage('obverse');
      removeImage('reverse');
    } catch (err) {
      setFormError(err.message || 'Error adding coin');
    } finally {
      setAdding(false);
      setTimeout(() => setNotif({ show: false, message: '', type: '' }), 3000);
    }
  };

  const handleAddToWishlist = async () => {
    if (!coin) return;
    setAddingWishlist(true);
    try {
      const reference = fmtReference(coin.reference, coin.title?.en);
      await apiClient.post('/api/wishlist', {
        coinId: coin._id,
        name: coin.title?.en || 'Catalog coin',
        emperor: coin.authority?.issuer || '',
        mint: coin.classification?.mint || '',
        material: coin.classification?.material || '',
        denomination: coin.classification?.denomination || '',
        references: [
          reference,
          coin.source_ocre_url
        ].filter(Boolean).join('\n'),
        notes: `Catalog ID: ${coin._id}`,
        status: 'Wanted'
      });
      setNotif({ show: true, message: 'Coin added to wishlist!', type: 'success' });
    } catch (err) {
      setNotif({ show: true, message: err.message || 'Error adding coin to wishlist', type: 'error' });
    } finally {
      setAddingWishlist(false);
      setTimeout(() => setNotif({ show: false, message: '', type: '' }), 3000);
    }
  };

  const handleBack = (e) => {
    e.preventDefault();
    const savedPage = localStorage.getItem('coinCurrentPage');
    router.push(savedPage ? `/browse?page=${savedPage}` : '/browse');
  };

  const inputCls  = 'w-full px-3 py-2 font-sans text-sm bg-card text-text-primary border border-border rounded outline-none focus:border-amber transition-colors';
  const selectCls = inputCls + ' cursor-pointer';

  const handleSpecimenInputChange = (e) => {
    const { name, value } = e.target;
    if (nonNegativeFields.has(name) && Number(value) < 0) return;
    setCoinDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (file, side) => {
    if (!file) return;
    setImageError(null);
    if (!file.type.startsWith('image/')) {
      setImageError('Unsupported file type. Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setImageError('File is too large. Please upload an image under 15 MB.');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    if (side === 'obverse') { setSelectedObverseImage(file); setObversePreview(previewUrl); }
    else { setSelectedReverseImage(file); setReversePreview(previewUrl); }
  };

  const removeImage = (side) => {
    setImageError(null);
    if (side === 'obverse') {
      if (obversePreview) URL.revokeObjectURL(obversePreview);
      setSelectedObverseImage(null); setObversePreview(null);
    } else {
      if (reversePreview) URL.revokeObjectURL(reversePreview);
      setSelectedReverseImage(null); setReversePreview(null);
    }
  };

  const active = specimens[activeIdx] || null;

  return (
    <div className="min-h-screen bg-canvas">
      <Head>
        <title>{coin ? `${coin.title?.en} — NumisRoma` : 'Coin — NumisRoma'}</title>
        <meta name="description" content={coin ? coin.title?.en : 'Coin detail'} />
      </Head>

      {/* Notification */}
      {notif.show && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded border shadow-lg animate-fade-in ${
          notif.type === 'success'
            ? 'bg-success-bg border-success-border text-success-text'
            : 'bg-error-bg border-error-border text-error-text'
        }`}>
          {notif.type === 'success'
            ? <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
            : <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>}
          <span className="font-sans text-sm">{notif.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto py-8 sm:py-10 px-4 sm:px-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber border-t-transparent" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 p-4 rounded bg-red-50 border border-red-200 text-red-700">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span className="font-sans text-sm">{error}</span>
          </div>
        ) : coin ? (
          <>
            {/* Top bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <nav className="flex items-center gap-2 font-sans text-sm text-text-muted">
                <Link href="/" className="hover:text-amber transition-colors">Home</Link>
                <span>/</span>
                <Link href="/browse" className="hover:text-amber transition-colors">Browse</Link>
                <span>/</span>
                <span className="text-text-primary truncate max-w-xs">{coin.title?.en}</span>
              </nav>
              <div className="flex items-center gap-3">
                {hasFilters && (
                  <button onClick={handleBack} className="flex items-center gap-1.5 px-4 py-2 font-sans text-sm border border-border rounded bg-card text-text-secondary hover:border-border-strong transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                    Back to results
                  </button>
                )}
                {user && (
                  <>
                    <button
                      onClick={handleAddToWishlist}
                      disabled={addingWishlist}
                      className="flex items-center gap-1.5 px-4 py-2 font-sans text-sm font-semibold rounded border border-border bg-card text-text-secondary hover:border-amber hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z" />
                      </svg>
                      {addingWishlist ? 'Adding…' : 'Add to Wishlist'}
                    </button>
                    <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-4 py-2 font-sans text-sm font-semibold rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                      Add to Collection
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Header card */}
            <div className="bg-card border border-border rounded-md p-6 sm:p-8 mb-6">
              <h1 className="font-display font-semibold text-3xl sm:text-4xl mb-3 text-text-primary">{coin.title?.en}</h1>
              <div className="flex flex-wrap gap-2">
                {hasVal(fmtPeriod(coin.coinage?.date)) && <span className="font-sans text-xs px-3 py-1 rounded-full bg-surface-alt border border-border text-text-secondary">{fmtPeriod(coin.coinage.date)}</span>}
                {hasVal(coin.classification?.material)    && <span className="font-sans text-xs px-3 py-1 rounded-full bg-surface-alt border border-border text-text-secondary">{fmt(coin.classification.material)}</span>}
                {hasVal(coin.classification?.denomination) && <span className="font-sans text-xs px-3 py-1 rounded-full bg-surface-alt border border-border text-text-secondary">{fmt(coin.classification.denomination)}</span>}
                {hasVal(coin.classification?.mint)         && <span className="font-sans text-xs px-3 py-1 rounded-full bg-surface-alt border border-border text-text-secondary">{fmt(coin.classification.mint)}</span>}
              </div>
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
                            className="w-full max-h-[420px] object-contain p-8 transition-transform duration-300 group-hover:scale-[1.02] mix-blend-multiply"
                            onError={e => { e.currentTarget.src = '/images/coin-placeholder.svg'; }} />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 bg-surface">
                          {sp.obverse && (
                            <div className="flex min-h-[260px] items-center justify-center bg-surface border-r border-border">
                              <img src={sp.obverse} alt="Obverse"
                                className="w-full max-h-[420px] object-contain p-8 transition-transform duration-300 group-hover:scale-[1.02] mix-blend-multiply"
                                onError={e => { e.currentTarget.src = '/images/coin-placeholder.svg'; }} />
                            </div>
                          )}
                          {sp.reverse && (
                            <div className="flex min-h-[260px] items-center justify-center bg-surface">
                              <img src={sp.reverse} alt="Reverse"
                                className="w-full max-h-[420px] object-contain p-8 transition-transform duration-300 group-hover:scale-[1.02] mix-blend-multiply"
                                onError={e => { e.currentTarget.src = '/images/coin-placeholder.svg'; }} />
                            </div>
                          )}
                        </div>
                      )}
                      {/* Zoom hint + nav arrows */}
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
                <div className="border-t border-border flex">
                  {/* Thumbnail strip */}
                  {specimens.length > 1 && (
                    <div className="flex gap-0 overflow-x-auto shrink-0 border-r border-border">
                      {specimens.map((sp, i) => {
                        const thumb = sp.obverse || sp.unified || sp.reverse;
                        return (
                          <button key={i} onClick={() => setActiveIdx(i)}
                            className={`relative w-[72px] h-[72px] shrink-0 transition-opacity bg-surface ${
                              i < specimens.length - 1 ? 'border-r border-border' : ''
                            } ${i === activeIdx ? 'opacity-100 outline-2 -outline-offset-2 outline-amber' : 'opacity-55 outline-none'}`}>
                            {thumb && (
                              <img src={thumb} alt={sp.label} className="w-full h-full object-contain p-1.5 mix-blend-multiply"
                                onError={e => { e.currentTarget.style.display = 'none'; }} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Active specimen metadata */}
                  {(() => {
                    const sp = specimens[activeIdx] || specimens[0];
                    const hasMeta = hasVal(sp?.meta?.copyright_holder) || hasVal(sp?.meta?.license);
                    return (
                      <div className="flex-1 flex items-center gap-6 px-4 py-3 flex-wrap">
                        <span className="font-sans text-xs font-medium text-text-muted">{sp?.label}</span>
                        {hasMeta && <span className="text-border">·</span>}
                        {hasVal(sp?.meta?.copyright_holder) && <span className="font-sans text-xs text-text-muted">© {sp.meta.copyright_holder}</span>}
                        {hasVal(sp?.meta?.license) && <span className="font-sans text-xs text-text-muted">{sp.meta.license}</span>}
                        {specimens.length > 1 && (
                          <span className="font-sans text-xs ml-auto tabular-nums text-text-muted">{activeIdx + 1} / {specimens.length}</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

              {/* ── Authority & Classification ── */}
              <div className="bg-card border border-border rounded-md p-6 space-y-6">
                <div>
                  <h2 className="font-display font-semibold text-xl mb-4 text-text-primary">Authority</h2>
                  <dl className="grid grid-cols-2 gap-2">
                    <Field label="Issuer"  value={fmt(coin.authority?.issuer)} />
                    <Field label="Dynasty" value={fmt(coin.authority?.dynasty)} />
                  </dl>
                </div>

                <div>
                  <h2 className="font-display font-semibold text-xl mb-4 text-text-primary">Classification</h2>
                  <dl className="grid grid-cols-2 gap-2">
                    <Field label="Denomination" value={fmt(coin.classification?.denomination)} />
                    <Field label="Material"     value={fmt(coin.classification?.material)} />
                    <Field label="Mint"         value={fmt(coin.classification?.mint)} />
                    <Field label="Period"       value={fmtPeriod(coin.coinage?.date)} />
                  </dl>
                </div>

                {/* Reference */}
                {coin.reference && (
                  <div>
                    <h2 className="font-display font-semibold text-xl mb-4 text-text-primary">Reference</h2>
                    <dl className="grid grid-cols-2 gap-2">
                      <Field label="Citation" value={fmtReference(coin.reference, coin.title?.en)} />
                    </dl>
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
                  </div>
                )}
              </div>

              {/* ── Obverse & Reverse descriptions ── */}
              <div className="bg-card border border-border rounded-md p-6 space-y-6">
                {['obverse', 'reverse'].map(side => {
                  const desc = coin.descriptions?.[side];
                  if (!desc) return null;
                  return (
                    <div key={side}>
                      <h2 className="font-display font-semibold text-xl mb-4 text-text-primary capitalize">{side}</h2>
                      <dl className="space-y-2">
                        <Field label="Legend"  value={desc.legend} />
                        <Field label="Type"    value={desc.type} />
                        <Field label="Portrait" value={fmt(desc.portrait)} />
                      </dl>
                    </div>
                  );
                })}

                {/* Subjects */}
                {coin.subjects?.length > 0 && (
                  <div>
                    <h2 className="font-display font-semibold text-xl mb-3 text-text-primary">Subjects</h2>
                    <div className="flex flex-wrap gap-2">
                      {coin.subjects.map(s => (
                        <span key={s} className="font-sans text-xs px-2.5 py-1 rounded-full bg-surface-alt border border-border text-text-secondary">{fmt(s)}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* OCRE link */}
                {coin.source_ocre_url && (
                  <div className="pt-2 border-t border-border">
                    <a href={coin.source_ocre_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-sans text-sm text-amber hover:text-amber-hover transition-colors">
                      View on OCRE
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Add to Collection Modal */}
            {showAddModal && user && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[rgba(46,40,32,0.6)]"
                onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
                <div className="w-full max-w-md bg-card border border-border rounded-md shadow-xl animate-fade-in" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-6 border-b border-border">
                    <div>
                      <h2 className="font-display font-semibold text-xl text-text-primary">Add to Collection</h2>
                      <p className="font-sans text-sm mt-1 text-text-muted truncate max-w-xs">&ldquo;{coin.title?.en}&rdquo;</p>
                    </div>
                    <button onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-text-primary transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                  <div className="p-6">
                    {userCollections.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="font-sans text-sm mb-4 text-text-muted">No collections yet. Create one first.</p>
                        <Link href={`/new-collection?coinId=${coin._id}`}
                          className="inline-flex items-center gap-2 px-5 py-2.5 font-sans text-sm font-semibold rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors">
                          Create Collection
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                        <div>
                          <label className="block font-sans text-sm font-medium mb-1.5 text-text-primary">Collection</label>
                          <select value={selectedCollection} onChange={e => setSelectedCollection(e.target.value)} className={selectCls}>
                            <option value="">Choose…</option>
                            {userCollections.map(c => <option key={c._id} value={c._id}>{c.name} ({c.coins?.length || 0})</option>)}
                          </select>
                        </div>

                        <div className="p-3 rounded bg-surface-alt border border-border">
                          <h3 className="font-sans font-semibold text-sm mb-3 text-text-primary">Catalog Match</h3>
                          <div className="grid grid-cols-2 gap-3 font-sans text-xs">
                            {[
                              ['Name', coin.title?.en],
                              ['Authority', coin.authority?.issuer],
                              ['Dynasty', coin.authority?.dynasty],
                              ['Period', fmtPeriod(coin.coinage?.date)],
                              ['Mint', coin.classification?.mint],
                              ['Denomination', coin.classification?.denomination],
                              ['Material', coin.classification?.material],
                              ['Reference', fmtReference(coin.reference, coin.title?.en)]
                            ].map(([label, value]) => (
                              <div key={label}>
                                <p className="text-text-muted">{label}</p>
                                <p className="font-medium text-text-primary">{fmt(value) || '-'}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <h3 className="font-sans font-semibold text-sm text-text-primary">
                          Your Specimen Details <span className="font-normal text-text-muted">(Optional)</span>
                        </h3>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">Weight (g)</label>
                            <input name="weight" type="number" step="0.01" min="0" value={coinDetails.weight} onChange={handleSpecimenInputChange} placeholder="0.00" className={inputCls} />
                          </div>
                          <div>
                            <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">Diameter (mm)</label>
                            <input name="diameter" type="number" step="0.01" min="0" value={coinDetails.diameter} onChange={handleSpecimenInputChange} placeholder="0.00" className={inputCls} />
                          </div>
                        </div>

                        <div>
                          <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">Grade / Condition</label>
                          <select name="grade" value={coinDetails.grade} onChange={handleSpecimenInputChange} className={selectCls}>
                            <option value="">Select grade…</option>
                            {['Poor','Fair','About Good','Good','Very Good','Fine','Very Fine','Extremely Fine','About Uncirculated','Uncirculated'].map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </div>

                        <div className="pt-2 border-t border-border">
                          <h3 className="font-sans font-semibold text-sm mb-3 text-text-primary">Additional Collection Fields</h3>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              ['axis', 'Axis'], ['thickness', 'Thickness'], ['shape', 'Shape'], ['patina', 'Patina'],
                              ['rarity', 'Rarity'], ['storageLocation', 'Storage location'], ['tags', 'Tags'], ['seller', 'Seller'],
                              ['auctionHouse', 'Auction house'], ['lotNumber', 'Lot number'], ['invoiceReferenceNumber', 'Invoice/reference'], ['acquisitionDate', 'Acquisition date']
                            ].map(([field, label]) => (
                              <div key={field}>
                                <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">{label}</label>
                                <input
                                  name={field}
                                  type={field === 'acquisitionDate' ? 'date' : field === 'thickness' ? 'number' : 'text'}
                                  min={field === 'thickness' ? '0' : undefined}
                                  value={coinDetails[field] || ''}
                                  onChange={handleSpecimenInputChange}
                                  className={inputCls}
                                />
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div>
                              <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">Purchase price</label>
                              <input name="purchasePrice" type="number" min="0" step="0.01" value={coinDetails.purchasePrice} onChange={handleSpecimenInputChange} className={inputCls} />
                            </div>
                            <div>
                              <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">Estimated value</label>
                              <input name="estimatedValue" type="number" min="0" step="0.01" value={coinDetails.estimatedValue} onChange={handleSpecimenInputChange} className={inputCls} />
                            </div>
                          </div>
                          <div className="mt-3">
                            <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">Additional private references</label>
                            <input name="otherReferences" value={coinDetails.otherReferences} onChange={handleSpecimenInputChange} className={inputCls} />
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div>
                              <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">Source type</label>
                              <select name="sourceType" value={coinDetails.sourceType} onChange={handleSpecimenInputChange} className={selectCls}>
                                <option value="">Select source…</option>
                                {['Auction', 'Dealer', 'Private seller', 'Personally found', 'Inherited', 'Gift'].map(source => <option key={source} value={source}>{source}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">Authenticity</label>
                              <select name="authenticityStatus" value={coinDetails.authenticityStatus} onChange={handleSpecimenInputChange} className={selectCls}>
                                {['Unknown', 'Authentic', 'Likely authentic', 'Questionable', 'Replica', 'Forgery'].map(status => <option key={status} value={status}>{status}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">Personal Notes</label>
                          <textarea name="notes" value={coinDetails.notes} onChange={handleSpecimenInputChange} placeholder="Add personal notes about this coin…" rows={3} className={inputCls + ' resize-none'} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[
                            ['conditionNotes', 'Condition notes'], ['provenance', 'Provenance']
                          ].map(([field, label]) => (
                            <div key={field}>
                              <label className="block font-sans text-xs font-medium mb-1 text-text-secondary">{label}</label>
                              <textarea name={field} rows={2} value={coinDetails[field] || ''} onChange={handleSpecimenInputChange} className={inputCls + ' resize-none'} />
                            </div>
                          ))}
                        </div>

                        <div className="pt-4 border-t border-border">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-sans text-sm font-semibold text-text-primary">Your Coin Photos</h4>
                            <span className="font-sans text-xs text-text-muted">Optional</span>
                          </div>
                          <p className="font-sans text-xs text-text-muted mb-3">Upload your own photos of this specific coin. Min 600x600px. JPEG, PNG, WebP. Max 15 MB.</p>

                          {imageError && (
                            <div className="flex items-start gap-2.5 p-3 mb-3 rounded-md text-sm font-sans bg-error-bg border border-error-border text-error-text">
                              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div className="flex-1">
                                <p className="font-semibold mb-0.5">Photo not accepted</p>
                                <p>{imageError}</p>
                              </div>
                              <button onClick={() => setImageError(null)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                              </button>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { side: 'obverse', label: 'Obverse (Front)', preview: obversePreview, dragActive: dragActiveObverse, setDragActive: setDragActiveObverse },
                              { side: 'reverse', label: 'Reverse (Back)', preview: reversePreview, dragActive: dragActiveReverse, setDragActive: setDragActiveReverse },
                            ].map(({ side, label, preview, dragActive, setDragActive }) => (
                              <div key={side}>
                                <p className="font-sans text-xs font-semibold mb-1.5 text-text-secondary">{label}</p>
                                <div
                                  className={`relative min-h-[110px] text-center rounded-md border-2 border-dashed transition-colors duration-150 ${
                                    dragActive ? 'border-amber bg-amber-bg' : 'border-border bg-surface'
                                  }`}
                                  onDragEnter={e => { e.preventDefault(); setDragActive(true); }}
                                  onDragLeave={e => { e.preventDefault(); setDragActive(false); }}
                                  onDragOver={e => e.preventDefault()}
                                  onDrop={e => {
                                    e.preventDefault(); setDragActive(false);
                                    if (e.dataTransfer.files[0]) handleImageChange(e.dataTransfer.files[0], side);
                                  }}
                                >
                                  <input
                                    type="file" accept="image/jpeg,image/png,image/webp"
                                    onChange={e => handleImageChange(e.target.files[0], side)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  />
                                  {preview ? (
                                    <div className="p-2">
                                      <img src={preview} alt={label} className="w-full h-24 object-contain rounded mix-blend-multiply" />
                                      <button
                                        type="button"
                                        onClick={e => { e.stopPropagation(); removeImage(side); }}
                                        className="mt-1.5 font-sans text-xs text-text-muted hover:text-red-600 transition-colors"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center py-3 px-3 pointer-events-none">
                                      <CoinImagePlaceholder className="w-20 h-20 rounded mb-2" />
                                      <p className="font-sans text-xs font-medium text-text-secondary">Click or drag & drop</p>
                                      <p className="font-sans text-xs text-text-muted mt-0.5">{label.split(' ')[0]} image</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {formError && (
                          <div className="flex items-start gap-2.5 p-3 rounded-md text-sm font-sans bg-error-bg border border-error-border text-error-text">
                            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex-1">
                              <p className="font-semibold mb-0.5">Could not add coin</p>
                              <p>{formError}</p>
                            </div>
                            <button onClick={() => setFormError(null)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                          </div>
                        )}

                        <div className="flex gap-3 pt-2">
                          <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 font-sans text-sm border border-border rounded bg-card text-text-secondary hover:border-border-strong transition-colors">Cancel</button>
                          <button onClick={handleAddToCollection} disabled={adding || !selectedCollection}
                            className="flex-1 py-2.5 font-sans text-sm font-semibold flex items-center justify-center gap-2 rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {adding ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-[#fdf8f0] border-t-transparent"/>Adding…</> : 'Add to Collection'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Zoom modal */}
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
                        className="max-h-[80vh] max-w-full object-contain pointer-events-none mix-blend-multiply bg-surface"
                        draggable={false}
                        onError={e => { e.currentTarget.src = '/images/coin-placeholder.svg'; }} />
                    ) : (
                      <div className="flex gap-8 items-center justify-center px-8 bg-surface">
                        {active.obverse && (
                          <img src={active.obverse} alt="Obverse"
                            className="max-h-[72vh] max-w-[44vw] object-contain pointer-events-none mix-blend-multiply bg-surface"
                            draggable={false}
                            onError={e => { e.currentTarget.src = '/images/coin-placeholder.svg'; }} />
                        )}
                        {active.reverse && (
                          <img src={active.reverse} alt="Reverse"
                            className="max-h-[72vh] max-w-[44vw] object-contain pointer-events-none mix-blend-multiply bg-surface"
                            draggable={false}
                            onError={e => { e.currentTarget.src = '/images/coin-placeholder.svg'; }} />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom license bar */}
                {(hasVal(active.meta?.copyright_holder) || hasVal(active.meta?.license)) && (
                  <div className="shrink-0 px-5 py-2.5 flex flex-wrap gap-x-5 gap-y-0.5 border-t border-border bg-card"
                    onClick={e => e.stopPropagation()}>
                    {hasVal(active.meta?.copyright_holder) && <span className="font-sans text-xs text-text-muted">© {active.meta.copyright_holder}</span>}
                    {hasVal(active.meta?.license) && <span className="font-sans text-xs text-text-muted">{active.meta.license}</span>}
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default CoinDetail;
