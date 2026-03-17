const leaderboardService = require('./leaderboard.service');

async function getLeaderboard(req, res, next) {
  try {
    const viewerUserId = req.user.sub || req.user.id;
    const data = await leaderboardService.getLeaderboard({
      viewerUserId,
      gameModeCode: req.query.mode,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { getLeaderboard };
