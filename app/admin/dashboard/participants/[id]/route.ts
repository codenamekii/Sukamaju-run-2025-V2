// app/api/admin/participants/[id]/route.ts
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const participant = await prisma.participant.findUnique({
      where: { id: params.id },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' }
        },
        racePack: true,
        communityMember: {
          include: {
            communityRegistration: {
              include: {
                members: {
                  include: {
                    participant: {
                      select: {
                        id: true,
                        fullName: true,
                        email: true,
                        category: true,
                        bibNumber: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        checkIns: {
          orderBy: { checkTime: 'asc' }
        },
        certificate: true
      }
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(participant);
  } catch (error) {
    console.error('Error fetching participant details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch participant details' },
      { status: 500 }
    );
  }
}