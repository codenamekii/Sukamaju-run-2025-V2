// scripts/create-system-admin.ts
// Run this script to create SYSTEM admin account for logging
// npx tsx scripts/create-system-admin.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createSystemAdmin() {
  try {
    // Check if system admin already exists
    const existingAdmin = await prisma.admin.findFirst({
      where: {
        OR: [
          { email: 'system@admin.local' },
          { role: 'SYSTEM' }
        ]
      }
    });

    if (existingAdmin) {
      console.log('✅ System admin already exists:', existingAdmin.email);
      return;
    }

    // Create system admin
    const hashedPassword = await bcrypt.hash('system-not-for-login-' + Date.now(), 10);

    const systemAdmin = await prisma.admin.create({
      data: {
        email: 'system@admin.local',
        password: hashedPassword,
        name: 'System',
        role: 'SYSTEM',
        isActive: false // Inactive so can't be used for login
      }
    });

    console.log('✅ System admin created successfully');
    console.log('   ID:', systemAdmin.id);
    console.log('   Email:', systemAdmin.email);
    console.log('   Note: This account is only for system logging and cannot be used for login');

  } catch (error) {
    console.error('❌ Failed to create system admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createSystemAdmin();