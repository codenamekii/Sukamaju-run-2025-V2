import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

// GET - Fetch race pack inventory and recent distributions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const categoryFilter = searchParams.get('category');

    // Ambil semua peserta dengan pembayaran PAID
    const participants = await prisma.participant.findMany({
      where: {
        payments: {
          some: { status: 'PAID' }
        },
        category: categoryFilter || undefined,
      },
      include: { racePack: true }
    });

    // Hitung inventory
    const inventoryMap: Record<string, { total: number; distributed: number; remaining: number }> = {};
    participants.forEach(p => {
      const cat = p.category;
      if (!inventoryMap[cat]) inventoryMap[cat] = { total: 0, distributed: 0, remaining: 0 };
      inventoryMap[cat].total += 1;
      if (p.racePack?.isCollected) inventoryMap[cat].distributed += 1;
      else inventoryMap[cat].remaining += 1;
    });

    const inventory = Object.entries(inventoryMap).map(([category, stats]) => ({
      category,
      ...stats
    }));

    // Recent distributions
    const recentDistributions = await prisma.racePack.findMany({
      where: { isCollected: true },
      include: { participant: true },
      orderBy: { collectedAt: 'desc' },
      take: 10
    });

    // Pack contents config
    const packContents = {
      '5K': { items: ['Race Bib', 'Event T-Shirt (S/M/L/XL)', 'Finisher Medal', 'Goodie Bag'], extras: ['Water Bottle'] },
      '10K': { items: ['Race Bib', 'Event T-Shirt (S/M/L/XL)', 'Exclusive Medal', 'Goodie Bag'], extras: ['Water Bottle', 'Isotonic Water'] }
    };

    return NextResponse.json({ inventory, recentDistributions, packContents });
  } catch (error) {
    console.error('Race packs fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch race pack data' }, { status: 500 });
  }
}

// POST - Record race pack collection
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { participantId, items, tshirtSize, notes } = await request.json();
    if (!participantId) return NextResponse.json({ error: 'Participant ID required' }, { status: 400 });

    // Ambil RacePack & Participant
    const racePack = await prisma.racePack.findUnique({
      where: { participantId },
      include: { participant: { include: { payments: true } } }
    });
    if (!racePack) return NextResponse.json({ error: 'Race pack not found' }, { status: 404 });

    const paid = racePack.participant.payments.some(p => p.status === 'PAID');
    if (!paid) return NextResponse.json({ error: 'Payment not confirmed' }, { status: 400 });

    if (racePack.isCollected) return NextResponse.json({ error: 'Race pack already collected' }, { status: 400 });

    // Update RacePack
    const updated = await prisma.racePack.update({
      where: { participantId },
      data: {
        isCollected: true,
        collectedAt: new Date(),
        collectedBy: session.user?.email || '',
        notes: notes || ''
      }
    });

    // Log activity (optional, kalau ada tabel activityLog)
    // await prisma.activityLog.create({
    //   data: {
    //     action: 'RACE_PACK_COLLECTED',
    //     entityType: 'PARTICIPANT',
    //     entityId: participantId,
    //     details: {
    //       participantName: racePack.participant.fullName,
    //       bibNumber: racePack.participant.bibNumber,
    //       category: racePack.participant.category,
    //       items,
    //       tshirtSize,
    //       collectedBy: session.user?.email || ''
    //     }
    //   }
    // });

    return NextResponse.json({ success: true, racePack: updated });
  } catch (error) {
    console.error('Race pack collection error:', error);
    return NextResponse.json({ error: 'Failed to record collection' }, { status: 500 });
  }
}