const specs = require('../../src/docs/openapi');

describe('openapi smoke', () => {
  it('generates a non-empty OpenAPI spec', () => {
    expect(specs.openapi).toBe('3.1.0');
    expect(Object.keys(specs.paths || {})).not.toHaveLength(0);
  });
});
