const fs = require('fs/promises');
const path = require('path');
const prisma = require('../../src/lib/prisma');
const { resetBusinessRateLimits } = require('../../src/lib/businessRateLimit');
const { resetDb, seedGameModes } = require('./db');

function registerIntegrationHooks() {
  beforeEach(async () => {
    vi.useRealTimers();
    resetBusinessRateLimits();
    await resetDb(prisma);
    await seedGameModes(prisma);

    const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_PATH);
    await fs.rm(uploadDir, { recursive: true, force: true }).catch(() => {});
    await fs.mkdir(uploadDir, { recursive: true });
  });

  afterAll(async () => {
    await prisma.$disconnect().catch(() => {});
  });
}

module.exports = { registerIntegrationHooks };
