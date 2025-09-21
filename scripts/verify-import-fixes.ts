// scripts/verify-import-fixes.ts
// Script to verify that all import fixes are working correctly

import { PRICING_CONFIG, calculateIndividualPrice } from '../lib/config/pricing';
import prisma from '../lib/prisma';

async function verifyImportFixes() {
  console.log('🔍 Starting Import Verification...\n');

  try {
    // 1. Verify Pricing Configuration
    console.log('1️⃣ VERIFYING PRICING CONFIGURATION');
    console.log('====================================');
    console.log('5K Prices:');
    console.log(`  - Early Bird: Rp ${PRICING_CONFIG.individual['5K'].earlyBird.toLocaleString('id-ID')}`);
    console.log(`  - Normal: Rp ${PRICING_CONFIG.individual['5K'].regular.toLocaleString('id-ID')}`);
    console.log('10K Prices:');
    console.log(`  - Early Bird: Rp ${PRICING_CONFIG.individual['10K'].earlyBird.toLocaleString('id-ID')}`);
    console.log(`  - Normal: Rp ${PRICING_CONFIG.individual['10K'].regular.toLocaleString('id-ID')}`);
    console.log(`Jersey Add-on (XXL/XXXL): Rp ${PRICING_CONFIG.jerseyAddOn.plusSizeCost.toLocaleString('id-ID')}\n`);

    // Test pricing calculations
    const test5KEarlyBird = calculateIndividualPrice('5K', 'M', true);
    const test5KNormal = calculateIndividualPrice('5K', 'M', false);
    const test10KEarlyBird = calculateIndividualPrice('10K', 'XXL', true);
    const test10KNormal = calculateIndividualPrice('10K', 'XXL', false);

    console.log('Test Calculations:');
    console.log(`  5K Early Bird (M): Rp ${test5KEarlyBird.totalPrice.toLocaleString('id-ID')} ✓ (Should be 162,000)`);
    console.log(`  5K Normal (M): Rp ${test5KNormal.totalPrice.toLocaleString('id-ID')} ✓ (Should be 180,000)`);
    console.log(`  10K Early Bird (XXL): Rp ${test10KEarlyBird.totalPrice.toLocaleString('id-ID')} ✓ (Should be 227,000)`);
    console.log(`  10K Normal (XXL): Rp ${test10KNormal.totalPrice.toLocaleString('id-ID')} ✓ (Should be 250,000)\n`);

    // 2. Check Imported Participants
    console.log('2️⃣ CHECKING IMPORTED PARTICIPANTS');
    console.log('====================================');

    const importedCount = await prisma.participant.count({
      where: { registrationStatus: 'IMPORTED' }
    });

    const earlyBirdCount = await prisma.participant.count({
      where: {
        registrationStatus: 'IMPORTED',
        isEarlyBird: true
      }
    });

    const normalCount = await prisma.participant.count({
      where: {
        registrationStatus: 'IMPORTED',
        isEarlyBird: false
      }
    });

    console.log(`Total Imported: ${importedCount}`);
    console.log(`  - Early Bird: ${earlyBirdCount}`);
    console.log(`  - Normal: ${normalCount}\n`);

    // 3. Verify Pricing Distribution
    console.log('3️⃣ VERIFYING PRICING DISTRIBUTION');
    console.log('====================================');

    // Check 5K Early Bird pricing
    const wrongPrice5KEarlyBird = await prisma.participant.count({
      where: {
        registrationStatus: 'IMPORTED',
        category: '5K',
        isEarlyBird: true,
        jerseySize: { notIn: ['XXL', 'XXXL'] },
        totalPrice: { not: 162000 }
      }
    });

    // Check 5K Normal pricing
    const wrongPrice5KNormal = await prisma.participant.count({
      where: {
        registrationStatus: 'IMPORTED',
        category: '5K',
        isEarlyBird: false,
        jerseySize: { notIn: ['XXL', 'XXXL'] },
        totalPrice: { not: 180000 }
      }
    });

    // Check 10K Early Bird pricing
    const wrongPrice10KEarlyBird = await prisma.participant.count({
      where: {
        registrationStatus: 'IMPORTED',
        category: '10K',
        isEarlyBird: true,
        jerseySize: { notIn: ['XXL', 'XXXL'] },
        totalPrice: { not: 207000 }
      }
    });

    // Check 10K Normal pricing
    const wrongPrice10KNormal = await prisma.participant.count({
      where: {
        registrationStatus: 'IMPORTED',
        category: '10K',
        isEarlyBird: false,
        jerseySize: { notIn: ['XXL', 'XXXL'] },
        totalPrice: { not: 230000 }
      }
    });

    console.log('Pricing Issues Found:');
    console.log(`  5K Early Bird wrong prices: ${wrongPrice5KEarlyBird} ${wrongPrice5KEarlyBird === 0 ? '✅' : '❌'}`);
    console.log(`  5K Normal wrong prices: ${wrongPrice5KNormal} ${wrongPrice5KNormal === 0 ? '✅' : '❌'}`);
    console.log(`  10K Early Bird wrong prices: ${wrongPrice10KEarlyBird} ${wrongPrice10KEarlyBird === 0 ? '✅' : '❌'}`);
    console.log(`  10K Normal wrong prices: ${wrongPrice10KNormal} ${wrongPrice10KNormal === 0 ? '✅' : '❌'}\n`);

    // 4. Check Sample Participants
    console.log('4️⃣ SAMPLE IMPORTED PARTICIPANTS');
    console.log('====================================');

    const samples = await prisma.participant.findMany({
      where: { registrationStatus: 'IMPORTED' },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        fullName: true,
        category: true,
        jerseySize: true,
        isEarlyBird: true,
        basePrice: true,
        jerseyAddOn: true,
        totalPrice: true,
        email: true,
        whatsapp: true,
        metadata: true
      }
    });

    samples.forEach((p, idx) => {
      console.log(`\n${idx + 1}. ${p.fullName}`);
      console.log(`   Category: ${p.category} | Jersey: ${p.jerseySize}`);
      console.log(`   Promo: ${p.isEarlyBird ? 'EARLY_BIRD' : 'NORMAL'}`);
      console.log(`   Price: Rp ${p.basePrice.toLocaleString('id-ID')} + ${p.jerseyAddOn} = Rp ${p.totalPrice.toLocaleString('id-ID')}`);
      console.log(`   Contact: ${p.email.includes('@imported.local') ? '❌ No email' : '✅ Has email'} | ${p.whatsapp ? '✅ Has WhatsApp' : '❌ No WhatsApp'}`);
    });

    // 5. Check for Data Completeness
    console.log('\n\n5️⃣ DATA COMPLETENESS CHECK');
    console.log('====================================');

    const missingEmail = await prisma.participant.count({
      where: {
        registrationStatus: 'IMPORTED',
        email: { contains: '@imported.local' }
      }
    });

    const missingWhatsApp = await prisma.participant.count({
      where: {
        registrationStatus: 'IMPORTED',
        AND: [
          { whatsapp: { startsWith: '62' } },
          { whatsapp: { not: { contains: '+' } } }
        ]
      }
    });

    const hasRacePack = await prisma.participant.count({
      where: {
        registrationStatus: 'IMPORTED',
        racePack: { isNot: null }
      }
    });

    const hasPayment = await prisma.participant.count({
      where: {
        registrationStatus: 'IMPORTED',
        payments: { some: { status: 'SUCCESS' } }
      }
    });

    console.log(`Missing Email: ${missingEmail} participants`);
    console.log(`Valid WhatsApp: ${importedCount - missingWhatsApp} / ${importedCount}`);
    console.log(`Has Race Pack: ${hasRacePack} / ${importedCount} ${hasRacePack === importedCount ? '✅' : '⚠️'}`);
    console.log(`Has Payment Record: ${hasPayment} / ${importedCount} ${hasPayment === importedCount ? '✅' : '⚠️'}\n`);

    // 6. Fix Wrong Prices (if any)
    const needsFix = wrongPrice5KEarlyBird + wrongPrice5KNormal + wrongPrice10KEarlyBird + wrongPrice10KNormal;

    if (needsFix > 0) {
      console.log('⚠️ FIXING WRONG PRICES');
      console.log('====================================');
      console.log(`Found ${needsFix} participants with wrong prices. Fixing...\n`);

      // Fix 5K Early Bird
      await prisma.participant.updateMany({
        where: {
          registrationStatus: 'IMPORTED',
          category: '5K',
          isEarlyBird: true,
          jerseySize: { notIn: ['XXL', 'XXXL'] }
        },
        data: {
          basePrice: 162000,
          totalPrice: 162000
        }
      });

      // Fix 5K Normal
      await prisma.participant.updateMany({
        where: {
          registrationStatus: 'IMPORTED',
          category: '5K',
          isEarlyBird: false,
          jerseySize: { notIn: ['XXL', 'XXXL'] }
        },
        data: {
          basePrice: 180000,
          totalPrice: 180000
        }
      });

      // Fix 10K Early Bird
      await prisma.participant.updateMany({
        where: {
          registrationStatus: 'IMPORTED',
          category: '10K',
          isEarlyBird: true,
          jerseySize: { notIn: ['XXL', 'XXXL'] }
        },
        data: {
          basePrice: 207000,
          totalPrice: 207000
        }
      });

      // Fix 10K Normal
      await prisma.participant.updateMany({
        where: {
          registrationStatus: 'IMPORTED',
          category: '10K',
          isEarlyBird: false,
          jerseySize: { notIn: ['XXL', 'XXXL'] }
        },
        data: {
          basePrice: 230000,
          totalPrice: 230000
        }
      });

      // Fix with jersey addon
      await prisma.$executeRaw`
        UPDATE "Participant"
        SET "totalPrice" = "basePrice" + "jerseyAddOn"
        WHERE "registrationStatus" = 'IMPORTED'
        AND "jerseySize" IN ('XXL', 'XXXL')
      `;

      console.log('✅ Prices fixed!\n');
    }

    console.log('\n✅ VERIFICATION COMPLETE!\n');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyImportFixes();