import { Inter } from 'next/font/google';
import './globals.css';
import { QueryClientProvider } from './providers/QueryClientProvider';
import { StoreInitializer } from './providers/StoreInitializer';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'NumisRoma - Catalogo di Monete Romane',
  description: 'Esplora e colleziona monete antiche romane',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body className={inter.className}>
        <QueryClientProvider>
          <StoreInitializer />
          <main className="min-h-screen">
            {children}
          </main>
        </QueryClientProvider>
      </body>
    </html>
  );
} 