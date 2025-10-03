// app/api/admin/stats/route.ts
import { Activity } from '@/app/admin/dashboard/types';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    monthAgo.setHours(0, 0, 0, 0);

    // tipe sesuai hasil query recentPayments
    type PaymentWithMinimalRelations = Prisma.PaymentGetPayload<{
      include: {
        participant: {
          select: {
            fullName: true;
            category: true;
          };
        };
        communityRegistration: {
          select: {
            communityName: true;
          };
        };
      };
    }>;

    // Parallel queries for better performance
    const [
      totalParticipants,
      confirmedParticipants,
      pendingPayments,
      totalRevenueResult,
      todayRegistrations,
      weekRegistrations,
      lastWeekRegistrations,
      monthRegistrations,
      lastMonthRegistrations,
      categoryStats,
      paymentStats,
,
      recentParticipants,
      recentPayments
    ] = await Promise.all([
      prisma.participant.count({
        where: { registrationStatus: { not: 'CANCELLED' } }
      }),
      prisma.participant.count({
        where: { registrationStatus: 'CONFIRMED' }
      }),
      prisma.payment.count({
        where: { status: 'PENDING' }
      }),
      prisma.payment.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true }
      }),
      prisma.participant.count({
        where: {
          createdAt: { gte: today },
          registrationStatus: { not: 'CANCELLED' }
        }
      }),
      prisma.participant.count({
        where: {
          createdAt: { gte: weekAgo },
          registrationStatus: { not: 'CANCELLED' }
        }
      }),
      prisma.participant.count({
        where: {
          createdAt: {
            gte: new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000),
            lt: weekAgo
          },
          registrationStatus: { not: 'CANCELLED' }
        }
      }),
      prisma.participant.count({
        where: {
          createdAt: { gte: monthAgo },
          registrationStatus: { not: 'CANCELLED' }
        }
      }),
      prisma.participant.count({
        where: {
          createdAt: {
            gte: new Date(monthAgo.getTime() - 30 * 24 * 60 * 60 * 1000),
            lt: monthAgo
          },
          registrationStatus: { not: 'CANCELLED' }
        }
      }),
      prisma.participant.groupBy({
        by: ['category', 'registrationType'],
        where: { registrationStatus: { not: 'CANCELLED' } },
        _count: true
      }),
      prisma.payment.groupBy({
        by: ['status'],
        _count: true
      }),
      prisma.notification.findMany({
        where: {
          createdAt: { gte: weekAgo },
          status: { in: ['SENT', 'PARTIAL'] }
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          participant: {
            select: {
              fullName: true,
              category: true
            }
          }
        }
      }),
      prisma.participant.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          fullName: true,
          category: true,
          registrationType: true,
          createdAt: true,
          registrationStatus: true
        }
      }),
      prisma.payment.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: {
          participant: {
            select: {
              fullName: true,
              category: true
            }
          },
          communityRegistration: {
            select: {
              communityName: true
            }
          }
        }
      })
    ]);

    const weeklyGrowth = lastWeekRegistrations > 0
      ? ((weekRegistrations - lastWeekRegistrations) / lastWeekRegistrations) * 100
      : 100;

    const monthlyGrowth = lastMonthRegistrations > 0
      ? ((monthRegistrations - lastMonthRegistrations) / lastMonthRegistrations) * 100
      : 100;

    const categoryBreakdown = { '5K': 0, '10K': 0, 'COMMUNITY': 0 };
    categoryStats.forEach((stat: { category: string; _count: number; registrationType: string; }) => {
      if (stat.category === '5K') categoryBreakdown['5K'] += stat._count;
      else if (stat.category === '10K') categoryBreakdown['10K'] += stat._count;
      if (stat.registrationType === 'COMMUNITY') categoryBreakdown['COMMUNITY'] += stat._count;
    });

    const paymentStatsProcessed = { total: 0, success: 0, pending: 0, failed: 0, expired: 0 };
    paymentStats.forEach((stat: { _count: number; status: string; }) => {
      paymentStatsProcessed.total += stat._count;
      switch (stat.status) {
        case 'SUCCESS': paymentStatsProcessed.success = stat._count; break;
        case 'PENDING': paymentStatsProcessed.pending = stat._count; break;
        case 'FAILED': paymentStatsProcessed.failed = stat._count; break;
        case 'EXPIRED': paymentStatsProcessed.expired = stat._count; break;
      }
    });

    const registrationTrend = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [registrations, payments] = await Promise.all([
        prisma.participant.count({
          where: {
            createdAt: { gte: date, lt: nextDate },
            registrationStatus: { not: 'CANCELLED' }
          }
        }),
        prisma.payment.count({
          where: {
            createdAt: { gte: date, lt: nextDate },
            status: 'SUCCESS'
          }
        })
      ]);

      registrationTrend.push({
        date: dayNames[date.getDay()],
        registrations,
        payments
      });
    }

    const recentActivities: Activity[] = [];

    recentParticipants.forEach((participant) => {
      const timeDiff = now.getTime() - new Date(participant.createdAt).getTime();
      const timeString = formatTimeAgo(timeDiff);

      recentActivities.push({
        id: `reg-${participant.id}`,
        type: 'registration',
        description: `New registration: ${participant.fullName} (${participant.category})`,
        timestamp: timeString,
        status: participant.registrationStatus === 'CONFIRMED' ? 'success' : 'pending',
        participantId: participant.id
      });
    });

    // gunakan tipe minimal, sesuai query findMany
    recentPayments.forEach((payment: PaymentWithMinimalRelations) => {
      const timeDiff = now.getTime() - new Date(payment.updatedAt).getTime();
      const timeString = formatTimeAgo(timeDiff);

      const name =
        payment.participant?.fullName ||
        payment.communityRegistration?.communityName ||
        "Unknown";

      recentActivities.push({
        id: `pay-${payment.id}`,
        type: 'payment',
        description: `Payment ${payment.status.toLowerCase()}: ${name}`,
        timestamp: timeString,
        status:
          payment.status === 'SUCCESS'
            ? 'success'
            : payment.status === 'FAILED'
              ? 'failed'
              : 'pending',
        paymentId: payment.id
      });
    });

    recentActivities.sort((a, b) => parseTimeAgo(a.timestamp) - parseTimeAgo(b.timestamp));

    return NextResponse.json({
      totalParticipants,
      confirmedParticipants,
      pendingPayments,
      totalRevenue: totalRevenueResult._sum.amount || 0,
      todayRegistrations,
      weeklyGrowth: Math.round(weeklyGrowth * 10) / 10,
      monthlyGrowth: Math.round(monthlyGrowth * 10) / 10,
      categoryBreakdown,
      paymentStats: paymentStatsProcessed,
      registrationTrend,
      recentActivities: recentActivities.slice(0, 10)
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      {
        totalParticipants: 0,
        confirmedParticipants: 0,
        pendingPayments: 0,
        totalRevenue: 0,
        todayRegistrations: 0,
        weeklyGrowth: 0,
        monthlyGrowth: 0,
        categoryBreakdown: { '5K': 0, '10K': 0, 'COMMUNITY': 0 },
        paymentStats: { total: 0, success: 0, pending: 0, failed: 0, expired: 0 },
        registrationTrend: [],
        recentActivities: [],
        error: 'Failed to fetch complete stats'
      },
      { status: 500 }
    );
  }
}

// Helpers
function formatTimeAgo(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

// Ganti kedua versi yang ada dengan satu fungsi ini
function parseTimeAgo(timeString: string): number {
  if (!timeString) return 0;
  // normalize
  const s = timeString.trim().toLowerCase();
  if (s === 'just now') return 0;

  // cocokkan angka + unit (accept singular & plural)
  const match = s.match(/(\d+)\s+(minutes?|hours?|days?)/);
  if (!match) return 0;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  if (unit.startsWith('minute')) return value * 60 * 1000;
  if (unit.startsWith('hour')) return value * 60 * 60 * 1000;
  if (unit.startsWith('day')) return value * 24 * 60 * 60 * 1000;
  return 0;
}