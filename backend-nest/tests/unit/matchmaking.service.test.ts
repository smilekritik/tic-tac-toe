import { MatchmakingService } from '../../src/matchmaking/matchmaking.service';

describe('MatchmakingService', () => {
  it('tracks queue membership', () => {
    const service = new MatchmakingService({} as never);

    service.addToQueue('user-1', 'alice', 'socket-1', {
      id: 'mode-1',
      code: 'classic',
      name: 'Classic',
      isEnabled: true,
      isRanked: true,
    });

    expect(service.isInQueue('user-1')).toBe(true);

    service.removeFromQueue('user-1');

    expect(service.isInQueue('user-1')).toBe(false);
  });
});
