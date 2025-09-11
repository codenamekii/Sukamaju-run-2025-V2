// app/api/admin/racepacks/stats/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const total = await prisma.participant.count({
      where: { registrationStatus: 'CONFIRMED' }
    });

    const collected = await prisma.racePack.count({
      where: { isCollected: true }
    });

    const pending = total - collected;

    // Get collection rate by category
    const categoryStats = await Promise.all([
      prisma.participant.count({
        where: {
          category: '5K',
          registrationStatus: 'CONFIRMED'
        }
      }),
      prisma.racePack.count({
        where: {
          isCollected: true,
          participant: {
            category: '5K'
          }
        }
      }),
      prisma.participant.count({
        where: {
          category: '10K',
          registrationStatus: 'CONFIRMED'
        }
      }),
      prisma.racePack.count({
        where: {
          isCollected: true,
          participant: {
            category: '10K'
          }
        }
      })
    ]);

    return NextResponse.json({
      total,
      collected,
      pending,
      categories: {
        '5K': {
          total: categoryStats[0],
          collected: categoryStats[1],
          pending: categoryStats[0] - categoryStats[1]
        },
        '10K': {
          total: categoryStats[2],
          collected: categoryStats[3],
          pending: categoryStats[2] - categoryStats[3]
        }
      }
    });

  } catch (error) {
    console.error('Error fetching race pack stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}