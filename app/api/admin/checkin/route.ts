import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

// GET - Fetch all participants for check-in
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const where: Record<string, unknown> = {};

    if (status) {
      where.checkinStatus = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { registrationCode: { contains: search, mode: 'insensitive' } },
        { bibNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category) {
      where.category = category;
    }

    const [participants, total] = await Promise.all([
      prisma.participant.findMany({
        where,
        include: {
          payment: true,
          community: {
            include: {
              members: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.participant.count({ where })
    ]);

    // Get check-in statistics
    type GroupedCheckin = {
      checkinStatus: string;
      _count: { _all: number };
    };

    const stats = await prisma.participant.groupBy({
      by: ['checkinStatus'],
      _count: { _all: true },
    });

    const formattedStats = {
      total,
      checkedIn: stats.find((s: GroupedCheckin) => s.checkinStatus === 'CHECKED_IN')?._count._all || 0,
      pending: stats.find((s: GroupedCheckin) => s.checkinStatus === 'PENDING')?._count._all || 0,
      noShow: stats.find((s: GroupedCheckin) => s.checkinStatus === 'NO_SHOW')?._count._all || 0,
    };

    return NextResponse.json({
      participants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: formattedStats
    });
  } catch (error) {
    console.error('Check-in fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch check-in data' },
      { status: 500 }
    );
  }
}

// POST - Process check-in
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { participantId, action, notes } = body;

    if (!participantId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate action
    if (!['CHECK_IN', 'UNDO_CHECK_IN', 'MARK_NO_SHOW'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Find participant
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

    // Check if payment is confirmed
    if (participant.payment?.status !== 'PAID') {
      return NextResponse.json(
        { error: 'Payment not confirmed' },
        { status: 400 }
      );
    }

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case 'CHECK_IN':
        if (participant.checkinStatus === 'CHECKED_IN') {
          return NextResponse.json(
            { error: 'Already checked in' },
            { status: 400 }
          );
        }
        updateData = {
          checkinStatus: 'CHECKED_IN',
          checkinTime: new Date(),
          checkinNotes: notes,
          racePackCollected: true,
          racePackCollectedAt: new Date()
        };
        break;

      case 'UNDO_CHECK_IN':
        if (participant.checkinStatus !== 'CHECKED_IN') {
          return NextResponse.json(
            { error: 'Not checked in' },
            { status: 400 }
          );
        }
        updateData = {
          checkinStatus: 'PENDING',
          checkinTime: null,
          checkinNotes: null,
          racePackCollected: false,
          racePackCollectedAt: null
        };
        break;

      case 'MARK_NO_SHOW':
        updateData = {
          checkinStatus: 'NO_SHOW',
          checkinNotes: notes
        };
        break;
    }

    // Update participant
    const updated = await prisma.participant.update({
      where: { id: participantId },
      data: updateData,
      include: {
        payment: true,
        community: true
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: `CHECK_IN_${action}`,
        entityType: 'PARTICIPANT',
        entityId: participantId,
        details: {
          participantName: participant.name,
          action,
          notes,
          performedBy: session.user?.email
        }
      }
    });

    return NextResponse.json({
      success: true,
      participant: updated
    });
  } catch (error) {
    console.error('Check-in process error:', error);
    return NextResponse.json(
      { error: 'Failed to process check-in' },
      { status: 500 }
    );
  }
}

// PATCH - Batch check-in
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { participantIds, action } = body;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid participant IDs' },
        { status: 400 }
      );
    }

    const results = {
      success: [] as string[],
      failed: [] as { id: string; reason: string }[]
    };

    for (const id of participantIds) {
      try {
        const participant = await prisma.participant.findUnique({
          where: { id },
          include: { payment: true }
        });

        if (!participant) {
          results.failed.push({ id, reason: 'Not found' });
          continue;
        }

        if (participant.payment?.status !== 'PAID') {
          results.failed.push({ id, reason: 'Payment not confirmed' });
          continue;
        }

        if (action === 'CHECK_IN' && participant.checkinStatus === 'CHECKED_IN') {
          results.failed.push({ id, reason: 'Already checked in' });
          continue;
        }

        await prisma.participant.update({
          where: { id },
          data: {
            checkinStatus: action === 'CHECK_IN' ? 'CHECKED_IN' : 'PENDING',
            checkinTime: action === 'CHECK_IN' ? new Date() : null,
            racePackCollected: action === 'CHECK_IN',
            racePackCollectedAt: action === 'CHECK_IN' ? new Date() : null
          }
        });

        results.success.push(id);
      } catch (error) {
        results.failed.push({ id, reason: 'Processing error' });
      }
    }

    return NextResponse.json({
      results,
      message: `Successfully processed ${results.success.length} participants`
    });
  } catch (error) {
    console.error('Batch check-in error:', error);
    return NextResponse.json(
      { error: 'Failed to process batch check-in' },
      { status: 500 }
    );
  }
}