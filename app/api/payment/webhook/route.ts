// app/api/payment/webhook/route.ts

import { Prisma, PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

// Helper untuk verify signature
function verifySignature(orderId: string, statusCode: string, grossAmount: string, serverKey: string): string {
  const signature = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');
  return signature;
}

// Handle OPTIONS request untuk CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    // Skip ngrok browser warning
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'ngrok-skip-browser-warning': 'true'
    };

    // Parse notification
    const notification = await request.json();

    console.log('🔔 Webhook notification received:', {
      order_id: notification.order_id,
      transaction_status: notification.transaction_status,
      payment_type: notification.payment_type,
      status_code: notification.status_code
    });

    // Untuk testing, log semua data
    if (process.env.NODE_ENV === 'development') {
      console.log('Full notification:', JSON.stringify(notification, null, 2));
    }

    // Verify signature
    const signatureKey = notification.signature_key;
    const expectedSignature = verifySignature(
      notification.order_id,
      notification.status_code,
      notification.gross_amount,
      process.env.MIDTRANS_SERVER_KEY || ''
    );

    if (signatureKey !== expectedSignature) {
      console.error('❌ Invalid signature');
      console.error('Received:', signatureKey);
      console.error('Expected:', expectedSignature);

      // Untuk testing di development, tetap proses
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
          { status: 'error', message: 'Invalid signature' },
          { status: 401, headers }
        );
      }
    }

    // Find payment by order ID
    const payment = await prisma.payment.findUnique({
      where: { midtransOrderId: notification.order_id },
      include: {
        participant: true,
        communityRegistration: {
          include: {
            members: {
              include: { participant: true }
            }
          }
        }
      }
    });

    if (!payment) {
      console.error('❌ Payment not found for order:', notification.order_id);

      // Return success anyway untuk Midtrans
      return NextResponse.json(
        { status: 'ok', message: 'Payment not found but acknowledged' },
        { status: 200, headers }
      );
    }

    // Handle different transaction statuses
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;

    let paymentStatus = payment.status;
    let registrationStatus = 'PENDING';

    console.log('📊 Processing status:', { transactionStatus, fraudStatus });

    if (transactionStatus === 'capture') {
      if (fraudStatus === 'accept') {
        paymentStatus = 'PAID';
        registrationStatus = 'CONFIRMED';
      }
    } else if (transactionStatus === 'settlement') {
      paymentStatus = 'PAID';
      registrationStatus = 'CONFIRMED';
    } else if (transactionStatus === 'pending') {
      paymentStatus = 'PENDING';
      registrationStatus = 'PENDING';
    } else if (transactionStatus === 'deny') {
      paymentStatus = 'FAILED';
      registrationStatus = 'CANCELLED';
    } else if (transactionStatus === 'expire') {
      paymentStatus = 'EXPIRED';
      registrationStatus = 'CANCELLED';
    } else if (transactionStatus === 'cancel') {
      paymentStatus = 'CANCELLED';
      registrationStatus = 'CANCELLED';
    }

    console.log('💾 Updating payment status to:', paymentStatus);

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus,
        paymentMethod: notification.payment_type,
        paymentChannel: notification.bank || notification.store || notification.issuer || null,
        vaNumber: notification.va_numbers?.[0]?.va_number || null,
        paidAt: paymentStatus === 'PAID' ? new Date() : null,
        midtransResponse: notification as Prisma.JsonObject
      }
    });

    // Update registration status
    if (payment.participantId) {
      // Individual registration
      await prisma.participant.update({
        where: { id: payment.participantId },
        data: { registrationStatus }
      });

      console.log(`✅ Updated participant ${payment.participantId} status to ${registrationStatus}`);

    } else if (payment.communityRegistrationId && payment.communityRegistration) {
      // Community registration
      await prisma.communityRegistration.update({
        where: { id: payment.communityRegistrationId },
        data: { registrationStatus }
      });

      // Update all community members
      const memberIds = payment.communityRegistration.members.map(m => m.participantId);
      await prisma.participant.updateMany({
        where: { id: { in: memberIds } },
        data: { registrationStatus }
      });

      console.log(`✅ Updated community ${payment.communityRegistrationId} and ${memberIds.length} members to ${registrationStatus}`);
    }

    // Send WhatsApp notification if payment successful
    if (paymentStatus === 'PAID') {
      console.log('📱 Payment confirmed! Sending WhatsApp notification...');

      // TODO: Implement WhatsApp notification
      // await WhatsAppService.sendPaymentConfirmation(payment);
    }

    // Return success response untuk Midtrans
    return NextResponse.json(
      {
        status: 'ok',
        message: 'Webhook processed successfully'
      },
      { status: 200, headers }
    );

  } catch (error) {
    console.error('❌ Webhook processing error:', error);

    // Return success anyway untuk prevent retry dari Midtrans
    return NextResponse.json(
      {
        status: 'error',
        message: 'Internal error but acknowledged',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 200 } // Return 200 untuk prevent retry
    );
  }
}

// GET method untuk testing dan health check
export async function GET() {
  // Set headers untuk skip ngrok warning
  const headers = {
    'ngrok-skip-browser-warning': 'true',
    'Content-Type': 'application/json'
  };

  return NextResponse.json(
    {
      status: 'ok',
      message: 'Webhook endpoint is working',
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/webhook`,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    },
    { headers }
  );
}