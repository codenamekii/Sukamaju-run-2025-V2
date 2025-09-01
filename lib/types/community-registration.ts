// lib/types/community-registration.ts
import { COMMUNITY_PRICING, JERSEY_ADDON } from "@/app/registration/community/constants/pricing";
import {
  BloodType,
  Category,
  EmergencyRelation,
  Gender,
  JerseySize,
  Nationality,
} from "./registration";

/** Satu anggota komunitas */
export interface CommunityMember {
  idNumber: string;
  estimatedTime: string;
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

  // Optional fields
  medicalHistory?: string;
  allergies?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  category?: Category;
}

export function calculateCommunityPrice(
  category: "5K" | "10K",
  members: CommunityMember[]
): CommunityPriceCalculation {
  const basePrice = COMMUNITY_PRICING[category].community;
  const baseMembers = members.length;      // jumlah anggota berbayar
  const freeMembers = 0;                   // default tidak ada yg gratis
  const totalMembers = members.length;

  const totalBase = baseMembers * basePrice; // harga dasar semua anggota

  // biaya tambahan jersey XXL/XXXL
  const jerseyAdjustments = members.map((m, i) => {
    const adjustment =
      m.jerseySize === "XXL" || m.jerseySize === "XXXL"
        ? JERSEY_ADDON
        : 0;
    return {
      memberName: m.fullName || `Member ${i + 1}`,
      size: m.jerseySize,
      adjustment,
    };
  });

  const totalJerseyAdjustment = jerseyAdjustments.reduce(
    (sum, j) => sum + j.adjustment,
    0
  );

  const jerseyAddOnTotal = totalJerseyAdjustment;

  const subtotal = totalBase;
  const totalPrice = subtotal + jerseyAddOnTotal;
  const pricePerPerson = totalMembers > 0 ? totalPrice / totalMembers : 0;

  const savings =
    (COMMUNITY_PRICING[category].individual - basePrice) * totalMembers;

  return {
    basePrice,
    baseMembers,
    freeMembers,
    totalMembers,
    subtotal,
    jerseyAdjustments,
    totalJerseyAdjustment,
    totalPrice,
    savings,
    pricePerPerson,
    jerseyAddOnTotal,
    totalBase,
  };
}

/** Data registrasi komunitas */
export interface CommunityRegistrationData {
  postalCode: string;
  picPosition: string;
  category: Category;

  // Community Info
  communityName: string;
  picName: string;
  picWhatsapp: string;
  picEmail: string;

  // Address
  address: string;
  city: string;
  province: string;

  // Members
  members: CommunityMember[];

  // Agreements
  agreeToTerms?: boolean;
  agreeToHealth?: boolean;
  agreeToRefund?: boolean;
  agreeToData?: boolean;

  priceCalculation?: CommunityPriceCalculation;
}

/** Kalkulasi harga komunitas */
export interface CommunityPriceCalculation {
  basePrice: number;
  baseMembers: number;
  freeMembers: number;
  totalMembers: number;
  pricePerPerson: number;
  subtotal: number;
  jerseyAddOnTotal: number;
  jerseyAdjustments: {
    memberName: string;
    size: JerseySize;
    adjustment: number;
  }[];
  totalJerseyAdjustment: number;
  totalBase: number;
  totalPrice: number;
  savings: number;
}

/** Konstanta komunitas */
export const COMMUNITY_CONSTANTS = {
  MIN_MEMBERS: 5,
  PRICE_PER_PERSON: 151000,
  PROMO_BUY: 10,
  PROMO_GET: 1,
  MAX_MEMBERS: 50,
};

/** Default member kosong untuk form (controlled) */
export const emptyMember: CommunityMember = {
  fullName: "",
  gender: "L", // sesuai union 'L' | 'P'
  dateOfBirth: "",
  identityNumber: "",
  nationality: "WNI", // sesuai union 'WNI' | 'WNA'

  whatsapp: "",
  email: "",

  bibName: "",
  jerseySize: "M", // salah satu dari 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL'

  emergencyName: "",
  emergencyRelation: "Keluarga", // sesuai union 'Keluarga' | 'Teman' | 'Lainnya'
  emergencyPhone: "",
  bloodType: "A+", // sesuai union BloodType

  medicalHistory: "",
  allergies: "",
  address: "",
  city: "",
  province: "",
  postalCode: "",
  category: "5K",
  idNumber: "",
  estimatedTime: ""
};