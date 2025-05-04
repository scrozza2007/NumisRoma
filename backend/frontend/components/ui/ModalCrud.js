'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ModalCrud({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer = null 
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    if (isOpen) {
      // Prevent scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      // Re-enable scrolling when component unmounts
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  useEffect(() => {
    // Add escape key listener
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Wait for client-side hydration
  if (!isMounted || !isOpen) return null;

  // Use createPortal to render the modal outside the normal DOM hierarchy
  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
      aria-label={title}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
            aria-label="Chiudi"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Body */}
        <div className="p-4 overflow-y-auto flex-grow">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end space-x-2">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
} 