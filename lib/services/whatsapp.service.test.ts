import 'dotenv/config';
import { WhatsAppService } from './whatsapp.service';

async function testSend() {
  try {
    const testPhone = '0895422741155'; // ganti dengan nomor kamu sendiri
    const message = 'Test WhatsApp Wablas 🚀';

    const result = await WhatsAppService.sendMessage(testPhone, message);
    console.log('Result:', result);
  } catch (error) {
    console.error('Error sending test message:', error);
  }
}

testSend();