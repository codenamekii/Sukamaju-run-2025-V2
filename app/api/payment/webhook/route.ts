// app/api/payment/webhook/route.ts
import { WhatsAppIntegrationService } from '@/lib/services/whatsapp-integration.service';
import { Prisma, PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

// Helper untuk verify signature
function verifySignature(orderId: string, statusCode: string, grossAmount: string, serverKey: string): string {
  return crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');
}

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
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'ngrok-skip-browser-warning': 'true',
    };

    const notification = await request.json();

    console.log('🔔 Webhook notification received:', {
      order_id: notification.order_id,
      transaction_status: notification.transaction_status,
      payment_type: notification.payment_type,
      status_code: notification.status_code,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('Full notification:', JSON.stringify(notification, null, 2));
    }

    const expectedSignature = verifySignature(
      notification.order_id,
      notification.status_code,
      notification.gross_amount,
      process.env.MIDTRANS_SERVER_KEY || ''
    );

    if (notification.signature_key !== expectedSignature) {
      console.error('❌ Invalid signature');
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
          { status: 'error', message: 'Invalid signature' },
          { status: 401, headers }
        );
      }
    }

    const payment = await prisma.payment.findUnique({
      where: { midtransOrderId: notification.order_id },
      include: {
        participant: true,
        communityRegistration: true
      },
    });

    if (!payment) {
      console.error('❌ Payment not found for order:', notification.order_id);
      return NextResponse.json(
        { status: 'ok', message: 'Payment not found but acknowledged' },
        { status: 200, headers }
      );
    }

    // Determine payment status
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;

    let paymentStatus = payment.status;
    let registrationStatus = 'PENDING';

    if (transactionStatus === 'capture' && fraudStatus === 'accept') {
      paymentStatus = 'PAID';
      registrationStatus = 'CONFIRMED';
    } else if (transactionStatus === 'settlement') {
      paymentStatus = 'PAID';
      registrationStatus = 'CONFIRMED';
    } else if (transactionStatus === 'pending') {
      paymentStatus = 'PENDING';
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

    // Update payment
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus,
        paymentMethod: notification.payment_type,
        paymentChannel: notification.bank || notification.store || notification.issuer || null,
        vaNumber: notification.va_numbers?.[0]?.va_number || null,
        paidAt: paymentStatus === 'PAID' ? new Date() : null,
        midtransResponse: notification as Prisma.JsonObject,
      },
    });

    // Handle payment success
    if (paymentStatus === 'PAID') {
      console.log('💳 Payment confirmed! Processing notifications...');

      try {
        // Use the integration service to handle notifications
        await WhatsAppIntegrationService.handlePaymentWebhook(
          notification.order_id,
          transactionStatus
        );

        console.log('✅ Payment success notifications sent');
      } catch (waError) {
        console.error('❌ Failed to send WhatsApp notification:', waError);
      }
    }

    return NextResponse.json(
      { status: 'ok', message: 'Webhook processed successfully' },
      { status: 200, headers }
    );
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Internal error but acknowledged',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 200 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      message: 'Webhook endpoint is working',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
    { headers: { 'ngrok-skip-browser-warning': 'true' } }
  );
}