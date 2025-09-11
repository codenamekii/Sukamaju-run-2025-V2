// app/api/admin/racepacks/route.ts
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch race pack inventory and distribution data
export async function GET(request: NextRequest) {
  try {
    // Get inventory by category
    const categories = ['5K', '10K'];
    const inventory = await Promise.all(
      categories.map(async (category) => {
        const total = await prisma.participant.count({
          where: {
            category,
            registrationStatus: 'CONFIRMED'
          }
        });

        const distributed = await prisma.racePack.count({
          where: {
            isCollected: true,
            participant: {
              category
            }
          }
        });

        return {
          category,
          total,
          distributed,
          remaining: total - distributed
        };
      })
    );

    // Get recent distributions
    const recentDistributions = await prisma.racePack.findMany({
      where: {
        isCollected: true,
        collectedAt: {
          not: null
        }
      },
      include: {
        participant: {
          select: {
            fullName: true,
            bibNumber: true,
            category: true,
            jerseySize: true
          }
        }
      },
      orderBy: {
        collectedAt: 'desc'
      },
      take: 20
    });

    // Transform recent distributions
    const transformedDistributions = recentDistributions.map(rp => ({
      id: rp.id,
      name: rp.participant.fullName,
      bibNumber: rp.participant.bibNumber || '',
      category: rp.participant.category,
      racePackCollectedAt: rp.collectedAt?.toISOString() || '',
      racePackItems: {
        items: ['BIB Number', 'Timing Chip', 'Goodie Bag'],
        tshirtSize: rp.participant.jerseySize,
        notes: rp.notes || ''
      }
    }));

    // Pack contents configuration
    const packContents = {
      '5K': {
        items: [
          'BIB Number dengan Timing Chip',
          'Goodie Bag',
          'Route Map',
          'Safety Pins (4 pcs)',
          'Event Guide'
        ],
        extras: [
          'Jersey (jika dipesan)',
          'Voucher Sponsor'
        ]
      },
      '10K': {
        items: [
          'BIB Number dengan Timing Chip',
          'Goodie Bag Premium',
          'Route Map',
          'Safety Pins (4 pcs)',
          'Event Guide',
          'Energy Gel (2 pcs)'
        ],
        extras: [
          'Jersey (jika dipesan)',
          'Voucher Sponsor',
          'Finisher Certificate (post-event)'
        ]
      }
    };

    return NextResponse.json({
      inventory,
      recentDistributions: transformedDistributions,
      packContents
    });

  } catch (error) {
    console.error('Error fetching race pack data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch race pack data' },
      { status: 500 }
    );
  }
}

// POST - Collect race pack (manual from race packs page)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participantId, items, tshirtSize, notes } = body;

    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      );
    }

    // Get participant
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: { racePack: true }
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    if (participant.registrationStatus !== 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Participant registration not confirmed' },
        { status: 400 }
      );
    }

    // Create or update race pack
    let racePack;
    if (participant.racePack) {
      if (participant.racePack.isCollected) {
        return NextResponse.json(
          {
            error: 'Race pack already collected',
            collectedAt: participant.racePack.collectedAt
          },
          { status: 400 }
        );
      }

      racePack = await prisma.racePack.update({
        where: { id: participant.racePack.id },
        data: {
          isCollected: true,
          collectedAt: new Date(),
          collectedBy: 'admin',
          notes: notes || `Items: ${items?.join(', ') || 'Standard pack'}. Jersey: ${tshirtSize || participant.jerseySize}`
        }
      });
    } else {
      const qrCode = `BM2025-QR-${participantId}-${Date.now().toString(36)}`;

      racePack = await prisma.racePack.create({
        data: {
          participantId,
          qrCode,
          isCollected: true,
          collectedAt: new Date(),
          collectedBy: 'admin',
          hasJersey: participant.jerseyAddOn > 0 || tshirtSize !== undefined,
          hasBib: true,
          hasGoodieBag: true,
          hasMedal: false,
          notes: notes || `Items: ${items?.join(', ') || 'Standard pack'}. Jersey: ${tshirtSize || participant.jerseySize}`
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Race pack collected successfully',
      racePack
    });

  } catch (error) {
    console.error('Error collecting race pack:', error);
    return NextResponse.json(
      { error: 'Failed to collect race pack' },
      { status: 500 }
    );
  }
}

// =====================================
// app/api/admin/racepacks/stats/route.ts
// =====================================

export async function GET_STATS() {
  try {
    const total = await prisma.participant.count({
      where: { registrationStatus: 'CONFIRMED' }
    });

    const collected = await prisma.racePack.count({
      where: { isCollected: true }
    });

    const pending = total - collected;

    return NextResponse.json({
      total,
      collected,
      pending
    });

  } catch (error) {
    console.error('Error fetching race pack stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}