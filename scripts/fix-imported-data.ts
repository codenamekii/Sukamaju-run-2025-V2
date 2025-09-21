import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

interface PricingMetadata {
  isEarlyBird?: boolean;
  basePrice?: number;
  jerseyAddOn?: number;
  totalPrice?: number;
}

interface ParticipantMetadata {
  originalPromo?: string;
  pricing?: PricingMetadata;
  [key: string]: unknown; // untuk fleksibilitas tambahan
}

async function fixImportedData() {
  console.log('🔧 Starting Data Fix...\n');

  try {
    // 1. Get all IMPORTED participants with wrong pricing
    const wrongData = await prisma.participant.findMany({
      where: {
        registrationStatus: 'IMPORTED',
        isEarlyBird: false
      },
      select: {
        id: true,
        fullName: true,
        category: true,
        jerseySize: true,
        metadata: true
      }
    });

    console.log(`Found ${wrongData.length} participants to check\n`);

    let fixed5KEarlyBird = 0;
    let fixed10KEarlyBird = 0;
    let skipped = 0;

    // 2. Fix each participant based on metadata
    for (const participant of wrongData) {
      const metadata = (participant.metadata as ParticipantMetadata) ?? {};
      const originalPromo = metadata.originalPromo ?? '';

      const shouldBeEarlyBird =
        originalPromo.toLowerCase().includes('early') ||
        originalPromo.toLowerCase().includes('bird') ||
        originalPromo.toLowerCase().includes('early_bird');

      if (shouldBeEarlyBird) {
        let basePrice = 0;

        if (participant.category === '5K') {
          basePrice = 162000;
          fixed5KEarlyBird++;
        } else if (participant.category === '10K') {
          basePrice = 207000;
          fixed10KEarlyBird++;
        }

        const jerseyAddOn = ['XXL', 'XXXL'].includes(participant.jerseySize) ? 20000 : 0;
        const totalPrice = basePrice + jerseyAddOn;

        // Update participant
        await prisma.participant.update({
          where: { id: participant.id },
          data: {
            isEarlyBird: true,
            basePrice,
            jerseyAddOn,
            totalPrice,
            metadata: {
              ...metadata,
              pricing: {
                ...(metadata.pricing ?? {}),
                isEarlyBird: true,
                basePrice,
                jerseyAddOn,
                totalPrice
              }
            } as Prisma.InputJsonValue // ✅ tambahkan ini
          }
        });

        // Update payment
        await prisma.payment.updateMany({
          where: {
            participantId: participant.id,
            paymentMethod: 'IMPORTED'
          },
          data: {
            amount: totalPrice,
            metadata: {
              ...metadata,
              isEarlyBird: true,
              basePrice,
              jerseyAddOn,
              totalPrice
            } as unknown as Prisma.InputJsonValue // ✅ tambahkan ini
          }
        });

        console.log(
          `✅ Fixed: ${participant.fullName} - ${participant.category} - Rp ${totalPrice.toLocaleString('id-ID')}`
        );
      } else {
        skipped++;
      }
    }

    console.log('\n📊 Fix Summary:');
    console.log(`  5K Early Bird Fixed: ${fixed5KEarlyBird}`);
    console.log(`  10K Early Bird Fixed: ${fixed10KEarlyBird}`);
    console.log(`  Normal Price (Skipped): ${skipped}`);

    // 3. Verify results
    const verifyStats = await prisma.participant.groupBy({
      by: ['category', 'isEarlyBird'],
      where: { registrationStatus: 'IMPORTED' },
      _count: true
    });

    console.log('\n✅ Final Statistics:');
    verifyStats.forEach(stat => {
      const type = stat.isEarlyBird ? 'EARLY_BIRD' : 'NORMAL';
      console.log(`  ${stat.category} ${type}: ${stat._count} participants`);
    });

    // 4. Show price distribution
    const priceStats = await prisma.participant.groupBy({
      by: ['category', 'totalPrice'],
      where: { registrationStatus: 'IMPORTED' },
      _count: true,
      orderBy: [
        { category: 'asc' },
        { totalPrice: 'asc' }
      ]
    });

    console.log('\n💰 Price Distribution:');
    priceStats.forEach(stat => {
      console.log(`  ${stat.category} - Rp ${stat.totalPrice.toLocaleString('id-ID')}: ${stat._count} participants`);
    });

  } catch (error) {
    console.error('❌ Error fixing data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixImportedData();