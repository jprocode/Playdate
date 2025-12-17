// Prisma Seed Script
// Run with: npx prisma db seed

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create a test user (optional)
  const testUser = await prisma.user.upsert({
    where: { email: 'test@playdate.dev' },
    update: {},
    create: {
      email: 'test@playdate.dev',
      displayName: 'Test User',
    },
  });

  console.log('Created test user:', testUser);

  console.log('Database seed completed!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

