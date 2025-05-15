const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Follow = require('../models/Follow');
const authMiddleware = require('../middlewares/authMiddleware');
const mongoose = require('mongoose');

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
    const currentUserId = req.user._id;

    if (id === currentUserId.toString()) {
      return res.status(400).json({ message: 'Non puoi seguire te stesso' });
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
    res.status(500).json({ message: 'Errore nel seguire l\'utente' });
  }
});

// DELETE /api/users/:id/unfollow - Smetti di seguire un utente
router.delete('/:id/unfollow', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const result = await Follow.deleteOne({
      follower: currentUserId,
      following: id
    });

    if (result.deletedCount === 0) {
      return res.status(400).json({ message: 'Non stai seguendo questo utente' });
    }

    res.json({ message: 'Hai smesso di seguire l\'utente con successo' });
  } catch (error) {
    res.status(500).json({ message: 'Errore nel smettere di seguire l\'utente' });
  }
});

module.exports = router; 