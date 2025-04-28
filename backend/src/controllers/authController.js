const User = require('../models/User');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Registrazione
exports.registerUser = async (req, res) => {
  // Validazione input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;

  try {
    // Controllo se esiste già l'utente
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'Utente già registrato' });
    }

    // Crea nuovo utente
    user = new User({
      username,
      email,
      password: await bcrypt.hash(password, 10) // Cripta la password
    });

    await user.save();

    // Crea token JWT
    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Errore del server');
  }
};

// Login
exports.loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Cerca utente
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Credenziali non valide' });
    }

    // Confronta password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Credenziali non valide' });
    }

    // Crea token
    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Errore del server');
  }
};