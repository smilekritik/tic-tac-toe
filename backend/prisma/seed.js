const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.gameMode.upsert({
    where: { code: 'classic' },
    update: {},
    create: {
      code: 'classic',
      name: 'Classic 3x3',
      isRanked: true,
      isEnabled: true,
    },
  });

  await prisma.gameMode.upsert({
    where: { code: 'casual' },
    update: {},
    create: {
      code: 'casual',
      name: 'Casual',
      isRanked: false,
      isEnabled: true,
    },
  });

  console.log('[seed] game modes created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
