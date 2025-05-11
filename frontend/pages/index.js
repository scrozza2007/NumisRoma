import React from 'react';
import Link from 'next/link';
import Head from 'next/head';

const Home = () => {
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
            <Link href="/login" className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">Sign In</Link>
            <Link href="/register" className="px-4 py-2 bg-white text-black rounded hover:bg-gray-200">Register</Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <div className="relative bg-white">
          <div className="container mx-auto text-center py-16">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">NumisRoma</h1>
            <p className="text-lg text-gray-600 mb-6">Online Roman Imperial Coinage Catalog</p>
            <Link href="/catalog" className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800">
              Browse Catalog
            </Link>
          </div>
          <div className="w-full">
            <img src="/images/colosseum-bg.jpg" alt="Roman Colosseum" className="w-full h-96 object-cover" />
          </div>
        </div>

        <section className="bg-gray-100 py-16">
          <div className="container mx-auto text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Heading</h2>
            <p className="text-gray-600 mb-8">Subheading</p>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="bg-white shadow-lg rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">"Quote"</h3>
                  <div className="flex items-center mt-4">
                    <img
                      src="/images/profile-placeholder.png"
                      alt="Profile"
                      className="w-10 h-10 rounded-full mr-4"
                    />
                    <div>
                      <p className="text-gray-800 font-medium">Title</p>
                      <p className="text-gray-600 text-sm">Description</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">Use cases</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="hover:underline">UI design</Link></li>
              <li><Link href="#" className="hover:underline">UX design</Link></li>
              <li><Link href="#" className="hover:underline">Wireframing</Link></li>
              <li><Link href="#" className="hover:underline">Diagramming</Link></li>
              <li><Link href="#" className="hover:underline">Brainstorming</Link></li>
              <li><Link href="#" className="hover:underline">Online whiteboard</Link></li>
              <li><Link href="#" className="hover:underline">Team collaboration</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">Explore</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="hover:underline">Design</Link></li>
              <li><Link href="#" className="hover:underline">Prototyping</Link></li>
              <li><Link href="#" className="hover:underline">Development features</Link></li>
              <li><Link href="#" className="hover:underline">Design systems</Link></li>
              <li><Link href="#" className="hover:underline">Enterprise</Link></li>
              <li><Link href="#" className="hover:underline">Design process</Link></li>
              <li><Link href="#" className="hover:underline">Figma</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="hover:underline">Blog</Link></li>
              <li><Link href="#" className="hover:underline">Best practices</Link></li>
              <li><Link href="#" className="hover:underline">Guides</Link></li>
              <li><Link href="#" className="hover:underline">Color wheel</Link></li>
              <li><Link href="#" className="hover:underline">Community</Link></li>
              <li><Link href="#" className="hover:underline">Developers</Link></li>
              <li><Link href="#" className="hover:underline">Resource library</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex justify-center space-x-4">
          <Link href="#" aria-label="Twitter"><img src="/images/twitter-icon.svg" alt="Twitter" className="h-6" /></Link>
          <Link href="#" aria-label="Instagram"><img src="/images/instagram-icon.svg" alt="Instagram" className="h-6" /></Link>
          <Link href="#" aria-label="YouTube"><img src="/images/youtube-icon.svg" alt="YouTube" className="h-6" /></Link>
          <Link href="#" aria-label="LinkedIn"><img src="/images/linkedin-icon.svg" alt="LinkedIn" className="h-6" /></Link>
        </div>
      </footer>
    </div>
  );
};

export default Home;