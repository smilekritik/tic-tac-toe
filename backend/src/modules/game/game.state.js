const matches = new Map();

function createMatch(matchId, playerX, playerO) {
  matches.set(matchId, {
    matchId,
    playerX,
    playerO,
    gameState: null,
    timer: null,
    connectedPlayers: new Set(),
  });
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

module.exports = { createMatch, getMatch, updateMatch, deleteMatch, getMatchByUserId };
