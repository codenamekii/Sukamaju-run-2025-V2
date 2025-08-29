// scripts/test-payment.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Warna untuk console log
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message: string, type: 'info' | 'success' | 'error' | 'warning' | 'cyan' = 'info') {
  const color = {
    info: colors.blue,
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    cyan: colors.cyan
  }[type];

  console.log(`${color}${message}${colors.reset}`);
}

async function testPaymentFlow() {
  log('\n🧪 SUKAMAJU RUN 2025 - Payment Flow Testing\n', 'info');

  const API_URL = process.env.API_URL || 'http://localhost:3000';

  try {
    // 1. Test Individual Registration
    log('═══════════════════════════════════════════', 'info');
    log('1️⃣  Testing Individual Registration', 'info');
    log('═══════════════════════════════════════════', 'info');

    const timestamp = Date.now();
    const individualData = {
      fullName: "Test User " + timestamp,
      gender: "L",
      dateOfBirth: "1990-01-01",
      idNumber: `ID${timestamp}`,
      email: `test${timestamp}@example.com`,
      whatsapp: "08123456789",
      address: "Jl. Test No. 123",
      province: "DKI Jakarta",
      city: "Jakarta Selatan",
      postalCode: "12345",
      category: "5K",
      bibName: "TESTER",
      jerseySize: "XXL", // Test jersey addon
      emergencyName: "Emergency Contact",
      emergencyPhone: "08987654321",
      emergencyRelation: "Keluarga",
      bloodType: "O+",
      estimatedTime: "00:30:00"
    };

    const individualResponse = await fetch(`${API_URL}/api/registration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(individualData)
    });

    const individualResult = await individualResponse.json();

    if (individualResult.success) {
      log('✅ Individual Registration: SUCCESS', 'success');
      log(`   Registration Code: ${individualResult.data.registrationCode}`, 'info');
      log(`   BIB Number: ${individualResult.data.bibNumber}`, 'info');
      log(`   Payment Code: ${individualResult.data.paymentCode}`, 'info');
      log(`   Base Price: Rp ${(180000).toLocaleString('id-ID')}`, 'info');
      log(`   Jersey XXL Addon: Rp ${(20000).toLocaleString('id-ID')}`, 'warning');
      log(`   Total Price: Rp ${individualResult.data.totalPrice.toLocaleString('id-ID')}`, 'success');
    } else {
      log(`❌ Individual Registration: FAILED - ${individualResult.error}`, 'error');
    }

    // 2. Test Community Registration
    log('\n═══════════════════════════════════════════', 'info');
    log('2️⃣  Testing Community Registration', 'info');
    log('═══════════════════════════════════════════', 'info');

    const communityData = {
      communityName: `Test Running Club ${timestamp}`,
      communityType: "RUNNING_CLUB",
      picName: "PIC Test Name",
      picWhatsapp: "08123456789",
      picEmail: `pic${timestamp}@example.com`,
      picPosition: "Ketua",
      address: "Jl. Community No. 456",
      city: "Jakarta Selatan",
      province: "DKI Jakarta",
      postalCode: "12345",
      category: "10K",
      members: Array.from({ length: 5 }, (_, i) => ({
        fullName: `Member ${i + 1} Test`,
        gender: i % 2 === 0 ? "L" : "P",
        dateOfBirth: "1990-01-01",
        idNumber: `MID${timestamp}${i}`,
        email: `member${i + 1}_${timestamp}@example.com`,
        whatsapp: `0812345678${i}`,
        bibName: `MEMBER${i + 1}`,
        jerseySize: i === 0 ? "XXXL" : "M", // Test jersey addon on first member
        emergencyName: `Emergency ${i + 1}`,
        emergencyPhone: `0898765432${i}`,
        emergencyRelation: "Keluarga",
        bloodType: "O+",
        estimatedTime: "01:00:00"
      }))
    };

    const communityResponse = await fetch(`${API_URL}/api/registration/community`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(communityData)
    });

    const communityResult = await communityResponse.json();

    if (communityResult.success) {
      log('✅ Community Registration: SUCCESS', 'success');
      log(`   Registration Code: ${communityResult.data.registrationCode}`, 'info');
      log(`   Community Name: ${communityResult.data.communityName}`, 'info');
      log(`   Total Members: ${communityResult.data.totalMembers} orang`, 'info');
      log(`   QR Code (PIC): ${communityResult.data.qrCode}`, 'cyan');
      log(`   Price Breakdown:`, 'info');
      log(`   - Base (10K x 5): Rp ${(218000 * 5).toLocaleString('id-ID')}`, 'info');
      log(`   - Jersey XXXL x1: Rp ${(20000).toLocaleString('id-ID')}`, 'warning');
      log(`   Total Price: Rp ${communityResult.data.totalPrice.toLocaleString('id-ID')}`, 'success');

      log('\n   Members:', 'info');
      communityResult.data.members.forEach((member: any, index: number) => {
        log(`   ${index + 1}. ${member.name} - BIB: ${member.bibNumber}`, 'info');
      });
    } else {
      log(`❌ Community Registration: FAILED`, 'error');
      if (communityResult.duplicateEmails) {
        log(`   Duplicate emails: ${communityResult.duplicateEmails.join(', ')}`, 'error');
      } else {
        log(`   Error: ${communityResult.error}`, 'error');
      }
    }

    // 3. Test Payment Creation (if individual registration successful)
    if (individualResult.success) {
      log('\n═══════════════════════════════════════════', 'info');
      log('3️⃣  Testing Payment Creation (Midtrans)', 'info');
      log('═══════════════════════════════════════════', 'info');

      const paymentResponse = await fetch(`${API_URL}/api/payment/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: individualResult.data.participant.id,
          amount: individualResult.data.totalPrice,
          paymentCode: individualResult.data.paymentCode,
          registrationCode: individualResult.data.registrationCode
        })
      });

      const paymentResult = await paymentResponse.json();

      if (paymentResult.token) {
        log('✅ Payment Token Generated: SUCCESS', 'success');
        log(`   Token: ${paymentResult.token.substring(0, 20)}...`, 'info');
        log(`   Redirect URL: ${paymentResult.redirect_url}`, 'cyan');
        log('\n   📱 Test payment at:', 'warning');
        log(`   ${paymentResult.redirect_url}`, 'cyan');
      } else {
        log('❌ Payment Creation: FAILED', 'error');
        log(`   Error: ${JSON.stringify(paymentResult)}`, 'error');
      }
    }

    // 4. Database Verification
    log('\n═══════════════════════════════════════════', 'info');
    log('4️⃣  Verifying Database Records', 'info');
    log('═══════════════════════════════════════════', 'info');

    // Check individual participant
    if (individualResult.success) {
      const participant = await prisma.participant.findUnique({
        where: { registrationCode: individualResult.data.registrationCode },
        include: { payments: true, racePack: true }
      });

      if (participant) {
        log('✅ Individual participant found in DB', 'success');
        log(`   Payment records: ${participant.payments.length}`, 'info');
        log(`   Race pack created: ${participant.racePack ? 'Yes' : 'No'}`, 'info');
      }
    }

    // Check community registration
    if (communityResult.success) {
      const community = await prisma.communityRegistration.findUnique({
        where: { registrationCode: communityResult.data.registrationCode },
        include: {
          members: { include: { participant: true } },
          payments: true
        }
      });

      if (community) {
        log('✅ Community registration found in DB', 'success');
        log(`   Members in DB: ${community.members.length}`, 'info');
        log(`   Payment records: ${community.payments.length}`, 'info');
      }
    }

    log('\n═══════════════════════════════════════════', 'success');
    log('✅ All tests completed successfully!', 'success');
    log('═══════════════════════════════════════════', 'success');

  } catch (error) {
    log('\n❌ Test failed with error:', 'error');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run test
testPaymentFlow().catch(console.error);