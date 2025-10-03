// app/api/admin/participants/route.ts
// Complete optimized version - ready to copy paste

import prisma from '@/lib/prisma';
import { WhatsAppIntegrationService } from '@/lib/services/whatsapp-integration.service';
import { generateBibNumber } from '@/lib/utils/bib-generator';
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

// Types
interface BulkActionRequest {
  action: 'UPDATE_STATUS' | 'CONFIRM_PAYMENTS' | 'SEND_NOTIFICATION' | 'GENERATE_QR';
  participantIds: string[];
  data?: {
    status?: string;
    message?: string;
  };
}

interface BulkActionResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: string[];
}

// GET - Fetch participants with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build where clause
    const where: Prisma.ParticipantWhereInput = {};

    // Search across multiple fields
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { whatsapp: { contains: search } },
        { registrationCode: { contains: search, mode: 'insensitive' } },
        { bibNumber: { equals: search } },
        { bibName: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Category filter (5K, 10K)
    if (category) {
      where.category = category;
    }

    // Status filter - Include all active statuses if not specified
    if (status) {
      where.registrationStatus = status;
    } else {
      // Default: exclude cancelled participants
      where.registrationStatus = {
        notIn: ['CANCELLED']
      };
    }

    // Type filter (INDIVIDUAL, COMMUNITY)
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

    // Get total count
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
      orderBy: [
        { createdAt: 'desc' },
        { fullName: 'asc' }
      ],
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

// PATCH - Update single participant
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract id and remove relational fields
    const {
      id,
      ...updateData
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      );
    }

    // Define valid fields that can be updated
    const validFields = [
      'fullName', 'gender', 'dateOfBirth', 'idNumber', 'bloodType',
      'email', 'whatsapp', 'address', 'province', 'city', 'postalCode',
      'category', 'bibName', 'jerseySize', 'estimatedTime',
      'emergencyName', 'emergencyPhone', 'emergencyRelation',
      'medicalHistory', 'allergies', 'medications',
      'registrationCode', 'bibNumber', 'registrationType',
      'basePrice', 'jerseyAddOn', 'totalPrice', 'isEarlyBird',
      'registrationStatus', 'metadata'
    ];

    // Build clean update data
    const cleanUpdateData: Prisma.ParticipantUpdateInput = {};

    for (const field of validFields) {
      if (field in updateData) {
        (cleanUpdateData as Record<string, unknown>)[field] = updateData[field];
      }
    }

    // Update participant
    const updated = await prisma.participant.update({
      where: { id },
      data: cleanUpdateData,
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

// POST - Bulk actions
export async function POST(request: NextRequest) {
  try {
    const body: BulkActionRequest = await request.json();
    const { action, participantIds, data } = body;

    // Validate request
    if (!action || !participantIds || participantIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid bulk action request' },
        { status: 400 }
      );
    }

    let result: BulkActionResult;

    switch (action) {
      case 'UPDATE_STATUS': {
        if (!data?.status) {
          return NextResponse.json(
            { error: 'Status is required for UPDATE_STATUS action' },
            { status: 400 }
          );
        }

        const updateResult = await prisma.participant.updateMany({
          where: { id: { in: participantIds } },
          data: { registrationStatus: data.status }
        });

        result = {
          success: true,
          processed: updateResult.count,
          failed: 0
        };
        break;
      }

      case 'CONFIRM_PAYMENTS': {
        // Update participants status to CONFIRMED
        await prisma.participant.updateMany({
          where: { id: { in: participantIds } },
          data: { registrationStatus: 'CONFIRMED' }
        });

        // Update related payments to SUCCESS
        await prisma.payment.updateMany({
          where: {
            participantId: { in: participantIds },
            status: 'PENDING'
          },
          data: {
            status: 'SUCCESS',
            paidAt: new Date()
          }
        });

        // Send WhatsApp notifications
        let notificationsSent = 0;
        for (const participantId of participantIds) {
          const payment = await prisma.payment.findFirst({
            where: { participantId }
          });
          if (payment) {
            await WhatsAppIntegrationService.onPaymentSuccess(payment.id);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            notificationsSent++;
          }
        }

        result = {
          success: true,
          processed: participantIds.length,
          failed: 0
        };
        break;
      }

      case 'SEND_NOTIFICATION': {
        if (!data?.message) {
          return NextResponse.json(
            { error: 'Message is required for SEND_NOTIFICATION action' },
            { status: 400 }
          );
        }

        const notificationResult = await WhatsAppIntegrationService.sendBulkNotifications(
          participantIds,
          data.message
        );

        result = {
          success: true,
          processed: notificationResult.success,
          failed: notificationResult.failed
        };
        break;
      }

      case 'GENERATE_QR': {
        let generated = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const participantId of participantIds) {
          try {
            // Check if QR already exists
            const existing = await prisma.racePack.findUnique({
              where: { participantId }
            });

            if (!existing) {
              // Get participant details
              const participant = await prisma.participant.findUnique({
                where: { id: participantId }
              });

              if (participant) {
                const categoryType = participant.category as '5K' | '10K';
                const bibNumber = participant.bibNumber || await generateBibNumber(categoryType);
                const qrCode = `SR2025-${participant.category}-${bibNumber}-${participant.id.substring(0, 8).toUpperCase()}`;

                // Create race pack with QR code
                await prisma.racePack.create({
                  data: {
                    participantId,
                    qrCode,
                    isCollected: false,
                    hasJersey: true,
                    hasBib: true,
                    hasMedal: false,
                    hasGoodieBag: true
                  }
                });
                generated++;
              } else {
                failed++;
                errors.push(`Participant ${participantId} not found`);
              }
            } else {
              generated++; // Already has QR
            }
          } catch (error) {
            failed++;
            errors.push(`Failed to generate QR for ${participantId}`);
            console.error(`QR generation error for ${participantId}:`, error);
          }
        }

        result = {
          success: failed === 0,
          processed: generated,
          failed,
          errors: errors.length > 0 ? errors : undefined
        };
        break;
      }

      default: {
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in bulk operation:', error);
    return NextResponse.json(
      { error: 'Bulk operation failed' },
      { status: 500 }
    );
  }
}