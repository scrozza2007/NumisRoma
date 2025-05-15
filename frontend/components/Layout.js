import React, { useContext } from 'react';
import Navbar from './Navbar';
import { ThemeContext } from '../context/ThemeContext';

const Layout = ({ children }) => {
  const { isDarkMode } = useContext(ThemeContext);
  
  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <footer className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t`}>
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <h3 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>About NumisRoma</h3>
              <ul className="space-y-3">
                <li><a href="#" className={`${isDarkMode ? 'text-gray-300 hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-500'} transition-colors duration-200`}>Our Mission</a></li>
                <li><a href="#" className={`${isDarkMode ? 'text-gray-300 hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-500'} transition-colors duration-200`}>Research</a></li>
                <li><a href="#" className={`${isDarkMode ? 'text-gray-300 hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-500'} transition-colors duration-200`}>Publications</a></li>
                <li><a href="#" className={`${isDarkMode ? 'text-gray-300 hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-500'} transition-colors duration-200`}>Contributors</a></li>
              </ul>
            </div>
            <div>
              <h3 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Resources</h3>
              <ul className="space-y-3">
                <li><a href="#" className={`${isDarkMode ? 'text-gray-300 hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-500'} transition-colors duration-200`}>Coin Database</a></li>
                <li><a href="#" className={`${isDarkMode ? 'text-gray-300 hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-500'} transition-colors duration-200`}>Historical Maps</a></li>
                <li><a href="#" className={`${isDarkMode ? 'text-gray-300 hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-500'} transition-colors duration-200`}>Timeline</a></li>
                <li><a href="#" className={`${isDarkMode ? 'text-gray-300 hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-500'} transition-colors duration-200`}>Bibliography</a></li>
              </ul>
            </div>
            <div>
              <h3 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Community</h3>
              <ul className="space-y-3">
                <li><a href="#" className={`${isDarkMode ? 'text-gray-300 hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-500'} transition-colors duration-200`}>Forum</a></li>
                <li><a href="#" className={`${isDarkMode ? 'text-gray-300 hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-500'} transition-colors duration-200`}>Events</a></li>
                <li><a href="#" className={`${isDarkMode ? 'text-gray-300 hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-500'} transition-colors duration-200`}>Newsletter</a></li>
                <li><a href="#" className={`${isDarkMode ? 'text-gray-300 hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-500'} transition-colors duration-200`}>Contact</a></li>
              </ul>
            </div>
          </div>
          <div className={`mt-12 pt-8 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex flex-col items-center">
              <div className="flex space-x-6 mb-4">
                <a href="#" aria-label="Twitter" className={`${isDarkMode ? 'text-gray-300 hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-500'} transition-colors duration-200`}>
                  <img src="/images/twitter-icon.svg" alt="Twitter" className="h-6 w-6" />
                </a>
                <a href="#" aria-label="Instagram" className={`${isDarkMode ? 'text-gray-300 hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-500'} transition-colors duration-200`}>
                  <img src="/images/instagram-icon.svg" alt="Instagram" className="h-6 w-6" />
                </a>
                <a href="#" aria-label="YouTube" className={`${isDarkMode ? 'text-gray-300 hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-500'} transition-colors duration-200`}>
                  <img src="/images/youtube-icon.svg" alt="YouTube" className="h-6 w-6" />
                </a>
                <a href="#" aria-label="LinkedIn" className={`${isDarkMode ? 'text-gray-300 hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-500'} transition-colors duration-200`}>
                  <img src="/images/linkedin-icon.svg" alt="LinkedIn" className="h-6 w-6" />
                </a>
              </div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>© 2024 NumisRoma. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;