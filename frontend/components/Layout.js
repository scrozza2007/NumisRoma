import React from 'react';
import Navbar from './Navbar';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-800">About NumisRoma</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Our Mission</a></li>
              <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Research</a></li>
              <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Publications</a></li>
              <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Contributors</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-800">Resources</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Coin Database</a></li>
              <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Historical Maps</a></li>
              <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Timeline</a></li>
              <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Bibliography</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-800">Community</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Forum</a></li>
              <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Events</a></li>
              <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Newsletter</a></li>
              <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex justify-center space-x-4">
          <a href="#" aria-label="Twitter" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">
            <img src="/images/twitter-icon.svg" alt="Twitter" className="h-6" />
          </a>
          <a href="#" aria-label="Instagram" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">
            <img src="/images/instagram-icon.svg" alt="Instagram" className="h-6" />
          </a>
          <a href="#" aria-label="YouTube" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">
            <img src="/images/youtube-icon.svg" alt="YouTube" className="h-6" />
          </a>
          <a href="#" aria-label="LinkedIn" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">
            <img src="/images/linkedin-icon.svg" alt="LinkedIn" className="h-6" />
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Layout; 