const express = require('express');
const { body } = require('express-validator');
const { sendContactMessage } = require('../controllers/contactController');

const router = express.Router();

// Invia un messaggio di contatto
router.post(
  '/',
  [
    body('name')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Name must be at least 2 characters long'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please enter a valid email address'),
    body('subject')
      .trim()
      .isLength({ min: 5 })
      .withMessage('Subject must be at least 5 characters long'),
    body('message')
      .trim()
      .isLength({ min: 20 })
      .withMessage('Message must be at least 20 characters long')
  ],
  sendContactMessage
);

module.exports = router; 