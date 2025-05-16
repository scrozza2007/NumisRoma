require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const coinRoutes = require('./routes/coins');
const collectionRoutes = require('./routes/collections');
const userRoutes = require('./routes/users');
const contactRoutes = require('./routes/contact');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rotta di test
app.get('/', (req, res) => {
  res.send('API online');
});
// Rotte di autenticazione
app.use('/api/auth', authRoutes);
// Rotte per le monete
app.use('/api/coins', coinRoutes);
// Rotte per le collezioni
app.use('/api/collections', collectionRoutes);
// Rotte per gli utenti
app.use('/api/users', userRoutes);
// Rotte per il form di contatto
app.use('/api/contact', contactRoutes);

// Connessione a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connesso a MongoDB'))
  .catch((err) => console.error('Errore connessione MongoDB:', err));

// Avvio server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server avviato su http://localhost:${PORT}`));