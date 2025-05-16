import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

const CoinDetail = () => {
  const router = useRouter();
  const { id } = router.query;
  const [coin, setCoin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatText = (text, isTitle = false) => {
    if (isTitle) {
      return text.replace(/\s+/g, ' ').trim();
    }
    return text
      .replace(/\s+/g, ' ')
      .replace(/([^:]):/g, '$1: ')
      .trim();
  };

  const extractCoinData = (htmlContent) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Estraiamo le informazioni usando regex migliorate
    const text = doc.body.textContent;
    
    const titleMatch = text.match(/RIC I \(second edition\) ([^\n]+)/);
    const dateMatch = text.match(/Date\s*:?\s*([^\n]+)/i);
    const denominationMatch = text.match(/Denomination\s*:?\s*([^\n]+)/i);
    const mintMatch = text.match(/Mint\s*:?\s*([^\n]+)/i);
    const obverseMatch = text.match(/Obverse\s*:?\s*([^\n]+)/i);
    const reverseMatch = text.match(/Reverse\s*:?\s*([^\n]+)/i);
    
    // Estraiamo il nome della moneta dal titolo
    let title = titleMatch?.[1] || '';
    title = title.replace(/\s*objects?.*$/i, '');
    const titleParts = title.match(/^([A-Za-z]+)\s+(\d+[A-Za-z]*)/);
    if (titleParts) {
      title = `${titleParts[1]} ${titleParts[2]}`;
    }
    
    // Estraiamo le immagini
    const images = doc.querySelectorAll('img');
    const obverseImg = images[0];
    const reverseImg = images[1];
    
    return {
      name: formatText(title, true),
      authority: {
        emperor: title.split(' ')[0] || '',
        dynasty: ''
      },
      description: {
        date_range: formatText(dateMatch?.[1] || ''),
        material: '',
        denomination: formatText(denominationMatch?.[1] || ''),
        mint: formatText(mintMatch?.[1] || '')
      },
      obverse: {
        image: obverseImg?.src || '/images/coin-placeholder.jpg',
        legend: formatText(obverseMatch?.[1] || ''),
        type: ''
      },
      reverse: {
        image: reverseImg?.src || '/images/coin-placeholder.jpg',
        legend: formatText(reverseMatch?.[1] || ''),
        type: ''
      }
    };
  };

  useEffect(() => {
    const fetchCoinDetails = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('Recupero dettagli moneta:', id);
        const response = await fetch(`https://numismatics.org/ocre/results?q=${encodeURIComponent(id)}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const htmlContent = await response.text();
        console.log('Risposta OCRE completa:', htmlContent);
        console.log('Lunghezza risposta:', htmlContent.length);
        
        const coinData = extractCoinData(htmlContent);
        console.log('Dati moneta estratti:', coinData);
        
        setCoin(coinData);
      } catch (error) {
        console.error('Errore nel recupero dei dettagli della moneta:', error);
        setError('Si è verificato un errore durante il caricamento dei dettagli della moneta. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };

    fetchCoinDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center space-x-2">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!coin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Moneta non trovata</h2>
          <Link href="/browse" className="text-yellow-600 hover:text-yellow-700">
            Torna al catalogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{coin.name} - NumisRoma</title>
        <meta name="description" content={`Dettagli della moneta ${coin.name}`} />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container mx-auto py-12 px-4">
        <div className="mb-8">
          <Link href="/browse" className="text-yellow-600 hover:text-yellow-700 flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Torna al catalogo</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Immagini */}
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Dritto</h3>
                <div className="aspect-square bg-gray-50 rounded-xl p-6">
                  <img
                    src={coin.obverse.image}
                    alt="Dritto"
                    className="w-full h-full object-contain mix-blend-multiply"
                  />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Rovescio</h3>
                <div className="aspect-square bg-gray-50 rounded-xl p-6">
                  <img
                    src={coin.reverse.image}
                    alt="Rovescio"
                    className="w-full h-full object-contain mix-blend-multiply"
                  />
                </div>
              </div>
            </div>

            {/* Dettagli */}
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{coin.name}</h1>
                <p className="text-xl text-gray-600">{coin.authority.emperor}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Periodo</h3>
                  <p className="text-gray-600">{coin.description.date_range}</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nominale</h3>
                  <p className="text-gray-600">{coin.description.denomination}</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Zecca</h3>
                  <p className="text-gray-600">{coin.description.mint}</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Dritto</h3>
                  <p className="text-gray-600">{coin.obverse.legend}</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Rovescio</h3>
                  <p className="text-gray-600">{coin.reverse.legend}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoinDetail;

export async function getServerSideProps(context) {
  return {
    props: {
      coinId: context.params.id
    }
  };
}