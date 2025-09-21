import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const orderId = searchParams.get('order_id');

    if (!code && !orderId) {
      return NextResponse.json(
        { error: 'Registration code or order ID is required' },
        { status: 400 }
      );
    }

    // Try to find participant by multiple methods
    let participant = null;

    // Method 1: Try by registrationCode
    if (code) {
      participant = await prisma.participant.findUnique({
        where: { registrationCode: code },
        include: {
          racePack: {
            select: {
              qrCode: true
            }
          }
        }
      });
    }

    // Method 2: If not found and we have orderId, try finding by payment
    if (!participant && orderId) {
      const payment = await prisma.payment.findFirst({
        where: {
          midtransOrderId: orderId
        },
        include: {
          participant: {
            include: {
              racePack: {
                select: {
                  qrCode: true
                }
              }
            }
          }
        }
      });

      if (payment?.participant) {
        participant = payment.participant;
      }
    }

    // Method 3: Try partial match on registrationCode (for codes like DBQ337 that might be part of a longer code)
    if (!participant && code) {
      participant = await prisma.participant.findFirst({
        where: {
          OR: [
            { registrationCode: { contains: code } },
            { registrationCode: { endsWith: code } }
          ]
        },
        include: {
          racePack: {
            select: {
              qrCode: true
            }
          }
        }
      });
    }

    if (!participant) {
      console.log('Participant not found with:', { code, orderId });
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    // Generate QR code if not exists
    let qrCode = participant.racePack?.qrCode;
    if (!qrCode) {
      qrCode = `SR2025-${participant.category}-${participant.bibNumber || 'TBA'}-${participant.id.substring(0, 8).toUpperCase()}`;

      // Create race pack record
      await prisma.racePack.create({
        data: {
          participantId: participant.id,
          qrCode,
          isCollected: false,
          hasJersey: true,
          hasBib: true,
          hasGoodieBag: true,
          hasMedal: false
        }
      });
    }

    return NextResponse.json({
      participant: {
        id: participant.id,
        fullName: participant.fullName,
        email: participant.email,
        bibNumber: participant.bibNumber,
        category: participant.category,
        registrationCode: participant.registrationCode,
        jerseySize: participant.jerseySize
      },
      racePack: {
        qrCode
      }
    });

  } catch (error) {
    console.error('Error fetching ticket data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket data' },
      { status: 500 }
    );
  }
}