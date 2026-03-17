const router = require('express').Router();
const controller = require('./matches.controller');
const { optionalAuth, requireAuth } = require('../../middlewares/auth.middleware');

router.get('/me/matches', requireAuth, controller.getMyMatches);
router.get('/users/:username/matches', controller.getUserMatches);
router.get('/matches/:matchId', optionalAuth, controller.getMatchDetails);

module.exports = router;
