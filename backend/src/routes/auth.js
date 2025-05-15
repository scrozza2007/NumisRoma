const express = require('express');
const { body } = require('express-validator');

const { registerUser, loginUser } = require('../controllers/authController');
const User = require('../models/User');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Funzione di validazione password personalizzata
const validatePassword = (value) => {
  if (value.length < 8) {
    throw new Error('La password deve essere di almeno 8 caratteri');
  }
  if (!/[A-Z]/.test(value)) {
    throw new Error('La password deve contenere almeno una lettera maiuscola');
  }
  if (!/[0-9]/.test(value)) {
    throw new Error('La password deve contenere almeno un numero');
  }
  if (!/[!@#$%^&*]/.test(value)) {
    throw new Error('La password deve contenere almeno un carattere speciale (!@#$%^&*)');
  }
  return true;
};

// Rotta di registrazione
router.post(
  '/register',
  [
    body('username').notEmpty().withMessage('Username obbligatorio'),
    body('email').isEmail().withMessage('Email non valida'),
    body('password').custom(validatePassword)
  ],
  registerUser
);

// Rotta di login
router.post(
  '/login',
  [
    body('identifier').notEmpty().withMessage('Identificatore obbligatorio'),
    body('password').notEmpty().withMessage('Password obbligatoria')
  ],
  loginUser
);

// Rotta protetta: restituisce tutti i dati utente (senza password)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;