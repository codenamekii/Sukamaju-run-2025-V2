// app/api/admin/templates/route.ts
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

interface TemplateMetadata {
  name?: string;
  variables?: string[];
  usageCount?: number;
  lastUsed?: string | Date | null;
}

// Default templates untuk seed awal
const defaultTemplates = [
  {
    name: 'Registration Confirmation',
    type: 'EMAIL',
    category: 'REGISTRATION',
    subject: 'Welcome to Sukamaju Run 2025 - Registration Confirmed!',
    content: `Hi {{fullName}},

Thank you for registering for Sukamaju Run 2025!

Your registration details:
- Registration Code: {{registrationCode}}
- Category: {{category}}
- BIB Number: {{bibNumber}}
- Total Amount: Rp {{totalPrice}}

Please complete your payment to secure your spot.
Payment Link: {{paymentUrl}}

See you at the starting line!

Best regards,
Sukamaju Run Team`,
    variables: ['fullName', 'registrationCode', 'category', 'bibNumber', 'totalPrice', 'paymentUrl'],
    isActive: true
  },
  {
    name: 'Payment Success',
    type: 'EMAIL',
    category: 'PAYMENT',
    subject: 'Payment Confirmed - Sukamaju Run 2025',
    content: `Hi {{fullName}},

Your payment has been successfully processed!

Transaction Details:
- Amount: Rp {{totalPrice}}
- Registration Code: {{registrationCode}}
- Payment Date: {{paymentDate}}

Your spot is now secured. Don't forget to collect your race pack!

Best regards,
Sukamaju Run Team`,
    variables: ['fullName', 'totalPrice', 'registrationCode', 'paymentDate'],
    isActive: true
  },
  {
    name: 'WhatsApp Registration',
    type: 'WHATSAPP',
    category: 'REGISTRATION',
    subject: '',
    content: `🏃 *SUKAMAJU RUN 2025* 🏃

Halo {{fullName}}! 

Registrasi Anda berhasil! 
📋 Kode Registrasi: *{{registrationCode}}*
🏃 Kategori: *{{category}}*
🎽 Nomor BIB: *{{bibNumber}}*

💳 Silakan lakukan pembayaran:
Total: *Rp {{totalPrice}}*
Link: {{paymentUrl}}

Terima kasih! 🙏`,
    variables: ['fullName', 'registrationCode', 'category', 'bibNumber', 'totalPrice', 'paymentUrl'],
    isActive: true
  },
  {
    name: 'Race Pack Collection Reminder',
    type: 'WHATSAPP',
    category: 'REMINDER',
    subject: '',
    content: `📦 *PENGAMBILAN RACE PACK* 📦

Halo {{fullName}}!

Jangan lupa ambil race pack Anda:
📅 Tanggal: 13-14 Februari 2025
⏰ Waktu: 10:00 - 20:00
📍 Lokasi: Sukamaju Mall

Bawa:
✅ KTP/Identitas
✅ Bukti Registrasi

Info: 0812-3456-7890`,
    variables: ['fullName'],
    isActive: true
  },
  {
    name: 'Event Day Reminder',
    type: 'EMAIL',
    category: 'REMINDER',
    subject: 'Ready to Run? Sukamaju Run 2025 is Tomorrow!',
    content: `Hi {{fullName}},

The big day is almost here! 🏃‍♂️

Event Details:
📅 Date: {{eventDate}}
⏰ Time: {{startTime}}
📍 Venue: {{venue}}
🎽 Your BIB: {{bibNumber}}

Remember to bring:
- Your BIB number
- Comfortable running shoes
- Water bottle
- Positive energy!

See you tomorrow!

Best regards,
Sukamaju Run Team`,
    variables: ['fullName', 'eventDate', 'startTime', 'venue', 'bibNumber'],
    isActive: true
  }
];

export async function GET() {
  try {
    // Check if templates exist, if not, seed them
    const templateCount = await prisma.notification.count({
      where: { type: { in: ['EMAIL', 'WHATSAPP'] } }
    });

    let templates = [];

    if (templateCount === 0) {
      // Seed default templates using Notification model
      for (const template of defaultTemplates) {
        await prisma.notification.create({
          data: {
            type: template.type,
            category: template.category,
            subject: template.subject || null,
            message: template.content,
            status: template.isActive ? 'ACTIVE' : 'INACTIVE',
            metadata: {
              name: template.name,
              variables: template.variables,
              usageCount: 0
            }
          }
        });
      }
    }

    // Fetch all templates
    const notifications = await prisma.notification.findMany({
      where: {
        type: { in: ['EMAIL', 'WHATSAPP'] },
        participantId: null // Templates don't have participantId
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform to template format
    templates = notifications.map((notif) => {
      const metadata = notif.metadata as unknown as TemplateMetadata;

      return {
        id: notif.id,
        name: metadata?.name || 'Unnamed Template',
        type: notif.type,
        category: notif.category,
        subject: notif.subject,
        content: notif.message,
        variables: metadata?.variables || [],
        isActive: notif.status === 'ACTIVE',
        usageCount: metadata?.usageCount || 0,
        lastUsed: metadata?.lastUsed || null,
        createdAt: notif.createdAt,
        updatedAt: notif.updatedAt
      };
    });

    return NextResponse.json(
      { success: true, data: templates },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}