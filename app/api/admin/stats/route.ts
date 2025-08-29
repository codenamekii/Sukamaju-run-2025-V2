import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [
      totalParticipants,
      confirmedParticipants,
      pendingPayments,
      totalRevenueResult,
      count5K,
      count10K,
      countCommunity
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
        where: { category: '5K', registrationStatus: { not: 'CANCELLED' } }
      }),
      prisma.participant.count({
        where: { category: '10K', registrationStatus: { not: 'CANCELLED' } }
      }),
      prisma.participant.count({
        where: { registrationType: 'COMMUNITY', registrationStatus: { not: 'CANCELLED' } }
      })
    ]);

    return NextResponse.json({
      totalParticipants: totalParticipants,
      confirmedParticipants: confirmedParticipants,
      pendingPayments: pendingPayments,
      totalRevenue: totalRevenueResult._sum.amount ?? 0,
      categoryBreakdown: {
        '5K': count5K,
        '10K': count10K,
        'COMMUNITY': countCommunity
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({
      totalParticipants: 0,
      confirmedParticipants: 0,
      pendingPayments: 0,
      totalRevenue: 0,
      categoryBreakdown: {
        '5K': 0,
        '10K': 0,
        'COMMUNITY': 0
      },
      error: 'Failed to fetch complete stats'
    });
  }
}