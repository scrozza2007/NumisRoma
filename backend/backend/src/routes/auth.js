const express = require('express');
const { body } = require('express-validator');
const { registerUser, loginUser } = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registra un nuovo utente
 *     tags: [Autenticazione]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *     responses:
 *       201:
 *         description: Utente registrato con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       400:
 *         description: Dati non validi o utente già esistente
 */
router.post(
  '/register',
  [
    body('username').notEmpty().withMessage('Username obbligatorio'),
    body('email').isEmail().withMessage('Email non valida'),
    body('password').isLength({ min: 6 }).withMessage('Password di almeno 6 caratteri')
  ],
  registerUser
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Effettua il login
 *     tags: [Autenticazione]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login effettuato con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Credenziali non valide
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email non valida'),
    body('password').notEmpty().withMessage('Password obbligatoria')
  ],
  loginUser
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Ottiene i dati dell'utente autenticato
 *     tags: [Autenticazione]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dati dell'utente
 *       401:
 *         description: Non autorizzato
 */
router.get('/me', authMiddleware, (req, res) => {
  res.json({ msg: 'Sei autenticato!', user: req.user });
});

module.exports = router;