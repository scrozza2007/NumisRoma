const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');

// ... existing routes ...

// Routes per follower e following
router.get('/:id/followers', auth, userController.getFollowers);
router.get('/:id/following', auth, userController.getFollowing);
router.post('/:id/follow', auth, userController.followUser);
router.delete('/:id/unfollow', auth, userController.unfollowUser);

module.exports = router; 