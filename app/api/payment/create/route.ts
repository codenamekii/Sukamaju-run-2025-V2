// app/api/payment/create/route.ts
import { PrismaClient } from '@prisma/client';
import midtransClient from 'midtrans-client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

// Initialize Midtrans Snap
const snap = new midtransClient.Snap({
  isProduction: false, // Set to true for production
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || ''
});

export async function POST(request: NextRequest) {
  try {
    const { registrationCode } = await request.json();

    if (!registrationCode) {
      return NextResponse.json(
        { error: 'Kode registrasi harus diisi' },
        { status: 400 }
      );
    }

    // Find participant and payment
    const participant = await prisma.participant.findFirst({
      where: { registrationCode },
      include: {
        payments: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Peserta tidak ditemukan' },
        { status: 404 }
      );
    }

    let payment = participant.payments[0];

    // If no pending payment, create new one
    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          participantId: participant.id,
          amount: participant.totalPrice,
          status: 'PENDING',
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      });
    }

    // Generate unique order ID
    const orderId = `SUKAMAJU-${payment.paymentCode}`;

    // Prepare Midtrans parameter
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: payment.amount
      },
      customer_details: {
        first_name: participant.fullName,
        email: participant.email,
        phone: participant.whatsapp,
        billing_address: {
          first_name: participant.fullName,
          email: participant.email,
          phone: participant.whatsapp,
          address: participant.address,
          city: participant.city,
          postal_code: participant.postalCode || '00000',
          country_code: 'IDN'
        }
      },
      item_details: [
        {
          id: participant.registrationCode,
          price: participant.basePrice,
          quantity: 1,
          name: `Registrasi ${participant.category} - SUKAMAJU RUN 2025`,
          category: participant.category,
        }
      ],
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/registration/success?order_id=${orderId}`
      },
      expiry: {
        unit: 'hours',
        duration: 24
      },
      enabled_payments: [
        'credit_card',
        'bca_va',
        'bni_va',
        'bri_va',
        'permata_va',
        'other_va',
        'gopay',
        'shopeepay',
        'cstore',
        'akulaku'
      ]
    };

    // Add jersey addon if exists
    if (participant.jerseyAddOn > 0) {
      parameter.item_details.push({
        id: `${participant.registrationCode}-JERSEY`,
        price: participant.jerseyAddOn,
        quantity: 1,
        name: `Tambahan Biaya Jersey (${participant.jerseySize})`,
        category: 'ADDON'
      });
    }

    try {
      // Create transaction token with Midtrans
      const transaction = await snap.createTransaction(parameter);

      // Update payment with Midtrans info
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          midtransOrderId: orderId,
          midtransToken: transaction.token,
          midtransResponse: transaction as unknown as object
        }
      });

      return NextResponse.json({
        success: true,
        token: transaction.token,
        redirectUrl: transaction.redirect_url,
        orderId,
        paymentCode: payment.paymentCode
      });

    } catch (midtransError: unknown) {
      console.error('Midtrans error:', midtransError);

      // Fallback for testing without valid Midtrans credentials
      if (process.env.NODE_ENV === 'development') {
        // Generate mock token for testing
        const mockToken = `mock-token-${Date.now()}`;

        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            midtransOrderId: orderId,
            midtransToken: mockToken
          }
        });

        return NextResponse.json({
          success: true,
          token: mockToken,
          redirectUrl: '#',
          orderId,
          paymentCode: payment.paymentCode,
          testMode: true,
          message: 'Test mode - Midtrans not configured. Payment simulation only.'
        });
      }

      throw midtransError;
    }

  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      {
        error: 'Gagal membuat transaksi pembayaran',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}