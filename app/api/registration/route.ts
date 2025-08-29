import { calculateRegistrationPrice } from '@/lib/utils/pricing';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

// Helper function to generate BIB number
async function generateBibNumber(category: '5K' | '10K'): Promise<string> {
  const count = await prisma.participant.count({ where: { category } });
  const prefix = category === '5K' ? '5' : '10';
  const number = (count + 1).toString().padStart(3, '0');
  return `${prefix}${number}`;
}

// Helper function to calculate price
function calculatePrice(category: string, jerseySize: string, registrationType: string) {
  // Fixed prices - no early bird
  let basePrice = 0;

  if (registrationType === 'COMMUNITY') {
    // Community prices (5% discount)
    if (category === '5K') {
      basePrice = 171000; // Rp 171.000
    } else if (category === '10K') {
      basePrice = 218000; // Rp 218.000
    }
  } else {
    // Individual prices
    if (category === '5K') {
      basePrice = 180000;
    } else if (category === '10K') {
      basePrice = 230000;
    }
  }

  // Jersey add-on ONLY for XXL and XXXL
  const jerseyAddOn = ['XXL', 'XXXL'].includes(jerseySize) ? 20000 : 0;

  // Remove early bird logic since prices are fixed
  const isEarlyBird = false;

  return {
    basePrice,
    jerseyAddOn,
    totalPrice: basePrice + jerseyAddOn,
    isEarlyBird
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if email already exists
    const existingParticipant = await prisma.participant.findUnique({
      where: { email: body.email },
    });

    if (existingParticipant) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 });
    }

    // Check age eligibility
    const birthDate = new Date(body.dateOfBirth);
    const age = new Date().getFullYear() - birthDate.getFullYear();

    if ((body.category === '5K' && age < 12) || (body.category === '10K' && age < 17)) {
      return NextResponse.json(
        {
          error:
            body.category === '5K'
              ? 'Minimal usia 12 tahun untuk kategori 5K'
              : 'Minimal usia 17 tahun untuk kategori 10K',
        },
        { status: 400 }
      );
    }

    // Calculate pricing
    const pricing = calculateRegistrationPrice(body.category, body.jerseySize);

    // Generate BIB number
    const bibNumber = await generateBibNumber(body.category);

    // Generate registration code (random 6 digit)
    const registrationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create participant with relations in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const participant = await tx.participant.create({
        data: {
          fullName: body.fullName,
          gender: body.gender,
          dateOfBirth: birthDate,
          idNumber: body.idNumber,
          bloodType: body.bloodType || null,
          email: body.email,
          whatsapp: body.whatsapp,
          address: body.address,
          province: body.province,
          city: body.city,
          postalCode: body.postalCode || null,
          category: body.category,
          bibName: body.bibName,
          jerseySize: body.jerseySize,
          estimatedTime: body.estimatedTime || null,
          emergencyName: body.emergencyName,
          emergencyPhone: body.emergencyPhone,
          emergencyRelation: body.emergencyRelation,
          medicalHistory: body.medicalHistory || null,
          allergies: body.allergies || null,
          medications: body.medications || null,
          bibNumber,
          registrationCode,
          registrationType: 'INDIVIDUAL',
          basePrice: pricing.basePrice,
          jerseyAddOn: pricing.jerseyAddOn,
          totalPrice: pricing.totalPrice,
          isEarlyBird: false,
          registrationStatus: 'PENDING',
        },
      });

      const racePack = await tx.racePack.create({
        data: {
          participantId: participant.id,
          hasJersey: true,
          hasBib: true,
          hasGoodieBag: true,
        },
      });

      const payment = await tx.payment.create({
        data: {
          participantId: participant.id,
          amount: pricing.totalPrice,
          status: 'PENDING',
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      return { participant, racePack, payment };
    });

    return NextResponse.json({
      success: true,
      data: {
        registrationCode: result.participant.registrationCode,
        bibNumber: result.participant.bibNumber,
        totalPrice: pricing.totalPrice,
        paymentCode: result.payment.paymentCode,
        participant: {
          id: result.participant.id,
          fullName: result.participant.fullName,
          email: result.participant.email,
          category: result.participant.category,
        },
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mendaftar', details: process.env.NODE_ENV === 'development' ? error : undefined },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const registrationCode = searchParams.get('code');
    const email = searchParams.get('email');

    if (!registrationCode && !email) {
      return NextResponse.json({ error: 'Kode registrasi atau email harus diisi' }, { status: 400 });
    }

    const participant = await prisma.participant.findFirst({
      where: {
        OR: [
          { registrationCode: registrationCode || undefined },
          { email: email || undefined },
        ],
      },
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 }, racePack: true },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Peserta tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { participant, payment: participant.payments[0] || null } });
  } catch (error) {
    console.error('Error fetching participant:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
