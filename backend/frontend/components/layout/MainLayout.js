'use client';

import Header from './Header';
import Footer from './Footer';

export default function MainLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex-grow">
        {children}
      </div>
      <Footer />
    </div>
  );
} 