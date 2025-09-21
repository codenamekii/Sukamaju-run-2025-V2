// app/api/admin/communications/preview/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface PreviewRequest {
  content: string;
  subject?: string;
  sampleData?: Record<string, string>;
}

export async function POST(request: NextRequest) {
  try {
    const body: PreviewRequest = await request.json();

    if (!body.content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Default sample data
    const sampleData = body.sampleData || {
      fullName: 'John Doe',
      firstName: 'John',
      email: 'john.doe@example.com',
      whatsapp: '628123456789',
      bibNumber: '5042',
      category: '10K',
      registrationCode: 'REG2025ABC123',
      totalPrice: '200000',
      jerseySize: 'L',
      eventDate: '11 Mei 2025',
      collectionDate: '10-11 Mei 2025',
      venue: 'Lapangan Subiantoro, Sukamaju',
      paymentStatus: 'SUCCESS',
      racePackStatus: 'Belum Diambil'
    };

    // Replace variables
    let preview = body.content;
    let previewSubject = body.subject || '';

    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      preview = preview.replace(regex, value);
      if (previewSubject) {
        previewSubject = previewSubject.replace(regex, value);
      }
    });

    // Find unreplaced variables
    const unreplacedRegex = /\{\{(\w+)\}\}/g;
    const unreplaced: string[] = [];
    let match;

    while ((match = unreplacedRegex.exec(preview)) !== null) {
      if (!unreplaced.includes(match[1])) {
        unreplaced.push(match[1]);
      }
    }

    return NextResponse.json({
      preview,
      previewSubject,
      unreplacedVariables: unreplaced,
      sampleData
    });

  } catch (error) {
    console.error('Error generating preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}