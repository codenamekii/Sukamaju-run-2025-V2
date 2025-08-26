// app/api/midtrans/webhook/route.ts
import { core } from "@/lib/midtrans";
import { prisma } from "@/lib/prisma";
import type { MidtransNotification, MidtransStatusResponse } from "@/lib/types/midtrans";
import { JsonValue } from "@prisma/client/runtime/library";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

// fungsi verifikasi signature Midtrans
function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
  signature: string
): boolean {
  const hash = crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");
  return hash === signature;
}

// peta status midtrans -> status internal
function mapStatus(txStatus: MidtransStatusResponse["transaction_status"]) {
  if (txStatus === "capture" || txStatus === "settlement") {
    return { paymentStatus: "SUCCESS" as const, participantStatus: "CONFIRMED" as const };
  }
  if (txStatus === "cancel" || txStatus === "deny" || txStatus === "expire") {
    return { paymentStatus: "FAILED" as const, participantStatus: undefined };
  }
  if (txStatus === "pending") {
    return { paymentStatus: "PENDING" as const, participantStatus: undefined };
  }
  return { paymentStatus: "PENDING" as const, participantStatus: undefined };
}

export async function POST(request: NextRequest) {
  try {
    const notification = (await request.json()) as MidtransNotification;

    // cek env
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    if (!serverKey) {
      return NextResponse.json({ error: "MIDTRANS_SERVER_KEY kosong" }, { status: 500 });
    }

    // verifikasi signature
    const isValid = verifySignature(
      notification.order_id,
      notification.status_code,
      notification.gross_amount,
      serverKey,
      notification.signature_key
    );
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // ambil status dari Midtrans (source of truth)
    const statusResponse = (await core.transaction.status(notification.order_id)) as MidtransStatusResponse;

    // cari payment di DB
    const payment = await prisma.payment.findUnique({
      where: { midtransOrderId: notification.order_id },
      include: { participant: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // mapping status
    const { paymentStatus, participantStatus } = mapStatus(statusResponse.transaction_status);

    // ekstrak channel dan VA (aman terhadap variasi response)
    const vaNumber = Array.isArray(statusResponse.va_numbers)
      ? statusResponse.va_numbers[0]?.va_number ?? null
      : null;

    const paymentChannel =
      statusResponse.bank ??
      statusResponse.store ??
      statusResponse.va_numbers?.[0]?.bank ??
      null;

    // update payment
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus,
        paidAt: paymentStatus === "SUCCESS" ? new Date() : null,
        paymentMethod: statusResponse.payment_type ?? null,
        paymentChannel,
        vaNumber,
        midtransResponse: statusResponse as JsonValue,
      },
    });

    // update participant bila sukses
    if (paymentStatus === "SUCCESS" && payment.participantId) {
      await prisma.participant.update({
        where: { id: payment.participantId },
        data: { registrationStatus: "CONFIRMED" },
      });

      // tempatkan notifikasi WA/Email di sini bila dibutuhkan
      // await sendWhatsAppConfirmation(payment.participant);
    }

    return NextResponse.json({ success: true, message: "Webhook processed" });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}