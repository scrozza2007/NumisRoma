const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

const optionalAuthMiddleware = async (req, res, next) => {
  // Read token from Authorization header
  const authHeader = req.header('Authorization');

  console.log('optionalAuthMiddleware - richiesta a:', req.originalUrl);

  if (!authHeader) {
    console.log('optionalAuthMiddleware - nessun header Authorization, continuo senza auth');
    return next(); // Continua senza autenticazione
  }

  const token = authHeader.split(' ')[1]; // Expected format: Bearer TOKEN

  if (!token) {
    console.log('optionalAuthMiddleware - token malformato, continuo senza auth');
    return next(); // Continua senza autenticazione
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('optionalAuthMiddleware - token decodificato:', { userId: decoded.userId });

    // Verifica che la sessione associata al token sia ancora attiva
    const session = await Session.findOne({ token, isActive: true });
    
    if (!session) {
      console.log('optionalAuthMiddleware - sessione non trovata o inattiva, continuo senza auth');
      return next(); // Continua senza autenticazione invece di bloccare
    }
    
    console.log('optionalAuthMiddleware - sessione attiva trovata:', session._id);
    
    // Aggiorna l'ultima attività della sessione
    session.lastActive = new Date();
    await session.save();
    
    // Make sure we set userId in the request for controllers that need it
    req.user = { 
      userId: decoded.userId,
      _id: decoded.userId,
      sessionId: session._id
    };
    
    console.log('optionalAuthMiddleware - utente autenticato:', req.user.userId);
    
    next(); // Proceed to next middleware or controller
  } catch (err) {
    console.error('optionalAuthMiddleware - errore JWT, continuo senza auth:', err.message);
    next(); // Continua senza autenticazione invece di bloccare
  }
};

module.exports = optionalAuthMiddleware; 