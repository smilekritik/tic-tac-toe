const fs = require('fs/promises');
const path = require('path');
const prisma = require('../../src/lib/prisma');
const { resetBusinessRateLimits } = require('../../src/lib/businessRateLimit');
const gameStateService = require('../../src/modules/game/game.state');
const matchmakingService = require('../../src/modules/matchmaking/matchmaking.service');
const { resetDb, seedGameModes } = require('./db');

function registerWsHooks() {
  beforeEach(async () => {
    vi.useRealTimers();
    resetBusinessRateLimits();
    matchmakingService.resetForTests();
    gameStateService.resetForTests();
    await resetDb(prisma);
    await seedGameModes(prisma);

    const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_PATH);
    await fs.rm(uploadDir, { recursive: true, force: true }).catch(() => {});
    await fs.mkdir(uploadDir, { recursive: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    matchmakingService.resetForTests();
    gameStateService.resetForTests();
  });

  afterAll(async () => {
    await prisma.$disconnect().catch(() => {});
  });
}

module.exports = { registerWsHooks };
