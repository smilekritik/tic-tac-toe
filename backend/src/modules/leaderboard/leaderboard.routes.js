const router = require('express').Router();
const controller = require('./leaderboard.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');

router.get('/', requireAuth, controller.getLeaderboard);

module.exports = router;
