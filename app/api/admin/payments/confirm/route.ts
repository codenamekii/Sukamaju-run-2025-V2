import { prisma } from '@/lib/prisma';
import { WhatsAppIntegrationService } from '@/lib/services/whatsapp-integration.service';
import { generateBibNumber } from '@/lib/utils/bib-generator';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participantId } = body;

    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      );
    }

    // Get participant with payment
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

    if (participant.registrationStatus === 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Participant already confirmed' },
        { status: 400 }
      );
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate BIB number if not exists
      let bibNumber = participant.bibNumber;
      if (!bibNumber) {
        // Count existing participants in the same category to generate sequential number
        const categoryCount = await tx.participant.count({
          where: {
            category: participant.category,
            bibNumber: { not: null }
          }
        });

        bibNumber = await generateBibNumber(participant.category as '5K' | '10K', tx);

        // Check if BIB already exists
        const existingBib = await tx.participant.findFirst({
          where: { bibNumber }
        });

        if (existingBib) {
          // Generate alternative BIB
          bibNumber =
            participant.category === '5K'
              ? `5${(categoryCount + 1).toString().padStart(3, '0')}`
              : `10${(categoryCount + 1).toString().padStart(3, '0')}`;
        }
      }

      // Update participant status and BIB
      const updatedParticipant = await tx.participant.update({
        where: { id: participantId },
        data: {
          registrationStatus: 'CONFIRMED',
          bibNumber
        }
      });

      // Update payment if exists
      if (participant.payments.length > 0) {
        await tx.payment.update({
          where: { id: participant.payments[0].id },
          data: {
            status: 'SUCCESS',
            paidAt: new Date(),
            paymentMethod: 'MANUAL CONFIRMATION',
            metadata: {
              confirmedBy: 'admin',
              confirmedAt: new Date().toISOString()
            }
          }
        });
      } else {
        // Create manual payment record
        await tx.payment.create({
          data: {
            participantId,
            amount: participant.totalPrice,
            status: 'SUCCESS',
            paymentMethod: 'MANUAL CONFIRMATION',
            paidAt: new Date(),
            metadata: {
              confirmedBy: 'admin',
              confirmedAt: new Date().toISOString()
            }
          }
        });
      }

      // Create race pack entry if not exists
      const existingRacePack = await tx.racePack.findUnique({
        where: { participantId }
      });

      if (!existingRacePack) {
        await tx.racePack.create({
          data: {
            participantId,
            qrCode: `QR-${bibNumber}`,
            hasJersey: participant.jerseyAddOn > 0,
            hasBib: true,
            hasGoodieBag: true,
            hasMedal: false
          }
        });
      }

      return updatedParticipant;
    });

    // Send WhatsApp notification
    try {
      if (participant.payments.length > 0) {
        await WhatsAppIntegrationService.onPaymentSuccess(participant.payments[0].id);
      }
    } catch (notificationError) {
      console.error('Failed to send WhatsApp notification:', notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Payment confirmed successfully'
    });

  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}