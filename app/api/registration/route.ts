import { WhatsAppService } from '@/lib/services/whatsapp.service';
import { calculateRegistrationPrice } from '@/lib/utils/pricing';
import { formatWhatsAppNumber, validateWhatsAppNumber } from '@/lib/utils/whatsapp-formatter';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

interface RegistrationBody {
  fullName: string;
  gender: string;
  dateOfBirth: string;
  idNumber: string;
  bloodType?: string;
  email: string;
  whatsapp: string;
  address: string;
  province: string;
  city: string;
  postalCode?: string;
  category: '5K' | '10K';
  bibName: string | null;
  jerseySize: string;
  estimatedTime?: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  medicalHistory?: string;
  allergies?: string;
  medications?: string;
}

async function generateBibNumber(category: '5K' | '10K'): Promise<string> {
  const count = await prisma.participant.count({ where: { category } });
  const prefix = category === '5K' ? '5' : '10';
  return `${prefix}${(count + 1).toString().padStart(3, '0')}`;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegistrationBody = await request.json();

    // Format WhatsApp
    const formattedWhatsApp = formatWhatsAppNumber(body.whatsapp);
    if (!validateWhatsAppNumber(formattedWhatsApp)) {
      return NextResponse.json({ error: 'Format WhatsApp tidak valid' }, { status: 400 });
    }

    // Cek email unik
    const existingParticipant = await prisma.participant.findUnique({
      where: { email: body.email },
    });
    if (existingParticipant) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 });
    }

    // Cek usia
    const birthDate = new Date(body.dateOfBirth);
    const age = new Date().getFullYear() - birthDate.getFullYear();
    if ((body.category === '5K' && age < 12) || (body.category === '10K' && age < 17)) {
      return NextResponse.json(
        { error: body.category === '5K' ? 'Minimal usia 12 tahun untuk 5K' : 'Minimal usia 17 tahun untuk 10K' },
        { status: 400 }
      );
    }

    // Hitung harga
    const pricing = calculateRegistrationPrice(body.category, body.jerseySize);

    // Generate BIB & kode registrasi
    const bibNumber = await generateBibNumber(body.category);
    const registrationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Transaksi Prisma
    const result = await prisma.$transaction(async (tx) => {
      const participant = await tx.participant.create({
        data: {
          fullName: body.fullName,
          gender: body.gender,
          dateOfBirth: birthDate,
          idNumber: body.idNumber,
          bloodType: body.bloodType || null,
          email: body.email,
          whatsapp: formattedWhatsApp,
          address: body.address,
          province: body.province,
          city: body.city,
          postalCode: body.postalCode || null,
          category: body.category,
          bibName: body.bibName || '',
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

    // Kirim WhatsApp konfirmasi
    await WhatsAppService.sendRegistrationConfirmation(
      {
        fullName: result.participant.fullName,
        registrationCode: result.participant.registrationCode,
        category: result.participant.category,
        bibNumber: result.participant.bibNumber ?? 'N/A',
        totalPrice: result.participant.totalPrice,
        whatsapp: result.participant.whatsapp,
      },
      result.payment.paymentCode
    );

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
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: 'Terjadi kesalahan saat mendaftar', details: message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Registration code is required" }, { status: 400 });
  }

  try {
    const participant = await prisma.participant.findUnique({
      where: { registrationCode: code },
      include: {
        payments: true,   // pakai jamak
        racePack: true,
        certificate: true,
        checkIns: true,
        communityMember: true,
      },
    });

    if (!participant) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        participant,
        payment: participant.payment,
        racePack: participant.racePack,
      },
    });
  } catch (error) {
    console.error("GET registration error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json({ error: "Terjadi kesalahan", details: message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
