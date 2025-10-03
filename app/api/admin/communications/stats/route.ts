// app/api/admin/communications/stats/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

interface MessageStats {
  sent: number;
  failed: number;
  pending: number;
  total: number;
}

interface CommunicationStats {
  today: {
    email: MessageStats;
    whatsapp: MessageStats;
    total: MessageStats;
  };
  week: {
    email: MessageStats;
    whatsapp: MessageStats;
    total: MessageStats;
  };
  month: {
    email: MessageStats;
    whatsapp: MessageStats;
    total: MessageStats;
  };
}

export async function GET() {
  try {
    const now = new Date();

    // Calculate date ranges
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now);
    monthStart.setDate(monthStart.getDate() - 30);
    monthStart.setHours(0, 0, 0, 0);

    // Get stats for different periods
    const [todayStats, weekStats, monthStats] = await Promise.all([
      getStatsForPeriod(todayStart, now),
      getStatsForPeriod(weekStart, now),
      getStatsForPeriod(monthStart, now)
    ]);

    const stats: CommunicationStats = {
      today: todayStats,
      week: weekStats,
      month: monthStats
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching communication stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch communication stats' },
      { status: 500 }
    );
  }
}

async function getStatsForPeriod(startDate: Date, endDate: Date) {
  const logs = await prisma.communicationLog.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      messageType: true,
      status: true
    }
  });

  const stats = {
    email: { sent: 0, failed: 0, pending: 0, total: 0 },
    whatsapp: { sent: 0, failed: 0, pending: 0, total: 0 },
    total: { sent: 0, failed: 0, pending: 0, total: 0 }
  };

  for (const log of logs) {
    const type = log.messageType.toLowerCase() as 'email' | 'whatsapp';

    // Handle BOTH type
    if (log.messageType === 'BOTH') {
      // Count for both email and whatsapp
      if (log.status === 'SENT') {
        stats.email.sent++;
        stats.whatsapp.sent++;
        stats.total.sent += 2;
      } else if (log.status === 'FAILED') {
        stats.email.failed++;
        stats.whatsapp.failed++;
        stats.total.failed += 2;
      } else if (log.status === 'QUEUED' || log.status === 'SENDING') {
        stats.email.pending++;
        stats.whatsapp.pending++;
        stats.total.pending += 2;
      }
      stats.email.total++;
      stats.whatsapp.total++;
      stats.total.total += 2;
    } else if (type === 'email' || type === 'whatsapp') {
      // Single type
      if (log.status === 'SENT') {
        stats[type].sent++;
        stats.total.sent++;
      } else if (log.status === 'FAILED') {
        stats[type].failed++;
        stats.total.failed++;
      } else if (log.status === 'QUEUED' || log.status === 'SENDING') {
        stats[type].pending++;
        stats.total.pending++;
      }
      stats[type].total++;
      stats.total.total++;
    }
  }

  return stats;
}