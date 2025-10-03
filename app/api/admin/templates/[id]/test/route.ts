import { PrismaClient as PrismaClient2 } from '@prisma/client';
import { NextRequest as NextRequest2, NextResponse as NextResponse2 } from 'next/server';

const prisma2 = new PrismaClient2();

interface NotificationMetadata {
  usageCount?: number;
  lastUsed?: string;
}

// Test send template
export async function POST(request: NextRequest2) {
  try {
    const body = await request.json();
    const { templateId, recipient } = body;

    // Get template
    const template = await prisma2.notification.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return NextResponse2.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Sample data for testing
    const sampleData = {
      fullName: 'Test User',
      registrationCode: 'TEST2025001',
      category: '10K',
      bibNumber: '9999',
      totalPrice: '250000',
      paymentUrl: 'https://payment.example.com/test',
      paymentDate: new Date().toLocaleDateString(),
      eventDate: '15 Februari 2025',
      startTime: '06:00 WIB',
      venue: 'Sukamaju Park'
    };

    // Replace variables in content
    let content = template.message;
    let subject = template.subject || '';

    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      content = content.replace(regex, value);
      subject = subject.replace(regex, value);
    });

    if (template.type === 'EMAIL') {
      // Send test email
      console.log('Sending test email to:', recipient);
      console.log('Subject:', subject);
      console.log('Content:', content);

      // TODO: Integrate with actual email service (SendGrid, etc.)
      // For now, just log it

    } else if (template.type === 'WHATSAPP') {
      // Send test WhatsApp
      console.log('Sending test WhatsApp to:', recipient);
      console.log('Message:', content);

      // TODO: Integrate with WhatsApp service
      // You can use the existing WhatsAppService here
    }

    // Update usage count
    const currentMetadata = (template.metadata as NotificationMetadata) || {};

    await prisma2.notification.update({
      where: { id: templateId },
      data: {
        metadata: {
          ...currentMetadata,
          usageCount: (currentMetadata.usageCount || 0) + 1,
          lastUsed: new Date().toISOString(),
        }
      }
    });

    return NextResponse2.json({
      success: true,
      message: `Test ${template.type.toLowerCase()} sent to ${recipient}`
    });

  } catch (error) {
    console.error('Error sending test message:', error);
    return NextResponse2.json(
      { error: 'Failed to send test message' },
      { status: 500 }
    );
  }
}