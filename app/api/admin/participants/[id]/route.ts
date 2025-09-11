// app/api/admin/participants/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface Params {
  params: { id: string };
}

// GET participant by ID
export async function GET(req: Request, { params }: Params) {
  try {
    const { id } = params;

    const participant = await prisma.participant.findUnique({
      where: { id },
      include: {
        payments: true,
        racePack: true,
        checkIns: true,
        certificate: true,
        communityMember: true,
        Notification: true,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(participant);
  } catch (error) {
    console.error("Error fetching participant:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// UPDATE participant (PUT)
export async function PUT(req: Request, { params }: Params) {
  try {
    const { id } = params;
    const body = await req.json();

    const participant = await prisma.participant.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(participant);
  } catch (error) {
    console.error("Error updating participant:", error);
    return NextResponse.json(
      { error: "Failed to update participant" },
      { status: 500 }
    );
  }
}

// DELETE participant
export async function DELETE(req: Request, { params }: Params) {
  try {
    const { id } = params;

    await prisma.participant.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Participant deleted" });
  } catch (error) {
    console.error("Error deleting participant:", error);
    return NextResponse.json(
      { error: "Failed to delete participant" },
      { status: 500 }
    );
  }
}

// POST custom action (example: assign QR / Bib Number)
export async function POST(req: Request, { params }: Params) {
  try {
    const { id } = params;
    const body = await req.json();

    // contoh action: assign BIB number / QR code
    if (body.action === "ASSIGN_BIB") {
      const participant = await prisma.participant.update({
        where: { id },
        data: { bibNumber: body.bibNumber },
      });

      return NextResponse.json(participant);
    }

    if (body.action === "GENERATE_QR") {
      // simulasikan generate qr
      // nanti bisa kamu ganti dengan fungsi util QR
      const qrCode = `QR-${id}-${Date.now()}`;
      const participant = await prisma.participant.update({
        where: { id },
        data: { registrationCode: qrCode },
      });

      return NextResponse.json(participant);
    }

    return NextResponse.json(
      { error: "Unknown action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in POST action:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    );
  }
}