// scripts/test-whatsapp.ts
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Check if token is loaded
console.log('Environment check:');
console.log('- FONNTE_TOKEN:', process.env.FONNTE_TOKEN ? 'Loaded ✓' : 'Not found ✗');
console.log('- WHATSAPP_MOCK_MODE:', process.env.WHATSAPP_MOCK_MODE);
console.log('');

// Import WhatsApp service AFTER loading env
import WhatsAppService from '../lib/services/whatsapp.service';

async function testFonnte() {
  try {
    const testPhone = '62895422741155'; // Your test number
    const testMessage = `*Test Fonnte API* 🚀

Waktu: ${new Date().toLocaleString('id-ID')}
Status: Test berhasil!

Jika Anda menerima pesan ini, integrasi Fonnte berhasil ✅`;

    console.log('📱 Sending test message to:', testPhone);

    const result = await WhatsAppService.sendMessage(testPhone, testMessage);

    console.log('✅ Success! Response:', result);

    // Check if actually sent
    if (result.status === true || result.detail === 'success') {
      console.log('🎉 Message sent successfully!');
    } else {
      console.log('⚠️ Message may not have been sent. Check Fonnte dashboard.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test
testFonnte();