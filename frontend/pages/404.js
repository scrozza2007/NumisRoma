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
          Even Emperor Augustus couldn't find it now.
        </p>
        
        <button
          onClick={() => router.push('/')}
          className="px-8 py-4 bg-yellow-500 text-black font-semibold rounded-xl hover:bg-yellow-400 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default Custom404;