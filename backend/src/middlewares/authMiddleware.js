const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

const authMiddleware = async (req, res, next) => {
  // Read token from Authorization header
  const authHeader = req.header('Authorization');

  console.log('authMiddleware - richiesta a:', req.originalUrl);

  if (!authHeader) {
    console.log('authMiddleware - nessun header Authorization');
    return res.status(401).json({ msg: 'Missing token, access denied' });
  }

  const token = authHeader.split(' ')[1]; // Expected format: Bearer TOKEN

  if (!token) {
    console.log('authMiddleware - token malformato');
    return res.status(401).json({ msg: 'Malformed token, access denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('authMiddleware - token decodificato:', { userId: decoded.userId });

    // Verifica che la sessione associata al token sia ancora attiva
    const session = await Session.findOne({ token, isActive: true });
    
    if (!session) {
      console.log('authMiddleware - sessione non trovata o inattiva');
      return res.status(401).json({ 
        msg: 'Session terminated', 
        code: 'SESSION_TERMINATED',
        sessionTerminated: true
      });
    }
    
    console.log('authMiddleware - sessione attiva trovata:', session._id);
    
    // Aggiorna l'ultima attività della sessione
    session.lastActive = new Date();
    await session.save();
    
    // Make sure we set userId in the request for controllers that need it
    req.user = { 
      userId: decoded.userId,
      _id: decoded.userId,
      sessionId: session._id
    };
    
    console.log('authMiddleware - utente autenticato:', req.user.userId);
    
    next(); // Proceed to next middleware or controller
  } catch (err) {
    console.error('JWT verification error:', err);
    res.status(401).json({ msg: 'Invalid token, access denied' });
  }
};

module.exports = authMiddleware;
