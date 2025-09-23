// app/api/admin/racepacks/route.ts
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

interface RacePackItem {
  name: string;
  quantity?: number;
  size?: string;
}

interface CollectionNote {
  items?: string[];
  tshirtSize?: string;
  notes?: string;
  collectorName?: string;
  collectorPhone?: string;
}

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

// GET - Fetch race pack inventory and distribution data
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || 'all';
    const search = searchParams.get('search') || '';

    // Get inventory by category
    const categories = ['5K', '10K'];
    const inventory = await Promise.all(
      categories.map(async (cat) => {
        // Get total eligible participants
        const total = await prisma.participant.count({
          where: {
            category: cat,
            ...getEligibleParticipantsFilter()
          }
        });

        // Get distributed count
        const distributed = await prisma.racePack.count({
          where: {
            isCollected: true,
            participant: {
              category: cat,
              ...getEligibleParticipantsFilter()
            }
          }
        });

        // Get jersey count for this category
        const withJersey = await prisma.participant.count({
          where: {
            category: cat,
            jerseyAddOn: { gt: 0 },
            ...getEligibleParticipantsFilter()
          }
        });

        return {
          category: cat,
          total,
          distributed,
          remaining: total - distributed,
          withJersey,
          percentageCollected: total > 0 ? Math.round((distributed / total) * 100) : 0
        };
      })
    );

    // Build where clause for recent distributions
    const recentWhere: Prisma.RacePackWhereInput = {
      isCollected: true,
      collectedAt: { not: null }
    };

    if (category !== 'all') {
      recentWhere.participant = {
        category,
        ...getEligibleParticipantsFilter()
      };
    } else {
      recentWhere.participant = getEligibleParticipantsFilter();
    }

    if (search) {
      recentWhere.participant = {
        ...recentWhere.participant,
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { bibNumber: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    // Get recent distributions
    const recentDistributions = await prisma.racePack.findMany({
      where: recentWhere,
      include: {
        participant: {
          select: {
            id: true,
            fullName: true,
            bibNumber: true,
            category: true,
            jerseySize: true,
            jerseyAddOn: true,
            email: true,
            whatsapp: true
          }
        }
      },
      orderBy: {
        collectedAt: 'desc'
      },
      take: 50
    });

    // Transform recent distributions
    const transformedDistributions = recentDistributions.map(rp => ({
      id: rp.id,
      participantId: rp.participant.id,
      name: rp.participant.fullName,
      bibNumber: rp.participant.bibNumber || 'N/A',
      category: rp.participant.category,
      email: rp.participant.email,
      phone: rp.participant.whatsapp,
      racePackCollectedAt: rp.collectedAt?.toISOString() || '',
      collectedBy: rp.collectedBy || 'Unknown',
      collectorName: rp.collectorName,
      collectorPhone: rp.collectorPhone,
      racePackItems: {
        hasBib: rp.hasBib,
        hasJersey: rp.hasJersey,
        hasGoodieBag: rp.hasGoodieBag,
        hasMedal: rp.hasMedal,
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

    // Calculate overall stats
    const totalStats = {
      totalParticipants: inventory.reduce((sum, cat) => sum + cat.total, 0),
      totalDistributed: inventory.reduce((sum, cat) => sum + cat.distributed, 0),
      totalRemaining: inventory.reduce((sum, cat) => sum + cat.remaining, 0),
      totalWithJersey: inventory.reduce((sum, cat) => sum + cat.withJersey, 0),
      overallPercentage: 0
    };

    if (totalStats.totalParticipants > 0) {
      totalStats.overallPercentage = Math.round(
        (totalStats.totalDistributed / totalStats.totalParticipants) * 100
      );
    }

    return NextResponse.json({
      inventory,
      recentDistributions: transformedDistributions,
      packContents,
      stats: totalStats
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
    const {
      participantId,
      collectorName,
      collectorPhone,
      collectorRelation,
      notes
    } = body;

    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      );
    }

    // Get participant with payments
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        racePack: true,
        payments: {
          where: { status: 'SUCCESS' },
          take: 1
        }
      }
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    // Check if participant is eligible
    const isEligible =
      participant.registrationStatus === 'CONFIRMED' ||
      participant.registrationStatus === 'IMPORTED' ||
      participant.payments.length > 0;

    if (!isEligible) {
      return NextResponse.json(
        { error: 'Participant not eligible for race pack collection' },
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
            collectedAt: participant.racePack.collectedAt,
            collectedBy: participant.racePack.collectedBy
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
          collectorName,
          collectorPhone,
          hasJersey: participant.jerseyAddOn > 0,
          hasBib: true,
          hasGoodieBag: true,
          hasMedal: false,
          notes: notes || `Collected by: ${collectorName || 'Self'}. Relation: ${collectorRelation || 'Participant'}`
        }
      });
    } else {
      // Generate QR code
      const qrCode = `RP${participant.bibNumber || participant.id.substring(0, 8).toUpperCase()}`;

      racePack = await prisma.racePack.create({
        data: {
          participantId,
          qrCode,
          isCollected: true,
          collectedAt: new Date(),
          collectedBy: 'admin',
          collectorName,
          collectorPhone,
          hasJersey: participant.jerseyAddOn > 0,
          hasBib: true,
          hasGoodieBag: true,
          hasMedal: false,
          notes: notes || `Collected by: ${collectorName || 'Self'}. Relation: ${collectorRelation || 'Participant'}`
        }
      });
    }

    // Create check-in record
    await prisma.checkIn.upsert({
      where: {
        participantId_checkPoint: {
          participantId,
          checkPoint: 'RACE_PACK_COLLECTION'
        }
      },
      update: {
        checkTime: new Date(),
        verifiedBy: 'admin',
        verificationMethod: 'MANUAL'
      },
      create: {
        participantId,
        checkPoint: 'RACE_PACK_COLLECTION',
        checkTime: new Date(),
        verifiedBy: 'admin',
        verificationMethod: 'MANUAL'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Race pack collected successfully',
      racePack: {
        id: racePack.id,
        qrCode: racePack.qrCode,
        collectedAt: racePack.collectedAt,
        collectedBy: racePack.collectedBy,
        items: {
          bib: racePack.hasBib,
          jersey: racePack.hasJersey,
          goodieBag: racePack.hasGoodieBag,
          medal: racePack.hasMedal
        }
      },
      participant: {
        id: participant.id,
        name: participant.fullName,
        bibNumber: participant.bibNumber,
        category: participant.category,
        jerseySize: participant.jerseySize
      }
    });

  } catch (error) {
    console.error('Error collecting race pack:', error);
    return NextResponse.json(
      { error: 'Failed to collect race pack' },
      { status: 500 }
    );
  }
}

// PATCH - Update race pack details
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { racePackId, updates } = body;

    if (!racePackId) {
      return NextResponse.json(
        { error: 'Race pack ID is required' },
        { status: 400 }
      );
    }

    const racePack = await prisma.racePack.findUnique({
      where: { id: racePackId }
    });

    if (!racePack) {
      return NextResponse.json(
        { error: 'Race pack not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.racePack.update({
      where: { id: racePackId },
      data: updates
    });

    return NextResponse.json({
      success: true,
      racePack: updated
    });

  } catch (error) {
    console.error('Error updating race pack:', error);
    return NextResponse.json(
      { error: 'Failed to update race pack' },
      { status: 500 }
    );
  }
}