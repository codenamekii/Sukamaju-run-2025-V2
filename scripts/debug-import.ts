import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

async function debugData() {
  // Check all statuses
  const allStatuses = await prisma.participant.groupBy({
    by: ['registrationStatus'],
    _count: true
  });
  console.log('All Statuses:', allStatuses);

  // Check IMPORTED specifically
  const imported = await prisma.participant.findMany({
    where: { registrationStatus: 'IMPORTED' },
    select: {
      id: true,
      fullName: true,
      registrationStatus: true,
      isEarlyBird: true,
      metadata: true
    },
    take: 5
  });
  console.log('\nIMPORTED Participants:', imported);

  // Check metadata for promo info
  const withMetadata = await prisma.participant.findFirst({
    where: {
      registrationStatus: 'IMPORTED',
      metadata: {
        path: ['originalPromo'],
        not: Prisma.JsonNull,   // ✅ perbaikan di sini
      }
    }
  });
  console.log('\nSample Metadata:', withMetadata?.metadata);
}

debugData();