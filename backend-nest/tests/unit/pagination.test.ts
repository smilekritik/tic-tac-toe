import { MatchesService } from '../../src/matches/matches.service';

describe('pagination helper', () => {
  const service = new MatchesService({} as never);

  it('uses defaults for invalid inputs', () => {
    expect(service.clampPagination({})).toEqual({ page: 1, limit: 10 });
    expect(service.clampPagination({ page: '0', limit: '-1' })).toEqual({ page: 1, limit: 10 });
  });

  it('caps limit at 20', () => {
    expect(service.clampPagination({ page: '2', limit: '999' })).toEqual({ page: 2, limit: 20 });
  });
});
