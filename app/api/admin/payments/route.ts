// app/api/admin/payments/route.ts
import {
  PAYMENT_STATUS,
  PaymentStatus,
  PaymentUpdateRequest,
  RefundRequest
} from '@/app/types/payment';
import prisma from '@/lib/prisma';
import { WhatsAppIntegrationService } from '@/lib/services/whatsapp-integration.service';
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

// Type guard untuk validasi status
function isValidPaymentStatus(status: string): status is PaymentStatus {
  return Object.values(PAYMENT_STATUS).includes(status as PaymentStatus);
}

// GET - Fetch payments with filters and stats
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Validation
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    // Filters
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const method = searchParams.get('method') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build where clause
    const where: Prisma.PaymentWhereInput = {};

    // Search filter
    if (search) {
      where.OR = [
        { paymentCode: { contains: search, mode: 'insensitive' } },
        { midtransOrderId: { contains: search, mode: 'insensitive' } },
        { vaNumber: { contains: search } },
        {
          participant: {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } }
            ]
          }
        },
        {
          communityRegistration: {
            OR: [
              { communityName: { contains: search, mode: 'insensitive' } },
              { picName: { contains: search, mode: 'insensitive' } }
            ]
          }
        }
      ];
    }

    // Status filter - validate status
    if (status && status !== 'all') {
      if (!isValidPaymentStatus(status)) {
        return NextResponse.json(
          { error: 'Invalid status filter' },
          { status: 400 }
        );
      }
      where.status = status;
    }

    // Payment method filter
    if (method && method !== 'all') {
      where.paymentMethod = method;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (isNaN(fromDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid date format' },
            { status: 400 }
          );
        }
        where.createdAt.gte = fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        if (isNaN(toDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid date format' },
            { status: 400 }
          );
        }
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    // Get payments with relations
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          participant: {
            select: {
              id: true,
              fullName: true,
              email: true,
              whatsapp: true,
              category: true,
              registrationCode: true
            }
          },
          communityRegistration: {
            select: {
              id: true,
              communityName: true,
              picName: true,
              picEmail: true,
              picWhatsapp: true,
              totalMembers: true,
              category: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.payment.count({ where })
    ]);

    // Calculate stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [statsResult, todayRevenueResult] = await Promise.all([
      prisma.payment.groupBy({
        by: ['status'],
        _count: { status: true },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: {
          status: PAYMENT_STATUS.SUCCESS,
          paidAt: { gte: today }
        },
        _sum: { amount: true }
      })
    ]);

    // Process stats
    const stats = {
      total: 0,
      success: 0,
      pending: 0,
      failed: 0,
      expired: 0,
      cancelled: 0,
      refunded: 0,
      totalRevenue: 0,
      todayRevenue: todayRevenueResult._sum.amount || 0,
      pendingAmount: 0,
      averageAmount: 0
    };

    statsResult.forEach(stat => {
      const count = stat._count.status;
      const sum = stat._sum.amount || 0;

      stats.total += count;

      switch (stat.status) {
        case PAYMENT_STATUS.SUCCESS:
          stats.success = count;
          stats.totalRevenue = sum;
          break;
        case PAYMENT_STATUS.PENDING:
          stats.pending = count;
          stats.pendingAmount = sum;
          break;
        case PAYMENT_STATUS.FAILED:
          stats.failed = count;
          break;
        case PAYMENT_STATUS.EXPIRED:
          stats.expired = count;
          break;
        case PAYMENT_STATUS.CANCELLED:
          stats.cancelled = count;
          break;
        case PAYMENT_STATUS.REFUNDED:
          stats.refunded = count;
          break;
      }
    });

    if (stats.success > 0) {
      stats.averageAmount = Math.round(stats.totalRevenue / stats.success);
    }

    return NextResponse.json({
      payments,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

// PATCH - Update payment status
export async function PATCH(request: NextRequest) {
  try {
    const body: PaymentUpdateRequest = await request.json();
    const { paymentId, status, notes } = body;

    // Validation
    if (!paymentId || !status) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment ID and status are required'
        },
        { status: 400 }
      );
    }

    // Validate status
    if (!isValidPaymentStatus(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Must be one of: ${Object.values(PAYMENT_STATUS).join(', ')}`
        },
        { status: 400 }
      );
    }

    // Get current payment with all necessary relations
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        participant: true,
        communityRegistration: {
          include: {
            members: {
              include: {
                participant: true
              }
            }
          }
        }
      }
    });

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment not found'
        },
        { status: 404 }
      );
    }

    // Check if status transition is valid
    if (payment.status === status) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment already has this status'
        },
        { status: 400 }
      );
    }

    // Prevent invalid status transitions
    const invalidTransitions: Record<string, string[]> = {
      [PAYMENT_STATUS.SUCCESS]: [PAYMENT_STATUS.PENDING], // Can't go back to pending from success
      [PAYMENT_STATUS.REFUNDED]: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.SUCCESS], // Can't change refunded status
      [PAYMENT_STATUS.CANCELLED]: [PAYMENT_STATUS.SUCCESS] // Can't mark cancelled as success
    };

    const currentInvalidTransitions = invalidTransitions[payment.status] || [];
    if (currentInvalidTransitions.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot transition from ${payment.status} to ${status}`
        },
        { status: 400 }
      );
    }

    // Use transaction for data consistency
    const updatedPayment = await prisma.$transaction(async (tx) => {
      // Update payment
      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status,
          paidAt: status === PAYMENT_STATUS.SUCCESS ? new Date() : undefined,
          metadata: {
            ...(payment.metadata as object || {}),
            lastUpdate: {
              previousStatus: payment.status,
              newStatus: status,
              notes,
              updatedAt: new Date().toISOString(),
              updatedBy: 'admin' // You can add actual admin ID here if available
            }
          }
        }
      });

      // If payment is successful, update participant status
      if (status === PAYMENT_STATUS.SUCCESS && payment.status !== PAYMENT_STATUS.SUCCESS) {
        if (payment.participant) {
          // Update individual participant
          await tx.participant.update({
            where: { id: payment.participant.id },
            data: { registrationStatus: 'CONFIRMED' }
          });

          // Create notification record
          await tx.notification.create({
            data: {
              participantId: payment.participant.id,
              type: 'WHATSAPP',
              category: 'PAYMENT',
              subject: 'Payment Confirmed',
              message: `Your payment of ${payment.amount} has been confirmed`,
              status: 'PENDING'
            }
          });
        }

        if (payment.communityRegistration) {
          // Update community registration
          await tx.communityRegistration.update({
            where: { id: payment.communityRegistration.id },
            data: { registrationStatus: 'CONFIRMED' }
          });

          // Update all members
          const memberIds = payment.communityRegistration.members.map(m => m.participantId);
          await tx.participant.updateMany({
            where: { id: { in: memberIds } },
            data: { registrationStatus: 'CONFIRMED' }
          });

          // Create notification for community
          for (const memberId of memberIds) {
            await tx.notification.create({
              data: {
                participantId: memberId,
                type: 'WHATSAPP',
                category: 'PAYMENT',
                subject: 'Community Payment Confirmed',
                message: `Your community registration payment has been confirmed`,
                status: 'PENDING'
              }
            });
          }
        }
      }

      // If payment is failed/cancelled, update participant status
      if ((status === PAYMENT_STATUS.FAILED || status === PAYMENT_STATUS.CANCELLED) &&
        payment.status === PAYMENT_STATUS.PENDING) {
        if (payment.participant) {
          await tx.participant.update({
            where: { id: payment.participant.id },
            data: { registrationStatus: 'CANCELLED' }
          });
        }

        if (payment.communityRegistration) {
          await tx.communityRegistration.update({
            where: { id: payment.communityRegistration.id },
            data: { registrationStatus: 'CANCELLED' }
          });

          const memberIds = payment.communityRegistration.members.map(m => m.participantId);
          await tx.participant.updateMany({
            where: { id: { in: memberIds } },
            data: { registrationStatus: 'CANCELLED' }
          });
        }
      }

      return updated;
    });

    // Send WhatsApp notification asynchronously (don't block response)
    if (status === PAYMENT_STATUS.SUCCESS && payment.status !== PAYMENT_STATUS.SUCCESS) {
      WhatsAppIntegrationService.onPaymentSuccess(paymentId).catch(err => {
        console.error('Failed to send WhatsApp notification:', err);
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedPayment,
      message: `Payment status updated to ${status}`
    });

  } catch (error) {
    console.error('Error updating payment:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          {
            success: false,
            error: 'Duplicate entry detected'
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update payment'
      },
      { status: 500 }
    );
  }
}

// POST - Process refund
export async function POST(request: NextRequest) {
  try {
    const body: RefundRequest = await request.json();
    const { paymentId, amount, reason } = body;

    // Validation
    if (!paymentId || !amount || !reason) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment ID, amount, and reason are required'
        },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Refund amount must be greater than 0'
        },
        { status: 400 }
      );
    }

    if (!reason.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please provide a valid reason for the refund'
        },
        { status: 400 }
      );
    }

    // Get payment
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        participant: true,
        communityRegistration: true
      }
    });

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment not found'
        },
        { status: 404 }
      );
    }

    if (payment.status !== PAYMENT_STATUS.SUCCESS) {
      return NextResponse.json(
        {
          success: false,
          error: 'Only successful payments can be refunded'
        },
        { status: 400 }
      );
    }

    if (amount > payment.amount) {
      return NextResponse.json(
        {
          success: false,
          error: `Refund amount (${amount}) cannot exceed payment amount (${payment.amount})`
        },
        { status: 400 }
      );
    }

    // Check if already refunded
    const metadata = payment.metadata as Record<string, any> || {};
    if (metadata.refund && metadata.refund.amount) {
      const totalRefunded = metadata.refund.amount + amount;
      if (totalRefunded > payment.amount) {
        return NextResponse.json(
          {
            success: false,
            error: `Total refund would exceed payment amount. Already refunded: ${metadata.refund.amount}`
          },
          { status: 400 }
        );
      }
    }

    // Process refund in transaction
    const result = await prisma.$transaction(async (tx) => {
      const refundData = {
        originalPaymentId: paymentId,
        amount,
        reason,
        processedAt: new Date().toISOString(),
        processedBy: 'admin' // Add actual admin ID if available
      };

      // Update payment status
      const isFullRefund = amount === payment.amount;
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: isFullRefund ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.SUCCESS,
          metadata: {
            ...(payment.metadata as object || {}),
            refund: refundData,
            partialRefund: !isFullRefund
          }
        }
      });

      // If full refund, update participant status
      if (isFullRefund) {
        if (payment.participant) {
          await tx.participant.update({
            where: { id: payment.participant.id },
            data: { registrationStatus: 'CANCELLED' }
          });
        }

        if (payment.communityRegistration) {
          await tx.communityRegistration.update({
            where: { id: payment.communityRegistration.id },
            data: { registrationStatus: 'CANCELLED' }
          });

          // Update all community members
          await tx.participant.updateMany({
            where: {
              communityMember: {
                communityRegistrationId: payment.communityRegistration.id
              }
            },
            data: { registrationStatus: 'CANCELLED' }
          });
        }
      }

      // Log the refund
      await tx.notification.create({
        data: {
          participantId: payment.participantId,
          type: 'WHATSAPP',
          category: 'PAYMENT',
          subject: isFullRefund ? 'Payment Fully Refunded' : 'Partial Refund Processed',
          message: `Refund of ${amount} processed. Reason: ${reason}`,
          status: 'SENT',
          sentAt: new Date(),
          metadata: refundData
        }
      });

      return {
        payment: updatedPayment,
        refund: refundData
      };
    });

    // In production, you would call Midtrans API here for actual refund
    // Example:
    // await MidtransService.refund(payment.midtransOrderId, amount, reason);

    return NextResponse.json({
      success: true,
      data: result.payment,
      refund: result.refund,
      message: amount === payment.amount
        ? 'Full refund processed successfully'
        : 'Partial refund processed successfully'
    });

  } catch (error) {
    console.error('Error processing refund:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          {
            success: false,
            error: 'Related record not found'
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process refund'
      },
      { status: 500 }
    );
  }
}