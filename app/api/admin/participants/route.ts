import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const participants = await prisma.participant.findMany({
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        racePack: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return NextResponse.json({
      data: participants
    });

  } catch (error) {
    console.error('Error fetching participants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch participants' },
      { status: 500 }
    );
  }
}