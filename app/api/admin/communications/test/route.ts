// app/api/admin/communications/test/route.ts
import { EmailService } from '@/lib/services/email.service';
import { WhatsAppService } from '@/lib/services/whatsapp.service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, recipient, testMode } = body;

    if (!type || !recipient) {
      return NextResponse.json(
        { error: 'Type and recipient are required' },
        { status: 400 }
      );
    }

    // Set test mode
    if (testMode) {
      process.env.WHATSAPP_MOCK_MODE = 'true';
      process.env.EMAIL_MOCK_MODE = 'true';
    }

    const testMessage = `🧪 *TEST MESSAGE*

Ini adalah pesan test dari Sukamaju Run 2025.

Jika Anda menerima pesan ini, berarti integrasi ${type === 'EMAIL' ? 'Email' : 'WhatsApp'} berhasil!

Variables Test:
• Nama: {{fullName}}
• BIB: {{bibNumber}}
• Kategori: {{category}}

Timestamp: ${new Date().toLocaleString('id-ID')}

---
Abaikan pesan ini.`;

    let success = false;
    let result: Record<string, string | boolean> = {};

    if (type === 'WHATSAPP') {
      success = await WhatsAppService.sendCustomMessage(recipient, testMessage);
      result = { success, type: 'WhatsApp' };
    } else if (type === 'EMAIL') {
      success = await EmailService.sendCustomMessage(
        recipient,
        'Test Email - Sukamaju Run 2025',
        testMessage
      );
      result = { success, type: 'Email' };
    }

    // Reset to original mode
    if (testMode) {
      process.env.WHATSAPP_MOCK_MODE = 'false';
      process.env.EMAIL_MOCK_MODE = 'false';
    }

    return NextResponse.json({
      success,
      message: success ? 'Test message sent successfully' : 'Failed to send test message',
      details: result
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}