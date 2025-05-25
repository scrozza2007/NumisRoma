const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// Ottieni tutte le conversazioni dell'utente
const getConversations = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const conversations = await Conversation.find({
      participants: userId
    })
    .populate('participants', 'username fullName avatar')
    .populate('lastMessage')
    .sort({ lastActivity: -1 });

    res.json(conversations);
  } catch (error) {
    console.error('Errore nel recupero conversazioni:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Ottieni o crea una conversazione tra due utenti
const getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { otherUserId } = req.params;

    // Verifica che l'altro utente esista
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    // Cerca conversazione esistente
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, otherUserId] }
    }).populate('participants', 'username fullName avatar');

    // Se non esiste, creala
    if (!conversation) {
      conversation = new Conversation({
        participants: [userId, otherUserId]
      });
      await conversation.save();
      await conversation.populate('participants', 'username fullName avatar');
    }

    res.json(conversation);
  } catch (error) {
    console.error('Errore nel recupero/creazione conversazione:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Ottieni messaggi di una conversazione
const getMessages = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verifica che l'utente sia partecipante della conversazione
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Accesso negato alla conversazione' });
    }

    const messages = await Message.find({
      conversation: conversationId,
      isDeleted: false
    })
    .populate('sender', 'username fullName avatar')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

    res.json(messages.reverse()); // Inverti per ordine cronologico
  } catch (error) {
    console.error('Errore nel recupero messaggi:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Invia un nuovo messaggio
const sendMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { conversationId } = req.params;
    const { content, messageType = 'text', imageUrl } = req.body;

    // Verifica che l'utente sia partecipante della conversazione
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Accesso negato alla conversazione' });
    }

    // Crea il messaggio
    const message = new Message({
      conversation: conversationId,
      sender: userId,
      content,
      messageType,
      imageUrl: messageType === 'image' ? imageUrl : undefined
    });

    await message.save();
    await message.populate('sender', 'username fullName avatar');

    // Aggiorna la conversazione
    conversation.lastMessage = message._id;
    conversation.lastActivity = new Date();
    await conversation.save();

    res.status(201).json(message);
  } catch (error) {
    console.error('Errore nell\'invio messaggio:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Segna messaggi come letti
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { conversationId } = req.params;

    // Verifica che l'utente sia partecipante della conversazione
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Accesso negato alla conversazione' });
    }

    // Segna come letti tutti i messaggi non letti dall'utente
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        'readBy.user': { $ne: userId }
      },
      {
        $push: {
          readBy: {
            user: userId,
            readAt: new Date()
          }
        }
      }
    );

    res.json({ message: 'Messaggi segnati come letti' });
  } catch (error) {
    console.error('Errore nel segnare messaggi come letti:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Elimina un messaggio
const deleteMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { messageId } = req.params;

    const message = await Message.findOne({
      _id: messageId,
      sender: userId
    });

    if (!message) {
      return res.status(404).json({ message: 'Messaggio non trovato o non autorizzato' });
    }

    message.isDeleted = true;
    await message.save();

    res.json({ message: 'Messaggio eliminato' });
  } catch (error) {
    console.error('Errore nell\'eliminazione messaggio:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Cerca utenti per iniziare una conversazione
const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.userId;

    if (!query || query.length < 2) {
      return res.json([]);
    }

    const users = await User.find({
      _id: { $ne: userId },
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { fullName: { $regex: query, $options: 'i' } }
      ]
    })
    .select('username fullName avatar')
    .limit(10);

    res.json(users);
  } catch (error) {
    console.error('Errore nella ricerca utenti:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Ottieni conteggio messaggi non letti
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Trova tutte le conversazioni dell'utente
    const conversations = await Conversation.find({
      participants: userId
    });

    let totalUnread = 0;

    for (const conversation of conversations) {
      const unreadCount = await Message.countDocuments({
        conversation: conversation._id,
        sender: { $ne: userId },
        'readBy.user': { $ne: userId },
        isDeleted: false
      });
      totalUnread += unreadCount;
    }

    res.json({ unreadCount: totalUnread });
  } catch (error) {
    console.error('Errore nel conteggio messaggi non letti:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

module.exports = {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  searchUsers,
  getUnreadCount
}; 