// app/api/registration/community/route.ts
import { WhatsAppService } from '@/lib/services/whatsapp.service';
import { generateBibNumbersBatch, generateCommunityCode } from '@/lib/utils/bib-generator';
import { formatWhatsAppNumber, validateWhatsAppNumber } from '@/lib/utils/whatsapp-formatter';
import { Prisma, PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

// Constants for pricing
const PRICING = {
  '5K': {
    basePrice: 171000,
    jerseyAddOn: 20000
  },
  '10K': {
    basePrice: 218000,
    jerseyAddOn: 20000
  }
};

// Interface definitions
interface CommunityMemberData {
  fullName: string;
  gender: string;
  dateOfBirth: string;
  identityNumber: string;
  bloodType?: string;
  email: string;
  whatsapp: string;
  address?: string;
  province?: string;
  city?: string;
  postalCode?: string;
  bibName?: string;
  jerseySize: string;
  estimatedTime?: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  medicalHistory?: string;
  allergies?: string;
  medications?: string;
}

interface CommunityRegistrationBody {
  communityName: string;
  communityType?: string;
  address: string;
  picName: string;
  picWhatsapp: string;
  picEmail: string;
  picPosition?: string;
  category: '5K' | '10K';
  city: string;
  province: string;
  members: CommunityMemberData[];
  idempotencyKey?: string;
}

// Helper: Generate request hash for idempotency

// Helper: Calculate community pricing
function calculateCommunityPrice(
  category: '5K' | '10K',
  members: CommunityMemberData[]
) {
  const basePrice = PRICING[category].basePrice;
  const totalBasePrice = basePrice * members.length;

  let jerseyAddOnTotal = 0;
  const jerseyAdjustments: Array<{
    memberName: string;
    size: string;
    adjustment: number;
  }> = [];

  members.forEach(member => {
    if (member.jerseySize === 'XXL' || member.jerseySize === 'XXXL') {
      const adjustment = PRICING[category].jerseyAddOn;
      jerseyAddOnTotal += adjustment;
      jerseyAdjustments.push({
        memberName: member.fullName,
        size: member.jerseySize,
        adjustment
      });
    }
  });

  return {
    basePrice,
    totalBasePrice,
    jerseyAddOnTotal,
    jerseyAdjustments,
    finalPrice: totalBasePrice + jerseyAddOnTotal,
    pricePerPerson: Math.ceil((totalBasePrice + jerseyAddOnTotal) / members.length)
  };
}

// Main POST handler
export async function POST(request: NextRequest) {
  let idempotencyKey: string | null = null;

  try {
    const body: CommunityRegistrationBody = await request.json();

    // Generate idempotency key
    idempotencyKey = body.idempotencyKey ||
      `com-${body.picEmail}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;


    console.log('Community Registration Request:', {
      communityName: body.communityName,
      picEmail: body.picEmail,
      membersCount: body.members?.length,
      idempotencyKey
    });

    // Basic validations
    if (!body.members || body.members.length < 5) {
      return NextResponse.json(
        { error: 'Minimum 5 anggota untuk registrasi komunitas' },
        { status: 400 }
      );
    }

    if (!body.address || body.address.trim() === '') {
      return NextResponse.json(
        { error: 'Alamat komunitas harus diisi' },
        { status: 400 }
      );
    }

    // Validate PIC WhatsApp
    const formattedPicWhatsApp = formatWhatsAppNumber(body.picWhatsapp);
    if (!validateWhatsAppNumber(formattedPicWhatsApp)) {
      throw new Error('Format WhatsApp PIC tidak valid');
    }

    // Validate all members
    for (const member of body.members) {
      const formattedWa = formatWhatsAppNumber(member.whatsapp);
      if (!validateWhatsAppNumber(formattedWa)) {
        throw new Error(`Format WhatsApp tidak valid untuk: ${member.fullName}`);
      }
      if (!member.email.includes('@')) {
        throw new Error(`Email tidak valid untuk: ${member.fullName}`);
      }

      // Validate age
      const birthDate = new Date(member.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      const minAge = body.category === '5K' ? 12 : 17;
      if (age < minAge) {
        throw new Error(`${member.fullName} belum mencukupi umur minimal ${minAge} tahun untuk kategori ${body.category}`);
      }
    }

    // Check existing registrations
    const memberEmails = body.members.map(m => m.email);
    const existingParticipants = await prisma.participant.findMany({
      where: {
        email: { in: memberEmails },
        category: body.category,
        registrationStatus: { in: ['PENDING', 'CONFIRMED'] }
      },
      select: { email: true }
    });

    if (existingParticipants.length > 0) {
      throw new Error(`Email sudah terdaftar di kategori ${body.category}: ${existingParticipants.map(p => p.email).join(', ')}`);
    }

    // Calculate pricing
    const pricing = calculateCommunityPrice(body.category, body.members);

    // Main transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate community code (simple counter)
      const communityCode = await generateCommunityCode(tx);

      // Pre-generate all BIB numbers to avoid gaps
      const bibNumbers = await generateBibNumbersBatch(body.category, body.members.length, tx);

      // Create community registration
      const community = await tx.communityRegistration.create({
        data: {
          communityName: body.communityName,
          communityType: body.communityType || 'RUNNING_CLUB',
          communityAddress: body.address,
          picName: body.picName,
          picWhatsapp: formattedPicWhatsApp,
          picEmail: body.picEmail,
          picPosition: body.picPosition || 'PIC',
          registrationCode: communityCode,
          totalMembers: body.members.length,
          category: body.category,
          basePrice: pricing.basePrice,
          totalBasePrice: pricing.totalBasePrice,
          promoAmount: 0,
          jerseyAddOn: pricing.jerseyAddOnTotal,
          finalPrice: pricing.finalPrice,
          appliedPromo: null,
          registrationStatus: 'PENDING'
        }
      });

      // Create participants
      const participants = [];
      const racePacks = [];

      for (let i = 0; i < body.members.length; i++) {
        const member = body.members[i];
        const bibNumber = bibNumbers[i]; // Use pre-generated BIB
        const formattedMemberWhatsApp = formatWhatsAppNumber(member.whatsapp);

        const participant = await tx.participant.create({
          data: {
            fullName: member.fullName,
            gender: member.gender,
            dateOfBirth: new Date(member.dateOfBirth),
            idNumber: member.identityNumber,
            bloodType: member.bloodType || null,
            email: member.email,
            whatsapp: formattedMemberWhatsApp,
            address: member.address || body.address,
            province: member.province || body.province,
            city: member.city || body.city,
            postalCode: member.postalCode || null,
            category: body.category,
            bibName: member.bibName || member.fullName.substring(0, 10).toUpperCase(),
            jerseySize: member.jerseySize,
            estimatedTime: member.estimatedTime || null,
            emergencyName: member.emergencyName,
            emergencyPhone: member.emergencyPhone,
            emergencyRelation: member.emergencyRelation,
            medicalHistory: member.medicalHistory || null,
            allergies: member.allergies || null,
            medications: member.medications || null,
            bibNumber,
            registrationCode: `${communityCode}-M${(i + 1).toString().padStart(2, '0')}`,
            registrationType: 'COMMUNITY',
            basePrice: pricing.basePrice,
            jerseyAddOn: member.jerseySize === 'XXL' || member.jerseySize === 'XXXL' ? PRICING[body.category].jerseyAddOn : 0,
            totalPrice: pricing.pricePerPerson,
            isEarlyBird: false,
            registrationStatus: 'PENDING'
          }
        });

        await tx.communityMember.create({
          data: {
            communityRegistrationId: community.id,
            participantId: participant.id,
            memberNumber: i + 1,
            isFreeMember: false
          }
        });

        const racePack = await tx.racePack.create({
          data: {
            participantId: participant.id,
            hasJersey: true,
            hasBib: true,
            hasGoodieBag: true,
            qrCode: `QR-${participant.registrationCode}-${Date.now()}`
          }
        });

        participants.push(participant);
        racePacks.push(racePack);
      }

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          communityRegistrationId: community.id,
          amount: pricing.finalPrice,
          status: 'PENDING',
          paymentCode: `PAY-${communityCode}-${Date.now()}`,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });

      return { community, participants, racePacks, payment };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 30000
    });

    // Success response
    const successResponse = {
      success: true,
      data: {
        registrationCode: result.community.registrationCode,
        communityName: result.community.communityName,
        totalMembers: result.community.totalMembers,
        totalPrice: pricing.finalPrice,
        paymentCode: result.payment.paymentCode,
        paymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/${result.payment.paymentCode}`,
        members: result.participants.map(p => ({
          name: p.fullName,
          bibNumber: p.bibNumber,
          registrationCode: p.registrationCode
        }))
      }
    };

    // Send WhatsApp notification (async)
    setImmediate(async () => {
      try {
        const waMessage = `🏃 *REGISTRASI KOMUNITAS BERHASIL!*

Halo *${body.picName}*,

Registrasi komunitas *${body.communityName}* telah berhasil!

📋 *DETAIL:*
• Kode: *${result.community.registrationCode}*
• Kategori: *${body.category}*
• Jumlah: *${body.members.length} peserta*
• Total: *Rp ${pricing.finalPrice.toLocaleString('id-ID')}*

👥 *PESERTA:*
${result.participants.map((p, i) => `${i + 1}. ${p.fullName} - BIB: ${p.bibNumber}`).join('\n')}

💳 *PEMBAYARAN:*
Kode: *${result.payment.paymentCode}*
Link: ${process.env.NEXT_PUBLIC_APP_URL}/payment/${result.payment.paymentCode}

Terima kasih! 🙏`;

        await WhatsAppService.sendMessage(formattedPicWhatsApp, waMessage);
      } catch (waError) {
        console.error('WhatsApp notification error:', waError);
      }
    });

    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('Community registration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// GET handler
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Registration code is required' },
        { status: 400 }
      );
    }

    const community = await prisma.communityRegistration.findUnique({
      where: { registrationCode: code },
      include: {
        members: {
          include: {
            participant: true
          }
        },
        payments: {
          where: { status: { in: ['PENDING', 'PAID'] } },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!community) {
      return NextResponse.json(
        { error: 'Community registration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        community: {
          id: community.id,
          communityName: community.communityName,
          picName: community.picName,
          picEmail: community.picEmail,
          category: community.category,
          totalMembers: community.totalMembers,
          registrationCode: community.registrationCode,
          registrationStatus: community.registrationStatus,
          finalPrice: community.finalPrice
        },
        members: community.members.map(m => ({
          fullName: m.participant.fullName,
          email: m.participant.email,
          bibNumber: m.participant.bibNumber,
          jerseySize: m.participant.jerseySize
        })),
        payment: community.payments[0] || null
      }
    });
  } catch (error) {
    console.error('GET community registration error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch community registration' },
      { status: 500 }
    );
  }
}