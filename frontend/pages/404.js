import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const Custom404 = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Head>
        <title>404 - Page Not Found | NumisRoma</title>
        <meta name="description" content="Page not found - NumisRoma Roman Imperial Coinage Catalog" />
      </Head>

      <div className="max-w-2xl w-full mx-4 p-8 bg-white rounded-lg shadow-lg text-center">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">Page Not Found</h2>
        
        <p className="text-gray-600 mb-8">
          Looks like this page has been lost in time, just like that Roman coin you dropped in the Colosseum!
          Even Emperor Augustus couldn&apos;t find it now.
        </p>
        
        <button
          onClick={() => router.push('/')}
          className="group px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-yellow-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default Custom404;