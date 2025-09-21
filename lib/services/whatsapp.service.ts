import { formatWhatsAppNumber, validateWhatsAppNumber } from '@/lib/utils/whatsapp-formatter';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface WhatsAppResponse {
  status: boolean;
  data?: Record<string, string | number | boolean>;
  reason?: string;
  message?: string;
}

interface BulkSendResult {
  phone: string;
  success: boolean;
  result?: WhatsAppResponse;
  error?: string;
}

export class WhatsAppService {
  private static token = process.env.FONNTE_TOKEN;
  private static domain = 'https://api.fonnte.com';
  private static isMockMode = process.env.WHATSAPP_MOCK_MODE === 'true';

  // Core send message function
  static async sendMessage(phone: string, message: string): Promise<WhatsAppResponse> {
    try {
      const formattedPhone = formatWhatsAppNumber(phone);

      if (!validateWhatsAppNumber(formattedPhone)) {
        throw new Error(`Invalid WhatsApp number: ${phone}`);
      }

      // Log to database
      const notification = await prisma.notification.create({
        data: {
          recipientPhone: formattedPhone,
          type: 'WHATSAPP',
          category: 'TRANSACTIONAL',
          message,
          status: 'PENDING',
          metadata: {}
        }
      });

      // Mock mode for testing
      if (this.isMockMode) {
        console.log('📱 MOCK WhatsApp Message:');
        console.log('To:', formattedPhone);
        console.log('Message:', message.substring(0, 200) + '...');

        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            metadata: { mockMode: true }
          }
        });

        return { status: true, data: { mock: true } };
      }

      // Check if token exists
      if (!this.token) {
        console.error('❌ Fonnte token not configured');
        throw new Error('WhatsApp service not configured');
      }

      console.log('📤 Sending WhatsApp via Fonnte to:', formattedPhone);

      // Fonnte API call
      const response = await fetch(`${this.domain}/send`, {
        method: 'POST',
        headers: {
          'Authorization': this.token,
        },
        body: new URLSearchParams({
          target: formattedPhone,
          message: message,
          delay: '2',
          countryCode: '62'
        })
      });

      const result = await response.json() as WhatsAppResponse;
      console.log('📨 Fonnte Response:', result);

      const isSuccess = result.status === true;

      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: isSuccess ? 'SENT' : 'FAILED',
          sentAt: isSuccess ? new Date() : null,
          failureReason: !isSuccess ? (result.reason || result.message || 'Unknown error') : null,
          metadata: result as unknown as Prisma.JsonObject
        }
      });

      if (!isSuccess) {
        console.error('❌ Fonnte error:', result.reason || result.message);
      } else {
        console.log('✅ WhatsApp sent successfully via Fonnte');
      }

      return result;
    } catch (error) {
      console.error('❌ WhatsApp error:', error);
      throw error;
    }
  }

  // Send custom message (for communications center)
  static async sendCustomMessage(recipient: string, message: string): Promise<boolean> {
    try {
      const result = await this.sendMessage(recipient, message);
      return result.status === true;
    } catch (error) {
      console.error('Error sending custom message:', error);
      return false;
    }
  }

  // Bulk send with rate limiting
  static async sendBulkMessages(recipients: Array<{ phone: string; message: string }>): Promise<BulkSendResult[]> {
    const results: BulkSendResult[] = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendMessage(recipient.phone, recipient.message);
        results.push({
          phone: recipient.phone,
          success: true,
          result
        });

        // Rate limiting - 2 seconds between messages
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        results.push({
          phone: recipient.phone,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  // Registration confirmation
  static async sendRegistrationConfirmation(
    participant: {
      fullName: string;
      registrationCode: string;
      category: string;
      bibNumber: string | null;
      totalPrice: number;
      whatsapp: string;
    },
    paymentData: {
      paymentCode: string;
      amount: number;
      vaNumber?: string;
      paymentUrl?: string;
      expiredAt?: Date;
      midtransToken?: string;
    }
  ): Promise<WhatsAppResponse> {
    const formattedPhone = formatWhatsAppNumber(participant.whatsapp);

    let paymentUrl = paymentData.paymentUrl;
    if (!paymentUrl && paymentData.midtransToken) {
      const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
      const midtransDomain = isProduction ? '' : 'sandbox.';
      paymentUrl = `https://app.${midtransDomain}midtrans.com/snap/v2/vtweb/${paymentData.midtransToken}`;
    }

    const message = `🏃 *SUKAMAJU RUN 2025* 🏃

Halo *${participant.fullName}*! 

✅ *REGISTRASI BERHASIL DITERIMA!*

📋 *Detail Registrasi:*
• Kode Registrasi: *${participant.registrationCode}*
• Kategori: *${participant.category}*
• Nomor BIB: *${participant.bibNumber || 'TBA'}*

💳 *INFORMASI PEMBAYARAN:*
• Kode Pembayaran: *${paymentData.paymentCode}*
• Total Pembayaran: *Rp ${participant.totalPrice.toLocaleString('id-ID')}*

⏰ *Batas Waktu Pembayaran:*
${paymentData.expiredAt ? new Date(paymentData.expiredAt).toLocaleString('id-ID') : '24 jam dari sekarang'}

🔗 *Link Pembayaran:*
${paymentUrl || 'Link akan dikirim segera'}

📌 *Cara Pembayaran:*
1. Klik link pembayaran di atas
2. Pilih metode pembayaran
3. Ikuti instruksi pembayaran
4. Simpan bukti pembayaran

⚠️ *PENTING:*
• Registrasi akan dibatalkan otomatis jika pembayaran tidak dilakukan sebelum batas waktu
• Abaikan pesan ini jika sudah melakukan pembayaran


Terima kasih 🙏`;

    console.log('📱 Sending registration confirmation to:', formattedPhone);
    return this.sendMessage(formattedPhone, message);
  }

  // Payment success notification
  static async sendPaymentSuccessNotification(
    participant: {
      fullName: string;
      registrationCode: string;
      category: string;
      bibNumber: string | null;
      jerseySize: string;
      whatsapp: string;
    }
  ): Promise<WhatsAppResponse> {
    const formattedPhone = formatWhatsAppNumber(participant.whatsapp);

    const message = `✅ *PEMBAYARAN BERHASIL!*

Halo *${participant.fullName}*,

Selamat! Pembayaran Anda telah kami terima.

🎫 *DETAIL REGISTRASI:*
• Kode Registrasi: *${participant.registrationCode}*
• Nomor BIB: *${participant.bibNumber || 'TBA'}*
• Kategori: *${participant.category}*
• Ukuran Jersey: *${participant.jerseySize}*
• Status: *CONFIRMED ✅*

📦 *PENGAMBILAN RACE PACK:*
• Tanggal: 10-11 Mei 2025
• Waktu: 10:00 - 18:00 WIB
• Lokasi: Lapangan Subiantoro, Sukamaju
• Bawa: KTP & Bukti Registrasi ini

📅 *HARI LOMBA:*
• Minggu, 11 Mei 2025
• Start: 06:00 WIB
• Lokasi: Lapangan Subiantoro, Sukamaju

Good luck! 💪🏃

Terima kasih 🙏`;

    console.log('📱 Sending payment success to:', formattedPhone);
    return this.sendMessage(formattedPhone, message);
  }

  // Community registration confirmation
  static async sendCommunityRegistrationConfirmation(communityId: string): Promise<WhatsAppResponse | null> {
    try {
      const community = await prisma.communityRegistration.findUnique({
        where: { id: communityId },
        include: {
          members: {
            include: {
              participant: true
            }
          },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      if (!community || !community.payments[0]) {
        console.error('Community or payment not found');
        return null;
      }

      const payment = community.payments[0];
      const formattedPhone = formatWhatsAppNumber(community.picWhatsapp);

      let paymentUrl = '';
      if (payment.midtransToken) {
        const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
        const midtransDomain = isProduction ? '' : 'sandbox.';
        paymentUrl = `https://app.${midtransDomain}midtrans.com/snap/v2/vtweb/${payment.midtransToken}`;
      }

      const message = `🏃 *REGISTRASI KOMUNITAS BERHASIL!* 🏃

Halo *${community.picName}*,

Registrasi komunitas *${community.communityName}* berhasil diterima!

📋 *DETAIL REGISTRASI:*
• Kode Registrasi: *${community.registrationCode}*
• Kategori: *${community.category}*
• Jumlah Peserta: *${community.totalMembers} orang*

👥 *DAFTAR PESERTA:*
${community.members.map((m, i) =>
        `${i + 1}. ${m.participant.fullName} - BIB: ${m.participant.bibNumber || 'TBA'}`
      ).join('\n')}

💳 *INFORMASI PEMBAYARAN:*
• Kode Pembayaran: *${payment.paymentCode}*
• Total: *Rp ${community.finalPrice.toLocaleString('id-ID')}*

⏰ *Batas Pembayaran:*
${payment.expiredAt ? new Date(payment.expiredAt).toLocaleString('id-ID') : '24 jam dari sekarang'}

🔗 *Link Pembayaran:*
${paymentUrl || 'Link akan dikirim segera'}

Terima kasih 🙏`;

      console.log('📱 Sending community registration to:', formattedPhone);
      return this.sendMessage(formattedPhone, message);
    } catch (error) {
      console.error('Community registration confirmation error:', error);
      return null;
    }
  }

  // Community payment success
  static async sendCommunityPaymentSuccessNotification(paymentId: string): Promise<boolean> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          communityRegistration: {
            include: {
              members: {
                include: {
                  participant: true
                }
              }
            }
          }
        }
      });

      if (!payment || !payment.communityRegistration) {
        console.error('Payment or community not found');
        return false;
      }

      const community = payment.communityRegistration;
      const picPhone = formatWhatsAppNumber(community.picWhatsapp);

      const picMessage = `✅ *PEMBAYARAN KOMUNITAS BERHASIL!*

Halo *${community.picName}*,

Pembayaran komunitas *${community.communityName}* telah kami terima.

🎫 *DETAIL REGISTRASI:*
• Kode Registrasi: *${community.registrationCode}*
• Jumlah Peserta: *${community.totalMembers} orang*
• Kategori: *${community.category}*
• Total Pembayaran: *Rp ${payment.amount.toLocaleString('id-ID')}*
• Status: *CONFIRMED ✅*

👥 *DAFTAR PESERTA & BIB:*
${community.members.map((m, i) =>
        `${i + 1}. ${m.participant.fullName} - BIB: ${m.participant.bibNumber || 'TBA'}`
      ).join('\n')}

📦 *PENGAMBILAN RACE PACK:*
• Tanggal: 10-11 Mei 2025
• Waktu: 10:00 - 18:00 WIB
• Lokasi: Lapangan Subiantoro, Sukamaju
• PIC dapat mengambil semua race pack komunitas

Terima kasih 🙏`;

      console.log('📱 Sending payment success to PIC:', picPhone);
      const result = await this.sendMessage(picPhone, picMessage);

      return result.status === true;
    } catch (error) {
      console.error('Community payment success notification error:', error);
      return false;
    }
  }
}

export default WhatsAppService;