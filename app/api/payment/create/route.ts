// app/api/payment/create/route.ts

import { Prisma, PrismaClient } from '@prisma/client';
import midtransClient from 'midtrans-client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || ''
});

interface MidtransItem {
  id: string;
  price: number;
  quantity: number;
  name: string;
  category?: string;
  merchant_name?: string;
}

interface MidtransCustomer {
  first_name: string;
  email: string;
  phone: string;
  billing_address?: {
    first_name: string;
    email: string;
    phone: string;
    address?: string | null;
    city?: string | null;
    postal_code?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { registrationCode, amount } = body;

    if (!registrationCode) {
      return NextResponse.json(
        { error: 'Registration code is required' },
        { status: 400 }
      );
    }

    let customerDetails: MidtransCustomer;
    const itemDetails: MidtransItem[] = [];
    let orderId: string;
    let registrationType: 'INDIVIDUAL' | 'COMMUNITY';
    let calculatedAmount: number;
    let finalParticipantId: string | null = null;
    let finalCommunityId: string | null = null;

    // First, check if it's a community registration
    const communityReg = await prisma.communityRegistration.findUnique({
      where: { registrationCode },
      include: {
        members: {
          include: { participant: true }
        }
      }
    });

    if (communityReg) {
      // It's a community registration
      registrationType = 'COMMUNITY';
      orderId = `COM-${Date.now()}-${communityReg.registrationCode}`;
      finalCommunityId = communityReg.id;

      customerDetails = {
        first_name: communityReg.picName,
        email: communityReg.picEmail,
        phone: communityReg.picWhatsapp,
        billing_address: {
          first_name: communityReg.picName,
          email: communityReg.picEmail,
          phone: communityReg.picWhatsapp,
          address: communityReg.communityAddress
        }
      };

      const pricePerPerson = Math.floor(communityReg.totalBasePrice / communityReg.totalMembers);

      itemDetails.push({
        id: communityReg.registrationCode,
        price: pricePerPerson,
        quantity: communityReg.totalMembers,
        name: `Sukamaju Run 2025 - ${communityReg.category} (Community)`,
        category: 'Registration',
        merchant_name: 'Sukamaju Run'
      });

      if (communityReg.jerseyAddOn > 0) {
        itemDetails.push({
          id: `JERSEY-${communityReg.registrationCode}`,
          price: communityReg.jerseyAddOn,
          quantity: 1,
          name: 'Jersey Size XXL/XXXL Addon',
          category: 'Addon',
          merchant_name: 'Sukamaju Run'
        });
      }

      calculatedAmount = communityReg.finalPrice;

    } else {
      // Check for individual registration
      const participant = await prisma.participant.findFirst({
        where: { registrationCode }
      });

      if (!participant) {
        return NextResponse.json(
          { error: 'Registration not found' },
          { status: 404 }
        );
      }

      registrationType = 'INDIVIDUAL';
      orderId = `IND-${Date.now()}-${participant.registrationCode}`;
      finalParticipantId = participant.id;

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

      calculatedAmount = participant.totalPrice;
    }

    // Verify amount if provided
    if (amount && amount !== calculatedAmount) {
      console.warn(`Amount mismatch: provided ${amount}, calculated ${calculatedAmount}`);
    }

    // Build callback URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/registration/success?code=${registrationCode}&type=${registrationType}`;

    // Midtrans transaction parameters
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: calculatedAmount
      },
      customer_details: customerDetails,
      item_details: itemDetails,
      credit_card: {
        secure: true
      },
      expiry: {
        unit: 'hours',
        duration: 24
      },
      callbacks: {
        finish: successUrl
      },
      custom_field1: registrationCode,
      custom_field2: registrationType,
      custom_field3: ''
    };

    console.log('Creating Midtrans transaction:', {
      orderId,
      amount: calculatedAmount,
      type: registrationType,
      successUrl
    });

    const transaction = await snap.createTransaction(parameter);

    // Update or create payment record
    const existingPayment = await prisma.payment.findFirst({
      where: {
        OR: [
          ...(finalParticipantId ? [{ participantId: finalParticipantId }] : []),
          ...(finalCommunityId ? [{ communityRegistrationId: finalCommunityId }] : [])
        ],
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingPayment) {
      await prisma.payment.update({
        where: { id: existingPayment.id },
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
          paymentCode: orderId,
          participantId: finalParticipantId,
          communityRegistrationId: finalCommunityId,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
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
    console.error('Payment creation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create payment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}