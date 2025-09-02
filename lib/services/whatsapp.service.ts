import { formatWhatsAppNumber, validateWhatsAppNumber } from '@/lib/utils/whatsapp-formatter';

interface Participant {
  fullName: string;
  registrationCode: string;
  category: string;
  bibNumber: string;
  totalPrice: number;
  whatsapp: string;
}

export class WhatsAppService {
  private static token = process.env.WABLAS_TOKEN;
  private static domain = process.env.WABLAS_DOMAIN || 'https://api.wablas.com';

  static async sendMessage(phone: string, message: string) {
    try {
      // Format phone number to Wablas format
      const formattedPhone = formatWhatsAppNumber(phone);

      // Validate before sending
      if (!validateWhatsAppNumber(formattedPhone)) {
        throw new Error(`Invalid WhatsApp number: ${phone}`);
      }

      const response = await fetch(`${this.domain}/api/send-message`, {
        method: 'POST',
        headers: {
          'Authorization': this.token!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: formattedPhone, // Already in 628xxx format
          message
        })
      });

      const result = await response.json();
      console.log('WhatsApp sent to:', formattedPhone, result);
      return result;
    } catch (error) {
      console.error('WhatsApp error:', error);
      throw error;
    }
  }

  static async sendBulkMessages(recipients: Array<{ phone: string; message: string }>) {
    const results: Array<{ phone: string; success: boolean; result?: unknown; error?: string }> = [];

    for (const recipient of recipients) {
      try {
        const formattedPhone = formatWhatsAppNumber(recipient.phone);

        if (!validateWhatsAppNumber(formattedPhone)) {
          results.push({
            phone: recipient.phone,
            success: false,
            error: 'Invalid phone number'
          });
          continue;
        }

        const result = await this.sendMessage(formattedPhone, recipient.message);
        results.push({
          phone: formattedPhone,
          success: true,
          result
        });

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        // Akses message dengan casting
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          phone: recipient.phone,
          success: false,
          error: errorMessage
        });
      }
    }

    return results;
  }

  static async sendRegistrationConfirmation(participant: Participant, paymentCode: string) {
    // Ensure phone is formatted correctly
    const formattedPhone = formatWhatsAppNumber(participant.whatsapp);

    const message = `🏃 *SUKAMAJU RUN 2025* 🏃

Halo ${participant.fullName}! 

Registrasi Anda berhasil! 
📋 Kode Registrasi: *${participant.registrationCode}*
🏃 Kategori: *${participant.category}*
🎽 Nomor BIB: *${participant.bibNumber}*

💳 Silakan lakukan pembayaran:
Kode Pembayaran: *${paymentCode}*
Total: *Rp ${participant.totalPrice.toLocaleString('id-ID')}*

Terima kasih! 🙏`;

    return this.sendMessage(formattedPhone, message);
  }
}