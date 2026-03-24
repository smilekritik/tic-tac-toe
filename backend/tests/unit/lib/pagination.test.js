const { clampPagination } = require('../../../src/modules/matches/matches.service');

describe('pagination helper', () => {
  it('uses defaults for invalid inputs', () => {
    expect(clampPagination(undefined, undefined)).toEqual({ page: 1, limit: 10 });
    expect(clampPagination('0', '-1')).toEqual({ page: 1, limit: 10 });
  });

  it('caps limit at 20', () => {
    expect(clampPagination('2', '999')).toEqual({ page: 2, limit: 20 });
  });
});
