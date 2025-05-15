import { AuthProvider } from '../context/AuthContext';
import { MessageProvider } from '../context/MessageContext';
import Layout from '../components/Layout';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <MessageProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </MessageProvider>
    </AuthProvider>
  );
}

export default MyApp;