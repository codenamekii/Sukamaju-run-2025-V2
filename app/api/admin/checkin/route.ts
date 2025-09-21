// app/api/admin/checkin/route.ts
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

interface CollectorInfo {
  name?: string;
  phone?: string;
  relation?: string;
  method?: string;
  timestamp?: string;
  notes?: string;
}

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

    // Build where clause - Include CONFIRMED, IMPORTED, and participants with successful payments
    const where: Prisma.ParticipantWhereInput = {
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

    // Search filter
    if (search) {
      where.AND = {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { registrationCode: { contains: search, mode: 'insensitive' } },
          { bibNumber: { contains: search } },
          { whatsapp: { contains: search } }
        ]
      };
    }

    // Category filter
    if (category !== 'all') {
      where.category = category;
    }

    // Status filter based on race pack collection
    if (status === 'CHECKED_IN') {
      where.racePack = {
        isCollected: true
      };
    } else if (status === 'PENDING') {
      where.OR = [
        { racePack: { isCollected: false } },
        { racePack: null }
      ];
    } else if (status === 'NO_SHOW') {
      // For future implementation of no-show tracking
      where.racePack = {
        notes: { contains: 'NO_SHOW' }
      };
    }

    // Get participants with all related data
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
                  id: true,
                  communityName: true,
                  totalMembers: true
                }
              }
            }
          },
          checkIns: {
            orderBy: { checkTime: 'desc' },
            take: 1
          }
        },
        orderBy: [
          { bibNumber: 'asc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.participant.count({ where })
    ]);

    // Calculate comprehensive stats
    const [totalEligible, totalCollected, totalPending] = await Promise.all([
      prisma.participant.count({
        where: {
          OR: [
            { registrationStatus: 'CONFIRMED' },
            { registrationStatus: 'IMPORTED' },
            { payments: { some: { status: 'SUCCESS' } } }
          ]
        }
      }),
      prisma.racePack.count({
        where: {
          isCollected: true,
          participant: {
            OR: [
              { registrationStatus: 'CONFIRMED' },
              { registrationStatus: 'IMPORTED' },
              { payments: { some: { status: 'SUCCESS' } } }
            ]
          }
        }
      }),
      prisma.participant.count({
        where: {
          OR: [
            { registrationStatus: 'CONFIRMED' },
            { registrationStatus: 'IMPORTED' },
            { payments: { some: { status: 'SUCCESS' } } }
          ],
          AND: [
            {
              OR: [
                { racePack: { isCollected: false } }, // sudah ada racepack tapi belum diambil
                { racePack: { is: null } }            // belum punya racepack sama sekali
              ]
            }
          ]
        }
      })
    ]);

    // Transform data for frontend
    const transformedParticipants = participants.map(p => {
      // Determine check-in status
      let checkinStatus: 'PENDING' | 'CHECKED_IN' | 'NO_SHOW' = 'PENDING';
      if (p.racePack?.isCollected) {
        checkinStatus = 'CHECKED_IN';
      } else if (p.racePack?.notes?.includes('NO_SHOW')) {
        checkinStatus = 'NO_SHOW';
      }

      return {
        id: p.id,
        registrationCode: p.registrationCode,
        bibNumber: p.bibNumber || '',
        name: p.fullName,
        email: p.email,
        phone: p.whatsapp,
        category: p.category,
        registrationStatus: p.registrationStatus,
        checkinStatus,
        checkinTime: p.racePack?.collectedAt?.toISOString() || null,
        checkinNotes: p.racePack?.notes || null,
        racePackCollected: p.racePack?.isCollected || false,
        racePackCollectedAt: p.racePack?.collectedAt?.toISOString() || null,
        racePackQrCode: p.racePack?.qrCode || null,
        racePackDetails: p.racePack ? {
          hasJersey: p.racePack.hasJersey,
          hasBib: p.racePack.hasBib,
          hasMedal: p.racePack.hasMedal,
          hasGoodieBag: p.racePack.hasGoodieBag,
          collectorName: p.racePack.collectorName,
          collectorPhone: p.racePack.collectorPhone
        } : null,
        payment: {
          status: p.payments[0]?.status || 'NO_PAYMENT',
          amount: p.payments[0]?.amount || 0,
          paidAt: p.payments[0]?.paidAt?.toISOString() || null
        },
        community: p.communityMember ? {
          id: p.communityMember.communityRegistration?.id || '',
          name: p.communityMember.communityRegistration?.communityName || '',
          totalMembers: p.communityMember.communityRegistration?.totalMembers || 0
        } : null,
        createdAt: p.createdAt.toISOString()
      };
    });

    return NextResponse.json({
      participants: transformedParticipants,
      stats: {
        total: totalEligible,
        checkedIn: totalCollected,
        pending: totalPending,
        noShow: 0
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

// POST - Process check-in actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participantId, qrCode, action, collectorInfo } = body;

    // Validate input
    if (!participantId && !qrCode) {
      return NextResponse.json(
        { error: 'Participant ID or QR code required' },
        { status: 400 }
      );
    }

    // Find participant
    let participant;
    if (qrCode) {
      // Find by QR code in racePack
      participant = await prisma.participant.findFirst({
        where: {
          racePack: { qrCode }
        },
        include: { racePack: true }
      });

      if (!participant) {
        // Try parsing QR code format
        const match = qrCode.match(/^RP(\d+)/);
        if (match) {
          const bibNumber = match[1];
          participant = await prisma.participant.findFirst({
            where: { bibNumber },
            include: { racePack: true }
          });
        }
      }
    } else {
      participant = await prisma.participant.findUnique({
        where: { id: participantId },
        include: { racePack: true }
      });
    }

    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    // Perform action
    switch (action) {
      case 'CHECK_IN':
      case 'COLLECT':
        return await collectRacePack(participant.id, collectorInfo);

      case 'UNDO_CHECK_IN':
      case 'UNCOLLECT':
        return await undoCollection(participant.id);

      case 'MARK_NO_SHOW':
        return await markNoShow(participant.id);

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

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

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const participantId of participantIds) {
      try {
        let response;
        switch (action) {
          case 'CHECK_IN':
          case 'COLLECT':
            response = await collectRacePack(participantId, { method: 'batch' });
            break;
          case 'UNDO_CHECK_IN':
          case 'UNCOLLECT':
            response = await undoCollection(participantId);
            break;
          case 'MARK_NO_SHOW':
            response = await markNoShow(participantId);
            break;
          default:
            throw new Error('Invalid action');
        }

        if (response.status === 200) {
          results.success++;
        } else {
          results.failed++;
          const data = await response.json();
          results.errors.push(`${participantId}: ${data.error}`);
        }
      } catch (err) {
        results.failed++;
        results.errors.push(`${participantId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      processed: results.success,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined
    });

  } catch (error) {
    console.error('Error in batch operation:', error);
    return NextResponse.json(
      { error: 'Batch operation failed' },
      { status: 500 }
    );
  }
}

// Helper: Collect race pack
async function collectRacePack(
  participantId: string,
  collectorInfo?: CollectorInfo
): Promise<NextResponse> {
  try {
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

    // Check eligibility
    const hasPayment = await prisma.payment.findFirst({
      where: {
        participantId,
        status: 'SUCCESS'
      }
    });

    const isEligible =
      participant.registrationStatus === 'CONFIRMED' ||
      participant.registrationStatus === 'IMPORTED' ||
      hasPayment !== null;

    if (!isEligible) {
      return NextResponse.json(
        { error: 'Participant not eligible for check-in' },
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
          collectorName: collectorInfo?.name,
          collectorPhone: collectorInfo?.phone,
          notes: collectorInfo?.notes
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
          collectorName: collectorInfo?.name,
          collectorPhone: collectorInfo?.phone,
          hasJersey: participant.jerseyAddOn > 0,
          hasBib: true,
          hasGoodieBag: true,
          hasMedal: false,
          notes: collectorInfo?.notes
        }
      });
    }

    // Create check-in record
    await prisma.checkIn.create({
      data: {
        participantId,
        checkPoint: 'RACE_PACK_COLLECTION',
        checkTime: new Date(),
        verifiedBy: 'admin',
        verificationMethod: collectorInfo?.method || 'MANUAL'
      }
    }).catch(() => {
      // Ignore duplicate check-in error
    });

    return NextResponse.json({
      success: true,
      participant: {
        id: participant.id,
        name: participant.fullName,
        bibNumber: participant.bibNumber,
        category: participant.category
      },
      racePack: {
        qrCode: racePack.qrCode,
        collectedAt: racePack.collectedAt,
        items: {
          jersey: racePack.hasJersey,
          bib: racePack.hasBib,
          medal: racePack.hasMedal,
          goodieBag: racePack.hasGoodieBag
        }
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

// Helper: Undo collection
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
        collectedBy: null,
        collectorName: null,
        collectorPhone: null
      }
    });

    // Remove check-in record
    await prisma.checkIn.deleteMany({
      where: {
        participantId,
        checkPoint: 'RACE_PACK_COLLECTION'
      }
    }).catch(() => {
      // Ignore if no check-in record
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

// Helper: Mark as no-show
async function markNoShow(participantId: string): Promise<NextResponse> {
  try {
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

    if (participant.racePack?.isCollected) {
      return NextResponse.json(
        { error: 'Cannot mark as no-show: already collected' },
        { status: 400 }
      );
    }

    // Update or create race pack with NO_SHOW note
    if (participant.racePack) {
      await prisma.racePack.update({
        where: { id: participant.racePack.id },
        data: {
          notes: 'NO_SHOW - ' + new Date().toISOString()
        }
      });
    } else {
      const qrCode = `RP${participant.bibNumber || participant.id.substring(0, 8).toUpperCase()}`;

      await prisma.racePack.create({
        data: {
          participantId,
          qrCode,
          isCollected: false,
          hasJersey: participant.jerseyAddOn > 0,
          hasBib: true,
          hasGoodieBag: true,
          hasMedal: false,
          notes: 'NO_SHOW - ' + new Date().toISOString()
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Marked as no-show'
    });

  } catch (error) {
    console.error('Error marking no-show:', error);
    return NextResponse.json(
      { error: 'Failed to mark as no-show' },
      { status: 500 }
    );
  }
}