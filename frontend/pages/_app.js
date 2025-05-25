import '../styles/globals.css';
import { AuthProvider } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Layout from '../components/Layout';

function MyApp({ Component, pageProps }) {
  // Se la pagina ha un layout personalizzato, usalo
  if (Component.getLayout) {
    return (
      <AuthProvider>
        {Component.getLayout(<Component {...pageProps} />)}
      </AuthProvider>
    );
  }

  // Altrimenti usa il layout di default con la navbar
  return (
    <AuthProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}

export default MyApp;