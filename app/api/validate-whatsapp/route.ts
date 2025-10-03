import { parseWhatsAppInput } from '@/lib/utils/whatsapp-formatter';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const result = parseWhatsAppInput(phone);

    return NextResponse.json(result);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to validate phone number' },
      { status: 500 }
    );
  }
}