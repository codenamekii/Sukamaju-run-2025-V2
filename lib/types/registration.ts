// Registration Types & Interfaces

export type Category = '5K' | '10K' | 'COMMUNITY';
export type Gender = 'L' | 'P';
export type JerseySize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';
export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type Nationality = 'WNI' | 'WNA';
export type EmergencyRelation = 'Keluarga' | 'Teman' | 'Lainnya';

export interface RegistrationFormData {
  // Personal Info
  fullName: string;
  gender: Gender;
  dateOfBirth: string;
  identityNumber: string;
  nationality: Nationality;

  // Contact
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  province: string;

  // Race Info
  category: Category;
  bibName: string;
  jerseySize: JerseySize;
  runningCommunity?: string;
  estimatedTime?: string;

  // Emergency Contact
  emergencyName: string;
  emergencyRelation: EmergencyRelation;
  emergencyPhone: string;
  medicalHistory?: string;
  allergies?: string;
  bloodType: BloodType;

  // Terms
  agreeToTerms: boolean;
  agreeToHealth: boolean;
  agreeToRefund: boolean;
  agreeToData: boolean;
}

export interface PriceCalculation {
  basePrice: number;
  jerseyAdjustment: number;
  earlyBirdDiscount: number;
  communityDiscount: number;
  totalPrice: number;
}

export interface RegistrationResponse {
  success: boolean;
  registrationCode: string;
  paymentToken?: string;
  paymentUrl?: string;
  message: string;
}

export interface PaymentData {
  orderId: string;
  amount: number;
  vaNumber?: string;
  bank?: string;
  qrisUrl?: string;
  expiryTime: string;
}

// Province list for Indonesia
export const PROVINCES = [
  'Aceh',
  'Sumatera Utara',
  'Sumatera Barat',
  'Riau',
  'Kepulauan Riau',
  'Jambi',
  'Sumatera Selatan',
  'Bangka Belitung',
  'Bengkulu',
  'Lampung',
  'DKI Jakarta',
  'Jawa Barat',
  'Banten',
  'Jawa Tengah',
  'DI Yogyakarta',
  'Jawa Timur',
  'Bali',
  'Nusa Tenggara Barat',
  'Nusa Tenggara Timur',
  'Kalimantan Barat',
  'Kalimantan Tengah',
  'Kalimantan Selatan',
  'Kalimantan Timur',
  'Kalimantan Utara',
  'Sulawesi Utara',
  'Gorontalo',
  'Sulawesi Tengah',
  'Sulawesi Barat',
  'Sulawesi Selatan',
  'Sulawesi Tenggara',
  'Maluku',
  'Maluku Utara',
  'Papua',
  'Papua Barat',
] as const;

export type Province = typeof PROVINCES[number];

