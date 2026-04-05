import { CHAT_MESSAGE_LIMIT, CHAT_MESSAGE_MAX_BYTES } from './game.constants';

const BLOCKED_WORDS = ['fuck', 'shit', 'bitch', 'asshole', 'сука', 'блять', 'хуй', 'kurwa'];
const INVISIBLE_CHAT_CHARACTERS_REGEX = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;
const MULTISPACE_REGEX = /\s+/g;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function filterChatText(text: string): string {
  let filtered = text;

  for (const word of BLOCKED_WORDS) {
    const pattern = new RegExp(escapeRegExp(word), 'gi');
    filtered = filtered.replace(pattern, (match) => '*'.repeat(match.length));
  }

  return filtered;
}

function trimToUtf8ByteLimit(text: string, maxBytes: number): string {
  let value = text;
  while (value && Buffer.byteLength(value, 'utf8') > maxBytes) {
    value = value.slice(0, -1);
  }

  return value;
}

export function sanitizeChatText(text: unknown): string {
  const normalized = String(text || '')
    .normalize('NFKC')
    .replace(INVISIBLE_CHAT_CHARACTERS_REGEX, '')
    .replace(MULTISPACE_REGEX, ' ')
    .trim();

  if (!normalized) {
    return '';
  }

  const limitedByChars = normalized.slice(0, CHAT_MESSAGE_LIMIT);
  const limitedByBytes = trimToUtf8ByteLimit(limitedByChars, CHAT_MESSAGE_MAX_BYTES);

  return filterChatText(limitedByBytes);
}
