import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Type definition untuk params
type Params = {
  params: Promise<{
    id: string;
  }>;
};

// GET participant
export async function GET(
  req: NextRequest,
  { params }: Params
) {
  const { id } = await params;

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
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  return NextResponse.json(participant);
}

// PUT participant
export async function PUT(
  req: NextRequest,
  { params }: Params
) {
  const { id } = await params;
  const body = await req.json();

  const participant = await prisma.participant.update({
    where: { id },
    data: body,
  });

  return NextResponse.json(participant);
}

// DELETE participant
export async function DELETE(
  req: NextRequest,
  { params }: Params
) {
  const { id } = await params;

  await prisma.participant.delete({ where: { id } });

  return NextResponse.json({ message: "Participant deleted" });
}

// POST custom action
export async function POST(
  req: NextRequest,
  { params }: Params
) {
  const { id } = await params;
  const body = await req.json();

  if (body.action === "ASSIGN_BIB") {
    const participant = await prisma.participant.update({
      where: { id },
      data: { bibNumber: body.bibNumber },
    });

    return NextResponse.json(participant);
  }

  if (body.action === "GENERATE_QR") {
    const qrCode = `QR-${id}-${Date.now()}`;
    const participant = await prisma.participant.update({
      where: { id },
      data: { registrationCode: qrCode },
    });

    return NextResponse.json(participant);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}