import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

// GET - Fetch race pack inventory and distribution status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    // Get race pack inventory by category
    const inventory = await prisma.$queryRaw`
      SELECT 
        category,
        COUNT(*) as total,
        SUM(CASE WHEN "racePackCollected" = true THEN 1 ELSE 0 END) as distributed,
        SUM(CASE WHEN "racePackCollected" = false THEN 1 ELSE 0 END) as remaining
      FROM "Participant"
      WHERE "paymentStatus" = 'PAID'
      GROUP BY category
    `;

    // Get recent distributions
    const recentDistributions = await prisma.participant.findMany({
      where: {
        racePackCollected: true,
        racePackCollectedAt: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        bibNumber: true,
        category: true,
        racePackCollectedAt: true,
        racePackItems: true
      },
      orderBy: {
        racePackCollectedAt: 'desc'
      },
      take: 10
    });

    // Get pack contents configuration
    const packContents = {
      '5K': {
        items: ['Race Bib', 'Timing Chip', 'Event T-Shirt (S/M/L/XL)', 'Runner Guide', 'Safety Pins'],
        extras: ['Energy Gel x1', 'Water Bottle']
      },
      '10K': {
        items: ['Race Bib', 'Timing Chip', 'Event T-Shirt (S/M/L/XL)', 'Runner Guide', 'Safety Pins'],
        extras: ['Energy Gel x2', 'Water Bottle', 'Sweat Band']
      }
    };

    return NextResponse.json({
      inventory,
      recentDistributions,
      packContents
    });
  } catch (error) {
    console.error('Race packs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch race pack data' },
      { status: 500 }
    );
  }
}

// POST - Record race pack collection
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { participantId, items, tshirtSize, notes } = body;

    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID required' },
        { status: 400 }
      );
    }

    // Check if participant exists and is eligible
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: { payment: true }
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    if (participant.payment?.status !== 'PAID') {
      return NextResponse.json(
        { error: 'Payment not confirmed' },
        { status: 400 }
      );
    }

    if (participant.racePackCollected) {
      return NextResponse.json(
        { error: 'Race pack already collected' },
        { status: 400 }
      );
    }

    // Update participant record
    const updated = await prisma.participant.update({
      where: { id: participantId },
      data: {
        racePackCollected: true,
        racePackCollectedAt: new Date(),
        racePackItems: {
          items: items || [],
          tshirtSize: tshirtSize || 'M',
          notes: notes || '',
          collectedBy: session.user?.email
        }
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'RACE_PACK_COLLECTED',
        entityType: 'PARTICIPANT',
        entityId: participantId,
        details: {
          participantName: participant.name,
          bibNumber: participant.bibNumber,
          category: participant.category,
          items,
          tshirtSize,
          collectedBy: session.user?.email
        }
      }
    });

    return NextResponse.json({
      success: true,
      participant: updated
    });
  } catch (error) {
    console.error('Race pack collection error:', error);
    return NextResponse.json(
      { error: 'Failed to record collection' },
      { status: 500 }
    );
  }
}