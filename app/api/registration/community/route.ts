// app/api/registration/community/route.ts

import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

// Helper untuk generate BIB numbers
async function generateBibNumbers(category: '5K' | '10K', count: number): Promise<string[]> {
  const existingCount = await prisma.participant.count({ where: { category } });
  const prefix = category === '5K' ? '5' : '10';
  const bibNumbers: string[] = [];

  for (let i = 0; i < count; i++) {
    const number = (existingCount + i + 1).toString().padStart(3, '0');
    bibNumbers.push(`${prefix}${number}`);
  }

  return bibNumbers;
}

// Helper untuk calculate community price
function calculateCommunityPrice(category: string, jerseySize: string) {
  // Community prices (5% discount from individual)
  const basePrice = category === '5K' ? 171000 : 218000;
  const jerseyAddOn = ['XXL', 'XXXL'].includes(jerseySize) ? 20000 : 0;

  return {
    basePrice,
    jerseyAddOn,
    totalPrice: basePrice + jerseyAddOn
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('📥 Community Registration Request:', {
      communityName: body.communityName,
      memberCount: body.members?.length || 0,
      category: body.category
    });

    // Validate minimum members
    if (!body.members || body.members.length < 5) {
      return NextResponse.json(
        { error: 'Minimal 5 peserta untuk registrasi komunitas' },
        { status: 400 }
      );
    }

    // Check for duplicate emails
    const emails = body.members.map((m: {email : string}) => m.email);
    const existingParticipants = await prisma.participant.findMany({
      where: { email: { in: emails } },
      select: { email: true }
    });

    if (existingParticipants.length > 0) {
      const duplicateEmails = existingParticipants.map(p => p.email);
      return NextResponse.json(
        {
          error: 'Email sudah terdaftar',
          duplicateEmails
        },
        { status: 400 }
      );
    }

    // Generate registration code for community
    const communityRegCode = `COM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Generate BIB numbers for all members
    const bibNumbers = await generateBibNumbers(body.category, body.members.length);

    // Calculate total prices
    let totalBasePrice = 0;
    let totalJerseyAddOn = 0;
    const memberPricings = body.members.map((member: {jerseySize:string}) => {
      const pricing = calculateCommunityPrice(body.category, member.jerseySize);
      totalBasePrice += pricing.basePrice;
      totalJerseyAddOn += pricing.jerseyAddOn;
      return pricing;
    });

    const finalPrice = totalBasePrice + totalJerseyAddOn;

    console.log('💰 Price Calculation:', {
      totalBasePrice,
      totalJerseyAddOn,
      finalPrice
    });

    // Create everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create community registration
      const communityReg = await tx.communityRegistration.create({
        data: {
          communityName: body.communityName,
          communityType: body.communityType || 'RUNNING_CLUB',
          communityAddress: body.address,
          picName: body.picName,
          picWhatsapp: body.picWhatsapp,
          picEmail: body.picEmail,
          picPosition: body.picPosition || 'PIC',
          registrationCode: communityRegCode,
          totalMembers: body.members.length,
          category: body.category,
          basePrice: Math.floor(totalBasePrice / body.members.length), // Average base price
          totalBasePrice,
          jerseyAddOn: totalJerseyAddOn,
          finalPrice,
          appliedPromo: 'COMMUNITY_5%',
          registrationStatus: 'PENDING'
        }
      });

      console.log('✅ Community registration created:', communityReg.id);

      // 2. Create participants and community members
      const participants = [];
      const racePacks = [];

      for (let i = 0; i < body.members.length; i++) {
        const member = body.members[i];
        const pricing = memberPricings[i];

        // Create participant
        const participant = await tx.participant.create({
          data: {
            fullName: member.fullName,
            gender: member.gender,
            dateOfBirth: new Date(member.dateOfBirth),
            idNumber: member.idNumber,
            bloodType: member.bloodType || null,
            email: member.email,
            whatsapp: member.whatsapp,
            address: body.address, // Use community address
            province: body.province,
            city: body.city,
            postalCode: body.postalCode || null,
            category: body.category,
            bibName: member.bibName,
            jerseySize: member.jerseySize,
            estimatedTime: member.estimatedTime || null,
            emergencyName: member.emergencyName,
            emergencyPhone: member.emergencyPhone,
            emergencyRelation: member.emergencyRelation,
            medicalHistory: member.medicalHistory || null,
            allergies: member.allergies || null,
            medications: member.medications || null,
            bibNumber: bibNumbers[i],
            registrationCode: `${communityRegCode}-${i + 1}`,
            registrationType: 'COMMUNITY',
            basePrice: pricing.basePrice,
            jerseyAddOn: pricing.jerseyAddOn,
            totalPrice: pricing.totalPrice,
            isEarlyBird: false,
            registrationStatus: 'PENDING'
          }
        });

        participants.push(participant);

        // Create community member relation
        await tx.communityMember.create({
          data: {
            communityRegistrationId: communityReg.id,
            participantId: participant.id,
            memberNumber: i + 1,
            isFreeMember: false
          }
        });

        // Create race pack (single QR for PIC, individual packs for members)
        const racePack = await tx.racePack.create({
          data: {
            participantId: participant.id,
            qrCode: i === 0 ? `QR-${communityRegCode}` : `QR-${participant.registrationCode}`,
            hasJersey: true,
            hasBib: true,
            hasGoodieBag: true,
            notes: i === 0 ? 'PIC - Collect for all community members' : `Community member ${i + 1}`
          }
        });

        racePacks.push(racePack);
      }

      console.log(`✅ Created ${participants.length} participants`);

      // 3. Create single payment for community
      const payment = await tx.payment.create({
        data: {
          communityRegistrationId: communityReg.id,
          amount: finalPrice,
          status: 'PENDING',
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          metadata: {
            type: 'COMMUNITY',
            totalMembers: body.members.length,
            communityName: body.communityName
          }
        }
      });

      console.log('✅ Payment record created:', payment.paymentCode);

      return {
        communityRegistration: communityReg,
        participants,
        racePacks,
        payment
      };
    });

    // Prepare response
    const response = {
      success: true,
      data: {
        registrationCode: result.communityRegistration.registrationCode,
        communityName: result.communityRegistration.communityName,
        totalMembers: result.participants.length,
        totalPrice: result.communityRegistration.finalPrice,
        paymentCode: result.payment.paymentCode,
        qrCode: result.racePacks[0].qrCode, // PIC's QR code
        members: result.participants.map((p, i) => ({
          name: p.fullName,
          bibNumber: p.bibNumber,
          registrationCode: p.registrationCode
        }))
      }
    };

    console.log('✅ Community registration completed successfully');

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Community registration error:', error);

    // Better error handling
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Terjadi kesalahan saat mendaftar',
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Terjadi kesalahan tidak diketahui' },
      { status: 500 }
    );
  }
}

// GET endpoint untuk check status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const registrationCode = searchParams.get('code');

    if (!registrationCode) {
      return NextResponse.json(
        { error: 'Kode registrasi harus diisi' },
        { status: 400 }
      );
    }

    const communityReg = await prisma.communityRegistration.findUnique({
      where: { registrationCode },
      include: {
        members: {
          include: {
            participant: {
              include: {
                racePack: true
              }
            }
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!communityReg) {
      return NextResponse.json(
        { error: 'Registrasi komunitas tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        community: communityReg,
        payment: communityReg.payments[0] || null
      }
    });

  } catch (error) {
    console.error('Error fetching community registration:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
}