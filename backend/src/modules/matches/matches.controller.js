const matchesService = require('./matches.service');

async function getMyMatches(req, res, next) {
  try {
    const userId = req.user.sub || req.user.id;
    const history = await matchesService.getMatchHistoryByUserId(userId, req.query);
    res.json(history);
  } catch (err) {
    next(err);
  }
}

async function getUserMatches(req, res, next) {
  try {
    const history = await matchesService.getPublicMatchHistory(req.params.username, req.query);
    res.json(history);
  } catch (err) {
    next(err);
  }
}

async function getMatchDetails(req, res, next) {
  try {
    const viewerUserId = req.user?.sub || req.user?.id || null;
    const match = await matchesService.getMatchDetails(req.params.matchId, viewerUserId);
    res.json(match);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyMatches,
  getUserMatches,
  getMatchDetails,
};
