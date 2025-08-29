import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  // Delete test data
  await prisma.participant.deleteMany({
    where: { email: { contains: '@example.com' } }
  });

  await prisma.communityRegistration.deleteMany({
    where: { communityName: { contains: 'Test' } }
  });

  console.log('✅ Test data cleaned up');
}

cleanup().catch(console.error).finally(() => prisma.$disconnect());