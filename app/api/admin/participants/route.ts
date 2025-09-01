// app/api/admin/participants/route.ts
import { Prisma, PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Filters
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build where clause
    const where: Prisma.ParticipantWhereInput = {};

    // Search filter (name, email, whatsapp, registration code)
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { whatsapp: { contains: search } },
        { registrationCode: { contains: search, mode: 'insensitive' } },
        { bibNumber: { contains: search } }
      ];
    }

    // Category filter
    if (category) {
      where.category = category;
    }

    // Status filter
    if (status) {
      where.registrationStatus = status;
    }

    // Type filter
    if (type) {
      where.registrationType = type;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // Get total count for pagination
    const total = await prisma.participant.count({ where });

    // Fetch participants with relations
    const participants = await prisma.participant.findMany({
      where,
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        racePack: true,
        communityMember: {
          include: {
            communityRegistration: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    return NextResponse.json({
      data: participants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error fetching participants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch participants' },
      { status: 500 }
    );
  }
}

// Update participant
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      );
    }

    const updated = await prisma.participant.update({
      where: { id },
      data: updateData,
      include: {
        payments: true,
        racePack: true
      }
    });

    return NextResponse.json({
      success: true,
      data: updated
    });

  } catch (error) {
    console.error('Error updating participant:', error);
    return NextResponse.json(
      { error: 'Failed to update participant' },
      { status: 500 }
    );
  }
}

// Bulk update participants
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, participantIds, data } = body;

    if (!action || !participantIds || participantIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid bulk action request' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'UPDATE_STATUS':
        result = await prisma.participant.updateMany({
          where: { id: { in: participantIds } },
          data: { registrationStatus: data.status }
        });
        break;

      case 'CONFIRM_PAYMENTS':
        // Update participants status
        await prisma.participant.updateMany({
          where: { id: { in: participantIds } },
          data: { registrationStatus: 'CONFIRMED' }
        });

        // Update related payments
        await prisma.payment.updateMany({
          where: {
            participantId: { in: participantIds },
            status: 'PENDING'
          },
          data: {
            status: 'PAID',
            paidAt: new Date()
          }
        });

        result = { count: participantIds.length };
        break;

      case 'SEND_EMAIL':
        // TODO: Implement bulk email sending
        result = { message: 'Email feature not yet implemented' };
        break;

      case 'GENERATE_QR':
        // Generate QR codes for race packs
        const racePacks = await Promise.all(
          participantIds.map(async (participantId: string) => {
            const existing = await prisma.racePack.findUnique({
              where: { participantId }
            });

            if (!existing) {
              return prisma.racePack.create({
                data: {
                  participantId,
                  qrCode: `QR_${participantId}_${Date.now()}`
                }
              });
            }
            return existing;
          })
        );
        result = { generated: racePacks.length };
        break;

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error in bulk operation:', error);
    return NextResponse.json(
      { error: 'Bulk operation failed' },
      { status: 500 }
    );
  }
}