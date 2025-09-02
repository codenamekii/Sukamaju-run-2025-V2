import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import { formatWhatsAppNumber, validateWhatsAppNumber } from '../lib/utils/whatsapp-formatter';

const prisma = new PrismaClient();



async function migrateWhatsAppNumbers() {
  console.log('🔄 Starting WhatsApp number migration to Wablas format...\n');

  let updated = 0;
  let invalid = 0;
  const invalidNumbers: { name: string; email: string; whatsapp: string | null }[] = [];

  try {
    // Participants
    const participants = await prisma.participant.findMany({
      select: { id: true, fullName: true, whatsapp: true, email: true }
    });

    console.log(`Found ${participants.length} participants to check\n`);

    for (const p of participants) {
      if (!p.whatsapp) {
        invalidNumbers.push({ name: p.fullName, email: p.email, whatsapp: null });
        invalid++;
        continue;
      }

      const currentNumber = p.whatsapp;

      if (currentNumber.startsWith('62') && !currentNumber.startsWith('0')) {
        console.log(`✅ ${p.fullName}: Already formatted (${currentNumber})`);
        continue;
      }

      const formatted = formatWhatsAppNumber(currentNumber);
      const isValid = validateWhatsAppNumber(formatted);

      if (isValid) {
        await prisma.participant.update({
          where: { id: p.id },
          data: { whatsapp: formatted }
        });
        console.log(`✨ ${p.fullName}: ${currentNumber} → ${formatted}`);
        updated++;
      } else {
        console.log(`❌ ${p.fullName}: Invalid number (${currentNumber})`);
        invalidNumbers.push({ name: p.fullName, email: p.email, whatsapp: currentNumber });
        invalid++;
      }
    }

    // CommunityRegistrations
    const communities = await prisma.communityRegistration.findMany({
      select: { id: true, communityName: true, picWhatsapp: true, picEmail: true }
    });

    console.log(`\nFound ${communities.length} community registrations to check\n`);

    for (const c of communities) {
      if (!c.picWhatsapp) {
        invalidNumbers.push({ name: `PIC - ${c.communityName}`, email: c.picEmail, whatsapp: null });
        invalid++;
        continue;
      }

      const currentNumber = c.picWhatsapp;

      if (currentNumber.startsWith('62') && !currentNumber.startsWith('0')) {
        console.log(`✅ ${c.communityName}: Already formatted (${currentNumber})`);
        continue;
      }

      const formatted = formatWhatsAppNumber(currentNumber);
      const isValid = validateWhatsAppNumber(formatted);

      if (isValid) {
        await prisma.communityRegistration.update({
          where: { id: c.id },
          data: { picWhatsapp: formatted }
        });
        console.log(`✨ ${c.communityName}: ${currentNumber} → ${formatted}`);
        updated++;
      } else {
        console.log(`❌ ${c.communityName}: Invalid number (${currentNumber})`);
        invalidNumbers.push({ name: `PIC - ${c.communityName}`, email: c.picEmail, whatsapp: currentNumber });
        invalid++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('Migration Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Successfully updated: ${updated} numbers`);
    console.log(`❌ Invalid numbers found: ${invalid}`);

    if (invalidNumbers.length > 0) {
      console.log('\n⚠️  Invalid numbers that need manual review:');
      console.log('─'.repeat(50));
      invalidNumbers.forEach(item => {
        console.log(`Name: ${item.name}`);
        console.log(`Email: ${item.email}`);
        console.log(`WhatsApp: ${item.whatsapp}`);
        console.log('─'.repeat(50));
      });

      fs.writeFileSync('invalid-whatsapp-numbers.json', JSON.stringify(invalidNumbers, null, 2));
      console.log('\n📄 Invalid numbers saved to: invalid-whatsapp-numbers.json');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateWhatsAppNumbers();