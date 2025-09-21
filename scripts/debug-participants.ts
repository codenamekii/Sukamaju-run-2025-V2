import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

async function debugParticipants() {
  console.log('🔍 DEBUGGING PARTICIPANTS DATA\n');

  try {
    // 1. Check all registration statuses
    const statusCount = await prisma.participant.groupBy({
      by: ['registrationStatus'],
      _count: true
    });

    console.log('📊 Participants by Status:');
    statusCount.forEach(s => {
      console.log(`   ${s.registrationStatus}: ${s._count} participants`);
    });

    // 2. Check specific IMPORTED participants
    const imported = await prisma.participant.findMany({
      where: { registrationStatus: 'IMPORTED' },
      select: {
        id: true,
        fullName: true,
        registrationStatus: true,
        category: true,
        totalPrice: true,
        isEarlyBird: true
      },
      take: 5
    });

    console.log('\n📝 Sample IMPORTED Participants:');
    if (imported.length > 0) {
      console.table(imported);
    } else {
      console.log('   ❌ No participants with IMPORTED status found!');
    }

    // 3. Check if maybe status was changed
    const confirmed = await prisma.participant.count({
      where: { registrationStatus: 'CONFIRMED' }
    });

    const pending = await prisma.participant.count({
      where: { registrationStatus: 'PENDING' }
    });

    console.log('\n📈 Other Statuses:');
    console.log(`   CONFIRMED: ${confirmed}`);
    console.log(`   PENDING: ${pending}`);

    // 4. Check metadata to see if they were imported
    const withImportMetadata = await prisma.participant.count({
      where: {
        metadata: {
          path: ['importedFrom'],
          not: Prisma.JsonNull
        }
      }
    });

    console.log(`\n📦 Participants with import metadata: ${withImportMetadata}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugParticipants();