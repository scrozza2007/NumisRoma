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
    req.user = decoded; // Save user data in the request
    next(); // Proceed to next middleware or controller
  } catch (err) {
    console.error(err);
    res.status(401).json({ msg: 'Invalid token, access denied' });
  }
};

module.exports = authMiddleware;
