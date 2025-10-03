import { AuthService as AuthServiceImport } from '@/lib/auth';
import { prisma as prismaImport } from '@/lib/prisma';
import { NextResponse as NextResponseImport } from 'next/server';

export async function POST() {
  try {
    // Check if admin already exists
    const existingAdmin = await prismaImport.admin.findFirst({
      where: { email: process.env.ADMIN_EMAIL || 'admin@sukamajurun.com' }
    });

    if (existingAdmin) {
      return NextResponseImport.json(
        { error: 'Admin already exists' },
        { status: 400 }
      );
    }

    // Create default admin
    const hashedPassword = await AuthServiceImport.hashPassword(
      process.env.ADMIN_PASSWORD || 'Admin@123456'
    );

    const admin = await prismaImport.admin.create({
      data: {
        email: process.env.ADMIN_EMAIL || 'admin@sukamajurun.com',
        password: hashedPassword,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        isActive: true
      }
    });

    // Create initial settings
    const defaultSettings = [
      {
        key: 'event_name',
        value: { name: 'Sukamaju Run 2025' },
        description: 'Event name'
      },
      {
        key: 'event_date',
        value: { date: '2025-05-11' },
        description: 'Event date'
      },
      {
        key: 'registration_open',
        value: { isOpen: true },
        description: 'Registration status'
      },
      {
        key: 'early_bird_end',
        value: { date: '2025-03-31' },
        description: 'Early bird end date'
      },
      {
        key: 'registration_close',
        value: { date: '2025-04-30' },
        description: 'Registration close date'
      },
      {
        key: 'pricing',
        value: {
          '5K': {
            regular: 180000,
            earlyBird: 162000
          },
          '10K': {
            regular: 230000,
            earlyBird: 207000
          },
          jersey: 100000
        },
        description: 'Event pricing'
      },
      {
        key: 'payment_methods',
        value: {
          bankTransfer: true,
          creditCard: true,
          eWallet: true,
          qris: true
        },
        description: 'Enabled payment methods'
      },
      {
        key: 'whatsapp_notifications',
        value: { enabled: true },
        description: 'WhatsApp notification status'
      },
      {
        key: 'email_notifications',
        value: { enabled: true },
        description: 'Email notification status'
      }
    ];

    for (const setting of defaultSettings) {
      await prismaImport.setting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: setting
      });
    }

    await prismaImport.adminLog.create({
      data: {
        adminId: admin.id,
        action: 'SEED',
        details: {
          message: 'Initial admin and settings created',
          timestamp: new Date().toISOString()
        }
      }
    });

    return NextResponseImport.json({
      success: true,
      message: 'Admin and initial settings created successfully',
      admin: {
        email: admin.email,
        name: admin.name
      }
    });

  } catch (error) {
    console.error('Seed error:', error);
    return NextResponseImport.json(
      { error: 'Failed to seed admin' },
      { status: 500 }
    );
  }
}