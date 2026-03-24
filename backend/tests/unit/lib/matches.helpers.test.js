const {
  mapMatchHistoryItem,
  buildStateFromMoves,
} = require('../../../src/modules/matches/matches.service');

describe('matches helpers', () => {
  it('maps a history item for the current player', () => {
    const item = mapMatchHistoryItem(
      {
        id: 'match-1',
        matchType: 'ranked',
        winnerId: 'user-1',
        resultType: 'win',
        startedAt: new Date('2026-01-01T00:00:00Z'),
        finishedAt: new Date('2026-01-01T00:05:00Z'),
        durationSeconds: 300,
        ratingDeltaX: 12,
        ratingDeltaO: -12,
        gameMode: { code: 'classic', name: 'Classic 3x3' },
        playerX: { id: 'user-1', username: 'alice', profile: { avatarPath: '/x.png' } },
        playerO: { id: 'user-2', username: 'bob', profile: { avatarPath: '/y.png' } },
        _count: { moves: 5 },
      },
      'user-1',
    );

    expect(item).toMatchObject({
      matchId: 'match-1',
      result: 'win',
      ratingDelta: 12,
      opponent: { username: 'bob', avatarPath: '/y.png' },
      moveCount: 5,
    });
  });

  it('reconstructs classic board state from moves', () => {
    const state = buildStateFromMoves('classic', [
      { positionX: 0, positionY: 0, symbol: 'X' },
      { positionX: 1, positionY: 1, symbol: 'O' },
      { positionX: 0, positionY: 1, symbol: 'X' },
      { positionX: 2, positionY: 2, symbol: 'O' },
      { positionX: 0, positionY: 2, symbol: 'X' },
    ]);

    expect(state.board).toEqual(['X', 'X', 'X', null, 'O', null, null, null, 'O']);
    expect(state.winResult).toEqual({ winner: 'X', line: [0, 1, 2] });
  });

  it('reconstructs moving-window board state from current window', () => {
    const state = buildStateFromMoves('moving-window', [
      { positionX: 0, positionY: 0, symbol: 'X' },
      { positionX: 1, positionY: 0, symbol: 'O' },
      { positionX: 0, positionY: 1, symbol: 'X' },
      { positionX: 1, positionY: 1, symbol: 'O' },
      { positionX: 0, positionY: 2, symbol: 'X' },
      { positionX: 1, positionY: 2, symbol: 'O' },
      { positionX: 2, positionY: 0, symbol: 'X' },
    ]);

    expect(state.board).toEqual([null, 'X', 'X', 'O', 'O', 'O', 'X', null, null]);
    expect(state.winResult).toEqual({ winner: 'O', line: [3, 4, 5] });
  });
});
