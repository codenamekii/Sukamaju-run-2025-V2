// app/api/admin/payment/confirm/route.ts
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { participantId } = await request.json();

    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID required' },
        { status: 400 }
      );
    }

    // Find participant with pending payment
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        payments: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
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

    if (participant.payments.length === 0) {
      return NextResponse.json(
        { error: 'No pending payment found' },
        { status: 400 }
      );
    }

    const payment = participant.payments[0];

    // Update payment and participant status in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update payment to SUCCESS
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          paidAt: new Date(),
          paymentMethod: 'MANUAL_CONFIRMATION'
        }
      });

      // Update participant status to CONFIRMED
      const updatedParticipant = await tx.participant.update({
        where: { id: participantId },
        data: {
          registrationStatus: 'CONFIRMED'
        }
      });

      // Create admin log
      await tx.adminLog.create({
        data: {
          adminId: 'admin-manual', // TODO: Get from auth token
          action: 'MANUAL_PAYMENT_CONFIRMATION',
          details: {
            participantId,
            paymentId: payment.id,
            amount: payment.amount
          } as unknown as object
        }
      });

      return { payment: updatedPayment, participant: updatedParticipant };
    });

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: result
    });

  } catch (error) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to confirm payment',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// GET method to check payment status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const participantId = searchParams.get('participantId');

    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID required' },
        { status: 400 }
      );
    }

    const payments = await prisma.payment.findMany({
      where: { participantId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: payments
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}