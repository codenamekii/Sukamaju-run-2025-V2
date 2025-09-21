// lib/config/pricing.ts
// Centralized pricing configuration for SUKAMAJU RUN 2025
// FIXED VERSION WITH CORRECT EARLY BIRD PRICING

export const PRICING_CONFIG = {
  // Event dates
  eventDate: new Date('2025-05-11'),
  earlyBirdDeadline: new Date('2025-03-31'), // Adjust as needed

  // Individual registration prices - WITH EARLY BIRD DISCOUNT
  individual: {
    '5K': {
      earlyBird: 162000,  // Early bird price Rp 162.000 (10% discount)
      regular: 180000,    // Regular price Rp 180.000
      description: 'Kategori 5 KM'
    },
    '10K': {
      earlyBird: 207000,  // Early bird price Rp 207.000 (10% discount)
      regular: 230000,    // Regular price Rp 230.000
      description: 'Kategori 10 KM'
    }
  },

  // Community registration
  community: {
    '5K': {
      basePrice: 171000,  // Per person (5% discount from individual)
      description: 'Komunitas 5K'
    },
    '10K': {
      basePrice: 218000,  // Per person (5% discount from individual)
      description: 'Komunitas 10K'
    },
    minimumParticipants: 5,   // Minimum 5 orang
    maximumParticipants: 50,  // Maximum 50 orang
    promoThreshold: 10,        // Buy 10 get 1 free
    promoBonus: 1,            // Free participants
  },

  // Jersey size add-on
  jerseyAddOn: {
    regularSizes: ['XS', 'S', 'M', 'L', 'XL'],  // No additional cost
    plusSizes: ['XXL', 'XXXL'],                  // Additional cost
    plusSizeCost: 20000,                         // Additional Rp 20.000 for plus sizes
  },

  // Quota limits
  quota: {
    '5K': 3000,
    '10K': 2000,
    total: 5000
  }
};

// Helper function to calculate individual price
export function calculateIndividualPrice(
  category: '5K' | '10K',
  jerseySize: string,
  isEarlyBird?: boolean,
  registrationDate?: Date
): {
  basePrice: number;
  jerseyAddOn: number;
  totalPrice: number;
  isEarlyBird: boolean;
  breakdown: string[];
} {
  // If isEarlyBird is explicitly provided (from import), use it
  // Otherwise check the date
  let earlyBird = isEarlyBird;
  if (earlyBird === undefined) {
    const today = registrationDate || new Date();
    earlyBird = today < PRICING_CONFIG.earlyBirdDeadline;
  }

  // Get base price
  const categoryPricing = PRICING_CONFIG.individual[category];
  const basePrice = earlyBird ? categoryPricing.earlyBird : categoryPricing.regular;

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

  if (earlyBird) {
    breakdown.push('✓ Harga Early Bird (Diskon 10%)');
  }

  if (jerseyAddOn > 0) {
    breakdown.push(`Jersey ukuran ${jerseySize}: +Rp ${jerseyAddOn.toLocaleString('id-ID')}`);
  }

  return {
    basePrice,
    jerseyAddOn,
    totalPrice,
    isEarlyBird: earlyBird,
    breakdown
  };
}

// Helper function to calculate community price
export function calculateCommunityPrice(
  category: '5K' | '10K',
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
  const categoryConfig = config[category];

  // Calculate promo (buy 10 get 1 free)
  const hasPromo = participantCount >= config.promoThreshold;
  const freeParticipants = hasPromo ? Math.floor(participantCount / config.promoThreshold) * config.promoBonus : 0;
  const chargedParticipants = participantCount - freeParticipants;

  // Calculate base price
  const basePrice = chargedParticipants * categoryConfig.basePrice;

  // Calculate jersey add-on
  const jerseyAddOn = plusSizeCount * PRICING_CONFIG.jerseyAddOn.plusSizeCost;

  // Total
  const totalPrice = basePrice + jerseyAddOn;

  // Breakdown
  const breakdown = [
    `${participantCount} peserta × Rp ${categoryConfig.basePrice.toLocaleString('id-ID')}`,
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
  category: '5K' | '10K',
  currentCount: number
): Promise<number> {
  const limit = PRICING_CONFIG.quota[category];
  return Promise.resolve(Math.max(0, limit - currentCount));
}