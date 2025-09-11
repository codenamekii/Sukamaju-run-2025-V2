// scripts/setup.ts
// Run with: npx tsx scripts/setup.ts

import { exec } from 'child_process';
import * as dotenv from 'dotenv';
import { promisify } from 'util';
import { AuthService } from '../lib/auth';
import { prisma } from '../lib/prisma';

// Load environment variables
dotenv.config({ path: '.env.local' });

const execAsync = promisify(exec);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  const typeColors = {
    info: colors.blue,
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
  };

  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  };

  console.log(`${typeColors[type]}${icons[type]} ${message}${colors.reset}`);
}

async function checkEnvironment() {
  log('Checking environment variables...', 'info');

  const required = [
    'DATABASE_URL',
    'DIRECT_URL',
    'NEXTAUTH_SECRET',
    'MIDTRANS_SERVER_KEY',
    'MIDTRANS_CLIENT_KEY',
    'FONNTE_TOKEN',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    log(`Missing environment variables: ${missing.join(', ')}`, 'error');
    log('Please configure them in .env.local file', 'warning');
    return false;
  }

  log('All required environment variables are configured', 'success');
  return true;
}

async function runMigrations() {
  log('Running database migrations...', 'info');

  try {
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy');
    if (stderr && !stderr.includes('Already in sync')) {
      log(`Migration warnings: ${stderr}`, 'warning');
    }
    log('Database migrations completed', 'success');
    return true;
  } catch (error) {
    log('Failed to run migrations. Trying to create database...', 'warning');

    try {
      await execAsync('npx prisma migrate dev --name init');
      log('Database created and migrations applied', 'success');
      return true;
    } catch (err) {
      log(`Migration error: ${err}`, 'error');
      return false;
    }
  }
}

async function seedAdmin() {
  log('Checking for existing admin...', 'info');

  try {
    const existingAdmin = await prisma.admin.findFirst({
      where: { email: process.env.ADMIN_EMAIL || 'admin@sukamajurun.com' }
    });

    if (existingAdmin) {
      log('Admin already exists', 'warning');
      return true;
    }

    log('Creating admin user...', 'info');

    const hashedPassword = await AuthService.hashPassword(
      process.env.ADMIN_PASSWORD || 'admin123'
    );

    const admin = await prisma.admin.create({
      data: {
        email: process.env.ADMIN_EMAIL || 'admin@sukamajurun.com',
        password: hashedPassword,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        isActive: true
      }
    });

    log(`Admin created: ${admin.email}`, 'success');
    return true;
  } catch (error) {
    log(`Failed to create admin: ${error}`, 'error');
    return false;
  }
}

async function seedSettings() {
  log('Creating initial settings...', 'info');

  try {
    const settings = [
      {
        key: 'event_name',
        value: { name: 'SUKAMAJU RUN 2025' },
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
          jersey: 100000,
          community: {
            discount5: 10,
            discount10: 15
          }
        },
        description: 'Event pricing'
      }
    ];

    for (const setting of settings) {
      await prisma.setting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: setting
      });
    }

    log('Settings created successfully', 'success');
    return true;
  } catch (error) {
    log(`Failed to create settings: ${error}`, 'error');
    return false;
  }
}

async function createSampleData() {
  log('Do you want to create sample data for testing? (yes/no)', 'info');

  // For automated setup, skip sample data
  if (process.env.CREATE_SAMPLE_DATA !== 'true') {
    log('Skipping sample data creation', 'info');
    return true;
  }

  log('Creating sample participants...', 'info');

  try {
    const categories = ['5K', '10K'];
    const statuses = ['PENDING', 'CONFIRMED'];

    for (let i = 1; i <= 10; i++) {
      const category = categories[i % 2];
      const status = statuses[i % 2];

      const participant = await prisma.participant.create({
        data: {
          fullName: `Test Participant ${i}`,
          gender: i % 2 === 0 ? 'Male' : 'Female',
          dateOfBirth: new Date(1990 + (i % 30), i % 12, (i % 28) + 1),
          idNumber: `3201234567890${i.toString().padStart(3, '0')}`,
          email: `test${i}@example.com`,
          whatsapp: `08123456789${i % 10}`,
          address: `Jalan Test No. ${i}`,
          province: 'Jawa Barat',
          city: 'Bogor',
          category,
          bibName: `Runner ${i}`,
          jerseySize: ['XS','S', 'M', 'L', 'XL', 'XXL', 'XXXL'][i % 4],
          emergencyName: `Emergency Contact ${i}`,
          emergencyPhone: `08198765432${i % 10}`,
          emergencyRelation: 'Family',
          registrationStatus: status,
          bibNumber: status === 'CONFIRMED' ? `-${category}-${i.toString().padStart(4, '0')}` : null,
          basePrice: category === '5K' ? 162000 : 180000,
          totalPrice: category === '5K' ? 207000 : 230000
        }
      });

      // Create payment for each participant
      await prisma.payment.create({
        data: {
          participantId: participant.id,
          amount: participant.totalPrice,
          status: status === 'CONFIRMED' ? 'SUCCESS' : 'PENDING',
          paymentMethod: status === 'CONFIRMED' ? 'bank_transfer' : null,
          paidAt: status === 'CONFIRMED' ? new Date() : null
        }
      });

      // Create race pack for confirmed participants
      if (status === 'CONFIRMED') {
        await prisma.racePack.create({
          data: {
            participantId: participant.id,
            qrCode: `QR-${participant.bibNumber}`
          }
        });
      }
    }

    log('Sample data created successfully', 'success');
    return true;
  } catch (error) {
    log(`Failed to create sample data: ${error}`, 'error');
    return false;
  }
}

async function testConnections() {
  log('Testing database connection...', 'info');

  try {
    await prisma.$connect();
    log('Database connection successful', 'success');

    const count = await prisma.participant.count();
    log(`Found ${count} participants in database`, 'info');

    return true;
  } catch (error) {
    log(`Database connection failed: ${error}`, 'error');
    return false;
  }
}

async function main() {
  console.log(`${colors.bright}${colors.cyan}
╔════════════════════════════════════════════════════════╗
║           SUKAMAJU RUN 2025 - SETUP SCRIPT             ║
║                    Admin Dashboard                     ║
╚════════════════════════════════════════════════════════╝
${colors.reset}`);

  // Check environment
  const envOk = await checkEnvironment();
  if (!envOk) {
    log('Please fix environment variables and run setup again', 'error');
    process.exit(1);
  }

  // Run migrations
  const migrationOk = await runMigrations();
  if (!migrationOk) {
    log('Failed to setup database. Please check your DATABASE_URL', 'error');
    process.exit(1);
  }

  // Test connection
  const connectionOk = await testConnections();
  if (!connectionOk) {
    log('Cannot connect to database', 'error');
    process.exit(1);
  }

  // Seed admin
  const adminOk = await seedAdmin();
  if (!adminOk) {
    log('Failed to create admin user', 'error');
    process.exit(1);
  }

  // Seed settings
  const settingsOk = await seedSettings();
  if (!settingsOk) {
    log('Failed to create settings', 'error');
  }

  // Create sample data (optional)
  await createSampleData();

  // Summary
  console.log(`\n${colors.bright}${colors.green}========== Setup Complete ==========${colors.reset}\n`);

  log('Admin Dashboard is ready!', 'success');
  console.log('\nAdmin credentials:');
  console.log(`Email: ${process.env.ADMIN_EMAIL || 'admin@sukamajurun.com'}`);
  console.log(`Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
  console.log('\nYou can now run:');
  console.log(`${colors.cyan}npm run dev${colors.reset}`);
  console.log('\nThen access the admin dashboard at:');
  console.log(`${colors.cyan}http://localhost:3000/admin${colors.reset}`);

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (error) => {
  log(`Unexpected error: ${error}`, 'error');
  await prisma.$disconnect();
  process.exit(1);
});