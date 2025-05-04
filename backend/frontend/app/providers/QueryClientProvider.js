'use client';

import { QueryClient, QueryClientProvider as ReactQueryProvider } from 'react-query';
import { useState } from 'react';

export function QueryClientProvider({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 30000
      }
    }
  }));

  return (
    <ReactQueryProvider client={queryClient}>
      {children}
    </ReactQueryProvider>
  );
} 