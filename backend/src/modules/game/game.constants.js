function readPositiveIntEnv(name, fallback) {
  const value = Number.parseInt(process.env[name], 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const TURN_TIMEOUT_MS = readPositiveIntEnv('GAME_TURN_TIMEOUT_MS', 30000);
const ELO_K_FACTOR = 32;
const CHAT_MESSAGE_LIMIT = 250;
const CHAT_RATE_LIMIT_MS = readPositiveIntEnv('GAME_CHAT_RATE_LIMIT_MS', 1000);
const CHAT_MESSAGE_MAX_BYTES = 1000;

module.exports = {
  TURN_TIMEOUT_MS,
  ELO_K_FACTOR,
  CHAT_MESSAGE_LIMIT,
  CHAT_RATE_LIMIT_MS,
  CHAT_MESSAGE_MAX_BYTES,
};
