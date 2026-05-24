import React, { useState, useEffect, useContext, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { AuthContext } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';
import { semantic } from '../utils/tokens';
import { fmt, fmtPeriod } from '../utils/formatters';
import CoinImagePlaceholder from '../components/CoinImagePlaceholder';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Returns the primary image src from the new images[] array
const getPrimaryImageSrc = (coin) => {
  if (!coin?.images?.length) return null;
  const first = coin.images[0];
  return first?.files?.obverse || first?.files?.unified || null;
};

const sanitizeCoin = (coin) => {
  if (!coin || typeof coin !== 'object') return null;
  return {
    ...coin,
    _title: typeof coin.title?.en === 'string' ? coin.title.en : 'Name not available',
    _issuer: fmt(coin.authority?.issuer) || '',
    _period: fmtPeriod(coin.coinage?.date) || 'Period not specified',
    _imgSrc: getPrimaryImageSrc(coin)
  };
};

const inputCls = 'w-full px-3 py-2 font-sans text-sm bg-surface border border-border rounded outline-none focus:border-amber transition-colors duration-150 text-text-primary';
const nonNegativeFields = new Set(['weight', 'diameter', 'thickness', 'purchasePrice', 'estimatedValue']);

const AddCoinToCollectionPage = () => {
  const router = useRouter();
  const { id, coinId } = router.query;
  const { user, isLoading: authLoading } = useContext(AuthContext);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?message=You must be logged in to access community features');
    }
  }, [user, authLoading, router]);

  const [collection, setCollection] = useState(null);
  const [coins, setCoins] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coinsLoading, setCoinsLoading] = useState(false);
  const [addingCoin, setAddingCoin] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const [coinDetails, setCoinDetails] = useState({
    weight: '', diameter: '', axis: '', thickness: '', shape: '', grade: '',
    patina: '', conditionNotes: '', rarity: '', authenticityStatus: 'Unknown',
    acquisitionDate: '', purchasePrice: '', estimatedValue: '', seller: '', auctionHouse: '', lotNumber: '',
    invoiceReferenceNumber: '', sourceType: '', provenance: '', storageLocation: '', tags: '', notes: '', otherReferences: ''
  });
  const [selectedObverseImage, setSelectedObverseImage] = useState(null);
  const [selectedReverseImage, setSelectedReverseImage] = useState(null);
  const [obversePreview, setObversePreview] = useState(null);
  const [reversePreview, setReversePreview] = useState(null);
  const [imageError, setImageError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [dragActiveObverse, setDragActiveObverse] = useState(false);
  const [dragActiveReverse, setDragActiveReverse] = useState(false);
  const imageErrorRef = useRef(null);
  const formErrorRef = useRef(null);

  useEffect(() => {
    if (!id || !user) return;
    const fetchCollection = async () => {
      try {
        const data = await apiClient.get(`/api/collections/${id}`);
        setCollection(data);
      } catch {
        router.push('/');
      } finally {
        setLoading(false);
      }
    };
    fetchCollection();
  }, [id, user, router]);

  const searchCoins = async (term) => {
    if (!term.trim() || term.trim().length < 2) { setCoins([]); return; }
    setCoinsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/coins?keyword=${encodeURIComponent(term.trim())}&limit=50`);
      if (!res.ok) throw new Error('Search error');
      const data = await res.json();
      setCoins((data.results || []).filter(coin => coin && coin._id && coin.title?.en));
    } catch {
      setCoins([]);
    } finally {
      setCoinsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => searchCoins(searchTerm), searchTerm.length <= 2 ? 500 : 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    if (coinId && !selectedCoin) {
      const fetchAndSelectCoin = async () => {
        try {
          const res = await fetch(`${API_URL}/api/coins/${coinId}`);
          if (res.ok) {
            const coin = await res.json();
            const safeCoin = sanitizeCoin(coin);
            if (safeCoin) setSelectedCoin(safeCoin);
          }
        } catch {}
      };
      fetchAndSelectCoin();
    }
  }, [coinId, selectedCoin]);

  const handleCoinSelect = (coin) => {
    setSelectedCoin(coin);
    setFormError(null);
    setImageError(null);
    setCoinDetails(prev => Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: key === 'authenticityStatus' ? 'Unknown' : '' }), {}));
    setSelectedObverseImage(null); setSelectedReverseImage(null);
    setObversePreview(null); setReversePreview(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (nonNegativeFields.has(name) && Number(value) < 0) return;
    setCoinDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleAddCoin = async (e) => {
    e.preventDefault();
    if (!selectedCoin) {
      setNotification({ show: true, message: 'Please select a coin first', type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
      return;
    }
    setAddingCoin(true);
    setImageError(null);
    try {
      // Step 1: validate images before touching the collection — if they fail,
      // the user stays on the page with the error shown inline.
      if (selectedObverseImage || selectedReverseImage) {
        const validateForm = new FormData();
        if (selectedObverseImage) validateForm.append('obverse', selectedObverseImage);
        if (selectedReverseImage) validateForm.append('reverse', selectedReverseImage);
        try {
          await apiClient.postFormData('/api/coins/validate-images', validateForm);
        } catch (imgErr) {
          setImageError(imgErr.message || 'Image validation failed. Please check your photos and try again.');
          setAddingCoin(false);
          return;
        }
      }

      // Step 2: add coin to collection
      const updatedCollection = await apiClient.post(`/api/collections/${id}/coins`, {
        coin: selectedCoin._id,
        ...coinDetails,
        purchasePrice: coinDetails.purchasePrice ? { amount: Number(coinDetails.purchasePrice), currency: 'EUR' } : undefined,
        estimatedValue: coinDetails.estimatedValue ? { amount: Number(coinDetails.estimatedValue), currency: 'EUR' } : undefined,
        catalogReferences: coinDetails.otherReferences ? { other: coinDetails.otherReferences } : undefined
      });

      // Step 3: upload images (already validated — should not fail)
      if (selectedObverseImage || selectedReverseImage) {
        const entries = updatedCollection.coins?.filter(e => (e.coin?._id || e.coin) === selectedCoin._id || e.coin?.toString() === selectedCoin._id);
        const newEntry = entries?.[entries.length - 1];
        if (newEntry?._id) {
          const formData = new FormData();
          if (selectedObverseImage) formData.append('obverse', selectedObverseImage);
          if (selectedReverseImage) formData.append('reverse', selectedReverseImage);
          await apiClient.postFormData(`/api/coins/entry/${newEntry._id}/images`, formData);
        }
      }

      setNotification({ show: true, message: 'Coin added successfully!', type: 'success' });
      setTimeout(() => router.push(`/collection-detail?id=${id}`), 1500);
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setAddingCoin(false);
    }
  };

  const clearSelection = () => {
    setSelectedCoin(null);
    setFormError(null);
    setImageError(null);
    setCoinDetails(prev => Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: key === 'authenticityStatus' ? 'Unknown' : '' }), {}));
    setSelectedObverseImage(null); setSelectedReverseImage(null);
    setObversePreview(null); setReversePreview(null);
  };

  useEffect(() => {
    if (imageError && imageErrorRef.current) {
      imageErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [imageError]);

  useEffect(() => {
    if (formError && formErrorRef.current) {
      formErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [formError]);

  const getSafeDescription = (coin) => coin?._period || 'Period not specified';

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
          <p className="font-sans text-base mb-4 text-text-secondary">Collection not found</p>
          <Link href="/" className="font-sans text-sm text-amber hover:text-amber-hover">Back to Collections</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Head>
        <title>Add Coin to {collection.name} — NumisRoma</title>
        <meta name="description" content={`Add a coin to ${collection.name} collection`} />
      </Head>

      {notification.show && (
        <div
          className="fixed top-6 right-6 z-50 p-3.5 flex items-start gap-2 font-sans text-sm rounded-md max-w-xs"
          style={{
            backgroundColor: notification.type === 'success' ? semantic.success.bg : semantic.error.bg,
            border: `1px solid ${notification.type === 'success' ? semantic.success.border : semantic.error.border}`,
            color: notification.type === 'success' ? semantic.success.text : semantic.error.text,
          }}
        >
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={notification.type === 'success' ? 'M5 13l4 4L19 7' : 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'} />
          </svg>
          {notification.message}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="flex items-center gap-2 font-sans text-sm mb-4 text-text-muted">
            <Link href={`/collection-detail?id=${id}`} className="text-text-secondary hover:text-amber transition-colors duration-150">
              {collection.name}
            </Link>
            <span>/</span>
            <span className="text-text-primary">Add Coin</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-display font-semibold text-3xl text-text-primary">Add Coin to Collection</h1>
              <p className="font-sans text-sm mt-1 text-text-muted">Search and add a new coin to &quot;{collection.name}&quot;</p>
            </div>
            <Link
              href={`/collection-detail?id=${id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 font-sans text-sm bg-card border border-border rounded-md text-text-secondary hover:border-border-strong transition-colors duration-150"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Collection
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="font-display font-semibold text-xl mb-4 text-text-primary">Search Coins</h2>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Type at least 2 characters (e.g., 'Augustus', 'Denarius')"
                  className={`${inputCls} pl-9`}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  {coinsLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber border-t-transparent" />
                  ) : (
                    <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </div>
                {searchTerm.length > 0 && searchTerm.length < 2 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-sans text-xs text-text-muted">
                    {2 - searchTerm.length} more char{2 - searchTerm.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {coinsLoading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-7 w-7 border-2 border-amber border-t-transparent mx-auto mb-2" />
                  <p className="font-sans text-sm text-text-muted">Searching…</p>
                </div>
              ) : coins.length > 0 ? (
                <div>
                  {coins.map(coin => {
                    const safeCoin = sanitizeCoin(coin);
                    if (!safeCoin) return null;
                    const isSelected = selectedCoin?._id === safeCoin._id;
                    return (
                      <div
                        key={safeCoin._id}
                        onClick={() => handleCoinSelect(safeCoin)}
                        className={`flex items-center gap-3 p-3 cursor-pointer transition-colors duration-100 border-b border-border ${isSelected ? 'bg-amber-bg border-l-[3px] border-l-amber' : 'hover:bg-surface-alt border-l-[3px] border-l-transparent'}`}
                      >
                        <div className="w-14 h-14 shrink-0 rounded overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#faf4ea' }}>
                          <img
                            src={safeCoin._imgSrc || '/images/coin-placeholder.svg'}
                            alt={safeCoin._title}
                            className="w-full h-full object-contain p-1"
                            style={{ mixBlendMode: 'multiply' }}
                            onError={e => { e.currentTarget.src = '/images/coin-placeholder.svg'; }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-sm font-medium truncate text-text-primary">{safeCoin._title}</p>
                          <p className="font-sans text-xs text-text-secondary">{safeCoin._issuer || 'Unknown Issuer'}</p>
                          <p className="font-sans text-xs text-text-muted">{getSafeDescription(safeCoin)}</p>
                        </div>
                        {isSelected && (
                          <svg className="w-4 h-4 shrink-0 text-amber" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : searchTerm && !selectedCoin ? (
                <div className="p-8 text-center text-text-muted">
                  <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="font-sans text-sm">No coins found for &quot;{searchTerm}&quot;</p>
                  <p className="font-sans text-xs mt-1">Try different keywords</p>
                </div>
              ) : (
                <div className="p-8 text-center text-text-muted">
                  <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="font-sans text-sm">Start typing to search for coins</p>
                </div>
              )}
            </div>
          </div>

          {/* Selected coin + form */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-display font-semibold text-xl text-text-primary">Selected Coin</h2>
              {selectedCoin && (
                <button onClick={clearSelection} className="font-sans text-xs text-text-muted hover:text-text-secondary transition-colors duration-150">Clear</button>
              )}
            </div>

            {selectedCoin ? (
              <div className="p-5">
                {/* Preview */}
                <div className="flex items-center gap-3 p-3 mb-5 rounded bg-surface-alt border border-border">
                  <div className="w-16 h-16 shrink-0 rounded overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#faf4ea' }}>
                    <img
                      src={selectedCoin._imgSrc || '/images/coin-placeholder.svg'}
                      alt={selectedCoin._title}
                      className="w-full h-full object-contain p-1"
                      style={{ mixBlendMode: 'multiply' }}
                      onError={e => { e.currentTarget.src = '/images/coin-placeholder.svg'; }}
                    />
                  </div>
                  <div>
                    <p className="font-sans font-semibold text-sm text-text-primary">{selectedCoin._title}</p>
                    <p className="font-sans text-xs text-text-secondary">{selectedCoin._issuer || 'Unknown Issuer'}</p>
                    <p className="font-sans text-xs text-text-muted">{getSafeDescription(selectedCoin)}</p>
                  </div>
                </div>

                <form onSubmit={handleAddCoin} className="space-y-4">
                  <h3 className="font-sans font-semibold text-sm text-text-primary">
                    Catalog Match
                  </h3>

                  <div className="p-3 rounded bg-surface-alt border border-border">
                    <div className="grid grid-cols-2 gap-3 font-sans text-xs">
                      {[
                        ['Name', selectedCoin._title],
                        ['Authority', selectedCoin.authority?.issuer],
                        ['Dynasty', selectedCoin.authority?.dynasty],
                        ['Period', selectedCoin._period],
                        ['Mint', selectedCoin.classification?.mint],
                        ['Denomination', selectedCoin.classification?.denomination],
                        ['Material', selectedCoin.classification?.material],
                        ['Reference', selectedCoin.reference ? `${selectedCoin.reference.system || ''} ${selectedCoin.reference.series || ''} ${selectedCoin.reference.number || ''}${selectedCoin.reference.suffix || ''}`.trim() : '']
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
                    {[
                      { id: 'weight', label: 'Weight (g)', type: 'number', step: '0.01', placeholder: '0.00' },
                      { id: 'diameter', label: 'Diameter (mm)', type: 'number', step: '0.01', placeholder: '0.00' },
                    ].map(({ id: fid, label, type, step, placeholder }) => (
                      <div key={fid}>
                        <label htmlFor={fid} className="block font-sans text-xs font-medium mb-1 text-text-secondary">{label}</label>
                        <input
                          type={type} id={fid} name={fid} step={step} min="0" placeholder={placeholder}
                          value={coinDetails[fid]} onChange={handleInputChange}
                          className={inputCls}
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label htmlFor="grade" className="block font-sans text-xs font-medium mb-1 text-text-secondary">Grade / Condition</label>
                    <select
                      id="grade" name="grade" value={coinDetails.grade} onChange={handleInputChange}
                      className={inputCls}
                    >
                      <option value="">Select grade…</option>
                      {['Poor','Fair','About Good','Good','Very Good','Fine','Very Fine','Extremely Fine','About Uncirculated','Uncirculated'].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <h3 className="font-sans font-semibold text-sm mb-3 text-text-primary">Additional Collection Fields</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ['axis', 'Axis'], ['thickness', 'Thickness'], ['shape', 'Shape'], ['patina', 'Patina'],
                        ['rarity', 'Rarity'], ['storageLocation', 'Storage location'], ['tags', 'Tags'], ['seller', 'Seller'],
                        ['auctionHouse', 'Auction house'], ['lotNumber', 'Lot number'], ['invoiceReferenceNumber', 'Invoice/reference'], ['acquisitionDate', 'Acquisition date']
                      ].map(([fid, label]) => (
                        <div key={fid}>
                          <label htmlFor={fid} className="block font-sans text-xs font-medium mb-1 text-text-secondary">{label}</label>
                          <input
                            id={fid}
                            name={fid}
                            type={fid === 'acquisitionDate' ? 'date' : ['thickness'].includes(fid) ? 'number' : 'text'}
                            min={fid === 'thickness' ? '0' : undefined}
                            value={coinDetails[fid] || ''}
                            onChange={handleInputChange}
                            className={inputCls}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label htmlFor="purchasePrice" className="block font-sans text-xs font-medium mb-1 text-text-secondary">Purchase price</label>
                        <input id="purchasePrice" name="purchasePrice" type="number" min="0" step="0.01" value={coinDetails.purchasePrice} onChange={handleInputChange} className={inputCls} />
                      </div>
                      <div>
                        <label htmlFor="estimatedValue" className="block font-sans text-xs font-medium mb-1 text-text-secondary">Estimated value</label>
                        <input id="estimatedValue" name="estimatedValue" type="number" min="0" step="0.01" value={coinDetails.estimatedValue} onChange={handleInputChange} className={inputCls} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label htmlFor="otherReferences" className="block font-sans text-xs font-medium mb-1 text-text-secondary">Additional private references</label>
                      <input id="otherReferences" name="otherReferences" value={coinDetails.otherReferences} onChange={handleInputChange} className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label htmlFor="sourceType" className="block font-sans text-xs font-medium mb-1 text-text-secondary">Source type</label>
                        <select id="sourceType" name="sourceType" value={coinDetails.sourceType} onChange={handleInputChange} className={inputCls}>
                          <option value="">Select source…</option>
                          {['Auction', 'Dealer', 'Private seller', 'Personally found', 'Inherited', 'Gift'].map(source => <option key={source} value={source}>{source}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="authenticityStatus" className="block font-sans text-xs font-medium mb-1 text-text-secondary">Authenticity</label>
                        <select id="authenticityStatus" name="authenticityStatus" value={coinDetails.authenticityStatus} onChange={handleInputChange} className={inputCls}>
                          {['Unknown', 'Authentic', 'Likely authentic', 'Questionable', 'Replica', 'Forgery'].map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="notes" className="block font-sans text-xs font-medium mb-1 text-text-secondary">Personal Notes</label>
                    <textarea
                      id="notes" name="notes" rows={3}
                      value={coinDetails.notes} onChange={handleInputChange}
                      placeholder="Add personal notes about this coin…"
                      className={`${inputCls} resize-none`}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      ['conditionNotes', 'Condition notes'], ['provenance', 'Provenance']
                    ].map(([fid, label]) => (
                      <div key={fid}>
                        <label htmlFor={fid} className="block font-sans text-xs font-medium mb-1 text-text-secondary">{label}</label>
                        <textarea id={fid} name={fid} rows={2} value={coinDetails[fid] || ''} onChange={handleInputChange} className={`${inputCls} resize-none`} />
                      </div>
                    ))}
                  </div>

                  {/* Custom images */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-sans text-sm font-semibold text-text-primary">
                        Your Coin Photos
                      </h4>
                      <span className="font-sans text-xs text-text-muted">Optional</span>
                    </div>
                    <p className="font-sans text-xs text-text-muted mb-3">Upload your own photos of this specific coin. Min 600×600px · JPEG, PNG, WebP · Max 15 MB.</p>

                    {imageError && (
                      <div ref={imageErrorRef} className="flex items-start gap-2.5 p-3 mb-3 rounded-md text-sm font-sans"
                        style={{ backgroundColor: semantic.error.bg, border: `1px solid ${semantic.error.border}`, color: semantic.error.text }}>
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
                      ].map(({ side, label, preview, dragActive: da, setDragActive: sda }) => (
                        <div key={side}>
                          <p className="font-sans text-xs font-semibold mb-1.5 text-text-secondary">{label}</p>
                          <div
                            className="relative text-center rounded-md transition-colors duration-150"
                            style={{
                              border: `2px dashed ${da ? '#b8843a' : '#e8e0d0'}`,
                              backgroundColor: da ? '#f0e8d4' : '#faf4ea',
                              minHeight: 110,
                            }}
                            onDragEnter={e => { e.preventDefault(); sda(true); }}
                            onDragLeave={e => { e.preventDefault(); sda(false); }}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => {
                              e.preventDefault(); sda(false);
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
                                <img src={preview} alt={label} className="w-full h-24 object-contain rounded" style={{ mixBlendMode: 'multiply' }} />
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
                    <div ref={formErrorRef} className="flex items-start gap-2.5 p-3 rounded-md text-sm font-sans"
                      style={{ backgroundColor: semantic.error.bg, border: `1px solid ${semantic.error.border}`, color: semantic.error.text }}>
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

                  <button
                    type="submit" disabled={addingCoin}
                    className="w-full flex items-center justify-center gap-2 py-2.5 font-sans text-sm font-semibold rounded-md bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingCoin ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />Adding…</>
                    ) : (
                      <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>Add to Collection</>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-10 text-center text-text-muted">
                <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <p className="font-sans text-sm font-medium">Select a coin to add</p>
                <p className="font-sans text-xs mt-1">Choose a coin from the search results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddCoinToCollectionPage;
