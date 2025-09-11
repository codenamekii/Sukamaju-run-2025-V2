import { prisma as prismaImport } from '@/lib/prisma';
import { NextRequest, NextResponse as NextResponseImport } from 'next/server';

export async function GET_TICKET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponseImport.json(
        { error: 'Registration code is required' },
        { status: 400 }
      );
    }

    const participant = await prismaImport.participant.findUnique({
      where: { registrationCode: code },
      include: {
        racePack: {
          select: {
            qrCode: true
          }
        }
      }
    });

    if (!participant) {
      return NextResponseImport.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    // Generate QR code if not exists
    let qrCode = participant.racePack?.qrCode;
    if (!qrCode) {
      qrCode = `BM2025-QR-${participant.id}-${Date.now().toString(36)}`;

      // Create race pack record
      await prismaImport.racePack.create({
        data: {
          participantId: participant.id,
          qrCode,
          hasJersey: participant.jerseyAddOn > 0,
          hasBib: true,
          hasGoodieBag: true,
          hasMedal: false
        }
      });
    }

    return NextResponseImport.json({
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
    return NextResponseImport.json(
      { error: 'Failed to fetch ticket data' },
      { status: 500 }
    );
  }
}