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
  private static domain = process.env.WABLAS_DOMAIN;

  static async sendMessage(phone: string, message: string) {
    try {
      const response = await fetch(`${this.domain}/api/send-message`, {
        method: 'POST',
        headers: {
          'Authorization': this.token!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: phone.replace(/^0/, '62'), // Convert 08xxx to 628xxx
          message
        })
      });

      const result = await response.json();
      console.log('WhatsApp sent:', result);
      return result;
    } catch (error) {
      console.error('WhatsApp error:', error);
      throw error;
    }
  }

  static async sendRegistrationConfirmation(participant: Participant, paymentCode: string) {
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

    return this.sendMessage(participant.whatsapp, message);
  }
}