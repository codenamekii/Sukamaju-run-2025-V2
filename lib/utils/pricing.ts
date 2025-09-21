// lib/utils/pricing.ts
import { JerseySize } from "@/lib/types/registration";

// ---------- TYPES ----------
export interface CommunityPriceCalculation {
  basePrice: number;
  baseMembers: number;
  freeMembers: number;
  totalMembers: number;
  pricePerPerson: number;
  subtotal: number;
  jerseyAddOnTotal: number;
  jerseyAdjustments: { memberName: string; size: JerseySize; adjustment: number }[];
  totalJerseyAdjustment: number;
  totalBase: number;
  totalPrice: number;
  savings: number;
}

// ---------- CONSTANTS ----------
const PRICES = {
  '5K': 180000,
  '10K': 230000,
  'COMMUNITY': 151000
};

const PLUS_SIZE_JERSEY = ['XXL', 'XXXL'];
const JERSEY_ADDON_PRICE = 20000;

const COMMUNITY_CONSTANTS = {
  MIN_MEMBERS: 5,
  PROMO_BUY: 5,
  PROMO_GET: 1,
  PRICE_PER_PERSON: PRICES.COMMUNITY
};

// ---------- INDIVIDUAL PRICE CALCULATION ----------
export function calculateRegistrationPrice(
  category: string,
  jerseySize: JerseySize
): { basePrice: number; jerseyAddOn: number; totalPrice: number } {
  const basePrice = PRICES[category as keyof typeof PRICES] || 0;
  const jerseyAddOn = PLUS_SIZE_JERSEY.includes(jerseySize) ? JERSEY_ADDON_PRICE : 0;
  const totalPrice = basePrice + jerseyAddOn;
  return { basePrice, jerseyAddOn, totalPrice };
}

// ---------- COMMUNITY PRICE CALCULATION ----------
export function calculateCommunityPrice(
  category: string,
  members: { fullName: string; jerseySize: JerseySize }[]
): CommunityPriceCalculation {
  const totalMembers = members.length;

  if (totalMembers < COMMUNITY_CONSTANTS.MIN_MEMBERS) {
    throw new Error(`Minimal ${COMMUNITY_CONSTANTS.MIN_MEMBERS} peserta untuk registrasi komunitas`);
  }

  const freeMembers = Math.floor(totalMembers / COMMUNITY_CONSTANTS.PROMO_BUY) * COMMUNITY_CONSTANTS.PROMO_GET;
  const baseMembers = totalMembers - freeMembers;
  const pricePerPerson = COMMUNITY_CONSTANTS.PRICE_PER_PERSON;
  const subtotal = baseMembers * pricePerPerson;

  const jerseyAdjustments = members.map((m) => ({
    memberName: m.fullName,
    size: m.jerseySize,
    adjustment: PLUS_SIZE_JERSEY.includes(m.jerseySize) ? JERSEY_ADDON_PRICE : 0
  }));

  const totalJerseyAdjustment = jerseyAdjustments.reduce((sum, j) => sum + j.adjustment, 0);
  const totalPrice = subtotal + totalJerseyAdjustment;

  return {
    basePrice: subtotal,
    baseMembers,
    freeMembers,
    totalMembers,
    pricePerPerson,
    subtotal,
    jerseyAddOnTotal: totalJerseyAdjustment,
    jerseyAdjustments,
    totalJerseyAdjustment,
    totalBase: subtotal,
    totalPrice,
    savings: freeMembers * pricePerPerson
  };
}

// ---------- FORMAT CURRENCY ----------
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// ---------- DISPLAY PRICE BREAKDOWN ----------
export function getPriceBreakdown(category: string, jerseySize: JerseySize): string[] {
  const { basePrice, jerseyAddOn, totalPrice } = calculateRegistrationPrice(category, jerseySize);

  const breakdown = [`Registrasi ${category}: ${formatRupiah(basePrice)}`];
  if (jerseyAddOn > 0) {
    breakdown.push(`Jersey ukuran ${jerseySize}: +${formatRupiah(jerseyAddOn)}`);
  }
  breakdown.push(`Total: ${formatRupiah(totalPrice)}`);

  return breakdown;
}