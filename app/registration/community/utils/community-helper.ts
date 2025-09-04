// app/registration/community/utils/community-helper.ts
import { CommunityMember, CommunityPriceCalculation, CommunityRegistrationData } from '@/lib/types/community-registration';
import crypto from 'crypto';

// Fixed pricing constants as per requirements
const COMMUNITY_PRICING = {
  '5K': {
    basePrice: 171000,
    jerseyAddOn: 20000
  },
  '10K': {
    basePrice: 218000,
    jerseyAddOn: 20000
  }
};

export const MIN_MEMBERS = 5;
export const MAX_MEMBERS = 50;
export const JERSEY_ADDON = 20000;

// Empty member template with proper defaults
export const emptyMember: CommunityMember = {
  fullName: "",
  gender: "L" as const,
  dateOfBirth: "",
  identityNumber: "",
  nationality: "WNI" as const,
  whatsapp: "",
  email: "",
  bibName: "",
  jerseySize: "M" as const,
  emergencyName: "",
  emergencyRelation: "Keluarga" as const,
  emergencyPhone: "",
  bloodType: "A+" as const,
  estimatedTime: "",
  medicalHistory: "",
  allergies: "",
  address: "",
  city: "",
  province: "",
  postalCode: ""
};

/**
 * Calculate community price with proper typing
 */
export function calculateCommunityPrice(
  category: '5K' | '10K',
  members: CommunityMember[]
): CommunityPriceCalculation {
  const basePrice = COMMUNITY_PRICING[category].basePrice;
  const totalMembers = members.length;
  const baseMembers = totalMembers; // No free members as per requirements
  const freeMembers = 0;

  const totalBase = basePrice * totalMembers;

  // Calculate jersey adjustments for XXL/XXXL
  const jerseyAdjustments = members.map((member, index) => {
    const needsAddOn = member.jerseySize === 'XXL' || member.jerseySize === 'XXXL';
    return {
      memberName: member.fullName || `Member ${index + 1}`,
      size: member.jerseySize,
      adjustment: needsAddOn ? JERSEY_ADDON : 0
    };
  });

  const totalJerseyAdjustment = jerseyAdjustments.reduce(
    (sum, item) => sum + item.adjustment,
    0
  );

  const subtotal = totalBase;
  const totalPrice = subtotal + totalJerseyAdjustment;
  const pricePerPerson = totalMembers > 0 ? Math.ceil(totalPrice / totalMembers) : 0;

  // No savings since no promo
  const savings = 0;

  return {
    basePrice,
    baseMembers,
    freeMembers,
    totalMembers,
    subtotal,
    jerseyAdjustments,
    totalJerseyAdjustment,
    jerseyAddOnTotal: totalJerseyAdjustment,
    totalBase,
    totalPrice,
    pricePerPerson,
    savings
  };
}

/**
 * Validate community info (step 1)
 */
export function validateCommunityInfo(data: CommunityRegistrationData): string[] {
  const errors: string[] = [];

  if (!data.communityName || data.communityName.trim().length < 3) {
    errors.push('Nama komunitas minimal 3 karakter');
  }

  if (!data.picName || data.picName.trim().length < 3) {
    errors.push('Nama PIC minimal 3 karakter');
  }

  if (!data.picWhatsapp || data.picWhatsapp.trim().length < 10) {
    errors.push('Nomor WhatsApp PIC tidak valid');
  }

  if (!data.picEmail || !data.picEmail.includes('@')) {
    errors.push('Email PIC tidak valid');
  }

  if (!data.address || data.address.trim().length < 20) {
    errors.push('Alamat minimal 20 karakter');
  }

  if (!data.city || data.city.trim().length < 3) {
    errors.push('Nama kota minimal 3 karakter');
  }

  if (!data.province || data.province === '') {
    errors.push('Provinsi harus dipilih');
  }

  if (!data.category || !['5K', '10K'].includes(data.category)) {
    errors.push('Kategori lomba harus dipilih');
  }

  return errors;
}

/**
 * Validate members data (step 2)
 */
export function validateMembers(members: CommunityMember[]): string[] {
  const errors: string[] = [];

  if (members.length < MIN_MEMBERS) {
    errors.push(`Minimal ${MIN_MEMBERS} anggota untuk registrasi komunitas`);
    return errors;
  }

  if (members.length > MAX_MEMBERS) {
    errors.push(`Maksimal ${MAX_MEMBERS} anggota per registrasi`);
    return errors;
  }

  const emailSet = new Set<string>();
  const whatsappSet = new Set<string>();

  members.forEach((member, index) => {
    const memberNum = index + 1;

    // Personal info
    if (!member.fullName || member.fullName.trim().length < 3) {
      errors.push(`Anggota ${memberNum}: Nama lengkap minimal 3 karakter`);
    }

    if (!member.gender || !['L', 'P'].includes(member.gender)) {
      errors.push(`Anggota ${memberNum}: Jenis kelamin harus dipilih`);
    }

    if (!member.dateOfBirth) {
      errors.push(`Anggota ${memberNum}: Tanggal lahir harus diisi`);
    } else {
      // Validate age
      const birthDate = new Date(member.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 12) {
        errors.push(`Anggota ${memberNum}: Usia minimal 12 tahun`);
      }
    }

    if (!member.identityNumber || member.identityNumber.length !== 16) {
      errors.push(`Anggota ${memberNum}: NIK harus 16 digit`);
    }

    // Contact info
    if (!member.email || !member.email.includes('@')) {
      errors.push(`Anggota ${memberNum}: Email tidak valid`);
    } else {
      if (emailSet.has(member.email.toLowerCase())) {
        errors.push(`Anggota ${memberNum}: Email ${member.email} sudah digunakan anggota lain`);
      }
      emailSet.add(member.email.toLowerCase());
    }

    if (!member.whatsapp || member.whatsapp.length < 10) {
      errors.push(`Anggota ${memberNum}: Nomor WhatsApp tidak valid`);
    } else {
      if (whatsappSet.has(member.whatsapp)) {
        errors.push(`Anggota ${memberNum}: WhatsApp ${member.whatsapp} sudah digunakan anggota lain`);
      }
      whatsappSet.add(member.whatsapp);
    }

    // Race info
    if (!member.bibName || member.bibName.trim().length === 0) {
      errors.push(`Anggota ${memberNum}: Nama BIB harus diisi`);
    } else if (member.bibName.length > 10) {
      errors.push(`Anggota ${memberNum}: Nama BIB maksimal 10 karakter`);
    }

    if (!member.jerseySize || !['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].includes(member.jerseySize)) {
      errors.push(`Anggota ${memberNum}: Ukuran jersey harus dipilih`);
    }

    // Emergency contact
    if (!member.emergencyName || member.emergencyName.trim().length < 3) {
      errors.push(`Anggota ${memberNum}: Nama kontak darurat minimal 3 karakter`);
    }

    if (!member.emergencyPhone || member.emergencyPhone.length < 10) {
      errors.push(`Anggota ${memberNum}: Nomor kontak darurat tidak valid`);
    }

    if (!member.emergencyRelation) {
      errors.push(`Anggota ${memberNum}: Hubungan kontak darurat harus dipilih`);
    }

    if (!member.bloodType) {
      errors.push(`Anggota ${memberNum}: Golongan darah harus dipilih`);
    }
  });

  return errors;
}

/**
 * Generate idempotency key for community registration
 */
export function generateIdempotencyKey(data: CommunityRegistrationData): string {
  const key = `${data.picEmail}-${data.communityName}-${Date.now()}`;
  return crypto.createHash('sha256').update(key).digest('hex').substring(0, 32);
}

/**
 * Submit community registration with idempotency
 */
export async function submitCommunityRegistration(data: CommunityRegistrationData) {
  try {
    // Generate idempotency key
    const idempotencyKey = generateIdempotencyKey(data);

    // Prepare request body
    const requestBody = {
      communityName: data.communityName,
      communityType: 'RUNNING_CLUB',
      address: data.address,
      picName: data.picName,
      picWhatsapp: data.picWhatsapp,
      picEmail: data.picEmail,
      picPosition: data.picPosition || 'PIC',
      category: data.category as '5K' | '10K',
      city: data.city,
      province: data.province,
      members: data.members.map(member => ({
        fullName: member.fullName,
        gender: member.gender,
        dateOfBirth: member.dateOfBirth,
        identityNumber: member.identityNumber,
        bloodType: member.bloodType,
        email: member.email,
        whatsapp: member.whatsapp,
        address: member.address || data.address,
        province: member.province || data.province,
        city: member.city || data.city,
        postalCode: member.postalCode,
        bibName: member.bibName,
        jerseySize: member.jerseySize,
        estimatedTime: member.estimatedTime,
        emergencyName: member.emergencyName,
        emergencyPhone: member.emergencyPhone,
        emergencyRelation: member.emergencyRelation,
        medicalHistory: member.medicalHistory,
        allergies: member.allergies
      })),
      idempotencyKey
    };

    // Submit to API
    const response = await fetch('/api/registration/community', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Registration failed');
    }

    return {
      registrationResults: result.data.members,
      communityRegistrationCode: result.data.registrationCode,
      paymentCode: result.data.paymentCode,
      totalPrice: result.data.totalPrice
    };
  } catch (error) {
    console.error('Community registration error:', error);
    throw error;
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

/**
 * Check if member needs jersey addon
 */
export function needsJerseyAddon(jerseySize: string): boolean {
  return jerseySize === 'XXL' || jerseySize === 'XXXL';
}

/**
 * Validate member age for category
 */
export function validateMemberAge(dateOfBirth: string, category: '5K' | '10K'): {
  isValid: boolean;
  age: number;
  minAge: number;
} {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  const minAge = category === '5K' ? 12 : 17;

  return {
    isValid: age >= minAge,
    age,
    minAge
  };
}