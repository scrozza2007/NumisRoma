import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import Image from 'next/image';

const Home = () => {
  const [featuredCoins, setFeaturedCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const fetchRandomCoins = async () => {
    try {
      setLoading(true);
      // Define a fallback URL and add logs for debugging
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      console.log('Calling API at:', apiUrl);
      
      const response = await fetch(`${apiUrl}/api/coins/random?limit=3`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }

      // Verifica che la risposta sia in formato JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Expected JSON response but got ${contentType}`);
      }
      
      const data = await response.json();
      
      setIsTransitioning(true);
      
      setTimeout(() => {
        setFeaturedCoins(data.results);
        setIsTransitioning(false);
        setLoading(false);
      }, 300);
    } catch (error) {
      console.error('Error fetching random coins:', error);
      setLoading(false);
      // Set placeholder coins in case of error
      setFeaturedCoins([]);
    }
  };

  useEffect(() => {
    fetchRandomCoins();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Head>
        <title>NumisRoma - Online Roman Imperial Coinage Catalog</title>
        <meta name="description" content="Explore the comprehensive catalog of Roman Imperial coins" />
        <link rel="icon" href="/favicon.ico" />
        {/* This is needed to ensure the page doesn't get cached, so we get new random coins on reload */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </Head>

      <main className="flex-grow">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-b from-yellow-50 to-white">
          <div className="container mx-auto px-6 py-20 text-center">
            <h1 className="text-6xl font-bold text-gray-900 mb-6 animate-fade-in">
              NumisRoma
            </h1>
            <p className="text-2xl text-gray-600 mb-12 animate-fade-in-delay max-w-2xl mx-auto">
              Discover the rich history of Roman Imperial coinage through our comprehensive online catalog
            </p>
            <div className="flex justify-center space-x-4">
              <Link 
                href="/browse" 
                className="px-8 py-4 bg-black text-white rounded-xl hover:bg-gray-800 transition-all duration-300 transform hover:scale-105 hover:shadow-lg font-medium"
              >
                Browse Catalog
              </Link>
              <Link 
                href="/search" 
                className="px-8 py-4 bg-white text-black border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 hover:shadow-lg font-medium"
              >
                Advanced Search
              </Link>
            </div>
          </div>
        </div>

        {/* Hero Image Section */}
        <div className="relative w-full h-[600px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10"></div>
          <Image 
            src="/images/colosseum-bg.JPG" 
            alt="Roman Colosseum"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="text-center text-white px-6">
              <h2 className="text-5xl font-bold mb-6 [text-shadow:_2px_2px_4px_rgb(0_0_0_/_80%)]">
                Explore Ancient Rome
              </h2>
              <p className="text-2xl mb-8 [text-shadow:_2px_2px_4px_rgb(0_0_0_/_80%)] max-w-3xl mx-auto">
                Journey through time with our extensive collection of Roman Imperial coins
              </p>
              <Link 
                href="/browse" 
                className="inline-block px-10 py-4 bg-yellow-500 text-black font-semibold rounded-xl hover:bg-yellow-400 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
              >
                Start Exploring
              </Link>
            </div>
          </div>
        </div>

        {/* Featured Coins Section */}
        <section className="py-24 bg-gray-50">
          <div className="container mx-auto px-6">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Coins</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-4">
                Discover a random selection from our extensive catalog of Roman Imperial coins
              </p>
              <button
                onClick={fetchRandomCoins}
                className="px-4 py-2 bg-yellow-500 text-black rounded-xl hover:bg-yellow-400 transition-all duration-300 font-medium"
              >
                Refresh Random Coins
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-transparent"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {featuredCoins.map((coin) => (
                  <div 
                    key={coin._id} 
                    className={`bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-500 ${
                      isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                    } hover:shadow-xl hover:-translate-y-1`}
                  >
                    <div className="aspect-[4/3] bg-white p-6">
                      <Image
                        src={coin.obverse.image || '/images/coin-placeholder.jpg'}
                        alt={coin.name}
                        width={400}
                        height={300}
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{coin.name}</h3>
                      <p className="text-gray-700 mb-2 font-medium">{coin.authority.emperor}</p>
                      <p className="text-gray-500 mb-4">{coin.description.date_range}</p>
                      <Link 
                        href={`/coins/${coin._id}`}
                        className="inline-flex items-center text-yellow-600 hover:text-yellow-700 font-medium transition-colors duration-200"
                      >
                        View Details
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Advanced Search</h3>
                <p className="text-gray-600">Find specific coins using our powerful search tools and filters</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Detailed Information</h3>
                <p className="text-gray-600">Access comprehensive details about each coin&apos;s history and characteristics</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Community</h3>
                <p className="text-gray-600">Join our community of numismatists and share your knowledge</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;