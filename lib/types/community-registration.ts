import { BloodType, Category, EmergencyRelation, Gender, JerseySize, Nationality } from './registration';

export interface CommunityMember {
  // Personal Info
  fullName: string;
  gender: Gender;
  dateOfBirth: string;
  identityNumber: string;
  nationality: Nationality;

  // Contact
  whatsapp: string;
  email: string;

  // Race Info
  bibName: string;
  jerseySize: JerseySize;

  // Emergency Contact
  emergencyName: string;
  emergencyRelation: EmergencyRelation;
  emergencyPhone: string;
  bloodType: BloodType;
  medicalHistory?: string;
  allergies?: string;
}

export interface CommunityRegistrationData {
  category: Category;
  // Community Info
  communityName: string;
  picName: string; // Person in Charge
  picWhatsapp: string;
  picEmail: string;

  // Address (for sending race packs if needed)
  address: string;
  city: string;
  province: string;

  // Members
  members: CommunityMember[];

  // Terms
  agreeToTerms: boolean;
  agreeToHealth: boolean;
  agreeToRefund: boolean;
  agreeToData: boolean;
}

export interface CommunityPriceCalculation {
  basePrice: number;            // Harga dasar per orang
  baseMembers: number;          // Jumlah member yang bayar
  freeMembers: number;          // Jumlah member gratis (bonus)
  totalMembers: number;         // Total semua member
  pricePerPerson: number;       // Harga per orang (misalnya 151.000)
  subtotal: number;             // baseMembers * pricePerPerson
  jerseyAddOnTotal: number;     // Total biaya tambahan jersey
  jerseyAdjustments: {
    memberName: string;
    size: JerseySize;
    adjustment: number;
  }[];
  totalJerseyAdjustment: number;
  totalBase: number;            // totalMembers × basePrice
  totalPrice: number;           // subtotal + jerseyAddOnTotal
  savings: number;              // Berapa yang dihemat dari promo
}


// Constants for community registration
export const COMMUNITY_CONSTANTS = {
  MIN_MEMBERS: 5,
  PRICE_PER_PERSON: 151000,
  PROMO_BUY: 10,           // Buy 10
  PROMO_GET: 1,            // Get 1 free
  MAX_MEMBERS: 50,
};