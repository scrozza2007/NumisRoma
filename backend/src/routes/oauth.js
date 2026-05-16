const express = require('express');
const passport = require('passport');
const { handleOAuthSuccess, handleOAuthFailure } = require('../controllers/oauthController');

const router = express.Router();

const failureRedirect = '/api/auth/oauth/failure';

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect, session: false }),
  handleOAuthSuccess
);

router.get('/failure', handleOAuthFailure);

module.exports = router;
