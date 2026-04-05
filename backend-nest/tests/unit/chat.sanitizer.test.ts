import { sanitizeChatText } from '../../src/game/chat.sanitizer';

describe('sanitizeChatText', () => {
  it('filters blocked words and trims whitespace', () => {
    expect(sanitizeChatText('   hello   kurwa   ')).toBe('hello *****');
  });

  it('returns empty string for invisible or blank content', () => {
    expect(sanitizeChatText('\u200B   \u200E')).toBe('');
  });
});
