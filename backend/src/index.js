require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const coinRoutes = require('./routes/coins');
const collectionRoutes = require('./routes/collections');
const messageRoutes = require('./routes/messages');


const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Creazione server HTTP
const server = http.createServer(app);

// Configurazione Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Gestione connessioni Socket.IO
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('Nuovo utente connesso:', socket.id);

  // Associa l'utente al socket
  socket.on('login', (userId) => {
    connectedUsers.set(userId, socket.id);
    console.log(`Utente ${userId} associato al socket ${socket.id}`);
  });

  // Invia messaggio
  socket.on('sendMessage', async (messageData) => {
    try {
      const { recipientId } = messageData;
      const recipientSocketId = connectedUsers.get(recipientId);

      // Se il destinatario è online, invia il messaggio in tempo reale
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receiveMessage', messageData);
      }
    } catch (error) {
      console.error('Errore invio messaggio socket:', error);
    }
  });

  // Notifica di digitazione
  socket.on('typing', (data) => {
    const { conversationId, userId, recipientId } = data;
    const recipientSocketId = connectedUsers.get(recipientId);
    
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('userTyping', { conversationId, userId });
    }
  });

  // Notifica di fine digitazione
  socket.on('stopTyping', (data) => {
    const { conversationId, userId, recipientId } = data;
    const recipientSocketId = connectedUsers.get(recipientId);
    
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('userStopTyping', { conversationId, userId });
    }
  });

  // Disconnessione
  socket.on('disconnect', () => {
    console.log('Utente disconnesso:', socket.id);
    // Rimuovi l'utente dalla mappa
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        break;
      }
    }
  });
});

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
// Rotte per i messaggi
app.use('/api/messages', messageRoutes);


// Connessione a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connesso a MongoDB'))
  .catch((err) => console.error('Errore connessione MongoDB:', err));

// Avvio server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server avviato su http://localhost:${PORT}`));