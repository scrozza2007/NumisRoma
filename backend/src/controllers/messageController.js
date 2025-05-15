const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

// Ottieni tutte le conversazioni di un utente
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.userId;

    const conversations = await Conversation.find({
      participants: userId
    })
    .populate({
      path: 'participants',
      select: 'username email'
    })
    .populate({
      path: 'lastMessage',
      select: 'content createdAt isRead sender'
    })
    .sort({ updatedAt: -1 });

    // Aggiungi informazioni su messaggi non letti
    const conversationsWithUnread = conversations.map(conv => {
      const convObj = conv.toObject();
      
      // Se lastMessage esiste e l'utente non è il mittente, controlla se è stato letto
      if (conv.lastMessage && 
          conv.lastMessage.sender.toString() !== userId.toString()) {
        // isRead può contenere true/false per ogni userId
        convObj.unreadCount = conv.isRead.get(userId.toString()) ? 0 : 1;
      } else {
        convObj.unreadCount = 0;
      }
      
      return convObj;
    });

    res.json(conversationsWithUnread);
  } catch (err) {
    console.error('Errore nel recupero delle conversazioni:', err);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Crea una nuova conversazione
exports.createConversation = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const userId = req.user.userId;

    // Verifica che il destinatario esista
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    // Controlla se esiste già una conversazione tra questi utenti
    const existingConversation = await Conversation.findOne({
      participants: { $all: [userId, recipientId] }
    });

    if (existingConversation) {
      return res.json(existingConversation);
    }

    // Crea una nuova conversazione
    const newConversation = new Conversation({
      participants: [userId, recipientId],
    });

    await newConversation.save();

    // Popola i dati degli utenti
    const populatedConversation = await Conversation.findById(newConversation._id)
      .populate({
        path: 'participants',
        select: 'username email'
      });

    res.status(201).json(populatedConversation);
  } catch (err) {
    console.error('Errore nella creazione della conversazione:', err);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Ottieni i messaggi di una conversazione
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    // Verifica che la conversazione esista e che l'utente ne faccia parte
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversazione non trovata' });
    }

    // Recupera i messaggi
    const messages = await Message.find({ conversationId })
      .populate({
        path: 'sender',
        select: 'username email'
      })
      .sort({ createdAt: 1 });

    // Aggiorna lo stato di lettura dei messaggi
    await Message.updateMany(
      { 
        conversationId, 
        sender: { $ne: userId },
        isRead: false
      },
      { isRead: true }
    );

    // Aggiorna lo stato di lettura nella conversazione
    conversation.isRead.set(userId.toString(), true);
    await conversation.save();

    res.json(messages);
  } catch (err) {
    console.error('Errore nel recupero dei messaggi:', err);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Invia un nuovo messaggio
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, content, image } = req.body;
    const userId = req.user.userId;

    // Verifica che la conversazione esista e che l'utente ne faccia parte
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversazione non trovata' });
    }

    // Crea il nuovo messaggio
    const newMessage = new Message({
      conversationId,
      sender: userId,
      content,
      image: image || null
    });

    await newMessage.save();

    // Aggiorna l'ultimo messaggio nella conversazione
    conversation.lastMessage = newMessage._id;
    
    // Imposta come non letto per tutti i partecipanti tranne il mittente
    conversation.participants.forEach(participantId => {
      if (participantId.toString() !== userId.toString()) {
        conversation.isRead.set(participantId.toString(), false);
      }
    });
    
    await conversation.save();

    // Popola i dati del mittente per la risposta
    const populatedMessage = await Message.findById(newMessage._id)
      .populate({
        path: 'sender',
        select: 'username email'
      });

    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error('Errore nell\'invio del messaggio:', err);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Ottieni utenti con cui si può iniziare una conversazione
exports.getAvailableUsers = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Trova tutti gli utenti tranne l'utente corrente
    const users = await User.find({ _id: { $ne: userId } })
      .select('username email');
    
    res.json(users);
  } catch (err) {
    console.error('Errore nel recupero degli utenti:', err);
    res.status(500).json({ message: 'Errore del server' });
  }
}; 