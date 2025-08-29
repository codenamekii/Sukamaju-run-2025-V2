// lib/config/pricing.ts
// Centralized pricing configuration for SUKAMAJU RUN 2025

export const PRICING_CONFIG = {
  // Event dates
  eventDate: new Date('2025-11-16'),
  earlyBirdDeadline: new Date('2025-08-31'),

  // Individual registration prices - FIXED PRICES (no early bird)
  individual: {
    '5K': {
      earlyBird: 180000,  // Same as regular (no early bird discount)
      regular: 180000,    // Fixed price Rp 180.000
      description: 'Kategori 5 KM'
    },
    '10K': {
      earlyBird: 230000,  // Same as regular (no early bird discount)
      regular: 230000,    // Fixed price Rp 230.000
      description: 'Kategori 10 KM'
    }
  },

  // Community registration
  community: {
    basePrice: 151000,        // Per person
    minimumParticipants: 5,   // Minimum 5 orang
    promoThreshold: 10,       // Buy 10 get 1 free
    promoBonus: 1,            // Free participants
    description: 'Registrasi Komunitas (min. 5 orang)'
  },

  // Jersey size add-on
  jerseyAddOn: {
    regularSizes: ['XS', 'S', 'M', 'L', 'XL'],  // No additional cost
    plusSizes: ['XXL', 'XXXL'],                  // Additional cost
    plusSizeCost: 20000,                         // Additional cost for plus sizes
  },

  // Quota limits
  quota: {
    '5K': 300,
    '10K': 200,
    'COMMUNITY': 100, // Max community groups or participants
    total: 500
  }
};

// Helper function to calculate individual price
export function calculateIndividualPrice(
  category: '5K' | '10K',
  jerseySize: string,
  registrationDate?: Date
): {
  basePrice: number;
  jerseyAddOn: number;
  totalPrice: number;
  isEarlyBird: boolean;
  breakdown: string[];
} {
  const today = registrationDate || new Date();
  const isEarlyBird = today < PRICING_CONFIG.earlyBirdDeadline;

  // Get base price
  const categoryPricing = PRICING_CONFIG.individual[category];
  const basePrice = isEarlyBird ? categoryPricing.earlyBird : categoryPricing.regular;

  // Calculate jersey add-on
  const jerseyAddOn = PRICING_CONFIG.jerseyAddOn.plusSizes.includes(jerseySize)
    ? PRICING_CONFIG.jerseyAddOn.plusSizeCost
    : 0;

  // Total
  const totalPrice = basePrice + jerseyAddOn;

  // Breakdown for display
  const breakdown = [
    `Registrasi ${category}: Rp ${basePrice.toLocaleString('id-ID')}`,
  ];

  if (isEarlyBird) {
    breakdown.push('✓ Harga Early Bird');
  }

  if (jerseyAddOn > 0) {
    breakdown.push(`Jersey ukuran ${jerseySize}: +Rp ${jerseyAddOn.toLocaleString('id-ID')}`);
  }

  return {
    basePrice,
    jerseyAddOn,
    totalPrice,
    isEarlyBird,
    breakdown
  };
}

// Helper function to calculate community price
export function calculateCommunityPrice(
  participantCount: number,
  plusSizeCount: number = 0
): {
  basePrice: number;
  totalParticipants: number;
  freeParticipants: number;
  jerseyAddOn: number;
  totalPrice: number;
  hasPromo: boolean;
  breakdown: string[];
} {
  const config = PRICING_CONFIG.community;

  // Calculate promo (buy 10 get 1 free)
  const hasPromo = participantCount >= config.promoThreshold;
  const freeParticipants = hasPromo ? Math.floor(participantCount / config.promoThreshold) * config.promoBonus : 0;
  const chargedParticipants = participantCount - freeParticipants;

  // Calculate base price
  const basePrice = chargedParticipants * config.basePrice;

  // Calculate jersey add-on
  const jerseyAddOn = plusSizeCount * PRICING_CONFIG.jerseyAddOn.plusSizeCost;

  // Total
  const totalPrice = basePrice + jerseyAddOn;

  // Breakdown
  const breakdown = [
    `${participantCount} peserta × Rp ${config.basePrice.toLocaleString('id-ID')}`,
  ];

  if (hasPromo) {
    breakdown.push(`✓ Promo: Gratis ${freeParticipants} peserta (buy 10 get 1)`);
    breakdown.push(`Peserta berbayar: ${chargedParticipants} orang`);
  }

  if (jerseyAddOn > 0) {
    breakdown.push(`Jersey plus size (${plusSizeCount}x): +Rp ${jerseyAddOn.toLocaleString('id-ID')}`);
  }

  return {
    basePrice,
    totalParticipants: participantCount,
    freeParticipants,
    jerseyAddOn,
    totalPrice,
    hasPromo,
    breakdown
  };
}

// Check if early bird period is active
export function isEarlyBirdActive(date?: Date): boolean {
  const checkDate = date || new Date();
  return checkDate < PRICING_CONFIG.earlyBirdDeadline;
}

// Format currency for display
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Get remaining quota
export async function getRemainingQuota(
  category: '5K' | '10K' | 'COMMUNITY',
  currentCount: number
): Promise <number> {
  const limit = PRICING_CONFIG.quota[category];
  return Promise.resolve(Math.max(0, limit - currentCount));
}