import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.admin.create({
    data: {
      email: 'admin@sukamajurun.com',
      password: hashedPassword,
      name: 'Admin Sukamaju',
      role: 'ADMIN'
    }
  });

  console.log('✅ Database seeded successfully');
}

seed().catch(console.error).finally(() => prisma.$disconnect());