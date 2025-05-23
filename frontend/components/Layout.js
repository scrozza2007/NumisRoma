import React from 'react';
import Navbar from './Navbar';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <footer className="bg-white border-gray-200 border-t">
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <h3 className="text-xl font-bold mb-6 text-gray-800">About NumisRoma</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Our Mission</a></li>
                <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Research</a></li>
                <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Publications</a></li>
                <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Contributors</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-6 text-gray-800">Resources</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Coin Database</a></li>
                <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Historical Maps</a></li>
                <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Timeline</a></li>
                <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Bibliography</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-6 text-gray-800">Community</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Forum</a></li>
                <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Events</a></li>
                <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Newsletter</a></li>
                <li><a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors duration-200">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex flex-col items-center">
              <div className="flex space-x-6 mb-4">
                <a 
                  href="https://x.com/numisroma" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  aria-label="X" 
                  className="text-gray-600 hover:text-yellow-500 transition-colors duration-200"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a 
                  href="https://www.instagram.com/numisroma" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  aria-label="Instagram" 
                  className="text-gray-600 hover:text-yellow-500 transition-colors duration-200"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </a>
                <a 
                  href="https://www.youtube.com/@numisroma" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  aria-label="YouTube" 
                  className="text-gray-600 hover:text-yellow-500 transition-colors duration-200"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
                <a 
                  href="https://www.linkedin.com/company/numisroma" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  aria-label="LinkedIn" 
                  className="text-gray-600 hover:text-yellow-500 transition-colors duration-200"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
              <p className="text-sm text-gray-600">© 2025 NumisRoma. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;