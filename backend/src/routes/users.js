const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Follow = require('../models/Follow');
const authMiddleware = require('../middlewares/authMiddleware');
const mongoose = require('mongoose');
const Collection = require('../models/Collection');
const Chat = require('../models/Chat');

// GET /api/users - Cerca utenti
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search } = req.query;
    const currentUserId = req.user.userId;

    let query = {};
    if (search) {
      query = {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ],
        _id: { $ne: currentUserId }
      };
    }

    const users = await User.find(query).select('-password');
    
    // Aggiungi isFollowing per ogni utente
    const usersWithFollowStatus = await Promise.all(
      users.map(async (user) => {
        if (!currentUserId) return { ...user.toObject(), isFollowing: false };
        
        const isFollowing = await Follow.exists({
          follower: currentUserId,
          following: user._id
        });
        
        return {
          ...user.toObject(),
          isFollowing: !!isFollowing
        };
      })
    );

    res.json(usersWithFollowStatus);
  } catch (error) {
    res.status(500).json({ message: 'Errore nel recupero degli utenti' });
  }
});

// GET /api/users/recommended - Ottieni utenti consigliati
router.get('/recommended', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    
    // Trova gli ID degli utenti che l'utente corrente già segue
    const following = await Follow.find({ follower: currentUserId })
      .select('following')
      .lean();
    const followingIds = following.map(f => f.following);
    
    // Trova utenti che:
    // 1. L'utente corrente non segue già
    // 2. Non sono l'utente corrente stesso
    // 3. Hanno più follower (più popolari)
    // 4. Sono stati attivi di recente
    const users = await User.aggregate([
      {
        $match: {
          _id: { 
            $ne: new mongoose.Types.ObjectId(currentUserId),
            $nin: followingIds 
          }
        }
      },
      {
        $lookup: {
          from: 'follows',
          localField: '_id',
          foreignField: 'following',
          as: 'followers'
        }
      },
      {
        $addFields: {
          followersCount: { $size: '$followers' }
        }
      },
      {
        $sort: {
          followersCount: -1,
          lastActive: -1
        }
      },
      {
        $limit: 3
      },
      {
        $project: {
          password: 0,
          followers: 0
        }
      }
    ]);

    // Aggiungi isFollowing (sarà sempre false per gli utenti consigliati)
    const usersWithFollowStatus = users.map(user => ({
      ...user,
      isFollowing: false
    }));

    res.json(usersWithFollowStatus);
  } catch (error) {
    console.error('Errore nel recupero degli utenti consigliati:', error);
    res.status(500).json({ message: 'Errore nel recupero degli utenti consigliati' });
  }
});

// POST /api/users/:id/follow - Segui un utente
router.post('/:id/follow', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.userId;

    // Verifica che l'ID sia un ObjectId valido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID utente non valido' });
    }

    if (id === currentUserId) {
      return res.status(400).json({ message: 'Non puoi seguire te stesso' });
    }

    // Verifica che l'utente da seguire esista
    const userToFollow = await User.findById(id);
    if (!userToFollow) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    const existingFollow = await Follow.findOne({
      follower: currentUserId,
      following: id
    });

    if (existingFollow) {
      return res.status(400).json({ message: 'Stai già seguendo questo utente' });
    }

    await Follow.create({
      follower: currentUserId,
      following: id
    });

    res.json({ message: 'Utente seguito con successo' });
  } catch (error) {
    console.error('Error in follow:', error);
    res.status(500).json({ message: 'Errore nel seguire l\'utente' });
  }
});

// DELETE /api/users/:id/unfollow - Smetti di seguire un utente
router.delete('/:id/unfollow', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.userId;

    // Verifica che l'ID sia un ObjectId valido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID utente non valido' });
    }

    // Verifica che l'utente da non seguire più esista
    const userToUnfollow = await User.findById(id);
    if (!userToUnfollow) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    const result = await Follow.deleteOne({
      follower: currentUserId,
      following: id
    });

    if (result.deletedCount === 0) {
      return res.status(400).json({ message: 'Non stai seguendo questo utente' });
    }

    res.json({ message: 'Hai smesso di seguire l\'utente con successo' });
  } catch (error) {
    console.error('Error in unfollow:', error);
    res.status(500).json({ message: 'Errore nel smettere di seguire l\'utente' });
  }
});

// GET /api/users/:id/profile - Profilo pubblico utente
router.get('/:id/profile', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.userId;

    // Trova l'utente
    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    // Conta follower
    const followersCount = await Follow.countDocuments({ following: id });
    // Conta following
    const followingCount = await Follow.countDocuments({ follower: id });
    // Conta coins (puoi cambiare la logica se hai un altro modello)
    const coinsCount = await Collection.aggregate([
      { $match: { user: user._id } },
      { $unwind: '$coins' },
      { $count: 'total' }
    ]);
    // Verifica se l'utente autenticato segue questo profilo
    let isFollowing = false;
    if (currentUserId && currentUserId !== id) {
      isFollowing = await Follow.exists({ follower: currentUserId, following: id });
    }

    res.json({
      _id: user._id,
      username: user.username,
      avatar: user.avatar || null,
      bio: user.bio || '',
      followersCount,
      followingCount,
      coinsCount: coinsCount[0]?.total || 0,
      isFollowing: !!isFollowing
    });
  } catch (error) {
    console.error('Errore nel recupero del profilo:', error);
    res.status(500).json({ message: 'Errore nel recupero del profilo utente' });
  }
});

// GET /api/users/:id/followers - Ottieni i follower di un utente
router.get('/:id/followers', authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    console.log('Getting followers for user:', userId);
    
    // Trova tutti i follow dove l'utente è seguito
    const follows = await Follow.find({ following: userId })
      .populate('follower', 'username avatar bio')
      .sort({ createdAt: -1 });

    console.log('Found follows:', follows);

    // Estrai i follower dai risultati
    const followers = follows.map(follow => follow.follower);
    console.log('Extracted followers:', followers);

    res.json(followers);
  } catch (error) {
    console.error('Error getting followers:', error);
    res.status(500).json({ 
      message: 'Error retrieving followers',
      error: error.message 
    });
  }
});

// GET /api/users/:id/following - Ottieni gli utenti seguiti da un utente
router.get('/:id/following', authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    console.log('Getting following for user:', userId);
    
    // Trova tutti i follow dove l'utente è il follower
    const follows = await Follow.find({ follower: userId })
      .populate('following', 'username avatar bio')
      .sort({ createdAt: -1 });

    console.log('Found follows:', follows);

    // Estrai gli utenti seguiti dai risultati
    const following = follows.map(follow => follow.following);
    console.log('Extracted following:', following);

    res.json(following);
  } catch (error) {
    console.error('Error getting following:', error);
    res.status(500).json({ 
      message: 'Error retrieving following',
      error: error.message 
    });
  }
});

// GET /api/users/:id/activity - Ottieni le attività recenti dell'utente
router.get('/:id/activity', authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Trova i follower più recenti
    const recentFollowers = await Follow.find({ following: userId })
      .populate('follower', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(10);

    // Formatta i dati per il frontend
    const activities = recentFollowers.map(follow => ({
      type: 'follow',
      user: follow.follower,
      createdAt: follow.createdAt
    }));

    res.json(activities);
  } catch (error) {
    console.error('Error getting user activity:', error);
    res.status(500).json({ 
      message: 'Error retrieving user activity',
      error: error.message 
    });
  }
});

// GET /api/users/:id/chat - Crea o ottieni una chat con un utente
router.get('/:id/chat', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const otherUserId = req.params.id;

    // Verifica che l'utente esista
    const otherUser = await User.findById(otherUserId).select('username avatar');
    if (!otherUser) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    // Crea una nuova chat tra i due utenti
    const chat = await Chat.findOneAndUpdate(
      {
        participants: { 
          $all: [currentUserId, otherUserId],
          $size: 2
        }
      },
      {
        $setOnInsert: {
          participants: [currentUserId, otherUserId],
          lastMessage: null,
          lastMessageAt: new Date()
        }
      },
      {
        new: true,
        upsert: true
      }
    );

    res.json({
      chatId: chat._id,
      user: otherUser
    });
  } catch (error) {
    console.error('Error creating/getting chat:', error);
    res.status(500).json({ 
      message: 'Errore nella creazione della chat',
      error: error.message 
    });
  }
});

module.exports = router; 