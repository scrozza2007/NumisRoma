const Session = require('../models/Session');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Utility per rilevare le informazioni del dispositivo
const detectDevice = (userAgent) => {
  const ua = userAgent.toLowerCase();
  let deviceType = 'unknown';
  let os = 'unknown';
  let browser = 'unknown';
  let deviceName = 'Dispositivo sconosciuto';

  // Rileva tipo di dispositivo
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|opera mini|opera mobi|webos/i.test(ua)) {
    deviceType = 'mobile';
  } else {
    deviceType = 'desktop';
  }

  // Rileva sistema operativo
  if (ua.includes('windows nt')) {
    os = 'Windows';
    if (ua.includes('windows nt 10')) os = 'Windows 10';
    else if (ua.includes('windows nt 6.3')) os = 'Windows 8.1';
    else if (ua.includes('windows nt 6.2')) os = 'Windows 8';
    else if (ua.includes('windows nt 6.1')) os = 'Windows 7';
    else if (ua.includes('windows nt 6.0')) os = 'Windows Vista';
    else if (ua.includes('windows nt 5.1')) os = 'Windows XP';
  } else if (ua.includes('mac os x')) {
    os = 'macOS';
    // Estrai la versione di macOS se presente
    const macOSVersionMatch = ua.match(/mac os x (\d+_\d+)/);
    if (macOSVersionMatch) {
      const version = macOSVersionMatch[1].replace('_', '.');
      os += ` ${version}`;
    }
  } else if (ua.includes('android')) {
    os = 'Android';
    // Estrai la versione di Android se presente
    const androidVersionMatch = ua.match(/android (\d+(\.\d+)*)/);
    if (androidVersionMatch) {
      os += ` ${androidVersionMatch[1]}`;
    }
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    os = 'iOS';
    // Estrai la versione di iOS se presente
    const iOSVersionMatch = ua.match(/os (\d+_\d+)/);
    if (iOSVersionMatch) {
      const version = iOSVersionMatch[1].replace('_', '.');
      os += ` ${version}`;
    }
  } else if (ua.includes('linux')) {
    os = 'Linux';
  }

  // Rileva browser
  if (ua.includes('firefox/')) {
    browser = 'Firefox';
  } else if (ua.includes('edg/') || ua.includes('edge/')) {
    browser = 'Edge';
  } else if (ua.includes('opr/') || ua.includes('opera/')) {
    browser = 'Opera';
  } else if (ua.includes('chrome/') && !ua.includes('chromium/')) {
    browser = 'Chrome';
  } else if (ua.includes('safari/') && !ua.includes('chrome/') && !ua.includes('chromium/')) {
    browser = 'Safari';
  } else if (ua.includes('msie ') || ua.includes('trident/')) {
    browser = 'Internet Explorer';
  }

  // Crea un nome del dispositivo descrittivo
  deviceName = `${os} • ${browser}`;

  return {
    type: deviceType,
    operatingSystem: os,
    browser,
    deviceName
  };
};

// Crea una nuova sessione
exports.createSession = async (userId, token, req) => {
  try {
    // Ottieni informazioni sul dispositivo dal user-agent
    const userAgent = req.headers['user-agent'] || '';
    const deviceInfo = detectDevice(userAgent);
    
    // Ottieni indirizzo IP
    const ipAddress = req.headers['x-forwarded-for'] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress || 
                     'sconosciuto';
    
    // Per semplicità, impostiamo la posizione in base all'IP
    // In produzione, si dovrebbe usare un servizio di geolocalizzazione
    const location = req.body.location || 'Sconosciuta';

    const session = new Session({
      userId,
      token,
      deviceInfo,
      ipAddress,
      location,
      lastActive: new Date()
    });

    await session.save();
    return session;
  } catch (error) {
    console.error('Errore durante la creazione della sessione:', error);
    throw error;
  }
};

// Ottieni tutte le sessioni attive di un utente
exports.getActiveSessions = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Ottieni tutte le sessioni attive dell'utente
    const sessions = await Session.find({ 
      userId, 
      isActive: true 
    }).sort({ lastActive: -1 });
    
    // Estrai il token corrente dall'header di autenticazione
    const currentToken = req.headers.authorization.split(' ')[1];
    
    // Marca la sessione corrente
    const sessionsWithCurrentFlag = sessions.map(session => {
      const sessionObj = session.toObject();
      sessionObj.isCurrentSession = session.token === currentToken;
      return sessionObj;
    });
    
    res.json({ sessions: sessionsWithCurrentFlag });
  } catch (error) {
    console.error('Errore durante il recupero delle sessioni:', error);
    res.status(500).json({ error: 'Errore del server durante il recupero delle sessioni' });
  }
};

// Termina una sessione specifica
exports.terminateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;
    
    // Trova la sessione e assicurati che appartenga all'utente corrente
    const session = await Session.findOne({ _id: sessionId, userId });
    
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    
    // Estrai il token corrente dall'header di autenticazione
    const currentToken = req.headers.authorization.split(' ')[1];
    
    // Se l'utente sta cercando di terminare la sessione corrente
    if (session.token === currentToken) {
      return res.status(400).json({ 
        error: 'Non puoi terminare la sessione corrente da qui',
        message: 'Usa la funzione di logout per terminare la sessione corrente'
      });
    }
    
    // Disattiva la sessione
    session.isActive = false;
    await session.save();
    
    res.json({ message: 'Sessione terminata con successo' });
  } catch (error) {
    console.error('Errore durante la terminazione della sessione:', error);
    res.status(500).json({ error: 'Errore del server durante la terminazione della sessione' });
  }
};

// Termina tutte le altre sessioni tranne quella corrente
exports.terminateAllOtherSessions = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Estrai il token corrente dall'header di autenticazione
    const currentToken = req.headers.authorization.split(' ')[1];
    
    // Trova e disattiva tutte le altre sessioni attive dell'utente
    await Session.updateMany(
      { userId, isActive: true, token: { $ne: currentToken } },
      { $set: { isActive: false } }
    );
    
    res.json({ message: 'Tutte le altre sessioni sono state terminate con successo' });
  } catch (error) {
    console.error('Errore durante la terminazione di tutte le sessioni:', error);
    res.status(500).json({ error: 'Errore del server durante la terminazione delle sessioni' });
  }
};

// Aggiorna l'ultima attività di una sessione
exports.updateSessionActivity = async (userId, token) => {
  try {
    await Session.findOneAndUpdate(
      { userId, token, isActive: true },
      { $set: { lastActive: new Date() } }
    );
  } catch (error) {
    console.error('Errore durante l\'aggiornamento dell\'attività della sessione:', error);
  }
}; 