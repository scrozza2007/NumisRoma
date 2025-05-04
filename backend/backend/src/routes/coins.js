const express = require('express');
const { body } = require('express-validator');
const { createCoin, getCoins } = require('../controllers/coinController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Coin:
 *       type: object
 *       required:
 *         - name
 *         - authority
 *       properties:
 *         _id:
 *           type: string
 *           description: ID generato automaticamente della moneta
 *         name:
 *           type: string
 *           description: Nome della moneta
 *         authority:
 *           type: object
 *           properties:
 *             emperor:
 *               type: string
 *             dynasty:
 *               type: string
 *         description:
 *           type: object
 *           properties:
 *             date_range:
 *               type: string
 *             mint:
 *               type: string
 *             denomination:
 *               type: string
 *             material:
 *               type: string
 *         obverse:
 *           type: object
 *           properties:
 *             legend:
 *               type: string
 *             type:
 *               type: string
 *             portrait:
 *               type: string
 *             image:
 *               type: string
 *         reverse:
 *           type: object
 *           properties:
 *             legend:
 *               type: string
 *             type:
 *               type: string
 *             deity:
 *               type: string
 *             image:
 *               type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/coins:
 *   post:
 *     summary: Crea una nuova moneta
 *     tags: [Monete]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Coin'
 *     responses:
 *       201:
 *         description: Moneta creata con successo
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Utente non autenticato
 */
router.post(
  '/',
  authMiddleware,
  [
    body('name').notEmpty().withMessage('Nome moneta obbligatorio'),
    body('authority.emperor').notEmpty().withMessage('Imperatore obbligatorio'),
    body('description.material').notEmpty().withMessage('Materiale obbligatorio')
  ],
  createCoin
);

/**
 * @swagger
 * /api/coins:
 *   get:
 *     summary: Recupera elenco delle monete con filtri
 *     tags: [Monete]
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Parola chiave per la ricerca
 *       - in: query
 *         name: date_range
 *         schema:
 *           type: string
 *         description: Range di date
 *       - in: query
 *         name: emperor
 *         schema:
 *           type: string
 *         description: Nome dell'imperatore
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt]
 *         description: Campo per l'ordinamento
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Direzione dell'ordinamento
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Pagina dei risultati
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Numero di risultati per pagina
 *     responses:
 *       200:
 *         description: Elenco di monete
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 pages:
 *                   type: integer
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Coin'
 */
router.get('/', getCoins);

module.exports = router;