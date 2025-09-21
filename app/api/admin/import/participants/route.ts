// app/api/admin/import/participants/route.ts
import { prisma } from '@/lib/prisma';
import { generateBibNumber } from '@/lib/utils/bib-generator';
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

interface ImportParticipant {
  namaLengkap: string;
  jenisKelamin: string;
  usia: string;
  namaBib: string;
  noWhatsapp: string;
  email: string;
  kategoriLari: string;
  ukuranJersey: string;
  nomorBib: string;
  kategoriPromo: string;
}

interface ImportError {
  row: number;
  field: string;
  value: string;
  message: string;
}

interface ImportResult {
  success: number;
  failed: number;
  skipped: number;
  errors: ImportError[];
  importedBibs: string[];
  duplicates: Array<{
    row: number;
    email: string;
    existingName?: string;
  }>;
}

// Pricing configuration
const PRICING = {
  '5K': {
    earlyBird: 162000,
    normal: 180000,
  },
  '10K': {
    earlyBird: 207000,
    normal: 230000,
  },
  jerseyAddOn: {
    plusSizes: ['XXL', 'XXXL', '3XL', '4XL'],
    addOnPrice: 20000,
  },
};

// Helper untuk normalize email
function normalizeEmail(email: string): string {
  return email ? email.trim().toLowerCase() : '';
}

// Helper untuk normalize phone
function normalizePhone(phone: string): string {
  return phone ? phone.trim().replace(/\D/g, '') : '';
}

// Helper untuk extract promo info
function extractPromoInfo(promo: string): { isEarlyBird: boolean; discountPercent: number } {
  if (!promo) return { isEarlyBird: false, discountPercent: 0 };

  const promoLower = promo.toLowerCase();
  const isEarlyBird =
    promoLower.includes('early') ||
    promoLower.includes('bird') ||
    promoLower.includes('early_bird') ||
    promoLower.includes('early-bird');

  const percentMatch = promo.match(/(\d+)%/);
  const discountPercent = percentMatch ? parseInt(percentMatch[1]) : 0;

  return { isEarlyBird, discountPercent };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participants } = body;

    if (!participants || !Array.isArray(participants)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Get existing participants untuk duplicate check
    const existingParticipants = await prisma.participant.findMany({
      select: {
        email: true,
        whatsapp: true,
        fullName: true
      },
    });

    // Buat map untuk lookup cepat
    const existingEmails = new Map<string, string>();
    const existingPhones = new Map<string, string>();

    existingParticipants.forEach(p => {
      const normalizedEmail = normalizeEmail(p.email);
      const normalizedPhone = normalizePhone(p.whatsapp);

      if (normalizedEmail && !normalizedEmail.includes('@imported.local')) {
        existingEmails.set(normalizedEmail, p.fullName);
      }
      if (normalizedPhone) {
        existingPhones.set(normalizedPhone, p.fullName);
      }
    });

    // Get existing BIB numbers
    const existingBibs = await prisma.participant.findMany({
      where: { bibNumber: { not: null } },
      select: { bibNumber: true },
    });
    const bibSet = new Set(existingBibs.map(p => p.bibNumber).filter(Boolean));

    // Track emails dan phones dalam batch ini untuk cegah duplikasi internal
    const batchEmails = new Map<string, number>(); // email -> row number
    const batchPhones = new Map<string, number>(); // phone -> row number

    // Results
    const result: ImportResult = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      importedBibs: [],
      duplicates: []
    };

    // Participants yang akan diimport (setelah validasi)
    const toImport: Array<{
      data: ImportParticipant;
      rowNumber: number;
    }> = [];

    // FASE 1: Validasi semua data dulu
    for (let i = 0; i < participants.length; i++) {
      const row = participants[i] as ImportParticipant;
      const rowNumber = i + 1;

      // Normalize data
      const normalizedEmail = normalizeEmail(row.email);
      const normalizedPhone = normalizePhone(row.noWhatsapp);

      // Skip jika tidak ada identifier sama sekali
      if (!normalizedEmail && !normalizedPhone) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          field: 'Contact',
          value: '',
          message: 'Must have either email or WhatsApp number',
        });
        continue;
      }

      // Cek duplikasi dengan existing data
      let isDuplicate = false;

      // Cek email duplikasi (hanya jika email valid dan bukan generated)
      if (normalizedEmail && !normalizedEmail.includes('@imported.local')) {
        // Cek di database
        if (existingEmails.has(normalizedEmail)) {
          result.duplicates.push({
            row: rowNumber,
            email: row.email,
            existingName: existingEmails.get(normalizedEmail)
          });
          isDuplicate = true;
        }
        // Cek dalam batch
        else if (batchEmails.has(normalizedEmail)) {
          result.duplicates.push({
            row: rowNumber,
            email: row.email,
            existingName: `Already in row ${batchEmails.get(normalizedEmail)}`
          });
          isDuplicate = true;
        }
      }

      // Cek phone duplikasi jika tidak ada email atau email tidak duplikat
      if (!isDuplicate && normalizedPhone) {
        // Cek di database
        if (existingPhones.has(normalizedPhone)) {
          result.duplicates.push({
            row: rowNumber,
            email: row.noWhatsapp,
            existingName: existingPhones.get(normalizedPhone)
          });
          isDuplicate = true;
        }
        // Cek dalam batch
        else if (batchPhones.has(normalizedPhone)) {
          result.duplicates.push({
            row: rowNumber,
            email: row.noWhatsapp,
            existingName: `Already in row ${batchPhones.get(normalizedPhone)}`
          });
          isDuplicate = true;
        }
      }

      if (isDuplicate) {
        result.skipped++;
        continue;
      }

      // Track dalam batch
      if (normalizedEmail && !normalizedEmail.includes('@imported.local')) {
        batchEmails.set(normalizedEmail, rowNumber);
      }
      if (normalizedPhone) {
        batchPhones.set(normalizedPhone, rowNumber);
      }

      // Add ke list untuk import
      toImport.push({ data: row, rowNumber });
    }

    // FASE 2: Import data yang valid
    for (const { data: row, rowNumber } of toImport) {
      try {
        // Generate atau gunakan BIB number dengan check uniqueness
        let bibNumber = row.nomorBib;
        let attemptCount = 0;
        const maxAttempts = 10;

        // Check if BIB number is provided and valid
        if (bibNumber && bibNumber !== '' && bibNumber !== '-' && !bibSet.has(bibNumber)) {
          // Check if exists in database
          const existingBib = await prisma.participant.findFirst({
            where: { bibNumber },
            select: { id: true }
          });

          if (existingBib) {
            // BIB exists in DB, need to generate new one
            bibNumber = '';
          }
        } else {
          bibNumber = '';
        }

        // Generate new BIB if needed
        if (!bibNumber) {
          while (attemptCount < maxAttempts) {
            bibNumber = await generateBibNumber(row.kategoriLari as '5K' | '10K');

            // Check if generated BIB already exists
            if (!bibSet.has(bibNumber)) {
              const existingBib = await prisma.participant.findFirst({
                where: { bibNumber },
                select: { id: true }
              });

              if (!existingBib) {
                break; // Found unique BIB
              }
            }
            attemptCount++;
          }

          // If still can't find unique BIB, use timestamp-based
          if (attemptCount >= maxAttempts) {
            bibNumber = `${row.kategoriLari === '10K' ? '10' : '5'}${Date.now().toString().slice(-6)}`;
          }
        }

        bibSet.add(bibNumber);

        // Calculate age dan date of birth
        const currentYear = new Date().getFullYear();
        const age = parseInt(row.usia) || 25; // Default age jika tidak valid
        const birthYear = currentYear - age;
        const dateOfBirth = new Date(`${birthYear}-01-01`);

        // Parse promo
        const promoInfo = extractPromoInfo(row.kategoriPromo);

        // Calculate pricing
        const category = row.kategoriLari === '10K' ? '10K' : '5K'; // Default ke 5K jika tidak valid
        const basePrice = promoInfo.isEarlyBird
          ? PRICING[category].earlyBird
          : PRICING[category].normal;

        const jerseyAddOn = PRICING.jerseyAddOn.plusSizes.includes(row.ukuranJersey)
          ? PRICING.jerseyAddOn.addOnPrice
          : 0;

        const totalPrice = basePrice + jerseyAddOn;

        // Prepare data dengan fallback values
        const participantEmail = normalizeEmail(row.email) ||
          `noemail_${Date.now()}_${rowNumber}@imported.local`;

        const participantWhatsApp = row.noWhatsapp ||
          `no_wa_${Date.now()}_${rowNumber}`;

        // Create participant dengan transaction
        await prisma.$transaction(async (tx) => {
          const newParticipant = await tx.participant.create({
            data: {
              fullName: row.namaLengkap || `Participant ${rowNumber}`,
              gender: row.jenisKelamin || 'Laki-laki',
              dateOfBirth,
              idNumber: `IMPORT${Date.now()}${rowNumber}`,
              email: participantEmail,
              whatsapp: participantWhatsApp,
              address: 'Data imported - Perlu dilengkapi',
              province: 'Jawa Barat',
              city: 'Bogor',
              category,
              bibName: row.namaBib || row.namaLengkap?.toUpperCase() || `BIB${rowNumber}`,
              bibNumber,
              jerseySize: row.ukuranJersey || 'M',
              emergencyName: 'Perlu dilengkapi',
              emergencyPhone: participantWhatsApp,
              emergencyRelation: 'Keluarga',
              registrationCode: `IMP${Date.now().toString(36).toUpperCase()}${rowNumber}`,
              registrationType: 'INDIVIDUAL',
              basePrice,
              jerseyAddOn,
              totalPrice,
              isEarlyBird: promoInfo.isEarlyBird,
              registrationStatus: 'IMPORTED',
              estimatedTime: category === '5K' ? '30-45 menit' : '60-90 menit',
              metadata: {
                importedFrom: 'GoogleForm',
                importedAt: new Date().toISOString(),
                hasEmail: !!row.email,
                hasWhatsApp: !!row.noWhatsapp,
                needsContactUpdate: !row.email || !row.noWhatsapp,
                originalPromo: row.kategoriPromo,
                rowNumber,
                pricing: {
                  category,
                  basePrice,
                  jerseyAddOn,
                  totalPrice,
                  isEarlyBird: promoInfo.isEarlyBird,
                },
              } as Prisma.JsonObject,
            },
          });

          // Create race pack
          await tx.racePack.create({
            data: {
              participantId: newParticipant.id,
              qrCode: `RP${bibNumber}${newParticipant.id.substring(0, 8).toUpperCase()}`,
              isCollected: false,
              hasJersey: true,
              hasBib: true,
              hasGoodieBag: true,
              hasMedal: false,
            },
          });

          // Create payment record
          await tx.payment.create({
            data: {
              participantId: newParticipant.id,
              paymentCode: `PAY${Date.now().toString(36).toUpperCase()}${rowNumber}`,
              amount: totalPrice,
              paymentMethod: 'IMPORTED',
              status: 'SUCCESS',
              paidAt: new Date(),
              metadata: {
                importedFrom: 'GoogleForm',
                importedAt: new Date().toISOString(),
                originalPromo: row.kategoriPromo,
                category,
                basePrice,
                jerseyAddOn,
                totalPrice,
                isEarlyBird: promoInfo.isEarlyBird,
              },
            },
          });
        });

        result.success++;
        result.importedBibs.push(bibNumber);

      } catch (error) {
        result.failed++;

        // Handle specific error types
        let errorMessage = 'Failed to import';
        if (error instanceof Error) {
          if (error.message.includes('Unique constraint failed') && error.message.includes('bibNumber')) {
            errorMessage = `BIB Number conflict - unable to generate unique BIB`;
          } else if (error.message.includes('Unique constraint failed') && error.message.includes('email')) {
            errorMessage = `Email already registered (may have been imported in this batch)`;
          } else {
            errorMessage = error.message;
          }
        }

        result.errors.push({
          row: rowNumber,
          field: 'Import',
          value: row.email || row.noWhatsapp || 'unknown',
          message: errorMessage,
        });
        console.error(`Failed to import row ${rowNumber}:`, error);
      }
    }

    // Log import activity (optional - don't fail if admin doesn't exist)
    try {
      // Check if SYSTEM admin exists, if not create it
      const systemAdmin = await prisma.admin.findFirst({
        where: { email: 'system@admin.local' }
      });

      let adminId = 'SYSTEM';
      if (systemAdmin) {
        adminId = systemAdmin.id;
      } else {
        // Try to create SYSTEM admin for logging
        try {
          const newAdmin = await prisma.admin.create({
            data: {
              email: 'system@admin.local',
              password: 'not-for-login', // This account is only for logging
              name: 'System',
              role: 'SYSTEM',
              isActive: false
            }
          });
          adminId = newAdmin.id;
        } catch (adminError) {
          // If can't create admin, just skip logging
          console.log('Skipping admin log - no system admin account');
        }
      }

      // Only create log if we have valid adminId
      if (adminId !== 'SYSTEM') {
        await prisma.adminLog.create({
          data: {
            adminId,
            action: 'BULK_IMPORT_PARTICIPANTS',
            details: {
              totalRows: participants.length,
              success: result.success,
              failed: result.failed,
              skipped: result.skipped,
              duplicates: result.duplicates.length,
              source: 'GoogleForm',
              timestamp: new Date().toISOString(),
            } as Prisma.JsonObject,
          },
        });
      }
    } catch (logError) {
      // Don't fail the import just because logging failed
      console.log('Admin log skipped:', logError instanceof Error ? logError.message : 'Unknown error');
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      {
        error: 'Failed to import participants',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET - Check import status
export async function GET(_request: NextRequest) {
  try {
    const [
      totalParticipants,
      importedParticipants,
      confirmedParticipants,
      totalRacePacks,
    ] = await Promise.all([
      prisma.participant.count(),
      prisma.participant.count({
        where: { registrationStatus: 'IMPORTED' },
      }),
      prisma.participant.count({
        where: { registrationStatus: 'CONFIRMED' },
      }),
      prisma.racePack.count(),
    ]);

    const highest5K = await prisma.participant.findFirst({
      where: {
        category: '5K',
        bibNumber: { not: null },
      },
      orderBy: {
        bibNumber: 'desc',
      },
      select: { bibNumber: true },
    });

    const highest10K = await prisma.participant.findFirst({
      where: {
        category: '10K',
        bibNumber: { not: null },
      },
      orderBy: {
        bibNumber: 'desc',
      },
      select: { bibNumber: true },
    });

    const recentImports = await prisma.participant.findMany({
      where: { registrationStatus: 'IMPORTED' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        fullName: true,
        email: true,
        whatsapp: true,
        bibNumber: true,
        bibName: true,
        category: true,
        jerseySize: true,
        basePrice: true,
        jerseyAddOn: true,
        totalPrice: true,
        isEarlyBird: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      stats: {
        total: totalParticipants,
        imported: importedParticipants,
        confirmed: confirmedParticipants,
        racePacks: totalRacePacks,
        highest5K: highest5K?.bibNumber || 'None',
        highest10K: highest10K?.bibNumber || 'None',
      },
      recentImports,
      pricing: PRICING,
    });
  } catch (error) {
    console.error('Error fetching import stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import statistics' },
      { status: 500 }
    );
  }
}