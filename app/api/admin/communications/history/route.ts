// app/api/admin/communications/history/route.ts
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

interface HistoryFilters {
  batchId?: string;
  status?: string;
  messageType?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Filters
    const filters: HistoryFilters = {
      batchId: searchParams.get('batchId') || undefined,
      status: searchParams.get('status') || undefined,
      messageType: searchParams.get('messageType') || undefined,
      category: searchParams.get('category') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      search: searchParams.get('search') || undefined
    };

    // Build where clause
    const where: Prisma.CommunicationLogWhereInput = {};

    if (filters.batchId) {
      where.batchId = filters.batchId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.messageType) {
      where.messageType = filters.messageType;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.search) {
      where.OR = [
        { recipientName: { contains: filters.search, mode: 'insensitive' } },
        { recipientEmail: { contains: filters.search, mode: 'insensitive' } },
        { recipientPhone: { contains: filters.search } },
        { subject: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // Get total count
    const total = await prisma.communicationLog.count({ where });

    // Get logs with template info
    const logs = await prisma.communicationLog.findMany({
      where,
      include: {
        template: {
          select: {
            name: true,
            type: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    // Get batch summaries if needed
    const batchIds = [...new Set(logs.filter(log => log.batchId).map(log => log.batchId))];
    const batchSummaries = await getBatchSummaries(batchIds as string[]);

    return NextResponse.json({
      data: logs,
      batchSummaries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching communication history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch communication history' },
      { status: 500 }
    );
  }
}

async function getBatchSummaries(batchIds: string[]) {
  if (batchIds.length === 0) return {};

  const summaries: Record<string, {
    total: number;
    sent: number;
    failed: number;
    pending: number;
  }> = {};

  for (const batchId of batchIds) {
    const stats = await prisma.communicationLog.groupBy({
      by: ['status'],
      where: { batchId },
      _count: true
    });

    const summary = {
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0
    };

    for (const stat of stats) {
      summary.total += stat._count;
      if (stat.status === 'SENT') {
        summary.sent = stat._count;
      } else if (stat.status === 'FAILED') {
        summary.failed = stat._count;
      } else if (stat.status === 'QUEUED' || stat.status === 'SENDING') {
        summary.pending += stat._count;
      }
    }

    summaries[batchId] = summary;
  }

  return summaries;
}

// Resend failed messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { logIds } = body;

    if (!logIds || !Array.isArray(logIds)) {
      return NextResponse.json(
        { error: 'Invalid request. logIds array required.' },
        { status: 400 }
      );
    }

    // Get failed logs
    const logs = await prisma.communicationLog.findMany({
      where: {
        id: { in: logIds },
        status: 'FAILED'
      }
    });

    if (logs.length === 0) {
      return NextResponse.json(
        { error: 'No failed messages found' },
        { status: 404 }
      );
    }

    // Reset status to QUEUED for retry
    await prisma.communicationLog.updateMany({
      where: { id: { in: logIds } },
      data: {
        status: 'QUEUED',
        retryCount: { increment: 1 },
        errorMessage: null,
        failedAt: null
      }
    });

    // Import services
    const { WhatsAppService } = await import('@/lib/services/whatsapp.service');
    const { EmailService } = await import('@/lib/services/email.service');

    // Process resend in background
    processResend(logs, WhatsAppService, EmailService);

    return NextResponse.json({
      success: true,
      message: `Queued ${logs.length} messages for resend`
    });
  } catch (error) {
    console.error('Error resending messages:', error);
    return NextResponse.json(
      { error: 'Failed to resend messages' },
      { status: 500 }
    );
  }
}

async function processResend(
  logs: Array<{
    id: string;
    recipientEmail: string | null;
    recipientPhone: string | null;
    content: string;
    subject: string | null;
    messageType: string;
  }>,
  WhatsAppService: {
    sendCustomMessage: (phone: string, message: string) => Promise<boolean>;
  },
  EmailService: {
    sendCustomMessage: (email: string, subject: string, content: string) => Promise<boolean>;
  }
) {
  for (const log of logs) {
    try {
      await prisma.communicationLog.update({
        where: { id: log.id },
        data: { status: 'SENDING' }
      });

      let success = false;
      let errorMessage = '';

      if ((log.messageType === 'WHATSAPP' || log.messageType === 'BOTH') && log.recipientPhone) {
        const sent = await WhatsAppService.sendCustomMessage(log.recipientPhone, log.content);
        if (!sent && log.messageType === 'WHATSAPP') {
          errorMessage = 'WhatsApp send failed';
        } else if (sent) {
          success = true;
        }
      }

      if ((log.messageType === 'EMAIL' || log.messageType === 'BOTH') && log.recipientEmail) {
        const sent = await EmailService.sendCustomMessage(
          log.recipientEmail,
          log.subject || 'Notification',
          log.content
        );
        if (!sent && log.messageType === 'EMAIL') {
          errorMessage = errorMessage || 'Email send failed';
        } else if (sent) {
          success = true;
        }
      }

      await prisma.communicationLog.update({
        where: { id: log.id },
        data: {
          status: success ? 'SENT' : 'FAILED',
          sentAt: success ? new Date() : null,
          failedAt: !success ? new Date() : null,
          errorMessage: !success ? errorMessage : null
        }
      });

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      await prisma.communicationLog.update({
        where: { id: log.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          errorMessage: `Resend error: ${error}`
        }
      });
    }
  }
}