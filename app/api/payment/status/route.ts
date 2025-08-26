import { core } from '@/lib/midtrans';
import { prisma } from '@/lib/prisma'; // pastikan pakai singleton prisma
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const orderId = searchParams.get('order_id') ?? undefined;
    const paymentCode = searchParams.get('payment_code') ?? undefined;

    if (!orderId && !paymentCode) {
      return NextResponse.json(
        { error: 'Order ID atau kode pembayaran harus diisi' },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { midtransOrderId: orderId },
          { paymentCode }
        ]
      },
      include: { participant: true }
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Pembayaran tidak ditemukan' },
        { status: 404 }
      );
    }

    // Cek status Midtrans kalau masih pending
    if (payment.status === 'PENDING' && payment.midtransOrderId) {
      await updatePaymentFromMidtrans(payment.id, payment.participantId, payment.midtransOrderId);
    }

    const updatedPayment = await prisma.payment.findUnique({
      where: { id: payment.id },
      include: { participant: true }
    });

    return NextResponse.json({
      success: true,
      data: updatedPayment
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
}

async function updatePaymentFromMidtrans(
  paymentId: string,
  participantId: string | null,
  orderId: string
) {
  try {
    const statusResponse = await core.transaction.status(orderId);

    const isSuccess =
      statusResponse.transaction_status === "settlement" ||
      statusResponse.transaction_status === "capture";

    if (!isSuccess) return;

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "SUCCESS",
        paidAt: new Date(),
        paymentMethod: statusResponse.payment_type,
        paymentChannel: statusResponse.bank || statusResponse.store || null,
        vaNumber: statusResponse.va_numbers?.[0]?.va_number || null,
        midtransResponse: statusResponse as unknown
      }
    });

    if (participantId) {
      await prisma.participant.update({
        where: { id: participantId },
        data: { registrationStatus: "CONFIRMED" }
      });
    }
  } catch (error) {
    console.error("Error checking Midtrans status:", error);
  }
}