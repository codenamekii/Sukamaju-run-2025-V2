import { Category, JerseySize, PriceCalculation } from '@/lib/types/registration';

// Price constants
const BASE_PRICES = {
  '5K': 180000,
  '10K': 230000,
  'COMMUNITY': 0, // Calculated separately
} as const;

const LARGE_JERSEY_SIZES: JerseySize[] = ['XXL', 'XXXL'];
const JERSEY_PRICE_ADJUSTMENT = 20000;
const COMMUNITY_DISCOUNT = 0.15; // 15% discount

// Calculate age from birth date
export function calculateAge(birthDate: string | Date): number {
  const today = new Date();
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

// Calculate jersey price adjustment
export function getJerseyPriceAdjustment(size: JerseySize): number {
  return LARGE_JERSEY_SIZES.includes(size) ? JERSEY_PRICE_ADJUSTMENT : 0;
}

// Calculate total price
export function calculatePrice(
  category: Category,
  jerseySize: JerseySize,
  communitySize?: number
): PriceCalculation {
  // start from base price (may be overridden for COMMUNITY)
  let basePrice: number = BASE_PRICES[category]; // kept for backward compatibility (no early bird)
  let communityDiscount = 0;

  // Calculate community price (group)
  if (category === 'COMMUNITY' && communitySize && communitySize > 0) {
    const normalPrice = BASE_PRICES['5K'];
    basePrice = normalPrice * communitySize;
    communityDiscount = Math.round(basePrice * COMMUNITY_DISCOUNT);
    basePrice = basePrice - communityDiscount;
  }

  // Add jersey adjustment (only XXL & XXXL)
  const jerseyAdjustment = getJerseyPriceAdjustment(jerseySize);
  const totalPrice = basePrice + jerseyAdjustment;

  return {
    basePrice,
    jerseyAdjustment,
    communityDiscount,
    totalPrice,
  } as unknown as PriceCalculation;
}

// Format currency to IDR
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format phone number
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Handle different formats
  if (cleaned.startsWith('62')) {
    // Already in international format
    return '+' + cleaned;
  } else if (cleaned.startsWith('0')) {
    // Local format, convert to international
    return '+62' + cleaned.substring(1);
  } else {
    // Assume it's already without country code
    return '+62' + cleaned;
  }
}

// Generate registration code
export function generateRegistrationCode(): string {
  const prefix = 'SR2025';
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${randomPart}`;
}

// Generate BIB number
export function generateBibNumber(category: Category, sequence: number): string {
  const prefix = category === '5K' ? 'A' : category === '10K' ? 'B' : 'C';
  return `${prefix}${sequence.toString().padStart(3, '0')}`;
}

// Validate minimum age for category
export function validateAgeForCategory(birthDate: string | Date, category: Category): {
  isValid: boolean;
  minAge: number;
  currentAge: number;
} {
  const age = calculateAge(birthDate);
  const minAge = category === '5K' ? 12 : 17;

  return {
    isValid: age >= minAge,
    minAge,
    currentAge: age,
  };
}

// Check quota availability (mock - replace with API call)
export async function checkQuotaAvailability(category: Category): Promise<{
  available: boolean;
  remaining: number;
  total: number;
}> {
  // This should be replaced with actual API call
  const quotas = {
    '5K': { total: 300, used: 150 },
    '10K': { total: 200, used: 75 },
    'COMMUNITY': { total: 100, used: 20 },
  };

  const quota = quotas[category];
  const remaining = quota.total - quota.used;

  return {
    available: remaining > 0,
    remaining,
    total: quota.total,
  };
}

// Save form data to session storage
export function saveFormToSession(data: unknown): void {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem('registration_form', JSON.stringify(data));
    } catch (e) {
      // session storage mungkin penuh atau disabled
      console.warn('Gagal menyimpan session:', e);
    }
  }
}

// Load form data from session storage
export function loadFormFromSession(): unknown | null {
  if (typeof window !== 'undefined') {
    try {
      const saved = sessionStorage.getItem('registration_form');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn('Gagal membaca session:', e);
      return null;
    }
  }
  return null;
}

// Clear form data from session storage
export function clearFormSession(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('registration_form');
  }
}

// Validate Indonesian phone number
export function isValidIndonesianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  const patterns = [
    /^08[1-9][0-9]{7,11}$/,  // 08xx format
    /^628[1-9][0-9]{7,11}$/, // 628xx format
  ];

  return patterns.some(pattern => pattern.test(cleaned));
}

// Format date for display
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj);
}

// Format time for display (HH:MM -> "H jam M menit")
export function formatTime(time: string): string {
  const [hours = '0', minutes = '0'] = time.split(':');
  return `${hours} jam ${minutes} menit`;
}

// Get jersey size label
export function getJerseySizeLabel(size: JerseySize): string {
  const labels: Record<string, string> = {
    'XS': 'Extra Small',
    'S': 'Small',
    'M': 'Medium',
    'L': 'Large',
    'XL': 'Extra Large',
    'XXL': 'Double XL (+ Rp 20.000)',
    'XXXL': 'Triple XL (+ Rp 20.000)',
  };

  return labels[size] || size;
}

// Calculate expiry time (24 hours from now)
export function getPaymentExpiryTime(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry;
}

// Check if payment is expired
export function isPaymentExpired(expiryTime: string | Date): boolean {
  const expiry = typeof expiryTime === 'string' ? new Date(expiryTime) : expiryTime;
  return new Date() > expiry;
}