// app/api/registration/route.ts
import { Prisma, PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema
const registrationSchema = z.object({
  // Personal Info
  fullName: z.string().min(3, 'Nama minimal 3 karakter'),
  gender: z.enum(['L', 'P']),
  dateOfBirth: z.string(),
  idNumber: z.string().length(16, 'NIK harus 16 digit'),
  bloodType: z.string().optional(),

  // Contact Info
  email: z.string().email('Email tidak valid'),
  whatsapp: z.string().regex(/^62[0-9]{9,12}$/, 'Format WhatsApp tidak valid'),
  address: z.string().min(10, 'Alamat minimal 10 karakter'),
  province: z.string(),
  city: z.string(),
  postalCode: z.string().optional(),

  // Race Info
  category: z.enum(['5K', '10K']),
  bibName: z.string().max(10, 'Nama BIB maksimal 10 karakter'),
  jerseySize: z.enum(['S', 'M', 'L', 'XL', 'XXL', 'XXXL']),
  estimatedTime: z.string().optional(),

  // Emergency Contact
  emergencyName: z.string().min(3),
  emergencyPhone: z.string(),
  emergencyRelation: z.string(),
  medicalHistory: z.string().optional(),
  allergies: z.string().optional(),
  medications: z.string().optional(),
});

// Helper function to check quota
async function checkQuota(category: string): Promise<boolean> {
  const count = await prisma.participant.count({
    where: {
      category,
      registrationStatus: { not: 'CANCELLED' }
    }
  });

  const limit = category === '5K' ? 300 : 200; // Adjust based on your limits
  return count < limit;
}

// Helper function to generate BIB number
async function generateBibNumber(category: string): Promise<string> {
  const count = await prisma.participant.count({
    where: { category }
  });

  const prefix = category === '5K' ? '5' : '10';
  const number = (count + 1).toString().padStart(3, '0');
  return `${prefix}${number}`;
}

// Helper function to calculate price
function calculatePrice(category: string, jerseySize: string, isEarlyBird: boolean) {
  // Base prices
  let basePrice = 0;
  if (category === '5K') {
    basePrice = isEarlyBird ? 85000 : 100000;
  } else if (category === '10K') {
    basePrice = isEarlyBird ? 135000 : 150000;
  }

  // Jersey add-on for XL+
  const jerseyAddOn = ['XL', 'XXL', 'XXXL'].includes(jerseySize) ? 20000 : 0;

  return {
    basePrice,
    jerseyAddOn,
    totalPrice: basePrice + jerseyAddOn
  };
}

// POST - Create new registration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = registrationSchema.parse(body);

    // Check if email already exists
    const existingParticipant = await prisma.participant.findUnique({
      where: { email: validatedData.email }
    });

    if (existingParticipant) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar' },
        { status: 400 }
      );
    }

    // Check quota
    const hasQuota = await checkQuota(validatedData.category);
    if (!hasQuota) {
      return NextResponse.json(
        { error: 'Kuota kategori ini sudah penuh' },
        { status: 400 }
      );
    }

    // Check age eligibility
    const birthDate = new Date(validatedData.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();

    if (validatedData.category === '5K' && age < 12) {
      return NextResponse.json(
        { error: 'Minimal usia 12 tahun untuk kategori 5K' },
        { status: 400 }
      );
    }

    if (validatedData.category === '10K' && age < 17) {
      return NextResponse.json(
        { error: 'Minimal usia 17 tahun untuk kategori 10K' },
        { status: 400 }
      );
    }

    // Check early bird (before August 31, 2025)
    const earlyBirdDeadline = new Date('2025-08-31');
    const isEarlyBird = today < earlyBirdDeadline;

    // Calculate pricing
    const pricing = calculatePrice(
      validatedData.category,
      validatedData.jerseySize,
      isEarlyBird
    );

    // Generate BIB number
    const bibNumber = await generateBibNumber(validatedData.category);

    // Create participant with all relations
    const participant = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newParticipant = await tx.participant.create({
        data: {
          ...validatedData,
          dateOfBirth: new Date(validatedData.dateOfBirth),
          bibNumber,
          isEarlyBird,
          ...pricing,
          registrationType: 'INDIVIDUAL',
        },
      });

      // Create race pack record
      await tx.racePack.create({
        data: {
          participantId: newParticipant.id,
          hasJersey: true,
          hasBib: true,
          hasGoodieBag: true
        }
      });

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          participantId: newParticipant.id,
          amount: pricing.totalPrice,
          status: 'PENDING',
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      });

      return { participant: newParticipant, payment };
    });

    return NextResponse.json({
      success: true,
      data: {
        registrationCode: participant.participant.registrationCode,
        bibNumber: participant.participant.bibNumber,
        totalPrice: pricing.totalPrice,
        paymentCode: participant.payment.paymentCode,
        participant: participant.participant
      }
    });

  } catch (error) {
    console.error('Registration error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mendaftar' },
      { status: 500 }
    );
  }
}

// GET - Check registration status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const registrationCode = searchParams.get('code');
    const email = searchParams.get('email');

    if (!registrationCode && !email) {
      return NextResponse.json(
        { error: 'Kode registrasi atau email harus diisi' },
        { status: 400 }
      );
    }

    const participant = await prisma.participant.findFirst({
      where: {
        OR: [
          { registrationCode: registrationCode || undefined },
          { email: email || undefined }
        ]
      },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        racePack: true
      }
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Peserta tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: participant
    });

  } catch (error) {
    console.error('Error fetching participant:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
}