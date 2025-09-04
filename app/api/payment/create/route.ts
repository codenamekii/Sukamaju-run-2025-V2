// app/api/payment/create/route.ts

import { Prisma, PrismaClient } from '@prisma/client';
import midtransClient from 'midtrans-client';
import { NextRequest, NextResponse } from 'next/server';

// 🔹 PrismaClient singleton
const globalForPrisma = global as unknown as { prisma?: PrismaClient };
export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['query', 'error', 'warn'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 🔹 Midtrans Snap
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || ''
});

// 🔹 Types
interface MidtransItem {
  id: string;
  price: number;
  quantity: number;
  name: string;
  category: string;
  merchant_name: string;
}

interface MidtransCustomer {
  first_name: string;
  email: string;
  phone: string;
  billing_address: {
    first_name: string;
    email: string;
    phone: string;
    address: string | null;
    city?: string | null;
    postal_code?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participantId, communityRegistrationId, amount, registrationCode } = body;

    if (!participantId && !communityRegistrationId) {
      return NextResponse.json(
        { error: 'Either participantId or communityRegistrationId is required' },
        { status: 400 }
      );
    }

    let customerDetails: MidtransCustomer;
    const itemDetails: MidtransItem[] = [];
    let orderId: string;

    if (communityRegistrationId) {
      const community = await prisma.communityRegistration.findUnique({
        where: { id: communityRegistrationId },
        include: { members: { include: { participant: true } } }
      });

      if (!community) {
        return NextResponse.json({ error: 'Community registration not found' }, { status: 404 });
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
          address: community.communityAddress
        }
      };

      itemDetails.push({
        id: community.registrationCode,
        price: Math.floor(community.totalBasePrice / community.totalMembers),
        quantity: community.totalMembers,
        name: `Sukamaju Run 2025 - ${community.category} (Community)`,
        category: 'Registration',
        merchant_name: 'Sukamaju Run'
      });

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
      const participant = await prisma.participant.findUnique({
        where: { id: participantId }
      });

      if (!participant) {
        return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
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
          postal_code: participant.postalCode || undefined
        }
      };

      itemDetails.push({
        id: participant.registrationCode,
        price: participant.basePrice,
        quantity: 1,
        name: `Sukamaju Run 2025 - ${participant.category}`,
        category: 'Registration',
        merchant_name: 'Sukamaju Run'
      });

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
        { error: 'Invalid request, missing IDs' },
        { status: 400 }
      );
    }

    // 🔹 Hitung ulang gross_amount
    const calculatedAmount = itemDetails.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    if (amount !== calculatedAmount) {
      return NextResponse.json(
        { error: 'Amount mismatch', expected: calculatedAmount, received: amount },
        { status: 400 }
      );
    }

    // 🔹 Midtrans transaction
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: calculatedAmount
      },
      customer_details: customerDetails,
      item_details: itemDetails,
      credit_card: { secure: true },
      expiry: { unit: 'hours', duration: 24 },
      custom_field1: participantId || communityRegistrationId,
      custom_field2: participantId ? 'INDIVIDUAL' : 'COMMUNITY',
      custom_field3: registrationCode
    };

    const transaction = await snap.createTransaction(parameter);

    // 🔹 Update or create payment record
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          ...(participantId ? [{ participantId }] : []),
          ...(communityRegistrationId ? [{ communityRegistrationId }] : [])
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
    } else {
      await prisma.payment.create({
        data: {
          amount: calculatedAmount,
          status: 'PENDING',
          midtransOrderId: orderId,
          midtransToken: transaction.token,
          midtransResponse: transaction as Prisma.JsonObject,
          participantId,
          communityRegistrationId
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
    return NextResponse.json(
      {
        error: 'Failed to create payment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}