const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Follow = require('../models/Follow');
const authMiddleware = require('../middlewares/authMiddleware');
const mongoose = require('mongoose');
const Collection = require('../models/Collection');

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

module.exports = router; 