function readPositiveIntEnv(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const TURN_TIMEOUT_MS = readPositiveIntEnv('GAME_TURN_TIMEOUT_MS', 30000);
export const ELO_K_FACTOR = 32;
export const CHAT_MESSAGE_LIMIT = 250;
export const CHAT_RATE_LIMIT_MS = readPositiveIntEnv('GAME_CHAT_RATE_LIMIT_MS', 1000);
export const CHAT_MESSAGE_MAX_BYTES = 1000;
