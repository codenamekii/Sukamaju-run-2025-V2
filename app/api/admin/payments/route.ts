import prisma from '@/lib/prisma';
import { WhatsAppIntegrationService } from '@/lib/services/whatsapp-integration.service';
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch payments with filters and stats
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

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

    // Status filter
    if (status && status !== 'all') {
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
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
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
          status: 'SUCCESS',
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
        case 'SUCCESS':
          stats.success = count;
          stats.totalRevenue = sum;
          break;
        case 'PENDING':
          stats.pending = count;
          stats.pendingAmount = sum;
          break;
        case 'FAILED':
          stats.failed = count;
          break;
        case 'EXPIRED':
          stats.expired = count;
          break;
        case 'REFUNDED':
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
    const body = await request.json();
    const { paymentId, status, notes } = body;

    if (!paymentId || !status) {
      return NextResponse.json(
        { error: 'Payment ID and status are required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['SUCCESS', 'PENDING', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Get current payment
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
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Update payment
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        paidAt: status === 'SUCCESS' ? new Date() : undefined,
        metadata: {
          ...(payment.metadata as object || {}),
          lastUpdate: {
            status,
            notes,
            updatedAt: new Date().toISOString()
          }
        }
      }
    });

    // If payment is successful, update participant status and send notification
    if (status === 'SUCCESS' && payment.status !== 'SUCCESS') {
      if (payment.participant) {
        // Update individual participant
        await prisma.participant.update({
          where: { id: payment.participant.id },
          data: { registrationStatus: 'CONFIRMED' }
        });

        // Send WhatsApp notification
        await WhatsAppIntegrationService.onPaymentSuccess(paymentId);
      }

      if (payment.communityRegistration) {
        // Update community registration
        await prisma.communityRegistration.update({
          where: { id: payment.communityRegistration.id },
          data: { registrationStatus: 'CONFIRMED' }
        });

        // Update all members
        const memberIds: string[] = payment.communityRegistration.members.map(
          (m) => m.participantId
        );
        await prisma.participant.updateMany({
          where: { id: { in: memberIds } },
          data: { registrationStatus: "CONFIRMED" },
        });

        // Send notifications
        await WhatsAppIntegrationService.onPaymentSuccess(paymentId);
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedPayment
    });

  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}

// POST - Process refund
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, amount, reason } = body;

    if (!paymentId || !amount || !reason) {
      return NextResponse.json(
        { error: 'Payment ID, amount, and reason are required' },
        { status: 400 }
      );
    }

    // Get payment
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        participant: true
      }
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    if (payment.status !== 'SUCCESS') {
      return NextResponse.json(
        { error: 'Only successful payments can be refunded' },
        { status: 400 }
      );
    }

    if (amount > payment.amount) {
      return NextResponse.json(
        { error: 'Refund amount cannot exceed payment amount' },
        { status: 400 }
      );
    }

    // Process refund (in production, this would call Midtrans API)
    const refundData = {
      originalPaymentId: paymentId,
      amount,
      reason,
      processedAt: new Date().toISOString()
    };

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: amount === payment.amount ? 'REFUNDED' : 'SUCCESS',
        metadata: {
          ...(payment.metadata as object || {}),
          refund: refundData
        }
      }
    });

    // If full refund, update participant status
    if (amount === payment.amount && payment.participant) {
      await prisma.participant.update({
        where: { id: payment.participant.id },
        data: { registrationStatus: 'CANCELLED' }
      });
    }

    // Log the refund
    await prisma.notification.create({
      data: {
        participantId: payment.participantId,
        type: 'WHATSAPP',
        category: 'PAYMENT',
        subject: 'Payment Refund',
        message: `Refund processed: ${reason}`,
        status: 'SENT',
        sentAt: new Date(),
        metadata: refundData
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedPayment,
      refund: refundData
    });

  } catch (error) {
    console.error('Error processing refund:', error);
    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    );
  }
}