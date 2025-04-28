require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');

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

// Connessione a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connesso a MongoDB'))
  .catch((err) => console.error('Errore connessione MongoDB:', err));

// Avvio server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server avviato su http://localhost:${PORT}`));
