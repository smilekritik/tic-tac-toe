import { GameStateService } from '../../src/game/game-state.service';

describe('GameStateService', () => {
  let service: GameStateService;

  beforeEach(() => {
    service = new GameStateService();
  });

  afterEach(() => {
    service.resetForTests();
  });

  it('creates a match and indexes it by both users', () => {
    service.createMatch(
      'match-1',
      { userId: 'user-x', username: 'alice' },
      { userId: 'user-o', username: 'bob' },
      { code: 'classic', name: 'Classic' },
    );

    const match = service.getMatch('match-1');
    const activeForX = service.getActiveMatchForUser('user-x');
    const activeForO = service.getActiveMatchForUser('user-o');

    expect(match?.matchId).toBe('match-1');
    expect(activeForX?.matchId).toBe('match-1');
    expect(activeForO?.matchId).toBe('match-1');
  });

  it('tracks connected and disconnected players', () => {
    service.createMatch(
      'match-1',
      { userId: 'user-x', username: 'alice' },
      { userId: 'user-o', username: 'bob' },
      { code: 'classic', name: 'Classic' },
    );

    service.setPlayerConnected('match-1', 'user-x');
    service.setPlayerDisconnected('match-1', 'user-x');

    const match = service.getMatch('match-1');

    expect(match?.connectedPlayers.has('user-x')).toBe(false);
    expect(match?.disconnectedPlayers.has('user-x')).toBe(true);
  });

  it('clears timers and user indexes when a match is deleted', () => {
    service.createMatch(
      'match-1',
      { userId: 'user-x', username: 'alice' },
      { userId: 'user-o', username: 'bob' },
      { code: 'classic', name: 'Classic' },
    );

    const turnTimer = setTimeout(() => undefined, 1000);
    const reconnectTimer = setTimeout(() => undefined, 1000);

    service.setTurnTimer('match-1', turnTimer, Date.now() + 1000);
    service.setReconnectTimer('match-1', 'user-x', reconnectTimer, Date.now() + 1000);
    service.deleteMatch('match-1');

    expect(service.getMatch('match-1')).toBeNull();
    expect(service.getActiveMatchForUser('user-x')).toBeNull();
    expect(service.getActiveMatchForUser('user-o')).toBeNull();
  });
});
