const matches = new Map();
const userActiveMatch = new Map(); // userId -> matchId

function createMatch(matchId, playerX, playerO) {
  matches.set(matchId, {
    matchId,
    playerX,
    playerO,
    gameState: null,
    timer: null,
    connectedPlayers: new Set(),
    disconnectedPlayers: new Set(),
  });
  userActiveMatch.set(playerX.userId, matchId);
  userActiveMatch.set(playerO.userId, matchId);
}

function getMatch(matchId) {
  return matches.get(matchId) || null;
}

function updateMatch(matchId, updates) {
  const match = matches.get(matchId);
  if (!match) return;
  matches.set(matchId, { ...match, ...updates });
}

function deleteMatch(matchId) {
  const match = matches.get(matchId);
  if (match) {
    userActiveMatch.delete(match.playerX.userId);
    userActiveMatch.delete(match.playerO.userId);
  }
  matches.delete(matchId);
}

function getMatchByUserId(userId) {
  for (const match of matches.values()) {
    if (match.playerX.userId === userId || match.playerO.userId === userId) {
      return match;
    }
  }
  return null;
}

function getActiveMatchForUser(userId) {
  const matchId = userActiveMatch.get(userId);
  if (!matchId) return null;
  return { matchId, match: matches.get(matchId) };
}

module.exports = { createMatch, getMatch, updateMatch, deleteMatch, getMatchByUserId, getActiveMatchForUser };
