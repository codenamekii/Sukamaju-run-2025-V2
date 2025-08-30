// app/api/payment/create/route.ts

import { Prisma, PrismaClient } from '@prisma/client';
import midtransClient from 'midtrans-client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

// Initialize Midtrans Snap
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || ''
});

// Helper untuk format tanggal sesuai Midtrans
function formatMidtransDate(date: Date) {
  const pad = (n: number) => (n < 10 ? "0" + n : n);
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  // Hitung offset timezone
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const offsetHours = pad(Math.floor(Math.abs(offset) / 60));
  const offsetMinutes = pad(Math.abs(offset) % 60);

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${sign}${offsetHours}${offsetMinutes}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participantId, communityRegistrationId, amount, registrationCode } = body;

    console.log('💳 Creating payment for:', {
      participantId,
      communityRegistrationId,
      amount
    });

    // Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Get registration details
    let customerDetails;
    let itemDetails;
    let orderId;

    if (communityRegistrationId) {
      // Community registration
      const community = await prisma.communityRegistration.findUnique({
        where: { id: communityRegistrationId },
        include: {
          members: {
            include: { participant: true }
          }
        }
      });

      if (!community) {
        return NextResponse.json(
          { error: 'Community registration not found' },
          { status: 404 }
        );
      }

      orderId = `COM-${Date.now()}-${community.registrationCode}`;

      customerDetails = {
        first_name: community.picName,
        email: community.picEmail,
        phone: community.picWhatsapp,
        billing_address: {
          first_name: community.picName,
          email: community.picEmail,
          phone: community.picWhatsapp,
          address: community.communityAddress,
        }
      };

      itemDetails = [
        {
          id: community.registrationCode,
          price: Math.floor(community.totalBasePrice / community.totalMembers),
          quantity: community.totalMembers,
          name: `Sukamaju Run 2025 - ${community.category} (Community)`,
          category: 'Registration',
          merchant_name: 'Sukamaju Run'
        }
      ];

      if (community.jerseyAddOn > 0) {
        itemDetails.push({
          id: `JERSEY-${community.registrationCode}`,
          price: community.jerseyAddOn,
          quantity: 1,
          name: 'Jersey Size XXL/XXXL Addon',
          category: 'Addon',
          merchant_name: 'Sukamaju Run'
        });
      }

    } else if (participantId) {
      // Individual registration
      const participant = await prisma.participant.findUnique({
        where: { id: participantId }
      });

      if (!participant) {
        return NextResponse.json(
          { error: 'Participant not found' },
          { status: 404 }
        );
      }

      orderId = `IND-${Date.now()}-${participant.registrationCode}`;

      customerDetails = {
        first_name: participant.fullName,
        email: participant.email,
        phone: participant.whatsapp,
        billing_address: {
          first_name: participant.fullName,
          email: participant.email,
          phone: participant.whatsapp,
          address: participant.address,
          city: participant.city,
          postal_code: participant.postalCode || undefined,
        }
      };

      itemDetails = [
        {
          id: participant.registrationCode,
          price: participant.basePrice,
          quantity: 1,
          name: `Sukamaju Run 2025 - ${participant.category}`,
          category: 'Registration',
          merchant_name: 'Sukamaju Run'
        }
      ];

      if (participant.jerseyAddOn > 0) {
        itemDetails.push({
          id: `JERSEY-${participant.registrationCode}`,
          price: participant.jerseyAddOn,
          quantity: 1,
          name: `Jersey Size ${participant.jerseySize} Addon`,
          category: 'Addon',
          merchant_name: 'Sukamaju Run'
        });
      }
    } else {
      return NextResponse.json(
        { error: 'Either participantId or communityRegistrationId is required' },
        { status: 400 }
      );
    }

    // Create Midtrans transaction
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      customer_details: customerDetails,
      item_details: itemDetails,
      credit_card: {
        secure: true
      },
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL}/registration/success?code=${registrationCode}&type=${participantId ? 'INDIVIDUAL' : 'COMMUNITY'}`,
        error: `${process.env.NEXT_PUBLIC_APP_URL}/registration/payment?code=${registrationCode}&type=${participantId ? 'INDIVIDUAL' : 'COMMUNITY'}&error=true`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/registration/pending?code=${registrationCode}&type=${participantId ? 'INDIVIDUAL' : 'COMMUNITY'}`
      },
      expiry: {
        start_time: formatMidtransDate(new Date()), // ✅ sudah sesuai format
        unit: 'hours',
        duration: 24
      },
      custom_field1: participantId || communityRegistrationId,
      custom_field2: participantId ? 'INDIVIDUAL' : 'COMMUNITY',
      custom_field3: registrationCode
    };

    console.log('📤 Sending to Midtrans:', { orderId, amount, expiry: parameter.expiry.start_time });

    const transaction = await snap.createTransaction(parameter);

    console.log('✅ Midtrans response:', {
      token: transaction.token?.substring(0, 20) + '...',
      redirect_url: transaction.redirect_url
    });

    // Update payment record
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { participantId: participantId || undefined },
          { communityRegistrationId: communityRegistrationId || undefined }
        ],
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          midtransOrderId: orderId,
          midtransToken: transaction.token,
          midtransResponse: transaction as Prisma.JsonObject
        }
      });
    }

    return NextResponse.json({
      success: true,
      token: transaction.token,
      redirect_url: transaction.redirect_url,
      order_id: orderId
    });

  } catch (error) {
    console.error('❌ Payment creation error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Failed to create payment',
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}