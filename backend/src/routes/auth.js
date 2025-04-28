const express = require('express');
const { body } = require('express-validator');

const { registerUser, loginUser } = require('../controllers/authController');

const router = express.Router();

// Rotta di registrazione
router.post(
  '/register',
  [
    body('username').notEmpty().withMessage('Username obbligatorio'),
    body('email').isEmail().withMessage('Email non valida'),
    body('password').isLength({ min: 6 }).withMessage('Password di almeno 6 caratteri')
  ],
  registerUser
);

// Rotta di login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email non valida'),
    body('password').notEmpty().withMessage('Password obbligatoria')
  ],
  loginUser
);

module.exports = router;

const authMiddleware = require('../middlewares/authMiddleware');

// Rotta protetta (di prova)
router.get('/me', authMiddleware, (req, res) => {
  res.json({ msg: 'Sei autenticato!', user: req.user });
});