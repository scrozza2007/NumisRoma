'use client';

import { useEffect, useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import ModalCrud from '../../components/ui/ModalCrud';
import useCollectionsStore from '../../lib/store/collectionsStore';
import Link from 'next/link';

export default function DashboardPage() {
  const { 
    collections, 
    fetchCollections, 
    createCollection, 
    isLoading, 
    error 
  } = useCollectionsStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [collectionName, setCollectionName] = useState('');
  const [collectionDescription, setCollectionDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user's collections on mount
  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    
    if (!collectionName.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      await createCollection({
        name: collectionName,
        description: collectionDescription,
        isPublic
      });
      
      // Reset form and close modal
      setCollectionName('');
      setCollectionDescription('');
      setIsPublic(false);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to create collection:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        form="create-collection-form"
        className="btn-primary"
        disabled={isSubmitting || !collectionName.trim()}
      >
        {isSubmitting ? 'Creazione in corso...' : 'Crea collezione'}
      </button>
    </>
  );

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Le tue collezioni</h1>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 md:mt-0 btn-primary flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Crea nuova collezione
          </button>
        </div>
        
        {error && (
          <div className="mb-6 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : collections.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 text-center">
            <h3 className="text-xl font-medium mb-2">Nessuna collezione trovata</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Non hai ancora creato nessuna collezione. Inizia creando la tua prima collezione!
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary"
            >
              Crea la tua prima collezione
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map(collection => (
              <div key={collection._id} className="card">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-semibold">{collection.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${collection.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {collection.isPublic ? 'Pubblica' : 'Privata'}
                    </span>
                  </div>
                  
                  {collection.description && (
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                      {collection.description}
                    </p>
                  )}
                  
                  <div className="mt-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-primary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">{collection.coins?.length || 0} monete</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Creata il {new Date(collection.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                    <Link
                      href={`/dashboard/collection/${collection._id}`}
                      className="text-primary hover:text-primary-700 flex items-center"
                    >
                      Visualizza collezione
                      <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Create Collection Modal */}
      <ModalCrud
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crea nuova collezione"
        footer={modalFooter}
      >
        <form id="create-collection-form" onSubmit={handleCreateCollection} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome collezione *
            </label>
            <input
              id="name"
              type="text"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              className="input"
              placeholder="Nome della tua collezione"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descrizione
            </label>
            <textarea
              id="description"
              value={collectionDescription}
              onChange={(e) => setCollectionDescription(e.target.value)}
              className="input"
              rows={3}
              placeholder="Descrizione opzionale"
            ></textarea>
          </div>
          
          <div className="flex items-center">
            <input
              id="isPublic"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Rendi la collezione pubblica
            </label>
          </div>
        </form>
      </ModalCrud>
    </MainLayout>
  );
} 