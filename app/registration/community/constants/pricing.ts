// app/registration/community/constants/pricing.ts
// FIXED VERSION - Aligned with main pricing configuration

export const COMMUNITY_PRICING = {
  '5K': {
    individual: 180000,      // Regular individual price
    earlyBird: 162000,       // Early bird individual price (10% discount)
    community: 171000,       // Community price (5% discount from regular)
    description: 'Kategori 5K'
  },
  '10K': {
    individual: 230000,      // Regular individual price
    earlyBird: 207000,       // Early bird individual price (10% discount)
    community: 218000,       // Community price (5% discount from regular)
    description: 'Kategori 10K'
  }
};

export const JERSEY_ADDON = 20000;  // Additional cost for XXL/XXXL
export const JERSEY_PLUS_SIZES = ['XXL', 'XXXL'];
export const MIN_MEMBERS = 5;       // Minimum community members
export const MAX_MEMBERS = 50;      // Maximum community members

// Community promo rules
export const COMMUNITY_PROMO = {
  threshold: 10,      // Buy 10 get 1 free
  bonus: 1,          // Number of free participants per threshold
  description: 'Beli 10 gratis 1'
};

// Early bird deadline
export const EARLY_BIRD_DEADLINE = new Date('2025-03-31');

// Event information
export const EVENT_INFO = {
  date: new Date('2025-05-11'),
  venue: 'Lapangan Subiantoro, Sukamaju',
  city: 'Sukamaju',
  province: 'Luwu Utara',
  country: 'Indonesia'
};