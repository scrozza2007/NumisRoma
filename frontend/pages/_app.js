import React, { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider, AuthContext } from '../context/AuthContext';
import Layout from '../components/Layout';
import '../styles/globals.css';

// Session checker component
const SessionChecker = () => {
  const { checkSession, sessionTerminated, terminationReason, resetSessionTermination } = useContext(AuthContext);
  const router = useRouter();

  // React immediately when session is terminated
  useEffect(() => {
    if (sessionTerminated && router.pathname !== '/login') {
      console.log('Session termination detected, redirecting...');
      
      // Redirect to login page with message
      router.replace({
        pathname: '/login',
        query: { message: terminationReason || 'Your session has expired' }
      });
      
      // Reset state after redirect
      resetSessionTermination();
    }
  }, [sessionTerminated, terminationReason, router, resetSessionTermination]);

  // Check session every 30 seconds
  useEffect(() => {
    // Skip check on public pages
    const publicPages = ['/login', '/register', '/forgot-password', '/reset-password'];
    if (publicPages.includes(router.pathname)) {
      return;
    }

    const sessionCheckInterval = setInterval(async () => {
      try {
        await checkSession();
      } catch (error) {
        console.error('Error during session check:', error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(sessionCheckInterval);
  }, [checkSession, router.pathname]);

  // Check if there's a logout reason to show
  useEffect(() => {
    const logoutReason = localStorage.getItem('logoutReason');
    if (logoutReason && router.pathname !== '/login') {
      // Save message in variable and remove from localStorage
      const message = logoutReason;
      localStorage.removeItem('logoutReason');
      
      // Redirect to login page with message
      router.replace({
        pathname: '/login',
        query: { message }
      });
    }
  }, [router]);

  return null;
};

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <SessionChecker />
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}

export default MyApp;