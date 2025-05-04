'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '../../../components/layout/MainLayout';
import ModalCrud from '../../../components/ui/ModalCrud';
import useCoinsStore from '../../../lib/store/coinsStore';
import useCollectionsStore from '../../../lib/store/collectionsStore';
import useAuthStore from '../../../lib/store/authStore';

export default function CoinDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { fetchCoinById, currentCoin, isLoading: isLoadingCoin, error: coinError } = useCoinsStore();
  const { 
    collections, 
    fetchCollections, 
    isLoading: isLoadingCollections, 
    addCoinToCollection 
  } = useCollectionsStore();
  const { isAuthenticated } = useAuthStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [coinNotes, setCoinNotes] = useState('');
  const [coinGrade, setCoinGrade] = useState('');
  const [coinWeight, setCoinWeight] = useState('');
  const [coinDiameter, setCoinDiameter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  // Fetch coin details on mount
  useEffect(() => {
    fetchCoinById(id);
  }, [id, fetchCoinById]);

  // Fetch user collections when modal is opened
  const openAddToCollectionModal = async () => {
    if (isAuthenticated) {
      await fetchCollections();
      setIsModalOpen(true);
    } else {
      router.push(`/login?redirect=/coin/${id}`);
    }
  };

  const handleAddToCollection = async (e) => {
    e.preventDefault();
    
    if (!selectedCollection) return;
    
    setIsSubmitting(true);
    
    try {
      await addCoinToCollection(selectedCollection, {
        coin: id,
        weight: coinWeight ? parseFloat(coinWeight) : undefined,
        diameter: coinDiameter ? parseFloat(coinDiameter) : undefined,
        grade: coinGrade || undefined,
        notes: coinNotes || undefined
      });
      
      setAddSuccess(true);
      
      // Reset form
      setTimeout(() => {
        setIsModalOpen(false);
        setAddSuccess(false);
        setSelectedCollection('');
        setCoinNotes('');
        setCoinGrade('');
        setCoinWeight('');
        setCoinDiameter('');
      }, 1500);
    } catch (error) {
      console.error('Failed to add coin to collection:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingCoin) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (coinError || !currentCoin) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <h2 className="text-xl font-bold mb-2">Errore nel caricamento della moneta</h2>
            <p>{coinError || 'Moneta non trovata'}</p>
            <button 
              onClick={() => router.push('/')}
              className="mt-4 btn-primary"
            >
              Torna al catalogo
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Modal footer buttons
  const modalFooter = (
    <>
      <button
        type="button"
        className="btn-outline"
        onClick={() => setIsModalOpen(false)}
        disabled={isSubmitting}
      >
        Annulla
      </button>
      <button
        type="submit"
        form="add-to-collection-form"
        className="btn-primary"
        disabled={isSubmitting || !selectedCollection}
      >
        {isSubmitting ? 'Aggiunta in corso...' : 'Aggiungi'}
      </button>
    </>
  );

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
          {/* Coin Header */}
          <div className="bg-gray-100 dark:bg-slate-700 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{currentCoin.name}</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {currentCoin.description?.denomination && (
                    <span className="mr-2">{currentCoin.description.denomination}</span>
                  )}
                  {currentCoin.authority?.emperor && (
                    <span>Imperatore: {currentCoin.authority.emperor}</span>
                  )}
                </p>
              </div>
              
              <button
                onClick={openAddToCollectionModal}
                className="mt-4 md:mt-0 btn-primary flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Aggiungi alla collezione
              </button>
            </div>
          </div>
          
          {/* Coin Images */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Obverse */}
            <div className="flex flex-col items-center">
              <h2 className="text-xl font-semibold mb-4">Dritto</h2>
              <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-4 w-full max-w-xs aspect-square flex items-center justify-center">
                {currentCoin.obverse?.image ? (
                  <img
                    src={currentCoin.obverse.image}
                    alt={`${currentCoin.name} - Dritto`}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-gray-500 dark:text-gray-400">Immagine non disponibile</div>
                )}
              </div>
              {currentCoin.obverse?.legend && (
                <p className="mt-4 text-center italic">"{currentCoin.obverse.legend}"</p>
              )}
            </div>
            
            {/* Reverse */}
            <div className="flex flex-col items-center">
              <h2 className="text-xl font-semibold mb-4">Rovescio</h2>
              <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-4 w-full max-w-xs aspect-square flex items-center justify-center">
                {currentCoin.reverse?.image ? (
                  <img
                    src={currentCoin.reverse.image}
                    alt={`${currentCoin.name} - Rovescio`}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-gray-500 dark:text-gray-400">Immagine non disponibile</div>
                )}
              </div>
              {currentCoin.reverse?.legend && (
                <p className="mt-4 text-center italic">"{currentCoin.reverse.legend}"</p>
              )}
            </div>
          </div>
          
          {/* Coin Details */}
          <div className="p-6 border-t border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold mb-4">Dettagli</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Authority Info */}
              <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg">
                <h3 className="font-medium text-lg mb-2">Autorità</h3>
                <ul className="space-y-2">
                  {currentCoin.authority?.emperor && (
                    <li>
                      <span className="font-medium">Imperatore:</span> {currentCoin.authority.emperor}
                    </li>
                  )}
                  {currentCoin.authority?.dynasty && (
                    <li>
                      <span className="font-medium">Dinastia:</span> {currentCoin.authority.dynasty}
                    </li>
                  )}
                </ul>
              </div>
              
              {/* Description Info */}
              <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg">
                <h3 className="font-medium text-lg mb-2">Descrizione</h3>
                <ul className="space-y-2">
                  {currentCoin.description?.date_range && (
                    <li>
                      <span className="font-medium">Periodo:</span> {currentCoin.description.date_range}
                    </li>
                  )}
                  {currentCoin.description?.mint && (
                    <li>
                      <span className="font-medium">Zecca:</span> {currentCoin.description.mint}
                    </li>
                  )}
                  {currentCoin.description?.denomination && (
                    <li>
                      <span className="font-medium">Denominazione:</span> {currentCoin.description.denomination}
                    </li>
                  )}
                  {currentCoin.description?.material && (
                    <li>
                      <span className="font-medium">Materiale:</span> {currentCoin.description.material}
                    </li>
                  )}
                </ul>
              </div>
              
              {/* Additional Info */}
              <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg">
                <h3 className="font-medium text-lg mb-2">Informazioni aggiuntive</h3>
                <ul className="space-y-2">
                  {currentCoin.obverse?.type && (
                    <li>
                      <span className="font-medium">Tipo del dritto:</span> {currentCoin.obverse.type}
                    </li>
                  )}
                  {currentCoin.reverse?.type && (
                    <li>
                      <span className="font-medium">Tipo del rovescio:</span> {currentCoin.reverse.type}
                    </li>
                  )}
                  {currentCoin.obverse?.portrait && (
                    <li>
                      <span className="font-medium">Ritratto:</span> {currentCoin.obverse.portrait}
                    </li>
                  )}
                  {currentCoin.reverse?.deity && (
                    <li>
                      <span className="font-medium">Divinità:</span> {currentCoin.reverse.deity}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
          
          {/* Credits */}
          {(currentCoin.obverse?.credits || currentCoin.reverse?.credits) && (
            <div className="p-6 border-t border-gray-200 dark:border-slate-700 text-sm text-gray-500 dark:text-gray-400">
              <h2 className="text-lg font-medium mb-2">Crediti</h2>
              {currentCoin.obverse?.credits && (
                <p>Immagine dritto: {currentCoin.obverse.credits}</p>
              )}
              {currentCoin.reverse?.credits && (
                <p>Immagine rovescio: {currentCoin.reverse.credits}</p>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Add to Collection Modal */}
      <ModalCrud
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Aggiungi alla collezione"
        footer={modalFooter}
      >
        {addSuccess ? (
          <div className="text-center py-8 text-green-600">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-xl font-medium">Moneta aggiunta con successo!</p>
          </div>
        ) : (
          <>
            {isLoadingCollections ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <form id="add-to-collection-form" onSubmit={handleAddToCollection} className="space-y-4">
                <div>
                  <label htmlFor="collection" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Seleziona collezione *
                  </label>
                  <select
                    id="collection"
                    value={selectedCollection}
                    onChange={(e) => setSelectedCollection(e.target.value)}
                    className="input"
                    required
                  >
                    <option value="">Seleziona una collezione</option>
                    {collections.map(collection => (
                      <option key={collection._id} value={collection._id}>
                        {collection.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="weight" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Peso (g)
                    </label>
                    <input
                      id="weight"
                      type="number"
                      step="0.01"
                      value={coinWeight}
                      onChange={(e) => setCoinWeight(e.target.value)}
                      className="input"
                      placeholder="Peso in grammi"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="diameter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Diametro (mm)
                    </label>
                    <input
                      id="diameter"
                      type="number"
                      step="0.1"
                      value={coinDiameter}
                      onChange={(e) => setCoinDiameter(e.target.value)}
                      className="input"
                      placeholder="Diametro in mm"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="grade" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Stato di conservazione
                  </label>
                  <select
                    id="grade"
                    value={coinGrade}
                    onChange={(e) => setCoinGrade(e.target.value)}
                    className="input"
                  >
                    <option value="">Seleziona stato</option>
                    <option value="FDC">Fior di Conio (FDC)</option>
                    <option value="SPL">Splendido (SPL)</option>
                    <option value="BB">Bellissimo (BB)</option>
                    <option value="MB">Molto Bello (MB)</option>
                    <option value="B">Bello (B)</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Note personali
                  </label>
                  <textarea
                    id="notes"
                    value={coinNotes}
                    onChange={(e) => setCoinNotes(e.target.value)}
                    className="input"
                    rows={3}
                    placeholder="Note sul tuo esemplare"
                  ></textarea>
                </div>
              </form>
            )}
          </>
        )}
      </ModalCrud>
    </MainLayout>
  );
} 