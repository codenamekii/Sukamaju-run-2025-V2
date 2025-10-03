import { WhatsAppService } from '@/lib/services/whatsapp.service';
import { JerseySize } from '@/lib/types/registration';
import { generateBibNumber } from '@/lib/utils/bib-generator';
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
  jerseySize: JerseySize;
  estimatedTime?: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  medicalHistory?: string;
  allergies?: string;
  medications?: string;
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

    // buat paymentCode yang unik (simple)
    const paymentCode = `PMT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

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
          paymentCode, // pastikan field ini ada di schema Prisma
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      return { participant, racePack, payment };
    });

    // Create Midtrans payment token
    let paymentToken: string | null = null;
    let paymentUrl = '';

    try {
      const midtransPayload = {
        transaction_details: {
          order_id: result.payment.paymentCode,
          gross_amount: result.payment.amount,
        },
        customer_details: {
          first_name: result.participant.fullName,
          email: result.participant.email,
          phone: result.participant.whatsapp,
        },
        item_details: [
          {
            id: result.participant.category,
            price: result.payment.amount,
            quantity: 1,
            name: `Registration ${result.participant.category} - ${result.participant.fullName}`,
          },
        ],
        expiry: {
          unit: 'hours',
          duration: 24,
        },
      };

      const midtransResponse = await fetch(
        `https://app.${process.env.MIDTRANS_IS_PRODUCTION === 'true' ? '' : 'sandbox.'}midtrans.com/snap/v1/transactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from((process.env.MIDTRANS_SERVER_KEY ?? '') + ':').toString('base64')}`,
          },
          body: JSON.stringify(midtransPayload),
        }
      );

      if (midtransResponse.ok) {
        const midtransData = await midtransResponse.json();
        paymentToken = midtransData.token;
        paymentUrl = midtransData.redirect_url;

        // Update payment dengan Midtrans order ID & token
        await prisma.payment.update({
          where: { id: result.payment.id },
          data: {
            midtransOrderId: result.payment.paymentCode,
            midtransToken: paymentToken,
          },
        });
      } else {
        const txt = await midtransResponse.text().catch(() => '');
        console.error('Midtrans responded not ok:', midtransResponse.status, txt);
      }
    } catch (midtransError) {
      console.error('Midtrans error:', midtransError);
    }

    // Kirim WhatsApp konfirmasi
    try {
      await WhatsAppService.sendRegistrationConfirmation(
        {
          fullName: result.participant.fullName,
          registrationCode: result.participant.registrationCode,
          category: result.participant.category,
          bibNumber: result.participant.bibNumber ?? 'N/A',
          totalPrice: result.participant.totalPrice,
          whatsapp: result.participant.whatsapp,
        },
        {
          paymentCode: result.payment.paymentCode,
          amount: result.payment.amount,
          paymentUrl: paymentUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment/${result.payment.paymentCode}`,
          // NOTE: Ini baris penting: ubah null -> undefined untuk cocok dengan tipe PaymentData
          expiredAt: result.payment.expiredAt ?? undefined,
        }
      );
    } catch (waError) {
      console.error('WhatsApp notification error:', waError);
    }

    // Reminder 30 menit sebelum expired
    if (result.payment.expiredAt) {
      const reminderTime = new Date(result.payment.expiredAt).getTime() - 30 * 60 * 1000;
      const now = Date.now();

      if (reminderTime > now) {
        setTimeout(async () => {
          try {
            WhatsAppService.sendPaymentReminder(
              result.participant.id,
              result.payment.amount
            );
          } catch (err) {
            console.error('Reminder WA error:', err);
          }
        }, reminderTime - now);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        registrationCode: result.participant.registrationCode,
        bibNumber: result.participant.bibNumber,
        totalPrice: pricing.totalPrice,
        paymentCode: result.payment.paymentCode,
        paymentToken,
        paymentUrl,
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
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Registration code is required' }, { status: 400 });
  }

  try {
    const participant = await prisma.participant.findUnique({
      where: { registrationCode: code },
      include: {
        payments: true,
        racePack: true,
        certificate: true,
        checkIns: true,
        communityMember: true,
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        participant,
        payment: participant.payments,
        racePack: participant.racePack,
      },
    });
  } catch (error) {
    console.error('GET registration error:', error);
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return NextResponse.json({ error: 'Terjadi kesalahan', details: message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}