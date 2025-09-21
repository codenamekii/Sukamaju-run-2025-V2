// app/api/admin/import/parse/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface GoogleFormData {
  'Nama Lengkap': string;
  'Jenis Kelamin': string;
  'Usia': string | number;
  'Nama BiB': string;
  'No. Whatsapp': string;
  'Email': string;
  'Kategori Lari': string;
  'Ukuran Jersey': string;
  'No. BiB': string;
  'Kategori Promo': string;
  [key: string]: string | number; // Allow for flexible column names
}

interface ParsedData {
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

interface ValidationError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Read file content
    const text = await file.text();

    let rawData: GoogleFormData[] = [];

    // Parse CSV (Excel harus diconvert dulu di client side)
    if (file.name.endsWith('.csv')) {
      rawData = parseCSV(text);
    } else {
      return NextResponse.json(
        { error: 'Please use CSV format. Convert Excel to CSV first.' },
        { status: 400 }
      );
    }

    if (rawData.length === 0) {
      return NextResponse.json(
        { error: 'No data found in file' },
        { status: 400 }
      );
    }

    // Parse and validate data
    const parsedData: ParsedData[] = [];
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    rawData.forEach((row, index) => {
      const rowNumber = index + 2; // Start from row 2 (after header)

      // Skip empty rows
      if (isEmptyRow(row)) {
        return;
      }

      // Parse each row dengan normalisasi - convert to string first
      const parsed: ParsedData = {
        namaLengkap: cleanString(String(row['Nama Lengkap'] || '')),
        jenisKelamin: normalizeGender(String(row['Jenis Kelamin'] || '')),
        usia: normalizeAge(row['Usia']),
        namaBib: cleanString(String(row['Nama BiB'] || row['Nama Bib'] || '')).toUpperCase(),
        noWhatsapp: normalizePhoneNumber(String(row['No. Whatsapp'] || row['No Whatsapp'] || row['WhatsApp'] || '')),
        email: normalizeEmail(String(row['Email'] || '')),
        kategoriLari: normalizeCategory(String(row['Kategori Lari'] || row['Kategori'] || '')),
        ukuranJersey: normalizeJerseySize(String(row['Ukuran Jersey'] || row['Ukuran'] || '')),
        nomorBib: extractBibNumber(String(row['No. BiB'] || row['No BiB'] || row['Nomor BiB'] || '')),
        kategoriPromo: cleanString(String(row['Kategori Promo'] || row['Promo'] || ''))
      };

      // Validasi dengan level: error (harus diperbaiki) vs warning (bisa diabaikan)

      // CRITICAL: Harus ada nama
      if (!parsed.namaLengkap) {
        errors.push({
          row: rowNumber,
          field: 'Nama Lengkap',
          value: String(row['Nama Lengkap'] || ''),
          message: 'Nama lengkap harus diisi'
        });
      }

      // CRITICAL: Harus ada minimal satu kontak (email ATAU whatsapp)
      const hasValidEmail = parsed.email && isValidEmail(parsed.email);
      const hasValidWhatsApp = parsed.noWhatsapp && isValidWhatsApp(parsed.noWhatsapp);

      if (!hasValidEmail && !hasValidWhatsApp) {
        errors.push({
          row: rowNumber,
          field: 'Contact',
          value: `Email: ${String(row['Email'] || 'kosong')}, WA: ${String(row['No. Whatsapp'] || 'kosong')}`,
          message: 'Harus memiliki email valid atau nomor WhatsApp valid'
        });
      } else {
        // Warning jika salah satu tidak lengkap
        if (!hasValidEmail && row['Email']) {
          warnings.push({
            row: rowNumber,
            field: 'Email',
            value: String(row['Email'] || ''),
            message: 'Email tidak valid, akan diabaikan'
          });
        }
        if (!hasValidWhatsApp && row['No. Whatsapp']) {
          warnings.push({
            row: rowNumber,
            field: 'WhatsApp',
            value: String(row['No. Whatsapp'] || ''),
            message: 'Nomor WhatsApp tidak valid, akan diabaikan'
          });
        }
      }

      // WARNING: Kategori default ke 5K jika tidak valid
      if (!['5K', '10K'].includes(parsed.kategoriLari)) {
        warnings.push({
          row: rowNumber,
          field: 'Kategori Lari',
          value: String(row['Kategori Lari'] || ''),
          message: `Kategori tidak valid, akan diset ke 5K`
        });
        parsed.kategoriLari = '5K';
      }

      // WARNING: Jersey size default ke M jika tidak valid
      const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];
      if (!validSizes.includes(parsed.ukuranJersey)) {
        warnings.push({
          row: rowNumber,
          field: 'Ukuran Jersey',
          value: String(row['Ukuran Jersey'] || ''),
          message: `Ukuran tidak valid, akan diset ke M`
        });
        parsed.ukuranJersey = 'M';
      }

      // WARNING: Usia default ke 25 jika tidak valid
      const age = parseInt(parsed.usia);
      if (isNaN(age) || age < 5 || age > 100) {
        warnings.push({
          row: rowNumber,
          field: 'Usia',
          value: String(row['Usia'] || ''),
          message: 'Usia tidak valid (harus 5-100), akan diset ke 25'
        });
        parsed.usia = '25';
      }

      // Tambahkan ke parsed data jika tidak ada error kritis
      parsedData.push(parsed);
    });

    // Return hasil parsing
    return NextResponse.json({
      data: parsedData,
      errors,
      warnings,
      total: parsedData.length,
      hasErrors: errors.length > 0,
      hasWarnings: warnings.length > 0,
      summary: {
        totalRows: rawData.length,
        validRows: parsedData.length,
        errorRows: errors.length,
        warningRows: warnings.length
      }
    });

  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      {
        error: 'Failed to parse file',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper Functions

function parseCSV(text: string): GoogleFormData[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];

  // Parse header - handle BOM and normalize
  let headerLine = lines[0];
  // Remove BOM if present
  if (headerLine.charCodeAt(0) === 0xFEFF) {
    headerLine = headerLine.substr(1);
  }

  const headers = parseCSVLine(headerLine).map(h => h.trim());

  // Parse data rows
  const data: GoogleFormData[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });

    // Skip completely empty rows
    if (Object.values(row).every(v => !v)) {
      continue;
    }

    data.push(row as GoogleFormData);
  }

  return data;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Push last field
  result.push(current);
  return result;
}

function isEmptyRow(row: GoogleFormData): boolean {
  return Object.values(row).every(value => !value || value.toString().trim() === '');
}

function cleanString(str: string | number | undefined | null): string {
  if (str === null || str === undefined || str === '') return '';
  return String(str).trim();
}

function normalizeEmail(email: string): string {
  const cleaned = cleanString(email).toLowerCase();
  // Remove common typos
  return cleaned
    .replace(/\s+/g, '') // Remove spaces
    .replace(/,/g, '.') // Replace comma with dot
    .replace(/\.{2,}/g, '.'); // Remove multiple dots
}

function normalizeGender(gender: string): string {
  const g = gender.toLowerCase().trim();
  if (g.includes('laki') || g === 'l' || g === 'male' || g === 'm' || g === 'pria') {
    return 'Laki-laki';
  }
  if (g.includes('perem') || g === 'p' || g === 'female' || g === 'f' || g === 'wanita') {
    return 'Perempuan';
  }
  return 'Laki-laki'; // Default
}

function normalizeAge(age: string | number | undefined | null): string {
  if (!age) return '25';

  const ageNum = parseInt(age.toString());
  if (isNaN(ageNum) || ageNum < 5 || ageNum > 100) {
    return '25';
  }

  return ageNum.toString();
}

function normalizePhoneNumber(phone: string): string {
  if (!phone || phone.trim() === '') {
    return '';
  }

  // Remove all non-digit except +
  let cleaned = phone.toString().replace(/[^\d+]/g, '');

  // Handle various formats
  cleaned = cleaned.replace(/^\+/, ''); // Remove leading +

  // Convert 08 to 628
  if (cleaned.startsWith('08')) {
    cleaned = '62' + cleaned.substring(1);
  }
  // Add 62 if doesn't start with it
  else if (!cleaned.startsWith('62')) {
    // If starts with 8, assume Indonesian number
    if (cleaned.startsWith('8')) {
      cleaned = '62' + cleaned;
    }
  }

  return cleaned;
}

function normalizeCategory(category: string): string {
  const cat = category.toUpperCase();
  if (cat.includes('10K') || cat.includes('10 K')) return '10K';
  if (cat.includes('5K') || cat.includes('5 K')) return '5K';
  return '5K'; // Default
}

function normalizeJerseySize(size: string): string {
  const s = size.toUpperCase().trim();

  // Handle common variations
  const sizeMap: Record<string, string> = {
    '2XL': 'XXL',
    'XXXL': '3XL',
    'XXXXL': '4XL',
    'XXS': 'XS',
    'MEDIUM': 'M',
    'LARGE': 'L',
    'SMALL': 'S',
    'EXTRA SMALL': 'XS',
    'EXTRA LARGE': 'XL'
  };

  if (sizeMap[s]) return sizeMap[s];

  const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];
  return validSizes.includes(s) ? s : 'M';
}

function extractBibNumber(bibField: string): string {
  if (!bibField) return '';

  // Handle various formats: "BiB 5001", "BIB 5001", "bib5001", "5001", etc.
  const cleaned = bibField.toUpperCase()
    .replace(/BIB\s*/g, '')
    .replace(/NO\.\s*/g, '')
    .replace(/NOMOR\s*/g, '')
    .trim();

  // Extract just the number
  const match = cleaned.match(/\d+/);
  return match ? match[0] : '';
}

function isValidEmail(email: string): boolean {
  if (!email || email.includes('@imported.local')) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidWhatsApp(phone: string): boolean {
  if (!phone || phone.includes('no_wa_')) return false;
  // Must be 10-15 digits starting with 62
  return /^62[0-9]{8,13}$/.test(phone);
}