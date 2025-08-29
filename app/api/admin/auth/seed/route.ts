import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Check if admin exists
    const existingAdmin = await prisma.admin.findFirst();

    if (existingAdmin) {
      return NextResponse.json({
        message: 'Admin already exists',
        email: existingAdmin.email
      });
    }

    // Create default admin
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = await prisma.admin.create({
      data: {
        email: 'admin@sukamajurun.com',
        password: hashedPassword,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        isActive: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Admin created successfully',
      credentials: {
        email: 'admin@sukamajurun.com',
        password: 'admin123',
        note: 'PLEASE CHANGE THIS PASSWORD IMMEDIATELY!'
      }
    });

  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Failed to seed admin', details: error },
      { status: 500 }
    );
  }
}