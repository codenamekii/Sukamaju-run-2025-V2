import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const registrationCode = searchParams.get('code');

    if (!registrationCode) {
      return NextResponse.json(
        { error: 'Masukkan Kode Registrasi' },
        { status: 400 }
      );
    }

    // Find participant or community
    const participant = await prisma.participant.findUnique({
      where: { registrationCode },
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });

    if (participant && participant.payments[0]) {
      return NextResponse.json({
        status: participant.payments[0].status,
        amount: participant.payments[0].amount,
        vaNumber: participant.payments[0].vaNumber,
        paymentMethod: participant.payments[0].paymentMethod
      });
    }

    // Check community
    const community = await prisma.communityRegistration.findUnique({
      where: { registrationCode },
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });

    if (community && community.payments[0]) {
      return NextResponse.json({
        status: community.payments[0].status,
        amount: community.payments[0].amount,
        vaNumber: community.payments[0].vaNumber,
        paymentMethod: community.payments[0].paymentMethod
      });
    }

    return NextResponse.json(
      { error: 'Pembayaran Tidak Ditemukan' },
      { status: 404 }
    );

  } catch (error) {
    console.error('Error checking status pembayaran:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}