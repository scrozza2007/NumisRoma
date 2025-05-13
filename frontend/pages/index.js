import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';

const Home = () => {
  const [featuredCoins, setFeaturedCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const fetchRandomCoins = async () => {
    try {
      // Generiamo un numero casuale per saltare un numero casuale di risultati
      const randomSkip = Math.floor(Math.random() * 41771); // Numero totale di monete nel catalogo
      const response = await fetch(`http://localhost:4000/api/coins?limit=3&skip=${randomSkip}`);
      const data = await response.json();
      
      // Attiviamo la transizione
      setIsTransitioning(true);
      
      // Dopo un breve delay, aggiorniamo le monete
      setTimeout(() => {
        setFeaturedCoins(data.results);
        setIsTransitioning(false);
      }, 300);
    } catch (error) {
      console.error('Error fetching random coins:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRandomCoins();

    // Aggiorna le monete ogni 2 minuti
    const interval = setInterval(fetchRandomCoins, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Head>
        <title>NumisRoma - Online Roman Imperial Coinage Catalog</title>
        <meta name="description" content="Explore the comprehensive catalog of Roman Imperial coins" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-yellow-500 shadow-md">
        <div className="container mx-auto flex justify-between items-center py-4 px-6">
          <Link href="/">
            <img src="/images/logo.png" alt="NumisRoma Logo" className="h-10" />
          </Link>
          <nav className="flex space-x-4">
            <Link href="/browse" className="text-white hover:underline">Browse</Link>
            <Link href="/search" className="text-white hover:underline">Search</Link>
            <Link href="/community" className="text-white hover:underline">Community</Link>
            <Link href="/resources" className="text-white hover:underline">Resources</Link>
            <Link href="/symbols" className="text-white hover:underline">Symbols</Link>
            <Link href="/contact" className="text-white hover:underline">Contact</Link>
          </nav>
          <div className="flex space-x-4">
            <Link href="/login" className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors duration-200">Sign In</Link>
            <Link href="/register" className="px-4 py-2 bg-white text-black rounded hover:bg-gray-200 transition-colors duration-200">Register</Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <div className="relative bg-white">
          <div className="container mx-auto text-center py-16">
            <h1 className="text-5xl font-bold text-gray-800 mb-4 animate-fade-in">NumisRoma</h1>
            <p className="text-xl text-gray-600 mb-8 animate-fade-in-delay">Online Roman Imperial Coinage Catalog</p>
            <Link href="/browse" className="px-8 py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200 transform hover:scale-105">
              Browse Catalog
            </Link>
          </div>
          <div className="relative w-full h-[500px] overflow-hidden">
              <img 
                src="/images/colosseum-bg.JPG" 
                alt="Roman Colosseum"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <h2 className="text-4xl font-bold mb-4 [text-shadow:_2px_2px_4px_rgb(0_0_0_/_80%)]">Explore Ancient Rome</h2>
                  <p className="text-xl mb-6 [text-shadow:_2px_2px_4px_rgb(0_0_0_/_80%)]">Discover the rich history of Roman Imperial coinage</p>
                  <Link 
                    href="/browse" 
                    className="inline-block px-8 py-3 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 transition-colors duration-200"
                  >
                    Start Exploring
                  </Link>
                </div>
              </div>
            </div>
        </div>

        <section className="bg-gray-100 py-16">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Featured Coins</h2>
            <p className="text-gray-600 mb-8">Discover a random selection from our catalog</p>
            {loading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-8">
                {featuredCoins.map((coin) => (
                  <div 
                    key={coin._id} 
                    className={`bg-white shadow-lg rounded-lg p-4 transform transition-all duration-300 ${
                      isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                    }`}
                  >
                    <div className="aspect-[4/3] mb-3">
                      <img
                        src={coin.obverse.image || '/images/coin-placeholder.jpg'}
                        alt={coin.name}
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{coin.name}</h3>
                    <p className="text-gray-600 mb-2">{coin.authority.emperor}</p>
                    <p className="text-gray-500 text-sm">{coin.description.date_range}</p>
                    <Link 
                      href={`/coins/${coin._id}`}
                      className="mt-4 inline-block text-yellow-500 hover:text-yellow-600 transition-colors duration-200"
                    >
                      View Details →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-800">About NumisRoma</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Our Mission</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Research</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Publications</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Contributors</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-800">Resources</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Coin Database</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Historical Maps</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Timeline</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Bibliography</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-800">Community</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Forum</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Events</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Newsletter</Link></li>
              <li><Link href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex justify-center space-x-4">
          <Link href="#" aria-label="Twitter" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">
            <img src="/images/twitter-icon.svg" alt="Twitter" className="h-6" />
          </Link>
          <Link href="#" aria-label="Instagram" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">
            <img src="/images/instagram-icon.svg" alt="Instagram" className="h-6" />
          </Link>
          <Link href="#" aria-label="YouTube" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">
            <img src="/images/youtube-icon.svg" alt="YouTube" className="h-6" />
          </Link>
          <Link href="#" aria-label="LinkedIn" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">
            <img src="/images/linkedin-icon.svg" alt="LinkedIn" className="h-6" />
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default Home;