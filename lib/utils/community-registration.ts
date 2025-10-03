import { JerseySize } from '@/lib/types/registration';
import { formatCurrency } from './registration';

// Types
export interface CommunityMember {
  fullName: string;
  email: string;
  jerseySize: JerseySize;
  dateOfBirth: string;
}

export interface CommunityPriceCalculation {
  basePrice: number;
  baseMembers: number;
  freeMembers: number;
  totalMembers: number;
  subtotal: number;
  jerseyAdjustments: {
    memberName: string;
    size: JerseySize;
    adjustment: number;
  }[];
  totalJerseyAdjustment: number;
  jerseyAddOnTotal: number;
  totalBase: number;
  totalPrice: number;
  pricePerPerson: number;
  savings: number;
}

// Constants
export const COMMUNITY_CONSTANTS = {
  PRICE_PER_PERSON: 151000,
  PROMO_BUY: 10,
  PROMO_GET: 1,
  MIN_MEMBERS: 5,
  MAX_MEMBERS: 50,
};

const LARGE_JERSEY_SIZES: JerseySize[] = ['XXL', 'XXXL'];
const JERSEY_PRICE_ADJUSTMENT = 20000;

/**
 * Hitung harga komunitas
 */
export function calculateCommunityPrice(
  members: CommunityMember[]
): CommunityPriceCalculation {
  const totalMembers = members.length;

  // Hitung free members berdasarkan promo
  const promoThreshold =
    COMMUNITY_CONSTANTS.PROMO_BUY + COMMUNITY_CONSTANTS.PROMO_GET;
  const freeMembers = Math.floor(totalMembers / promoThreshold);
  const baseMembers = totalMembers - freeMembers;

  // Harga dasar
  const pricePerPerson = COMMUNITY_CONSTANTS.PRICE_PER_PERSON;
  const subtotal = baseMembers * pricePerPerson;

  // Tambahan jersey
  const jerseyAdjustments = members
    .filter((m) => LARGE_JERSEY_SIZES.includes(m.jerseySize))
    .map((m) => ({
      memberName: m.fullName,
      size: m.jerseySize,
      adjustment: JERSEY_PRICE_ADJUSTMENT,
    }));

  const totalJerseyAdjustment =
    jerseyAdjustments.length * JERSEY_PRICE_ADJUSTMENT;

  const totalPrice = subtotal + totalJerseyAdjustment;

  // Savings
  const normalPrice = totalMembers * pricePerPerson;
  const savings = normalPrice - subtotal;

  return {
    basePrice: baseMembers * pricePerPerson,
    baseMembers,
    freeMembers,
    totalMembers,
    subtotal,
    jerseyAdjustments,
    totalJerseyAdjustment,
    jerseyAddOnTotal: totalJerseyAdjustment,
    totalBase: subtotal,
    totalPrice,
    pricePerPerson,
    savings,
  };
}

/**
 * Validasi jumlah anggota
 */
export function validateCommunitySize(memberCount: number): {
  isValid: boolean;
  message: string;
} {
  if (memberCount < COMMUNITY_CONSTANTS.MIN_MEMBERS) {
    return {
      isValid: false,
      message: `Minimal ${COMMUNITY_CONSTANTS.MIN_MEMBERS} orang untuk registrasi komunitas`,
    };
  }
  if (memberCount > COMMUNITY_CONSTANTS.MAX_MEMBERS) {
    return {
      isValid: false,
      message: `Maksimal ${COMMUNITY_CONSTANTS.MAX_MEMBERS} orang per registrasi komunitas`,
    };
  }
  return { isValid: true, message: 'Jumlah member valid' };
}

/**
 * Info promo
 */
export function getPromoInfo(memberCount: number): string {
  const promoThreshold =
    COMMUNITY_CONSTANTS.PROMO_BUY + COMMUNITY_CONSTANTS.PROMO_GET;

  if (memberCount < promoThreshold) {
    const needed = promoThreshold - memberCount;
    return `Tambah ${needed} orang lagi untuk mendapatkan 1 slot gratis!`;
  }

  const freeSlots = Math.floor(memberCount / promoThreshold);
  const nextPromoIn = promoThreshold - (memberCount % promoThreshold);

  if (freeSlots === 1) {
    return nextPromoIn === promoThreshold
      ? `Selamat! Anda mendapat 1 slot gratis dari promo.`
      : `Anda mendapat 1 slot gratis! Tambah ${nextPromoIn} orang untuk slot gratis berikutnya.`;
  }

  return nextPromoIn === promoThreshold
    ? `Selamat! Anda mendapat ${freeSlots} slot gratis dari promo.`
    : `Anda mendapat ${freeSlots} slot gratis! Tambah ${nextPromoIn} orang untuk slot gratis berikutnya.`;
}

/**
 * Format breakdown
 */
export function formatPriceBreakdown(
  calculation: CommunityPriceCalculation
): string[] {
  const lines: string[] = [];

  lines.push(`${calculation.totalMembers} Peserta Terdaftar`);

  if (calculation.freeMembers > 0) {
    lines.push(
      `├─ ${calculation.baseMembers} Peserta Berbayar × ${formatCurrency(
        calculation.pricePerPerson
      )}`
    );
    lines.push(`├─ ${calculation.freeMembers} Peserta Gratis (Promo)`);
    lines.push(`├─ Subtotal: ${formatCurrency(calculation.subtotal)}`);
  } else {
    lines.push(
      `├─ ${calculation.baseMembers} Peserta × ${formatCurrency(
        calculation.pricePerPerson
      )}`
    );
    lines.push(`├─ Subtotal: ${formatCurrency(calculation.subtotal)}`);
  }

  if (calculation.jerseyAdjustments.length > 0) {
    lines.push(
      `├─ Tambahan Jersey XL+ (${calculation.jerseyAdjustments.length} pcs): ${formatCurrency(
        calculation.totalJerseyAdjustment
      )}`
    );
  }

  lines.push(`└─ Total: ${formatCurrency(calculation.totalPrice)}`);

  if (calculation.savings > 0) {
    lines.push(`💰 Hemat: ${formatCurrency(calculation.savings)}`);
  }

  return lines;
}

/**
 * Contoh skenario
 */
export function getExampleScenarios() {
  return [
    {
      members: 5,
      description: 'Minimum (5 orang)',
      basePrice: 5 * COMMUNITY_CONSTANTS.PRICE_PER_PERSON,
      freeSlots: 0,
      total: formatCurrency(5 * COMMUNITY_CONSTANTS.PRICE_PER_PERSON),
    },
    {
      members: 11,
      description: '11 orang (10 bayar + 1 gratis)',
      basePrice: 10 * COMMUNITY_CONSTANTS.PRICE_PER_PERSON,
      freeSlots: 1,
      total: formatCurrency(10 * COMMUNITY_CONSTANTS.PRICE_PER_PERSON),
      savings: formatCurrency(COMMUNITY_CONSTANTS.PRICE_PER_PERSON),
    },
    {
      members: 22,
      description: '22 orang (20 bayar + 2 gratis)',
      basePrice: 20 * COMMUNITY_CONSTANTS.PRICE_PER_PERSON,
      freeSlots: 2,
      total: formatCurrency(20 * COMMUNITY_CONSTANTS.PRICE_PER_PERSON),
      savings: formatCurrency(2 * COMMUNITY_CONSTANTS.PRICE_PER_PERSON),
    },
  ];
}

/**
 * Validasi umur
 */
export function validateMembersAge(
  members: CommunityMember[]
): { isValid: boolean; invalidMembers: string[] } {
  const invalidMembers: string[] = [];
  const minAge = 12;

  members.forEach((m) => {
    const birthDate = new Date(m.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    if (age < minAge) {
      invalidMembers.push(`${m.fullName} (${age} tahun)`);
    }
  });

  return { isValid: invalidMembers.length === 0, invalidMembers };
}

/**
 * Generate registration codes
 */
export function generateMemberCodes(
  communityName: string,
  members: CommunityMember[]
): Map<string, string> {
  const codes = new Map<string, string>();
  const prefix = 'SRC2025';
  const communityInitial = communityName.substring(0, 3).toUpperCase();

  members.forEach((m, i) => {
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const code = `${prefix}-${communityInitial}-${(i + 1)
      .toString()
      .padStart(2, '0')}-${random}`;
    codes.set(m.email, code);
  });

  return codes;
}