const Contact = require('../models/Contact');
const { validationResult } = require('express-validator');

// Invia un nuovo messaggio di contatto
exports.sendContactMessage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }

  try {
    const { name, email, subject, message } = req.body;

    const contact = new Contact({
      name,
      email,
      subject,
      message
    });

    await contact.save();

    res.status(201).json({ 
      message: 'Message sent successfully',
      contact: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        createdAt: contact.createdAt
      }
    });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ 
      error: 'Server error',
      message: 'An unexpected error occurred while sending your message'
    });
  }
}; 