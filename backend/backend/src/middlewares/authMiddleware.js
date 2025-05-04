const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Legge il token dall'header Authorization
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({ msg: 'Token mancante, accesso negato' });
  }

  const token = authHeader.split(' ')[1]; // Aspettiamo: Bearer TOKEN

  if (!token) {
    return res.status(401).json({ msg: 'Token malformato, accesso negato' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Salviamo i dati dell'utente nella richiesta
    next(); // Passa al prossimo middleware o controller
  } catch (err) {
    console.error(err);
    res.status(401).json({ msg: 'Token non valido, accesso negato' });
  }
};

module.exports = authMiddleware;
