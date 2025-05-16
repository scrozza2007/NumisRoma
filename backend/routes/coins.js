const express = require('express');
const router = express.Router();
const https = require('https');

// Funzione per formattare il testo
const formatText = (text, isTitle = false) => {
  if (isTitle) {
    return text.replace(/\s+/g, ' ').trim();
  }
  return text
    .replace(/\s+/g, ' ')
    .replace(/([^:]):/g, '$1: ')
    .trim();
};

// Funzione per fare richieste HTTPS
const makeRequest = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
};

// Funzione per estrarre i dati della moneta
const extractCoinData = (htmlContent) => {
  const text = htmlContent;
  
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
  const obverseImgMatch = text.match(/<img[^>]*src="([^"]*)"[^>]*class="[^"]*obverse[^"]*"/i);
  const reverseImgMatch = text.match(/<img[^>]*src="([^"]*)"[^>]*class="[^"]*reverse[^"]*"/i);
  
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
      image: obverseImgMatch?.[1] || '/images/coin-placeholder.jpg',
      legend: formatText(obverseMatch?.[1] || ''),
      type: ''
    },
    reverse: {
      image: reverseImgMatch?.[1] || '/images/coin-placeholder.jpg',
      legend: formatText(reverseMatch?.[1] || ''),
      type: ''
    }
  };
};

// Endpoint per ottenere i dettagli di una moneta
router.get('/:id', async (req, res) => {
  try {
    console.log('Richiesta dettagli moneta:', req.params.id);
    const url = `https://numismatics.org/ocre/id/${req.params.id}`;
    
    const htmlContent = await makeRequest(url);
    console.log('Risposta HTML ricevuta');
    
    const coinData = extractCoinData(htmlContent);
    console.log('Dati moneta estratti:', coinData);
    
    res.json(coinData);
  } catch (error) {
    console.error('Errore nel recupero dei dettagli della moneta:', error);
    res.status(500).json({ error: 'Errore nel recupero dei dettagli della moneta' });
  }
});

// Endpoint per cercare monete
router.get('/search', async (req, res) => {
  try {
    const { page = 1, limit = 12, ...filters } = req.query;
    console.log('Parametri ricerca:', { page, limit, filters });
    
    const searchUrl = 'https://numismatics.org/ocre/results?';
    let searchParams = new URLSearchParams({
      page,
      limit
    });

    if (filters.keyword) searchParams.append('q', filters.keyword);
    if (filters.material) searchParams.append('material', filters.material);
    if (filters.emperor) searchParams.append('authority', filters.emperor);
    if (filters.denomination) searchParams.append('denomination', filters.denomination);
    if (filters.mint) searchParams.append('mint', filters.mint);
    if (filters.date_range) searchParams.append('date', filters.date_range);

    const url = searchUrl + searchParams.toString();
    console.log('URL ricerca:', url);

    const htmlContent = await makeRequest(url);
    console.log('Risposta HTML ricevuta');
    
    const resultDivs = htmlContent.match(/<div[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/div>/g) || [];
    console.log('Numero di risultati trovati:', resultDivs.length);
    
    const coins = [];
    
    for (const div of resultDivs) {
      const text = div;
      
      const titleMatch = text.match(/RIC I \(second edition\) ([^\n]+)/);
      const dateMatch = text.match(/Date\s*:?\s*([^\n]+)/i);
      const denominationMatch = text.match(/Denomination\s*:?\s*([^\n]+)/i);
      const mintMatch = text.match(/Mint\s*:?\s*([^\n]+)/i);
      const obverseMatch = text.match(/Obverse\s*:?\s*([^\n]+)/i);
      const reverseMatch = text.match(/Reverse\s*:?\s*([^\n]+)/i);
      
      let title = titleMatch?.[1] || '';
      title = title.replace(/\s*objects?.*$/i, '');
      const titleParts = title.match(/^([A-Za-z]+)\s+(\d+[A-Za-z]*)/);
      if (titleParts) {
        title = `${titleParts[1]} ${titleParts[2]}`;
      }
      
      const obverseImgMatch = text.match(/<img[^>]*src="([^"]*)"[^>]*class="[^"]*obverse[^"]*"/i);
      const reverseImgMatch = text.match(/<img[^>]*src="([^"]*)"[^>]*class="[^"]*reverse[^"]*"/i);
      
      const imageUrl = obverseImgMatch?.[1] || '';
      let coinId = null;
      const patterns = [
        /\/(\d+)\//,
        /id=(\d+)/,
        /record=(\d+)/
      ];
      
      for (const pattern of patterns) {
        const match = imageUrl.match(pattern);
        if (match) {
          coinId = match[1];
          break;
        }
      }
      
      if (!coinId) {
        console.log(`ID non trovato per il risultato, uso l'indice come fallback`);
        coinId = coins.length;
      }
      
      coins.push({
        _id: coinId,
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
          image: obverseImgMatch?.[1] || '/images/coin-placeholder.jpg',
          legend: formatText(obverseMatch?.[1] || ''),
          type: ''
        },
        reverse: {
          image: reverseImgMatch?.[1] || '/images/coin-placeholder.jpg',
          legend: formatText(reverseMatch?.[1] || ''),
          type: ''
        }
      });
    }
    
    // Estraiamo il numero totale di pagine
    const totalMatches = htmlContent.match(/Displaying records \d+ to \d+ of (\d+) total results/);
    const total = totalMatches ? parseInt(totalMatches[1]) : 0;
    
    res.json({
      coins,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Errore nella ricerca delle monete:', error);
    res.status(500).json({ error: 'Errore nella ricerca delle monete' });
  }
});

module.exports = router; 