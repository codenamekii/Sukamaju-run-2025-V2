// scripts/fix-bib-numbers.ts
// Run this script to fix invalid BIB numbers in database
// npx tsx scripts/fix-bib-numbers.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ParticipantBib {
  id: string;
  fullName: string;
  bibNumber: string | null;
  category: string;
  createdAt: Date;
}

/**
 * Check if BIB format is valid
 */
function isValidBibFormat(bibNumber: string, category: string): boolean {
  const num = parseInt(bibNumber);
  if (isNaN(num)) return false;

  if (category === '5K') {
    return num >= 5001 && num <= 5999;
  } else if (category === '10K') {
    return num >= 10001 && num <= 10999;
  }

  return false;
}
async function fixInvalidBibs() {
  try {
    console.log('🔍 Checking for invalid BIB numbers...\n');

    // Get all participants
    const participants = await prisma.participant.findMany({
      where: { bibNumber: { not: null } },
      select: {
        id: true,
        fullName: true,
        bibNumber: true,
        category: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' } // Process oldest first
    }) as ParticipantBib[];

    // Separate by category and identify invalid
    const invalidBibs5K: ParticipantBib[] = [];
    const invalidBibs10K: ParticipantBib[] = [];
    const validBibs5K = new Set<string>();
    const validBibs10K = new Set<string>();

    // First pass: categorize BIBs
    for (const participant of participants) {
      if (!participant.bibNumber) continue;

      if (participant.category === '5K') {
        if (!isValidBibFormat(participant.bibNumber, '5K')) {
          invalidBibs5K.push(participant);
          console.log(`❌ Invalid BIB: ${participant.bibNumber} (5K) - ${participant.fullName}`);
        } else {
          validBibs5K.add(participant.bibNumber);
        }
      } else if (participant.category === '10K') {
        if (!isValidBibFormat(participant.bibNumber, '10K')) {
          invalidBibs10K.push(participant);
          console.log(`❌ Invalid BIB: ${participant.bibNumber} (10K) - ${participant.fullName}`);
        } else {
          validBibs10K.add(participant.bibNumber);
        }
      }
    }

    const totalInvalid = invalidBibs5K.length + invalidBibs10K.length;

    if (totalInvalid === 0) {
      console.log('✅ All BIB numbers are valid!');
      return;
    }

    console.log(`\n📊 Found ${totalInvalid} invalid BIB numbers`);
    console.log(`  - 5K: ${invalidBibs5K.length} invalid`);
    console.log(`  - 10K: ${invalidBibs10K.length} invalid\n`);

    // Generate mapping for new BIBs
    const bibMapping = new Map<string, { oldBib: string; newBib: string; participant: ParticipantBib }>();

    // Process 5K invalid BIBs
    if (invalidBibs5K.length > 0) {
      console.log('🔧 Generating new BIB numbers for 5K...\n');

      // Sort by original BIB number (if numeric) or by creation date
      invalidBibs5K.sort((a, b) => {
        const numA = parseInt(a.bibNumber || '0');
        const numB = parseInt(b.bibNumber || '0');
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      // Find starting point for new BIBs
      let nextBib5K = 5001;

      // Find the highest valid BIB to start after it
      const validNums5K = Array.from(validBibs5K)
        .map(b => parseInt(b))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);

      // Assign new BIBs sequentially
      for (const participant of invalidBibs5K) {
        // Find next available number
        while (validBibs5K.has(nextBib5K.toString()) && nextBib5K <= 5999) {
          nextBib5K++;
        }

        if (nextBib5K > 5999) {
          console.error(`⚠️  No more available BIB numbers for 5K (reached limit)`);
          break;
        }

        const newBib = nextBib5K.toString();
        bibMapping.set(participant.id, {
          oldBib: participant.bibNumber || 'null',
          newBib,
          participant
        });

        validBibs5K.add(newBib);
        console.log(`  ${participant.bibNumber} -> ${newBib} (${participant.fullName})`);
        nextBib5K++;
      }
    }

    // Process 10K invalid BIBs
    if (invalidBibs10K.length > 0) {
      console.log('\n🔧 Generating new BIB numbers for 10K...\n');

      // Sort by original BIB number (if numeric) or by creation date
      invalidBibs10K.sort((a, b) => {
        const numA = parseInt(a.bibNumber || '0');
        const numB = parseInt(b.bibNumber || '0');
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      // Find starting point for new BIBs
      let nextBib10K = 10001;

      // Find the highest valid BIB to start after it
      const validNums10K = Array.from(validBibs10K)
        .map(b => parseInt(b))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);

      // Assign new BIBs sequentially
      for (const participant of invalidBibs10K) {
        // Find next available number
        while (validBibs10K.has(nextBib10K.toString()) && nextBib10K <= 10999) {
          nextBib10K++;
        }

        if (nextBib10K > 10999) {
          console.error(`⚠️  No more available BIB numbers for 10K (reached limit)`);
          break;
        }

        const newBib = nextBib10K.toString();
        bibMapping.set(participant.id, {
          oldBib: participant.bibNumber || 'null',
          newBib,
          participant
        });

        validBibs10K.add(newBib);
        console.log(`  ${participant.bibNumber} -> ${newBib} (${participant.fullName})`);
        nextBib10K++;
      }
    }

    // Confirm before updating
    console.log('\n⚠️  This will update BIB numbers in the database.');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Update database
    console.log('📝 Updating database...\n');

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const [participantId, mapping] of bibMapping) {
      try {
        // Update participant BIB
        await prisma.participant.update({
          where: { id: participantId },
          data: { bibNumber: mapping.newBib }
        });

        // Update RacePack QR code if exists
        const racePack = await prisma.racePack.findUnique({
          where: { participantId }
        });

        if (racePack) {
          await prisma.racePack.update({
            where: { participantId },
            data: {
              qrCode: `RP${mapping.newBib}${participantId.substring(0, 8).toUpperCase()}`
            }
          });
        }

        console.log(`✅ Updated: ${mapping.participant.fullName} (${mapping.oldBib} -> ${mapping.newBib})`);
        successCount++;
      } catch (error) {
        const errorMsg = `Failed to update ${mapping.participant.fullName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
        errorCount++;
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${successCount} participants`);
    console.log(`❌ Failed: ${errorCount} participants`);
    console.log(`📋 Total processed: ${bibMapping.size} participants`);

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(err => console.log(`  - ${err}`));
    }

    // Verify final state
    console.log('\n🔍 Verifying final BIB distribution...');

    const finalCheck = await prisma.participant.groupBy({
      by: ['category'],
      _count: { bibNumber: true },
      where: { bibNumber: { not: null } }
    });

    for (const stat of finalCheck) {
      console.log(`  ${stat.category}: ${stat._count.bibNumber} participants with BIB`);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixInvalidBibs();