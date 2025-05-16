const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Read token from Authorization header
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({ msg: 'Missing token, access denied' });
  }

  const token = authHeader.split(' ')[1]; // Expected format: Bearer TOKEN

  if (!token) {
    return res.status(401).json({ msg: 'Malformed token, access denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Make sure we set userId in the request for controllers that need it
    req.user = { 
      userId: decoded.userId,
      _id: decoded.userId 
    };
    next(); // Proceed to next middleware or controller
  } catch (err) {
    console.error('JWT verification error:', err);
    res.status(401).json({ msg: 'Invalid token, access denied' });
  }
};

module.exports = authMiddleware;
