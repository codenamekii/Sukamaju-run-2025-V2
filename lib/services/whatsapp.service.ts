// whatsapp.service.ts - Consolidated WhatsApp Service
import { formatWhatsAppNumber, validateWhatsAppNumber } from '@/lib/utils/whatsapp-formatter';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Participant {
  fullName: string;
  registrationCode: string;
  category: string;
  bibNumber: string;
  totalPrice: number;
  whatsapp: string;
  jerseySize?: string;
}

interface PaymentData {
  paymentCode: string;
  amount: number;
  vaNumber?: string;
  bank?: string;
  paymentUrl?: string;
  expiredAt?: Date;
  midtransToken?: string;
}

export class WhatsAppService {
  private static token = process.env.WABLAS_TOKEN;
  private static domain = process.env.WABLAS_DOMAIN || 'https://tegal.wablas.com';
  private static isMockMode = process.env.WHATSAPP_MOCK_MODE === 'true';

  static async sendMessage(phone: string, message: string) {
    try {
      const formattedPhone = formatWhatsAppNumber(phone);

      if (!validateWhatsAppNumber(formattedPhone)) {
        throw new Error(`Invalid WhatsApp number: ${phone}`);
      }

      // Log the notification in database
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

      // If in mock mode, just log and return success
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

      // Real API call to Wablas
      console.log('📤 Sending WhatsApp to:', formattedPhone);

      const response = await fetch(`${this.domain}/api/send-message`, {
        method: 'POST',
        headers: {
          'Authorization': this.token!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: formattedPhone,
          message: message,
          secret: process.env.WABLAS_SECRET || undefined,
          priority: false // Wablas parameter
        })
      });

      const result = await response.json();
      console.log('📨 Wablas Response:', result);

      // Update notification status
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: result.status === true ? 'SENT' : 'FAILED',
          sentAt: result.status === true ? new Date() : null,
          failureReason: result.message || result.reason || null,
          metadata: result
        }
      });

      return result;
    } catch (error) {
      console.error('❌ WhatsApp error:', error);

      // Update notification as failed
      await prisma.notification.updateMany({
        where: {
          recipientPhone: formatWhatsAppNumber(phone),
          status: 'PENDING'
        },
        data: {
          status: 'FAILED',
          failureReason: error instanceof Error ? error.message : 'Unknown error'
        }
      });

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

        // Add delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
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

  // === INDIVIDUAL REGISTRATION BEFORE PAYMENT ===
  static async sendRegistrationConfirmation(participant: Participant, paymentData: PaymentData) {
    const formattedPhone = formatWhatsAppNumber(participant.whatsapp);

    // Generate payment URL based on environment
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
• Nomor BIB: *${participant.bibNumber}*

💳 *INFORMASI PEMBAYARAN:*
• Kode Pembayaran: *${paymentData.paymentCode}*
• Total Pembayaran: *Rp ${participant.totalPrice.toLocaleString('id-ID')}*
${paymentData.vaNumber ? `• Virtual Account: *${paymentData.vaNumber}*` : ''}
${paymentData.bank ? `• Bank: *${paymentData.bank}*` : ''}

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
• Setelah pembayaran berhasil, Anda akan menerima konfirmasi via WhatsApp

Terima kasih 🙏`;

    console.log('📱 Sending registration confirmation to:', formattedPhone);
    return this.sendMessage(formattedPhone, message);
  }

  // === PAYMENT SUCCESS NOTIFICATION ===
  static async sendPaymentSuccessNotification(participant: Participant & { racePack?: any }) {
    const formattedPhone = formatWhatsAppNumber(participant.whatsapp);

    const message = `✅ *PEMBAYARAN BERHASIL!*

Halo *${participant.fullName}*,

Selamat! Pembayaran Anda telah kami terima.

🎫 *DETAIL REGISTRASI:*
• Kode Registrasi: *${participant.registrationCode}*
• Nomor BIB: *${participant.bibNumber}*
• Kategori: *${participant.category}*
• Ukuran Jersey: *${participant.jerseySize || 'M'}*
• Status: *CONFIRMED ✅*

📦 *PENGAMBILAN RACE PACK:*
• Tanggal: 13-14 Maret 2025
• Waktu: 09:00 - 17:00 WIB
• Lokasi: Mall Sukamaju Lt. 3
• Bawa: KTP & Bukti Registrasi ini

📅 *HARI LOMBA:*
• Minggu, 15 Maret 2025
• Start: ${participant.category === '5K' ? '06:00' : '05:30'} WIB
• Lokasi: Lapangan Merdeka, Sukamaju

${participant.racePack?.qrCode ? `
📱 *QR Code:*
${participant.racePack.qrCode}
` : ''}

Good luck! 💪🏃

Terima kasih 🙏`;

    console.log('📱 Sending payment success to:', formattedPhone);
    return this.sendMessage(formattedPhone, message);
  }

  // === COMMUNITY REGISTRATION NOTIFICATIONS ===
  static async sendCommunityRegistrationConfirmation(communityId: string) {
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
        return;
      }

      const payment = community.payments[0];
      const formattedPhone = formatWhatsAppNumber(community.picWhatsapp);

      // Generate payment URL
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
        `${i + 1}. ${m.participant.fullName} - BIB: ${m.participant.bibNumber} | Jersey: ${m.participant.jerseySize || 'M'}`
      ).join('\n')}

💳 *INFORMASI PEMBAYARAN:*
• Kode Pembayaran: *${payment.paymentCode}*
• Total: *Rp ${community.finalPrice.toLocaleString('id-ID')}*
${community.promoAmount > 0 ? `• Diskon: *Rp ${community.promoAmount.toLocaleString('id-ID')}*` : ''}

⏰ *Batas Pembayaran:*
${payment.expiredAt ? new Date(payment.expiredAt).toLocaleString('id-ID') : '24 jam dari sekarang'}

🔗 *Link Pembayaran:*
${paymentUrl || 'Link akan dikirim segera'}

📌 *Cara Pembayaran:*
1. Klik link pembayaran di atas
2. Pilih metode pembayaran
3. Ikuti instruksi
4. Simpan bukti pembayaran

Terima kasih 🙏`;

      console.log('📱 Sending community registration to:', formattedPhone);
      return this.sendMessage(formattedPhone, message);
    } catch (error) {
      console.error('Community registration confirmation error:', error);
    }
  }

  static async sendCommunityPaymentSuccessNotification(paymentId: string) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          communityRegistration: {
            include: {
              members: {
                include: {
                  participant: {
                    include: {
                      racePack: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!payment || !payment.communityRegistration) {
        console.error('Payment or community not found');
        return;
      }

      const community = payment.communityRegistration;
      const picPhone = formatWhatsAppNumber(community.picWhatsapp);

      // Send to PIC
      const picMessage = `✅ *PEMBAYARAN KOMUNITAS BERHASIL!*

Halo *${community.picName}*,

Pembayaran komunitas *${community.communityName}* telah kami terima.

🎫 *DETAIL REGISTRASI:*
• Kode Registrasi: *${community.registrationCode}*
• Jumlah Peserta: *${community.totalMembers} orang*
• Kategori: *${community.category}*
• Total Pembayaran: *Rp ${payment.amount.toLocaleString('id-ID')}*
• Status: *CONFIRMED ✅*

👥 *DAFTAR PESERTA:*
${community.members.map((m, i) =>
        `${i + 1}. ${m.participant.fullName} - BIB: ${m.participant.bibNumber} | Jersey: ${m.participant.jerseySize || 'M'}`
      ).join('\n')}

📦 *PENGAMBILAN RACE PACK:*
• Tanggal: 13-14 Maret 2025
• Waktu: 09:00 - 17:00 WIB
• Lokasi: Mall Sukamaju Lt. 3
• PIC dapat mengambil semua race pack komunitas

Terima kasih 🙏`;

      console.log('📱 Sending payment success to PIC:', picPhone);
      await this.sendMessage(picPhone, picMessage);

      // Send to each member
      for (const member of community.members) {
        const memberPhone = formatWhatsAppNumber(member.participant.whatsapp);
        const memberMessage = `✅ *REGISTRASI KOMUNITAS BERHASIL!*

Halo *${member.participant.fullName}*,

Selamat! Anda terdaftar dalam komunitas *${community.communityName}*.

🎫 *DETAIL REGISTRASI ANDA:*
• Nomor BIB: *${member.participant.bibNumber}*
• Kategori: *${member.participant.category}*
• Jersey: *${member.participant.jerseySize || 'M'}*
• Status: *CONFIRMED ✅*

📦 *PENGAMBILAN RACE PACK:*
• Tanggal: 13-14 Maret 2025
• Waktu: 09:00 - 17:00 WIB
• Lokasi: Mall Sukamaju Lt. 3
• Hubungi PIC: ${community.picName} (${community.picWhatsapp})

📅 *HARI LOMBA:*
• Minggu, 15 Maret 2025
• Start: ${member.participant.category === '5K' ? '06:00' : '05:30'} WIB
• Lokasi: Lapangan Merdeka, Sukamaju

Good luck! 💪🏃

Terima kasih 🙏`;

        console.log('📱 Sending to member:', memberPhone);
        await this.sendMessage(memberPhone, memberMessage);

        // Add delay between messages
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      return true;
    } catch (error) {
      console.error('Community payment success notification error:', error);
      return false;
    }
  }

  // === PAYMENT REMINDER ===
  static async sendPaymentReminder(participantId?: string, communityId?: string) {
    try {
      if (participantId) {
        const participant = await prisma.participant.findUnique({
          where: { id: participantId },
          include: {
            payments: {
              where: { status: 'PENDING' },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        });

        if (!participant || !participant.payments[0]) return;

        const payment = participant.payments[0];
        const formattedPhone = formatWhatsAppNumber(participant.whatsapp);

        const message = `⏰ *REMINDER PEMBAYARAN*

Halo *${participant.fullName}*,

Pembayaran Anda akan segera berakhir!

💳 *Detail:*
• Kode: *${payment.paymentCode}*
• Total: *Rp ${payment.amount.toLocaleString('id-ID')}*
• Status: *MENUNGGU PEMBAYARAN*

⚠️ *Batas Waktu:*
${payment.expiredAt ? new Date(payment.expiredAt).toLocaleString('id-ID') : 'Segera'}

Segera lakukan pembayaran untuk mengamankan slot Anda!

Abaikan jika sudah membayar.

Terima kasih 🙏`;

        console.log('📱 Sending payment reminder to:', formattedPhone);
        return this.sendMessage(formattedPhone, message);
      }

      if (communityId) {
        const community = await prisma.communityRegistration.findUnique({
          where: { id: communityId },
          include: {
            payments: {
              where: { status: 'PENDING' },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        });

        if (!community || !community.payments[0]) return;

        const payment = community.payments[0];
        const formattedPhone = formatWhatsAppNumber(community.picWhatsapp);

        const message = `⏰ *REMINDER PEMBAYARAN KOMUNITAS*

Halo *${community.picName}*,

Pembayaran komunitas *${community.communityName}* akan segera berakhir!

💳 *Detail:*
• Kode: *${payment.paymentCode}*
• Total: *Rp ${payment.amount.toLocaleString('id-ID')}*
• Status: *MENUNGGU PEMBAYARAN*

⚠️ *Batas Waktu:*
${payment.expiredAt ? new Date(payment.expiredAt).toLocaleString('id-ID') : 'Segera'}

Segera lakukan pembayaran untuk mengamankan slot ${community.totalMembers} peserta!

Abaikan jika sudah membayar.

Terima kasih 🙏`;

        console.log('📱 Sending community payment reminder to:', formattedPhone);
        return this.sendMessage(formattedPhone, message);
      }
    } catch (error) {
      console.error('Payment reminder error:', error);
    }
  }
}

export default WhatsAppService;