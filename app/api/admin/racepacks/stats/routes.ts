// app/api/admin/racepacks/stats/routes.ts
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

// Helper to get eligible participants filter
function getEligibleParticipantsFilter(): Prisma.ParticipantWhereInput {
  return {
    OR: [
      { registrationStatus: 'CONFIRMED' },
      { registrationStatus: 'IMPORTED' },
      {
        payments: {
          some: { status: 'SUCCESS' }
        }
      }
    ]
  };
}

export async function GET() {
  try {
    // Get total eligible participants
    const total = await prisma.participant.count({
      where: getEligibleParticipantsFilter()
    });

    // Get collected count
    const collected = await prisma.racePack.count({
      where: {
        isCollected: true,
        participant: getEligibleParticipantsFilter()
      }
    });

    const pending = total - collected;

    // Get collection rate by category with proper filtering
    const [
      total5K,
      collected5K,
      total10K,
      collected10K,
      withJersey5K,
      withJersey10K
    ] = await Promise.all([
      // 5K Total
      prisma.participant.count({
        where: {
          category: '5K',
          ...getEligibleParticipantsFilter()
        }
      }),
      // 5K Collected
      prisma.racePack.count({
        where: {
          isCollected: true,
          participant: {
            category: '5K',
            ...getEligibleParticipantsFilter()
          }
        }
      }),
      // 10K Total
      prisma.participant.count({
        where: {
          category: '10K',
          ...getEligibleParticipantsFilter()
        }
      }),
      // 10K Collected
      prisma.racePack.count({
        where: {
          isCollected: true,
          participant: {
            category: '10K',
            ...getEligibleParticipantsFilter()
          }
        }
      }),
      // 5K with Jersey
      prisma.participant.count({
        where: {
          category: '5K',
          jerseyAddOn: { gt: 0 },
          ...getEligibleParticipantsFilter()
        }
      }),
      // 10K with Jersey
      prisma.participant.count({
        where: {
          category: '10K',
          jerseyAddOn: { gt: 0 },
          ...getEligibleParticipantsFilter()
        }
      })
    ]);

    // Get collection timeline (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyCollections = await prisma.racePack.groupBy({
      by: ['collectedAt'],
      where: {
        isCollected: true,
        collectedAt: {
          gte: sevenDaysAgo
        }
      },
      _count: true
    });

    // Get today's collections
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCollected = await prisma.racePack.count({
      where: {
        isCollected: true,
        collectedAt: {
          gte: today
        }
      }
    });

    return NextResponse.json({
      total,
      collected,
      pending,
      todayCollected,
      percentageCollected: total > 0 ? Math.round((collected / total) * 100) : 0,
      categories: {
        '5K': {
          total: total5K,
          collected: collected5K,
          pending: total5K - collected5K,
          withJersey: withJersey5K,
          percentage: total5K > 0 ? Math.round((collected5K / total5K) * 100) : 0
        },
        '10K': {
          total: total10K,
          collected: collected10K,
          pending: total10K - collected10K,
          withJersey: withJersey10K,
          percentage: total10K > 0 ? Math.round((collected10K / total10K) * 100) : 0
        }
      },
      timeline: dailyCollections
    });

  } catch (error) {
    console.error('Error fetching race pack stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}