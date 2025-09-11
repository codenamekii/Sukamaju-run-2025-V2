// app/api/admin/checkin/route.ts
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch participants for check-in page
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Filters
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const category = searchParams.get('category') || 'all';

    // Build where clause
    const where: Prisma.ParticipantWhereInput = {
      registrationStatus: 'CONFIRMED' // Only show confirmed participants
    };

    // Search filter
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { registrationCode: { contains: search, mode: 'insensitive' } },
        { bibNumber: { contains: search } }
      ];
    }

    // Category filter
    if (category !== 'all') {
      where.category = category;
    }

    // Status filter (based on racePack collection status)
    if (status === 'COLLECTED') {
      where.racePack = {
        isCollected: true
      };
    } else if (status === 'PENDING') {
      where.OR = [
        { racePack: { isCollected: false } },
        { racePack: null }
      ];
    }

    // Get participants with race pack info
    const [participants, total] = await Promise.all([
      prisma.participant.findMany({
        where,
        include: {
          racePack: true,
          payments: {
            where: { status: 'SUCCESS' },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          communityMember: {
            include: {
              communityRegistration: {
                select: {
                  communityName: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.participant.count({ where })
    ]);

    // Calculate stats
    const stats = await prisma.racePack.aggregate({
      where: {
        participant: {
          registrationStatus: 'CONFIRMED'
        }
      },
      _count: {
        _all: true,
        isCollected: true
      }
    });

    const totalConfirmed = await prisma.participant.count({
      where: { registrationStatus: 'CONFIRMED' }
    });

    const collected = await prisma.racePack.count({
      where: { isCollected: true }
    });

    // Transform data for frontend
    const transformedParticipants = participants.map(p => ({
      id: p.id,
      registrationCode: p.registrationCode,
      bibNumber: p.bibNumber || '',
      name: p.fullName,
      email: p.email,
      phone: p.whatsapp,
      category: p.category,
      checkinStatus: p.racePack?.isCollected ? 'COLLECTED' : 'PENDING',
      checkinTime: p.racePack?.collectedAt?.toISOString() || null,
      checkinNotes: p.racePack?.notes || null,
      racePackCollected: p.racePack?.isCollected || false,
      racePackCollectedAt: p.racePack?.collectedAt?.toISOString() || null,
      racePackQrCode: p.racePack?.qrCode || null,
      payment: {
        status: p.payments[0]?.status || 'NO_PAYMENT',
        amount: p.payments[0]?.amount || 0
      },
      community: p.communityMember ? {
        name: p.communityMember.communityRegistration?.communityName || '',
        members: []
      } : undefined,
      createdAt: p.createdAt.toISOString()
    }));

    return NextResponse.json({
      participants: transformedParticipants,
      stats: {
        total: totalConfirmed,
        checkedIn: collected,
        pending: totalConfirmed - collected,
        noShow: 0 // Not applicable for race pack collection
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching check-in data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch check-in data' },
      { status: 500 }
    );
  }
}

// POST - Collect race pack (single or via QR scan)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participantId, qrCode, action, collectorInfo } = body;

    // Handle QR code scan
    if (qrCode && !participantId) {
      // Parse QR code format: BM2025-QR-[PARTICIPANT_ID]-[CHECKSUM]
      const qrParts = qrCode.split('-');
      if (qrParts.length < 3 || qrParts[0] !== 'BM2025' || qrParts[1] !== 'QR') {
        return NextResponse.json(
          { error: 'Invalid QR code format' },
          { status: 400 }
        );
      }

      const extractedParticipantId = qrParts[2];

      // Find participant by ID or by QR code in racePack
      const participant = await prisma.participant.findFirst({
        where: {
          OR: [
            { id: extractedParticipantId },
            { racePack: { qrCode } }
          ]
        },
        include: {
          racePack: true
        }
      });

      if (!participant) {
        return NextResponse.json(
          {
            error: 'Participant not found',
            details: 'QR code tidak valid atau peserta tidak terdaftar'
          },
          { status: 404 }
        );
      }

      // Check if already collected
      if (participant.racePack?.isCollected) {
        return NextResponse.json(
          {
            error: 'Race pack already collected',
            details: `Sudah diambil pada ${new Date(participant.racePack.collectedAt!).toLocaleString('id-ID')}`,
            participant: {
              name: participant.fullName,
              bibNumber: participant.bibNumber,
              category: participant.category,
              collectedAt: participant.racePack.collectedAt
            }
          },
          { status: 400 }
        );
      }

      // Perform collection
      return await collectRacePack(participant.id, collectorInfo);
    }

    // Handle manual action
    if (participantId && action) {
      switch (action) {
        case 'CHECK_IN':
        case 'COLLECT':
          return await collectRacePack(participantId, collectorInfo);

        case 'UNDO_CHECK_IN':
        case 'UNCOLLECT':
          return await undoCollection(participantId);

        default:
          return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
          );
      }
    }

    return NextResponse.json(
      { error: 'Invalid request parameters' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error processing check-in:', error);
    return NextResponse.json(
      { error: 'Failed to process check-in' },
      { status: 500 }
    );
  }
}

// PATCH - Batch operations
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { participantIds, action } = body;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid participant IDs' },
        { status: 400 }
      );
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const participantId of participantIds) {
      try {
        if (action === 'CHECK_IN' || action === 'COLLECT') {
          const result = await collectRacePack(participantId, {
            method: 'batch',
            timestamp: new Date().toISOString()
          });
          if (result.status === 200) {
            successCount++;
          } else {
            failedCount++;
            errors.push(`Failed for ${participantId}`);
          }
        } else if (action === 'UNDO_CHECK_IN' || action === 'UNCOLLECT') {
          const result = await undoCollection(participantId);
          if (result.status === 200) {
            successCount++;
          } else {
            failedCount++;
            errors.push(`Failed for ${participantId}`);
          }
        }
      } catch (err) {
        failedCount++;
        errors.push(`Error for ${participantId}: ${err}`);
      }
    }

    return NextResponse.json({
      success: true,
      processed: successCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error in batch operation:', error);
    return NextResponse.json(
      { error: 'Batch operation failed' },
      { status: 500 }
    );
  }
}

// Helper function to collect race pack
async function collectRacePack(
  participantId: string,
  collectorInfo?: Record<string, unknown>
): Promise<NextResponse> {
  try {
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
        {
          error: 'Participant not confirmed',
          details: 'Peserta belum melakukan pembayaran'
        },
        { status: 400 }
      );
    }

    // Create or update race pack
    let racePack;
    if (participant.racePack) {
      if (participant.racePack.isCollected) {
        return NextResponse.json(
          {
            error: 'Already collected',
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
          notes: collectorInfo ? JSON.stringify(collectorInfo) : null
        }
      });
    } else {
      // Generate QR code for new race pack
      const qrCode = `BM2025-QR-${participantId}-${Date.now().toString(36)}`;

      racePack = await prisma.racePack.create({
        data: {
          participantId,
          qrCode,
          isCollected: true,
          collectedAt: new Date(),
          collectedBy: 'admin',
          hasJersey: participant.jerseyAddOn > 0,
          hasBib: true,
          hasGoodieBag: true,
          hasMedal: false,
          notes: collectorInfo ? JSON.stringify(collectorInfo) : null
        }
      });
    }

    // Log the collection
    await prisma.notification.create({
      data: {
        participantId,
        type: 'WHATSAPP',
        category: 'INFO',
        subject: 'Race Pack Collected',
        message: `Race pack collected for ${participant.fullName} (BIB: ${participant.bibNumber})`,
        status: 'SENT',
        sentAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      participant: {
        id: participant.id,
        name: participant.fullName,
        bibNumber: participant.bibNumber,
        category: participant.category,
        jerseySize: participant.jerseySize
      },
      racePack: {
        qrCode: racePack.qrCode,
        collectedAt: racePack.collectedAt,
        hasJersey: racePack.hasJersey,
        hasBib: racePack.hasBib,
        hasGoodieBag: racePack.hasGoodieBag
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

// Helper function to undo collection
async function undoCollection(participantId: string): Promise<NextResponse> {
  try {
    const racePack = await prisma.racePack.findUnique({
      where: { participantId }
    });

    if (!racePack) {
      return NextResponse.json(
        { error: 'No race pack record found' },
        { status: 404 }
      );
    }

    if (!racePack.isCollected) {
      return NextResponse.json(
        { error: 'Race pack not collected yet' },
        { status: 400 }
      );
    }

    await prisma.racePack.update({
      where: { id: racePack.id },
      data: {
        isCollected: false,
        collectedAt: null,
        collectedBy: null
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Collection undone successfully'
    });

  } catch (error) {
    console.error('Error undoing collection:', error);
    return NextResponse.json(
      { error: 'Failed to undo collection' },
      { status: 500 }
    );
  }
}