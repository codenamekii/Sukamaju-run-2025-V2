import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

// GET - Fetch all payments with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const method = searchParams.get('method');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (method) {
      where.paymentMethod = method;
    }

    if (dateFrom && dateTo) {
      where.createdAt = {
        gte: new Date(dateFrom),
        lte: new Date(dateTo + 'T23:59:59')
      };
    }

    if (search) {
      where.OR = [
        { paymentCode: { contains: search, mode: 'insensitive' } },
        { midtransOrderId: { contains: search, mode: 'insensitive' } },
        { participant: { fullName: { contains: search, mode: 'insensitive' } } },
        { participant: { email: { contains: search, mode: 'insensitive' } } },
        { communityRegistration: { communityName: { contains: search, mode: 'insensitive' } } }
      ];
    }

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
              totalMembers: true,
              category: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.payment.count({ where })
    ]);

    // Get payment statistics
    const stats = await prisma.payment.groupBy({
      by: ['status'],
      _sum: {
        amount: true
      },
      _count: true
    });

    const totalRevenue = await prisma.payment.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true }
    });

    const todayRevenue = await prisma.payment.aggregate({
      where: {
        status: 'PAID',
        paidAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      },
      _sum: { amount: true }
    });

    const pendingAmount = await prisma.payment.aggregate({
      where: { status: 'PENDING' },
      _sum: { amount: true }
    });

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        total: stats.reduce((acc: number, s: { _count: number; }) => acc + s._count, 0),
        paid: stats.find((s: { status: string; }) => s.status === 'PAID')?._count || 0,
        pending: stats.find((s: { status: string; }) => s.status === 'PENDING')?._count || 0,
        failed: stats.find((s: { status: string; }) => s.status === 'FAILED')?._count || 0,
        totalRevenue: totalRevenue._sum.amount || 0,
        todayRevenue: todayRevenue._sum.amount || 0,
        pendingAmount: pendingAmount._sum.amount || 0
      }
    });
  } catch (error) {
    console.error('Payments fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

// PATCH - Update payment status manually
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentId, status, notes } = body;

    if (!paymentId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate status
    if (!['PAID', 'FAILED', 'CANCELLED', 'REFUNDED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        participant: true,
        communityRegistration: true
      }
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Update payment
    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        paidAt: status === 'PAID' ? new Date() : undefined,
        metadata: {
          ...((payment.metadata as object) || {}),
          manualUpdate: {
            status,
            notes,
            updatedBy: session.user?.email,
            updatedAt: new Date()
          }
        }
      }
    });

    // Update participant registration status if payment is confirmed
    if (status === 'PAID') {
      if (payment.participantId) {
        await prisma.participant.update({
          where: { id: payment.participantId },
          data: { registrationStatus: 'CONFIRMED' }
        });
      }
      if (payment.communityRegistrationId) {
        await prisma.communityRegistration.update({
          where: { id: payment.communityRegistrationId },
          data: { registrationStatus: 'CONFIRMED' }
        });
      }
    }

    // Log activity
    await prisma.adminLog.create({
      data: {
        adminId: session.user?.id || 'system',
        action: 'PAYMENT_STATUS_UPDATED',
        details: {
          paymentId,
          previousStatus: payment.status,
          newStatus: status,
          notes,
          amount: payment.amount
        }
      }
    });

    return NextResponse.json({
      success: true,
      payment: updated
    });
  } catch (error) {
    console.error('Payment update error:', error);
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}

// POST - Process refund
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentId, amount, reason } = body;

    if (!paymentId || !amount || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    if (payment.status !== 'PAID') {
      return NextResponse.json(
        { error: 'Can only refund paid payments' },
        { status: 400 }
      );
    }

    if (amount > payment.amount) {
      return NextResponse.json(
        { error: 'Refund amount exceeds payment amount' },
        { status: 400 }
      );
    }

    // Process refund (integrate with payment gateway)
    // This is a placeholder - actual implementation depends on payment gateway

    // Update payment status
    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REFUNDED',
        metadata: {
          ...((payment.metadata as object) || {}),
          refund: {
            amount,
            reason,
            processedBy: session.user?.email,
            processedAt: new Date()
          }
        }
      }
    });

    // Update participant status
    if (payment.participantId) {
      await prisma.participant.update({
        where: { id: payment.participantId },
        data: { registrationStatus: 'CANCELLED' }
      });
    }

    // Log activity
    await prisma.adminLog.create({
      data: {
        adminId: session.user?.id || 'system',
        action: 'PAYMENT_REFUNDED',
        details: {
          paymentId,
          amount,
          reason,
          originalAmount: payment.amount
        }
      }
    });

    return NextResponse.json({
      success: true,
      payment: updated
    });
  } catch (error) {
    console.error('Refund process error:', error);
    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    );
  }
}