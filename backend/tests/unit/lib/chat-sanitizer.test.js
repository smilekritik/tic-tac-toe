const { sanitizeChatText } = require('../../../src/modules/game/chat.sanitizer');

describe('chat sanitizer', () => {
  it('trims whitespace and strips invisible characters', () => {
    expect(sanitizeChatText('  hello\u200B   world  ')).toBe('hello world');
  });

  it('censors blocked words', () => {
    expect(sanitizeChatText('hello kurwa world')).toContain('*****');
  });

  it('returns empty string for empty normalized input', () => {
    expect(sanitizeChatText('\u200B   \n\t')).toBe('');
  });

  it('enforces the character limit', () => {
    expect(sanitizeChatText('a'.repeat(500)).length).toBe(250);
  });
});
