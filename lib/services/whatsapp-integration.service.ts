// lib/services/whatsapp-integration.service.ts
import { prisma } from '@/lib/prisma';
import WhatsAppService from './whatsapp.service';

export class WhatsAppIntegrationService {
  // Send bulk notifications to participants
  static async sendBulkNotifications(
    participantIds: string[],
    message: string
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const participantId of participantIds) {
      try {
        const participant = await prisma.participant.findUnique({
          where: { id: participantId },
          select: {
            fullName: true,
            whatsapp: true,
            bibNumber: true,
            category: true,
            registrationCode: true
          }
        });

        if (!participant) {
          failed++;
          continue;
        }

        // Replace basic variables in message
        const personalizedMessage = message
          .replace(/\{\{fullName\}\}/g, participant.fullName)
          .replace(/\{\{firstName\}\}/g, participant.fullName.split(' ')[0])
          .replace(/\{\{bibNumber\}\}/g, participant.bibNumber || 'TBA')
          .replace(/\{\{category\}\}/g, participant.category)
          .replace(/\{\{registrationCode\}\}/g, participant.registrationCode);

        const sent = await WhatsAppService.sendCustomMessage(
          participant.whatsapp,
          personalizedMessage
        );

        if (sent) {
          success++;
        } else {
          failed++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to send to participant ${participantId}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }

  // Triggered when payment is successful
  static async onPaymentSuccess(paymentId: string): Promise<boolean> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          participant: true,
          communityRegistration: true
        }
      });

      if (!payment) {
        console.error('Payment not found:', paymentId);
        return false;
      }

      // Handle individual payment
      if (payment.participant) {
        await WhatsAppService.sendPaymentSuccessNotification({
          fullName: payment.participant.fullName,
          registrationCode: payment.participant.registrationCode,
          category: payment.participant.category,
          bibNumber: payment.participant.bibNumber,
          jerseySize: payment.participant.jerseySize,
          whatsapp: payment.participant.whatsapp
        });

        // Update participant status
        await prisma.participant.update({
          where: { id: payment.participant.id },
          data: { registrationStatus: 'CONFIRMED' }
        });

        return true;
      }

      // Handle community payment
      if (payment.communityRegistration) {
        await WhatsAppService.sendCommunityPaymentSuccessNotification(paymentId);

        // Update community status
        await prisma.communityRegistration.update({
          where: { id: payment.communityRegistration.id },
          data: { registrationStatus: 'CONFIRMED' }
        });

        // Update all community members status
        const members = await prisma.communityMember.findMany({
          where: { communityRegistrationId: payment.communityRegistration.id }
        });

        await prisma.participant.updateMany({
          where: {
            id: { in: members.map(m => m.participantId) }
          },
          data: { registrationStatus: 'CONFIRMED' }
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error in onPaymentSuccess:', error);
      return false;
    }
  }

  // Send payment reminder
  static async sendPaymentReminder(paymentId: string): Promise<boolean> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          participant: true,
          communityRegistration: true
        }
      });

      if (!payment || payment.status !== 'PENDING') {
        return false;
      }

      let recipient: { name: string; phone: string } | null = null;
      let message = '';

      if (payment.participant) {
        recipient = {
          name: payment.participant.fullName,
          phone: payment.participant.whatsapp
        };

        // Generate payment URL
        let paymentUrl = '';
        if (payment.midtransToken) {
          const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
          const midtransDomain = isProduction ? '' : 'sandbox.';
          paymentUrl = `https://app.${midtransDomain}midtrans.com/snap/v2/vtweb/${payment.midtransToken}`;
        }

        message = `⏰ *REMINDER PEMBAYARAN*

Halo *${recipient.name}*,

Registrasi Anda belum selesai. Silakan segera lakukan pembayaran.

💳 *Detail Pembayaran:*
• Kode: *${payment.paymentCode}*
• Total: *Rp ${payment.amount.toLocaleString('id-ID')}*
• Status: MENUNGGU PEMBAYARAN

⏱️ *Batas Waktu:*
${payment.expiredAt ? new Date(payment.expiredAt).toLocaleString('id-ID') : '24 jam dari registrasi'}

🔗 *Link Pembayaran:*
${paymentUrl}

⚠️ Registrasi akan dibatalkan jika pembayaran tidak dilakukan tepat waktu.

Terima kasih 🙏`;
      } else if (payment.communityRegistration) {
        recipient = {
          name: payment.communityRegistration.picName,
          phone: payment.communityRegistration.picWhatsapp
        };

        // Similar message for community
        message = `⏰ *REMINDER PEMBAYARAN KOMUNITAS*

Halo *${recipient.name}*,

Pembayaran untuk komunitas *${payment.communityRegistration.communityName}* belum kami terima.

💳 *Detail:*
• Kode: *${payment.paymentCode}*
• Total: *Rp ${payment.amount.toLocaleString('id-ID')}*
• Peserta: *${payment.communityRegistration.totalMembers} orang*

Segera lakukan pembayaran sebelum batas waktu.

Terima kasih 🙏`;
      }

      if (recipient && message) {
        const result = await WhatsAppService.sendMessage(recipient.phone, message);
        return result.status === true;
      }

      return false;
    } catch (error) {
      console.error('Error sending payment reminder:', error);
      return false;
    }
  }

  // Send race pack collection reminder
  static async sendRacePackReminder(participantIds: string[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const participantId of participantIds) {
      try {
        const participant = await prisma.participant.findUnique({
          where: { id: participantId },
          include: { racePack: true }
        });

        if (!participant || participant.racePack?.isCollected) {
          continue;
        }

        const message = `📦 *REMINDER PENGAMBILAN RACE PACK*

Halo *${participant.fullName}*!

Jangan lupa ambil race pack Anda:

📋 *Info Race Pack:*
• Nomor BIB: *${participant.bibNumber || 'TBA'}*
• Kategori: *${participant.category}*
• Ukuran Jersey: *${participant.jerseySize}*

📍 *Lokasi & Waktu:*
• Tanggal: 10-11 Mei 2025
• Waktu: 10:00 - 18:00 WIB
• Tempat: Lapangan Subiantoro, Sukamaju

📱 *Yang Harus Dibawa:*
• KTP/Identitas asli
• Bukti registrasi (WA/Email ini)

Sampai jumpa! 🏃‍♂️

Terima kasih 🙏`;

        const sent = await WhatsAppService.sendCustomMessage(participant.whatsapp, message);

        if (sent) {
          success++;
        } else {
          failed++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to send race pack reminder to ${participantId}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }

  // Send race day reminder
  static async sendRaceDayReminder(participantIds: string[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const participantId of participantIds) {
      try {
        const participant = await prisma.participant.findUnique({
          where: { id: participantId }
        });

        if (!participant) {
          continue;
        }

        const startTime = participant.category === '5K' ? '06:00' : '06:00';

        const message = `🏃 *REMINDER HARI LOMBA!*

Halo *${participant.fullName}*!

Besok adalah hari yang ditunggu-tunggu! 

📅 *SUKAMAJU RUN 2025*
• Tanggal: Minggu, 11 Mei 2025
• Start: ${startTime} WIB
• Kategori: *${participant.category}*
• BIB: *${participant.bibNumber || 'TBA'}*

📍 *Lokasi:*
Lapangan Subiantoro, Sukamaju

⏰ *Timeline:*
• 04:30 - Venue dibuka
• 05:00 - Warming up
• 05:45 - Briefing
• ${startTime} - START!

✅ *Checklist:*
□ BIB Number (wajib)
□ Jersey event
□ Sepatu lari
□ Botol minum
□ Sarapan ringan

💪 *Tips:*
• Istirahat cukup malam ini
• Hindari makanan berat
• Datang 1 jam sebelum start
• Jangan lupa pemanasan

See you at the starting line! 🎯

Good luck & have fun! 🌟`;

        const sent = await WhatsAppService.sendCustomMessage(participant.whatsapp, message);

        if (sent) {
          success++;
        } else {
          failed++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to send race day reminder to ${participantId}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }
}

export default WhatsAppIntegrationService;