import { JerseySize } from "@/lib/types/registration";
import { COMMUNITY_CONSTANTS, CommunityPriceCalculation } from "../types/community-registration";

// Fixed prices configuration
const PRICES = {
  '5K': 180000,      // Rp 180.000
  '10K': 230000,     // Rp 230.000  
  'COMMUNITY': 151000 // Rp 151.000 per person
};

// Jersey sizes that incur additional cost
const PLUS_SIZE_JERSEY = ['XXL', 'XXXL'];
const JERSEY_ADDON_PRICE = 20000; // Rp 20.000

// Calculate total price for individual registration
export function calculateRegistrationPrice(
  category: string,
  jerseySize: string
): {
  basePrice: number;
  jerseyAddOn: number;
  totalPrice: number;
} {
  // Get base price
  const basePrice = PRICES[category as keyof typeof PRICES] || 0;

  // Calculate jersey add-on (only for XXL and XXXL)
  const jerseyAddOn = PLUS_SIZE_JERSEY.includes(jerseySize) ? JERSEY_ADDON_PRICE : 0;

  // Calculate total
  const totalPrice = basePrice + jerseyAddOn;

  return {
    basePrice,
    jerseyAddOn,
    totalPrice
  };
}

// Calculate price for community registration
export function calculateCommunityPrice(
p0: string, members: { fullName: string; jerseySize: JerseySize; }[]): CommunityPriceCalculation {
  const participantCount = members.length;

  if (participantCount < COMMUNITY_CONSTANTS.MIN_MEMBERS) {
    throw new Error(`Minimal ${COMMUNITY_CONSTANTS.MIN_MEMBERS} peserta untuk registrasi komunitas`);
  }

  // Promo buy X get Y
  const freeMembers = Math.floor(
    participantCount / COMMUNITY_CONSTANTS.PROMO_BUY
  ) * COMMUNITY_CONSTANTS.PROMO_GET;

  const baseMembers = participantCount - freeMembers;
  const pricePerPerson = COMMUNITY_CONSTANTS.PRICE_PER_PERSON;
  const subtotal = baseMembers * pricePerPerson;

  // Hitung penyesuaian jersey (contoh: XL/XXL ada tambahan harga)
  const jerseyAdjustments = members.map((m) => {
    let adjustment = 0;
    if (m.jerseySize === "XL" || m.jerseySize === "XXL") {
      adjustment = JERSEY_ADDON_PRICE;
    }
    return {
      memberName: m.fullName,
      size: m.jerseySize,
      adjustment,
    };
  });

  const totalJerseyAdjustment = jerseyAdjustments.reduce(
    (sum, j) => sum + j.adjustment,
    0
  );

  const totalPrice = subtotal + totalJerseyAdjustment;

  return {
    basePrice: 0,
    baseMembers: 0,
    freeMembers: 0,
    totalMembers: 0,
    pricePerPerson: 0,
    subtotal: 0,
    jerseyAddOnTotal: 0,
    jerseyAdjustments: [],
    totalJerseyAdjustment: 0,
    totalBase: 0,
    totalPrice: 0,
    savings: 0
  };
}

// Format currency for display
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Get price breakdown for display
export function getPriceBreakdown(
  category: string,
  jerseySize: string
): string[] {
  const { basePrice, jerseyAddOn, totalPrice } = calculateRegistrationPrice(category, jerseySize);

  const breakdown = [
    `Registrasi ${category}: ${formatRupiah(basePrice)}`
  ];

  if (jerseyAddOn > 0) {
    breakdown.push(`Jersey ukuran ${jerseySize}: +${formatRupiah(jerseyAddOn)}`);
  }

  breakdown.push(`Total: ${formatRupiah(totalPrice)}`);

  return breakdown;
}