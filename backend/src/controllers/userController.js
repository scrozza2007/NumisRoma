const User = require('../models/User');
const Follow = require('../models/Follow');

// Ottieni i follower di un utente
exports.getFollowers = async (req, res) => {
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
};

// Ottieni gli utenti seguiti da un utente
exports.getFollowing = async (req, res) => {
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
};

// Segui un utente
exports.followUser = async (req, res) => {
  try {
    const followerId = req.user._id;
    const followingId = req.params.id;

    // Non permettere di seguire se stessi
    if (followerId.toString() === followingId) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    // Verifica se l'utente da seguire esiste
    const userToFollow = await User.findById(followingId);
    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verifica se il follow esiste già
    const existingFollow = await Follow.findOne({ follower: followerId, following: followingId });
    if (existingFollow) {
      return res.status(400).json({ message: 'You are already following this user' });
    }

    // Crea il nuovo follow
    const follow = new Follow({
      follower: followerId,
      following: followingId
    });

    await follow.save();

    res.status(201).json({ message: 'Successfully followed user' });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ message: 'Error following user' });
  }
};

// Smetti di seguire un utente
exports.unfollowUser = async (req, res) => {
  try {
    const followerId = req.user._id;
    const followingId = req.params.id;

    // Trova e rimuovi il follow
    const follow = await Follow.findOneAndDelete({ follower: followerId, following: followingId });

    if (!follow) {
      return res.status(404).json({ message: 'Follow relationship not found' });
    }

    res.json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ message: 'Error unfollowing user' });
  }
}; 