import {
  COMMUNITY_CONSTANTS,
  CommunityMember,
  CommunityPriceCalculation
} from '@/lib/types/community-registration';
import { JerseySize } from '@/lib/types/registration';
import { formatCurrency } from './registration';

const LARGE_JERSEY_SIZES: JerseySize[] = ['XXL', 'XXXL'];
const JERSEY_PRICE_ADJUSTMENT = 20000;

/**
 * Calculate community registration price
 * Rules:
 * - Min 5 members
 * - Price: Rp 151.000 per person
 * - Promo: Every 10 paid members get 1 free member
 * - Jersey XL+ adds Rp 20.000
 */
export function calculateCommunityPrice(
  members: CommunityMember[]
): CommunityPriceCalculation {
  const totalMembers = members.length;

  // Calculate free members based on promo (every 10 get 1 free)
  const freeMembers = Math.floor(totalMembers / (COMMUNITY_CONSTANTS.PROMO_BUY + COMMUNITY_CONSTANTS.PROMO_GET));
  const baseMembers = totalMembers - freeMembers;

  // Calculate base price
  const pricePerPerson = COMMUNITY_CONSTANTS.PRICE_PER_PERSON;
  const subtotal = baseMembers * pricePerPerson;

  // Calculate jersey adjustments
  const jerseyAdjustments = members
    .filter(member => LARGE_JERSEY_SIZES.includes(member.jerseySize))
    .map(member => ({
      memberName: member.fullName,
      size: member.jerseySize,
      adjustment: JERSEY_PRICE_ADJUSTMENT
    }));

  const totalJerseyAdjustment = jerseyAdjustments.length * JERSEY_PRICE_ADJUSTMENT;

  // Calculate total price
  const totalPrice = subtotal + totalJerseyAdjustment;

  // Calculate savings from promo
  const normalPrice = totalMembers * pricePerPerson;
  const savings = normalPrice - subtotal;

  return {
  basePrice: 0,
  baseMembers: 0,
  freeMembers: 0,
  totalMembers: 0,
  subtotal: 0,
  jerseyAdjustments: [],
  totalJerseyAdjustment: 0,
  jerseyAddOnTotal: 0,
  totalBase: 0,
  totalPrice: 0,
  pricePerPerson: 0,
  savings: 0
};
}

/**
 * Validate if community meets minimum requirements
 */
export function validateCommunitySize(memberCount: number): {
  isValid: boolean;
  message: string;
} {
  if (memberCount < COMMUNITY_CONSTANTS.MIN_MEMBERS) {
    return {
      isValid: false,
      message: `Minimal ${COMMUNITY_CONSTANTS.MIN_MEMBERS} orang untuk registrasi komunitas`
    };
  }

  if (memberCount > COMMUNITY_CONSTANTS.MAX_MEMBERS) {
    return {
      isValid: false,
      message: `Maksimal ${COMMUNITY_CONSTANTS.MAX_MEMBERS} orang per registrasi komunitas`
    };
  }

  return {
    isValid: true,
    message: 'Jumlah member valid'
  };
}

/**
 * Get promo information text
 */
export function getPromoInfo(memberCount: number): string {
  const promoThreshold = COMMUNITY_CONSTANTS.PROMO_BUY + COMMUNITY_CONSTANTS.PROMO_GET;

  if (memberCount < promoThreshold) {
    const needed = promoThreshold - memberCount;
    return `Tambah ${needed} orang lagi untuk mendapatkan 1 slot gratis!`;
  }

  const freeSlots = Math.floor(memberCount / promoThreshold);
  const nextPromoIn = promoThreshold - (memberCount % promoThreshold);

  if (freeSlots === 1) {
    if (nextPromoIn === promoThreshold) {
      return `Selamat! Anda mendapat 1 slot gratis dari promo.`;
    }
    return `Anda mendapat 1 slot gratis! Tambah ${nextPromoIn} orang untuk slot gratis berikutnya.`;
  }

  if (nextPromoIn === promoThreshold) {
    return `Selamat! Anda mendapat ${freeSlots} slot gratis dari promo.`;
  }

  return `Anda mendapat ${freeSlots} slot gratis! Tambah ${nextPromoIn} orang untuk slot gratis berikutnya.`;
}

/**
 * Format price breakdown for display
 */
export function formatPriceBreakdown(calculation: CommunityPriceCalculation): string[] {
  const lines: string[] = [];

  lines.push(`${calculation.totalMembers} Peserta Terdaftar`);

  if (calculation.freeMembers > 0) {
    lines.push(`├─ ${calculation.baseMembers} Peserta Berbayar × ${formatCurrency(calculation.pricePerPerson)}`);
    lines.push(`├─ ${calculation.freeMembers} Peserta Gratis (Promo)`);
    lines.push(`├─ Subtotal: ${formatCurrency(calculation.subtotal)}`);
  } else {
    lines.push(`├─ ${calculation.baseMembers} Peserta × ${formatCurrency(calculation.pricePerPerson)}`);
    lines.push(`├─ Subtotal: ${formatCurrency(calculation.subtotal)}`);
  }

  if (calculation.jerseyAdjustments.length > 0) {
    lines.push(`├─ Tambahan Jersey XL+ (${calculation.jerseyAdjustments.length} pcs): ${formatCurrency(calculation.totalJerseyAdjustment)}`);
  }

  lines.push(`└─ Total: ${formatCurrency(calculation.totalPrice)}`);

  if (calculation.savings > 0) {
    lines.push(`💰 Hemat: ${formatCurrency(calculation.savings)}`);
  }

  return lines;
}

/**
 * Example calculation scenarios
 */
export function getExampleScenarios() {
  return [
    {
      members: 5,
      description: 'Minimum (5 orang)',
      basePrice: 5 * COMMUNITY_CONSTANTS.PRICE_PER_PERSON,
      freeSlots: 0,
      total: formatCurrency(5 * COMMUNITY_CONSTANTS.PRICE_PER_PERSON)
    },
    {
      members: 11,
      description: '11 orang (10 bayar + 1 gratis)',
      basePrice: 10 * COMMUNITY_CONSTANTS.PRICE_PER_PERSON,
      freeSlots: 1,
      total: formatCurrency(10 * COMMUNITY_CONSTANTS.PRICE_PER_PERSON),
      savings: formatCurrency(COMMUNITY_CONSTANTS.PRICE_PER_PERSON)
    },
    {
      members: 22,
      description: '22 orang (20 bayar + 2 gratis)',
      basePrice: 20 * COMMUNITY_CONSTANTS.PRICE_PER_PERSON,
      freeSlots: 2,
      total: formatCurrency(20 * COMMUNITY_CONSTANTS.PRICE_PER_PERSON),
      savings: formatCurrency(2 * COMMUNITY_CONSTANTS.PRICE_PER_PERSON)
    }
  ];
}

/**
 * Validate all members age for 5K category
 */
export function validateMembersAge(members: CommunityMember[]): {
  isValid: boolean;
  invalidMembers: string[];
} {
  const invalidMembers: string[] = [];
  const minAge = 12; // Community runs 5K category

  members.forEach(member => {
    const birthDate = new Date(member.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < minAge) {
      invalidMembers.push(`${member.fullName} (${age} tahun)`);
    }
  });

  return {
    isValid: invalidMembers.length === 0,
    invalidMembers
  };
}

/**
 * Generate registration codes for each member
 */
export function generateMemberCodes(communityName: string, members: CommunityMember[]): Map<string, string> {
  const codes = new Map<string, string>();
  const prefix = 'SRC2025'; // SR Community 2025
  const communityInitial = communityName.substring(0, 3).toUpperCase();

  members.forEach((member, index) => {
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const code = `${prefix}-${communityInitial}-${(index + 1).toString().padStart(2, '0')}-${random}`;
    codes.set(member.email, code);
  });

  return codes;
}