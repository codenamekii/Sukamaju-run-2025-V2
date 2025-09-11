// lib/services/whatsapp-integration.service.ts
import { PrismaClient } from '@prisma/client';
import WhatsAppService from './whatsapp.service';

const prisma = new PrismaClient();

export class WhatsAppIntegrationService {
  static onPaymentSuccess(paymentId: unknown) {
    throw new Error('Method not implemented.');
  }

  static async sendBulkNotifications(participantIds: string[], message: string): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const id of participantIds) {
      try {
        const participant = await prisma.participant.findUnique({ where: { id } });
        if (!participant) {
          failed++;
          continue;
        }
        // kirim pesan WhatsApp
        await this.sendMessage(participant.whatsapp, message);
        success++;
      } catch (error) {
        console.error(`Failed to send message to participant ${id}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Send notification after individual registration (before payment)
   */
  static async sendIndividualRegistrationNotification(participantId: string): Promise<boolean> {
    try {
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

      if (!participant || !participant.payments[0]) {
        console.error('Participant or payment not found');
        return false;
      }

      const payment = participant.payments[0];

      // Prepare payment data
      const paymentData = {
        paymentCode: payment.paymentCode,
        amount: payment.amount,
        vaNumber: payment.vaNumber || undefined,
        bank: payment.paymentChannel || undefined,
        paymentUrl: payment.midtransToken ?
          `https://app.${process.env.MIDTRANS_IS_PRODUCTION === 'true' ? '' : 'sandbox.'}midtrans.com/snap/v2/vtweb/${payment.midtransToken}` :
          undefined,
        expiredAt: payment.expiredAt || undefined,
        midtransToken: payment.midtransToken || undefined
      };

      // Prepare participant data for WhatsApp service
      const participantData = {
        fullName: participant.fullName,
        registrationCode: participant.registrationCode,
        category: participant.category,
        bibNumber: participant.bibNumber || '',
        totalPrice: participant.totalPrice,
        whatsapp: participant.whatsapp,
        jerseySize: participant.jerseySize
      };

      // Send WhatsApp notification
      await WhatsAppService.sendRegistrationConfirmation(participantData, paymentData);

      console.log(`✅ Registration notification sent to ${participant.fullName}`);
      return true;

    } catch (error) {
      console.error('Error sending individual registration notification:', error);
      return false;
    }
  }

  /**
   * Send notification after individual payment success
   */
  static async sendIndividualPaymentSuccessNotification(paymentId: string): Promise<boolean> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          participant: {
            include: {
              racePack: true
            }
          }
        }
      });

      if (!payment || !payment.participant) {
        console.error('Payment or participant not found');
        return false;
      }

      const participant = payment.participant;

      // Prepare participant data with race pack info
      const participantData = {
        fullName: participant.fullName,
        registrationCode: participant.registrationCode,
        category: participant.category,
        bibNumber: participant.bibNumber || '',
        totalPrice: participant.totalPrice,
        whatsapp: participant.whatsapp,
        jerseySize: participant.jerseySize,
        racePack: participant.racePack // Pass the whole racePack object
      };

      // Send WhatsApp notification
      await WhatsAppService.sendPaymentSuccessNotification(participantData);

      // Update participant status
      await prisma.participant.update({
        where: { id: participant.id },
        data: { registrationStatus: 'CONFIRMED' }
      });

      console.log(`✅ Payment success notification sent to ${participant.fullName}`);
      return true;

    } catch (error) {
      console.error('Error sending payment success notification:', error);
      return false;
    }
  }

  /**
   * Send notification after community registration (before payment)
   */
  static async sendCommunityRegistrationNotification(communityId: string): Promise<boolean> {
    try {
      await WhatsAppService.sendCommunityRegistrationConfirmation(communityId);
      console.log(`✅ Community registration notification sent`);
      return true;
    } catch (error) {
      console.error('Error sending community registration notification:', error);
      return false;
    }
  }

  /**
   * Send notification after community payment success
   */
  static async sendCommunityPaymentSuccessNotification(paymentId: string): Promise<boolean> {
    try {
      await WhatsAppService.sendCommunityPaymentSuccessNotification(paymentId);

      // Update community status
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          communityRegistration: {
            include: {
              members: true
            }
          }
        }
      });

      if (payment?.communityRegistration) {
        // Update community registration status
        await prisma.communityRegistration.update({
          where: { id: payment.communityRegistration.id },
          data: { registrationStatus: 'CONFIRMED' }
        });

        // Update all member participants status
        const memberParticipantIds = payment.communityRegistration.members.map(m => m.participantId);

        if (memberParticipantIds.length > 0) {
          await prisma.participant.updateMany({
            where: {
              id: { in: memberParticipantIds }
            },
            data: {
              registrationStatus: 'CONFIRMED'
            }
          });
        }
      }

      console.log(`✅ Community payment success notification sent`);
      return true;
    } catch (error) {
      console.error('Error sending community payment success notification:', error);
      return false;
    }
  }

  /**
   * Handle webhook from Midtrans for both individual and community
   */
  static async handlePaymentWebhook(orderId: string, status: string): Promise<void> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { midtransOrderId: orderId }
      });

      if (!payment) {
        console.error('Payment not found for order:', orderId);
        return;
      }

      // If payment successful
      if (status === 'settlement' || status === 'capture') {
        if (payment.participantId) {
          // Individual payment
          await this.sendIndividualPaymentSuccessNotification(payment.id);
        } else if (payment.communityRegistrationId) {
          // Community payment
          await this.sendCommunityPaymentSuccessNotification(payment.id);
        }
      }
    } catch (error) {
      console.error('Error handling payment webhook:', error);
    }
  }

  /**
   * Send payment reminder for pending payments
   */
  static async sendPaymentReminder(participantId?: string, communityId?: string) {
    if (participantId) {
      // ambil participant
      const participant = await prisma.participant.findUnique({ where: { id: participantId } });
      if (!participant) return false;

      const message = `⏰ Reminder: pembayaran untuk registrasi ${participant.registrationCode} masih pending. Silakan segera lakukan pembayaran.`;
      return this.sendMessage(participant.whatsapp, message);
    }

    if (communityId) {
      const community = await prisma.communityRegistration.findUnique({ where: { id: communityId } });
      if (!community) return false;

      const message = `⏰ Reminder: pembayaran untuk komunitas ${community.communityName} masih pending. Silakan segera lakukan pembayaran.`;
      return this.sendMessage(community.picWhatsapp, message);
    }

    return false;
  }
  static sendMessage(_whatsapp: string, message: string) {
    throw new Error('Method not implemented.');
  }
}