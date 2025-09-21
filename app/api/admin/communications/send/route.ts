// app/api/admin/communications/send/route.ts
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/services/email.service';
import { WhatsAppService } from '@/lib/services/whatsapp.service';
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

interface SendRequest {
  templateId?: string;
  messageType: 'EMAIL' | 'WHATSAPP' | 'BOTH';
  category: string;
  subject?: string;
  content: string;
  recipients: {
    type: 'INDIVIDUAL' | 'FILTER' | 'ALL';
    participantIds?: string[];
    filters?: {
      category?: string[];
      paymentStatus?: string[];
      racePackStatus?: 'COLLECTED' | 'NOT_COLLECTED';
      registrationStatus?: string[]; // Add this for more flexibility
    };
  };
  rateLimit?: number;
  priority?: number;
}

interface RecipientData {
  id: string;
  fullName: string;
  email: string;
  whatsapp: string;
  bibNumber: string | null;
  category: string;
  registrationCode: string;
  totalPrice: number;
  jerseySize: string;
  paymentStatus?: string;
  racePackCollected?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendRequest = await request.json();

    // Validate required fields
    if (!body.messageType || !body.category || !body.content || !body.recipients) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get recipients based on type
    const recipients = await getRecipients(body.recipients);

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients found with the specified criteria' },
        { status: 400 }
      );
    }

    // Apply rate limit
    const rateLimit = body.rateLimit || 20;
    const limitedRecipients = recipients.slice(0, rateLimit);

    // Generate batch ID
    const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}`;

    // Create communication logs (queued status)
    const logs = await Promise.all(
      limitedRecipients.map(recipient =>
        createCommunicationLog({
          templateId: body.templateId,
          recipient,
          messageType: body.messageType,
          category: body.category,
          subject: body.subject,
          content: replaceVariables(body.content, recipient),
          batchId,
          priority: body.priority || 0
        })
      )
    );

    // Start sending in background (don't wait)
    processSendQueue(logs, body.messageType, body.subject || '');

    return NextResponse.json({
      success: true,
      batchId,
      totalRecipients: recipients.length,
      queued: limitedRecipients.length,
      limited: recipients.length > rateLimit,
      message: `Messages queued for ${limitedRecipients.length} recipients`
    });

  } catch (error) {
    console.error('Error sending communications:', error);
    return NextResponse.json(
      { error: 'Failed to send communications' },
      { status: 500 }
    );
  }
}

async function getRecipients(
  recipientConfig: SendRequest['recipients']
): Promise<RecipientData[]> {
  const where: Prisma.ParticipantWhereInput = {};

  // Default: Include CONFIRMED and IMPORTED, exclude CANCELLED
  if (recipientConfig.filters?.registrationStatus && recipientConfig.filters.registrationStatus.length > 0) {
    where.registrationStatus = { in: recipientConfig.filters.registrationStatus };
  } else {
    // Default filter - include all active participants
    where.registrationStatus = {
      in: ['CONFIRMED', 'IMPORTED', 'PENDING'] // Include all active statuses
    };
  }

  // Handle different recipient types
  if (recipientConfig.type === 'INDIVIDUAL' && recipientConfig.participantIds) {
    where.id = { in: recipientConfig.participantIds };
  } else if (recipientConfig.type === 'FILTER' && recipientConfig.filters) {
    const filters = recipientConfig.filters;

    if (filters.category && filters.category.length > 0) {
      where.category = { in: filters.category };
    }

    if (filters.paymentStatus && filters.paymentStatus.length > 0) {
      where.payments = {
        some: {
          status: { in: filters.paymentStatus }
        }
      };
    }

    if (filters.racePackStatus) {
      if (filters.racePackStatus === 'COLLECTED') {
        where.racePack = {
          isCollected: true
        };
      } else if (filters.racePackStatus === 'NOT_COLLECTED') {
        where.OR = [
          { racePack: { isCollected: false } },
          { racePack: null }
        ];
      }
    }
  }

  // Fetch participants
  const participants = await prisma.participant.findMany({
    where,
    include: {
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      racePack: true
    }
  });

  return participants.map(p => ({
    id: p.id,
    fullName: p.fullName,
    email: p.email,
    whatsapp: p.whatsapp,
    bibNumber: p.bibNumber,
    category: p.category,
    registrationCode: p.registrationCode,
    totalPrice: p.totalPrice,
    jerseySize: p.jerseySize,
    paymentStatus: p.payments[0]?.status || 'NO_PAYMENT',
    racePackCollected: p.racePack?.isCollected || false
  }));
}

function replaceVariables(content: string, data: RecipientData): string {
  const variables: Record<string, string> = {
    fullName: data.fullName,
    firstName: data.fullName.split(' ')[0],
    email: data.email,
    whatsapp: data.whatsapp,
    bibNumber: data.bibNumber || 'TBA',
    category: data.category,
    registrationCode: data.registrationCode,
    totalPrice: data.totalPrice.toLocaleString('id-ID'),
    jerseySize: data.jerseySize,
    eventDate: '11 Mei 2025',
    collectionDate: '10-11 Mei 2025',
    venue: 'Lapangan Subiantoro, Sukamaju',
    paymentStatus: data.paymentStatus || 'PENDING',
    racePackStatus: data.racePackCollected ? 'Sudah Diambil' : 'Belum Diambil'
  };

  let result = content;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  });

  return result;
}

async function createCommunicationLog(data: {
  templateId?: string;
  recipient: RecipientData;
  messageType: string;
  category: string;
  subject?: string;
  content: string;
  batchId: string;
  priority: number;
}) {
  return prisma.communicationLog.create({
    data: {
      templateId: data.templateId,
      recipientId: data.recipient.id,
      recipientEmail: data.recipient.email,
      recipientPhone: data.recipient.whatsapp,
      recipientName: data.recipient.fullName,
      messageType: data.messageType,
      category: data.category,
      subject: data.subject,
      content: data.content,
      status: 'QUEUED',
      batchId: data.batchId,
      priority: data.priority,
      metadata: {
        bibNumber: data.recipient.bibNumber,
        registrationCode: data.recipient.registrationCode
      }
    }
  });
}

async function processSendQueue(
  logs: Array<{
    id: string;
    recipientEmail: string | null;
    recipientPhone: string | null;
    recipientName: string | null;
    content: string;
    messageType: string;
  }>,
  messageType: string,
  subject: string
) {
  for (const log of logs) {
    try {
      // Update status to SENDING
      await prisma.communicationLog.update({
        where: { id: log.id },
        data: { status: 'SENDING' }
      });

      let success = false;
      let errorMessage = '';

      // Send WhatsApp
      if ((messageType === 'WHATSAPP' || messageType === 'BOTH') && log.recipientPhone) {
        const whatsappSent = await WhatsAppService.sendCustomMessage(
          log.recipientPhone,
          log.content
        );

        if (!whatsappSent && messageType === 'WHATSAPP') {
          errorMessage = 'WhatsApp send failed';
        } else if (whatsappSent) {
          success = true;
        }
      }

      // Send Email
      if ((messageType === 'EMAIL' || messageType === 'BOTH') && log.recipientEmail) {
        // Skip placeholder emails from import
        if (!log.recipientEmail.includes('@imported.local')) {
          const emailSent = await EmailService.sendCustomMessage(
            log.recipientEmail,
            subject,
            log.content
          );

          if (!emailSent && messageType === 'EMAIL') {
            errorMessage = errorMessage || 'Email send failed';
          } else if (emailSent) {
            success = true;
          }
        } else if (messageType === 'EMAIL') {
          errorMessage = 'Placeholder email - cannot send';
        }
      }

      // Update log status
      await prisma.communicationLog.update({
        where: { id: log.id },
        data: {
          status: success ? 'SENT' : 'FAILED',
          sentAt: success ? new Date() : null,
          failedAt: !success ? new Date() : null,
          errorMessage: !success ? errorMessage : null
        }
      });

      // Update template usage count if successful
      const logWithTemplate = await prisma.communicationLog.findUnique({
        where: { id: log.id },
        select: { templateId: true }
      });

      if (success && logWithTemplate?.templateId) {
        await prisma.messageTemplate.update({
          where: { id: logWithTemplate.templateId },
          data: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date()
          }
        });
      }

      // Delay between messages (2 seconds for WhatsApp, 1 second for email)
      const delay = messageType === 'WHATSAPP' ? 2000 : 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

    } catch (error) {
      console.error(`Failed to process log ${log.id}:`, error);

      await prisma.communicationLog.update({
        where: { id: log.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          errorMessage: `Processing error: ${error}`
        }
      });
    }
  }
}