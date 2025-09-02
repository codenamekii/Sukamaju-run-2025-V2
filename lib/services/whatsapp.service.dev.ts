// lib/services/whatsapp.service.dev.ts
export class WhatsAppServiceDev {
  static async sendMessage(phone: string, message: string) {
    console.log('=== MOCK WHATSAPP MESSAGE ===');
    console.log('TO:', phone);
    console.log('MESSAGE:', message);
    console.log('============================');

    // Simpan ke file log untuk review
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    const logEntry = {
      timestamp: new Date().toISOString(),
      phone,
      message,
      status: 'MOCK_SENT'
    };

    // Append ke file log
    fs.appendFileSync(
      'whatsapp-test-log.json',
      JSON.stringify(logEntry) + '\n'
    );

    return {
      success: true,
      mock: true,
      phone,
      timestamp: new Date().toISOString()
    };
  }
}