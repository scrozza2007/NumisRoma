import '../styles/globals.css';
import { AuthProvider } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Layout from '../components/Layout';
import ErrorBoundary from '../components/ErrorBoundary';
import ProtectedRoute from '../components/ProtectedRoute';
import KofiWidget from '../components/KofiWidget';

// Pages that require a valid session — any other route is public.
const PROTECTED_ROUTES = new Set([
  '/community',
  '/profile',
  '/messages',
  '/settings',
  '/collections',
  '/new-collection',
  '/edit-collection',
  '/collection-detail',
  '/collection-export',
  '/collection-coin-detail',
  '/add-coin',
  '/delete-account',
]);

function MyApp({ Component, pageProps, router }) {
  const isProtected = PROTECTED_ROUTES.has(router.pathname);

  const content = isProtected
    ? <ProtectedRoute><Component {...pageProps} /></ProtectedRoute>
    : <Component {...pageProps} />;

  if (Component.getLayout) {
    return (
      <ErrorBoundary>
        <AuthProvider>
          {Component.getLayout(content)}
          <KofiWidget />
        </AuthProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Layout>
          {content}
        </Layout>
        <KofiWidget />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default MyApp;
