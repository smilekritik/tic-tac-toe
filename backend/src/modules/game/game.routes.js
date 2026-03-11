const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middlewares/auth.middleware');
const gameStateService = require('./game.state');

// Check if user has an active match
router.get('/active', requireAuth, (req, res) => {
  const userId = req.user.sub || req.user.id;
  const active = gameStateService.getActiveMatchForUser(userId);
  if (!active || !active.match) return res.json({ matchId: null });
  res.json({ matchId: active.matchId });
});

module.exports = router;
