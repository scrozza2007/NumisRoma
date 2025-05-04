'use client';

import { useEffect } from 'react';
import useAuthStore from '../../lib/store/authStore';

export function StoreInitializer() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    // Initialize auth state from cookie
    initialize();
  }, [initialize]);

  return null;
} 