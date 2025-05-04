const express = require('express');
const { body } = require('express-validator');
const { createCollection, addCoinToCollection } = require('../controllers/collectionController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Collection:
 *       type: object
 *       required:
 *         - name
 *         - user
 *       properties:
 *         _id:
 *           type: string
 *           description: ID generato automaticamente della collezione
 *         user:
 *           type: string
 *           description: ID dell'utente proprietario
 *         name:
 *           type: string
 *           description: Nome della collezione
 *         description:
 *           type: string
 *           description: Descrizione della collezione
 *         isPublic:
 *           type: boolean
 *           default: false
 *           description: Indica se la collezione è pubblica
 *         coins:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               coin:
 *                 type: string
 *                 description: ID della moneta
 *               weight:
 *                 type: number
 *               diameter:
 *                 type: number
 *               grade:
 *                 type: string
 *               notes:
 *                 type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/collections:
 *   post:
 *     summary: Crea una nuova collezione
 *     tags: [Collezioni]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Collezione creata con successo
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Utente non autenticato
 */
router.post(
  '/',
  authMiddleware,
  [
    body('name').notEmpty().withMessage('Il nome della collezione è obbligatorio'),
    body('description').optional(),
    body('isPublic').optional().isBoolean()
  ],
  createCollection
);

/**
 * @swagger
 * /api/collections/{collectionId}/coins:
 *   post:
 *     summary: Aggiunge una moneta alla collezione
 *     tags: [Collezioni]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collectionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID della collezione
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - coin
 *             properties:
 *               coin:
 *                 type: string
 *                 description: ID della moneta
 *               weight:
 *                 type: number
 *               diameter:
 *                 type: number
 *               grade:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Moneta aggiunta alla collezione con successo
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Utente non autenticato
 *       403:
 *         description: Utente non autorizzato
 *       404:
 *         description: Collezione non trovata
 */
router.post(
  '/:collectionId/coins',
  authMiddleware,
  [
    body('coin').notEmpty().withMessage('ID della moneta obbligatorio')
  ],
  addCoinToCollection
);

module.exports = router;