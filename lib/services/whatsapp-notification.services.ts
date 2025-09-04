import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// WhatsApp API Configuration
const WA_API_URL = process.env.WA_API_URL || 'https://api.fonnte.com/send';
const WA_API_TOKEN = process.env.WA_API_TOKEN || '';

interface WhatsAppMessage {
  target: string;
  message: string;
  type?: 'text' | 'image' | 'document';
  url?: string;
}

interface NotificationData {
  participantId?: string;
  communityId?: string;
  type: 'REGISTRATION' | 'PAYMENT_PENDING' | 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'CHECK_IN' | 'REMINDER';
  templateData: Record<string, string | number>;
}

// Send WhatsApp message using Fonnte API
async function sendWhatsAppMessage(data: WhatsAppMessage): Promise<boolean> {
  try {
    const response = await fetch(WA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': WA_API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: data.target,
        message: data.message,
        delay: '2', // 2 second delay
        countryCode: '62' // Indonesia
      })
    });

    const result = await response.json();

    // Log notification
    await prisma.notification.create({
      data: {
        recipientPhone: data.target,
        type: 'WHATSAPP',
        category: data.type || 'text',
        message: data.message,
        status: result.status ? 'SENT' : 'FAILED',
        sentAt: result.status ? new Date() : null,
        failureReason: result.reason || null,
        metadata: result
      }
    });

    return result.status || false;
  } catch (error) {
    console.error('WhatsApp send error:', error);

    // Log failed notification
    await prisma.notification.create({
      data: {
        recipientPhone: data.target,
        type: 'WHATSAPP',
        category: 'text',
        message: data.message,
        status: 'FAILED',
        failureReason: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    return false;
  }
}

// Format phone number to WhatsApp format
function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');

  // Remove leading zero if exists
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Remove country code if already exists
  if (cleaned.startsWith('62')) {
    cleaned = cleaned.substring(2);
  }

  // Return formatted number
  return cleaned;
}

// Message Templates
const messageTemplates = {
  REGISTRATION: (data: Record<string, string | number>) => `
🎉 *Pendaftaran Berhasil Diterima!*

Halo ${data.name},

Terima kasih telah mendaftar *${data.eventName}*

📋 *Detail Registrasi:*
• Kode Registrasi: ${data.registrationCode}
• Kategori: ${data.category}
• BIB Name: ${data.bibName}

💰 *Informasi Pembayaran:*
• Total: Rp ${data.amount}
• Status: Menunggu Pembayaran
• Batas Waktu: ${data.expiry}

Silakan lakukan pembayaran melalui link berikut:
${data.paymentUrl}

_Pembayaran akan otomatis terverifikasi setelah Anda melakukan transfer._

Butuh bantuan? Hubungi kami di:
📧 support@marathon.com
📱 0858-9003-1215

Salam hangat,
*Tim ${data.eventName}*
`,

  PAYMENT_PENDING: (data: Record<string, string | number>) => `
⏳ *Menunggu Pembayaran*

Halo ${data.name},

Silakan segera lakukan pembayaran untuk menyelesaikan registrasi Anda.

💳 *Detail Pembayaran:*
• Kode Pembayaran: ${data.paymentCode}
• Total: Rp ${data.amount}
• Metode: ${data.method || 'Transfer Bank'}
${data.vaNumber ? `• VA Number: ${data.vaNumber}` : ''}

📅 *Batas Waktu Pembayaran:*
${data.expiry}

🔗 *Link Pembayaran:*
${data.paymentUrl}

⚠️ Registrasi akan dibatalkan otomatis jika pembayaran tidak dilakukan sebelum batas waktu.

Terima kasih,
*Tim ${data.eventName}*
`,

  PAYMENT_SUCCESS: (data: Record<string, string | number>) => `
✅ *Pembayaran Berhasil!*

Halo ${data.name},

Selamat! Pembayaran Anda telah kami terima.

🎫 *Detail Registrasi:*
• Kode Registrasi: ${data.registrationCode}
• Nomor BIB: ${data.bibNumber || 'Akan diinformasikan'}
• Kategori: ${data.category}
• Status: CONFIRMED ✅

📅 *Informasi Event:*
• Tanggal: ${data.eventDate}
• Lokasi: ${data.eventLocation}
• Pengambilan Race Pack: ${data.racePackDate}

📱 *QR Code Race Pack:*
Simpan QR code berikut untuk pengambilan race pack:
${data.qrCodeUrl}

📋 *Langkah Selanjutnya:*
1. Simpan bukti registrasi ini
2. Datang saat pengambilan race pack dengan membawa:
   - KTP/identitas asli
   - Bukti registrasi (email/WA ini)
   - QR Code

Sampai jumpa di garis start! 🏃‍♂️

Salam hangat,
*Tim ${data.eventName}*
`,

  PAYMENT_FAILED: (data: Record<string, string | number>) => `
❌ *Pembayaran Gagal*

Halo ${data.name},

Pembayaran Anda tidak dapat diproses.

📋 *Detail:*
• Kode Pembayaran: ${data.paymentCode}
• Alasan: ${data.reason || 'Pembayaran expired/dibatalkan'}

Silakan lakukan registrasi ulang melalui:
${data.registrationUrl}

Butuh bantuan? Hubungi kami.

Terima kasih,
*Tim ${data.eventName}*
`,

  CHECK_IN: (data: Record<string, string | number>) => `
✅ *Check-in Berhasil!*

Halo ${data.name},

Race pack Anda telah berhasil diambil.

📦 *Item yang Diterima:*
• BIB Number: ${data.bibNumber}
• Jersey Size: ${data.jerseySize}
• Goodie Bag ✅
${data.additionalItems || ''}

📅 *Reminder Event:*
• Tanggal: ${data.eventDate}
• Waktu: ${data.eventTime}
• Lokasi: ${data.eventLocation}

💡 *Tips Persiapan:*
• Datang 1 jam sebelum start
• Bawa BIB
• Gunakan jersey event
• Siapkan air minum

Good luck! 🏃‍♂️💪

*Tim ${data.eventName}*
`,

  REMINDER: (data: Record<string, string | number>) => `
📢 *Reminder: ${data.title}*

Halo ${data.name},

${data.message}

${data.actionRequired ? `
⚠️ *Action Required:*
${data.actionRequired}
` : ''}

${data.link ? `
🔗 ${data.link}
` : ''}

Terima kasih,
*Tim ${data.eventName}*
`
};

// Send registration notification
export async function sendRegistrationNotification(
  participantId: string,
  paymentUrl: string,
  paymentExpiry: Date
): Promise<boolean> {
  try {
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!participant) {
      console.error('Participant not found:', participantId);
      return false;
    }

    const formattedPhone = formatPhoneNumber(participant.whatsapp);
    const payment = participant.payments[0];

    const templateData = {
      name: participant.fullName,
      eventName: 'Marathon 2025',
      registrationCode: participant.registrationCode,
      category: participant.category,
      bibName: participant.bibName,
      amount: new Intl.NumberFormat('id-ID').format(participant.totalPrice),
      expiry: paymentExpiry.toLocaleString('id-ID'),
      paymentUrl,
      paymentCode: payment?.paymentCode || '',
      vaNumber: payment?.vaNumber || '',
      method: payment?.paymentMethod || 'Transfer Bank'
    };

    // Send registration confirmation
    const message1 = messageTemplates.REGISTRATION(templateData);
    await sendWhatsAppMessage({
      target: formattedPhone,
      message: message1,
      type: 'text'
    });

    // Send payment reminder after 5 seconds
    setTimeout(async () => {
      const message2 = messageTemplates.PAYMENT_PENDING(templateData);
      await sendWhatsAppMessage({
        target: formattedPhone,
        message: message2,
        type: 'text'
      });
    }, 5000);

    return true;
  } catch (error) {
    console.error('Send registration notification error:', error);
    return false;
  }
}

// Send payment success notification
export async function sendPaymentSuccessNotification(paymentId: string): Promise<boolean> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        participant: {
          include: {
            racePack: true
          }
        },
        communityRegistration: true
      }
    });

    if (!payment) {
      console.error('Payment not found:', paymentId);
      return false;
    }

    let recipientPhone = '';
    let recipientName = '';
    let registrationCode = '';
    let category = '';

    if (payment.participant) {
      recipientPhone = payment.participant.whatsapp;
      recipientName = payment.participant.fullName;
      registrationCode = payment.participant.registrationCode;
      category = payment.participant.category;
    } else if (payment.communityRegistration) {
      recipientPhone = payment.communityRegistration.picWhatsapp;
      recipientName = payment.communityRegistration.picName;
      registrationCode = payment.communityRegistration.registrationCode;
      category = payment.communityRegistration.category;
    } else {
      console.error('No participant or community found for payment');
      return false;
    }

    const formattedPhone = formatPhoneNumber(recipientPhone);

    const templateData = {
      name: recipientName,
      eventName: 'Marathon 2025',
      registrationCode,
      bibNumber: payment.participant?.bibNumber || 'TBA',
      category,
      eventDate: '15 Maret 2025',
      eventLocation: 'Jakarta',
      racePackDate: '13-14 Maret 2025',
      qrCodeUrl: payment.participant?.racePack?.qrCode
        ? `https://marathon.com/qr/${payment.participant.racePack.qrCode}`
        : 'https://marathon.com/qr/generate'
    };

    const message = messageTemplates.PAYMENT_SUCCESS(templateData);

    return await sendWhatsAppMessage({
      target: formattedPhone,
      message,
      type: 'text'
    });
  } catch (error) {
    console.error('Send payment success notification error:', error);
    return false;
  }
}

// Send check-in notification
export async function sendCheckInNotification(participantId: string): Promise<boolean> {
  try {
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        racePack: true
      }
    });

    if (!participant) {
      console.error('Participant not found:', participantId);
      return false;
    }

    const formattedPhone = formatPhoneNumber(participant.whatsapp);

    const templateData = {
      name: participant.fullName,
      eventName: 'Marathon 2025',
      bibNumber: participant.bibNumber || 'N/A',
      jerseySize: participant.jerseySize,
      eventDate: '15 Maret 2025',
      eventTime: '05:00 WIB',
      eventLocation: 'Jakarta',
      additionalItems: ''
    };

    const message = messageTemplates.CHECK_IN(templateData);

    return await sendWhatsAppMessage({
      target: formattedPhone,
      message,
      type: 'text'
    });
  } catch (error) {
    console.error('Send check-in notification error:', error);
    return false;
  }
}

// Send custom reminder
export async function sendCustomReminder(
  participantIds: string[],
  title: string,
  message: string,
  actionRequired?: string,
  link?: string
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const participantId of participantIds) {
    try {
      const participant = await prisma.participant.findUnique({
        where: { id: participantId }
      });

      if (!participant) continue;

      const formattedPhone = formatPhoneNumber(participant.whatsapp);

      const templateData: Record<string, string | number> = {
        name: participant.fullName,
        eventName: "Sukamaju Run 2025",
        title,
        message,
        ...(actionRequired ? { actionRequired } : {}),
        ...(link ? { link } : {})
      };

      const waMessage = messageTemplates.REMINDER(templateData);

      const sent = await sendWhatsAppMessage({
        target: formattedPhone,
        message: waMessage,
        type: 'text'
      });

      if (sent) {
        success++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Failed to send reminder to ${participantId}:`, error);
      failed++;
    }
  }

  return { success, failed };
}