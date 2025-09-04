// lib/types/community-registration.ts
import {
  BloodType,
  EmergencyRelation,
  Gender,
  JerseySize,
  Nationality
} from "./registration";

// Fixed pricing constants (remove from multiple places)
export const COMMUNITY_PRICING = {
  "5K": {
    individual: 180000, // For reference/display only
    community: 171000,  // Actual price
    jerseyAddOn: 20000
  },
  "10K": {
    individual: 230000, // For reference/display only  
    community: 218000,  // Actual price
    jerseyAddOn: 20000
  }
} as const;

export const JERSEY_ADDON = 20000;
export const MIN_MEMBERS = 5;
export const MAX_MEMBERS = 50;

/** Single community member data */
export interface CommunityMember {
  // Personal Info
  fullName: string;
  gender: Gender;
  dateOfBirth: string;
  identityNumber: string; // Use only this, not idNumber
  nationality: Nationality;

  // Contact
  whatsapp: string;
  email: string;

  // Race Info
  bibName: string;
  jerseySize: JerseySize;
  estimatedTime?: string;

  // Emergency Contact
  emergencyName: string;
  emergencyRelation: EmergencyRelation;
  emergencyPhone: string;
  bloodType: BloodType;

  // Optional fields
  medicalHistory?: string;
  allergies?: string;
  medications?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
}

/** Price calculation result */
export interface CommunityPriceCalculation {
  basePrice: number;
  baseMembers: number;
  freeMembers: number;
  totalMembers: number;
  subtotal: number;
  jerseyAdjustments: {
    memberName: string;
    size: JerseySize;
    adjustment: number;
  }[];
  totalJerseyAdjustment: number;
  jerseyAddOnTotal: number;
  totalBase: number;
  totalPrice: number;
  pricePerPerson: number;
  savings: number;
}

/** Main community registration data */
export interface CommunityRegistrationData {
  // Community Info
  communityName: string;
  picName: string;
  picWhatsapp: string;
  picEmail: string;
  picPosition?: string;

  // Address
  address: string;
  city: string;
  province: string;
  postalCode?: string;

  // Race Info
  category: "5K" | "10K"; // Not generic Category type

  // Members
  members: CommunityMember[];

  // Agreements
  agreeToTerms: boolean;
  agreeToHealth: boolean;
  agreeToRefund: boolean;
  agreeToData: boolean;

  // Computed/Response fields (not for input)
  totalMembers?: number;
  registrationCode?: string;
  priceCalculation?: CommunityPriceCalculation;
}

/** Empty member template for controlled forms */
export const emptyMember: CommunityMember = {
  fullName: "",
  gender: "L",
  dateOfBirth: "",
  identityNumber: "",
  nationality: "WNI",
  whatsapp: "",
  email: "",
  bibName: "",
  jerseySize: "M",
  estimatedTime: "",
  emergencyName: "",
  emergencyRelation: "Keluarga",
  emergencyPhone: "",
  bloodType: "A+",
  medicalHistory: "",
  allergies: "",
  medications: "",
  address: "",
  city: "",
  province: "",
  postalCode: ""
};

/** Community registration API response */
export interface CommunityRegistrationResponse {
  success: boolean;
  data: {
    registrationCode: string;
    communityName: string;
    totalMembers: number;
    totalPrice: number;
    paymentCode: string;
    paymentUrl: string;
    members: Array<{
      name: string;
      bibNumber: string;
      registrationCode: string;
    }>;
  };
}

/** Helper function with single implementation */
export function calculateCommunityPrice(
  category: "5K" | "10K",
  members: CommunityMember[]
): CommunityPriceCalculation {
  const pricing = COMMUNITY_PRICING[category];
  const basePrice = pricing.community;
  const totalMembers = members.length;
  const baseMembers = totalMembers; // No free members per requirement
  const freeMembers = 0;

  const totalBase = basePrice * totalMembers;

  // Calculate jersey adjustments
  const jerseyAdjustments = members.map((member, index) => {
    const needsAddOn = member.jerseySize === "XXL" || member.jerseySize === "XXXL";
    return {
      memberName: member.fullName || `Member ${index + 1}`,
      size: member.jerseySize,
      adjustment: needsAddOn ? pricing.jerseyAddOn : 0
    };
  });

  const totalJerseyAdjustment = jerseyAdjustments.reduce(
    (sum, item) => sum + item.adjustment,
    0
  );

  const subtotal = totalBase;
  const totalPrice = subtotal + totalJerseyAdjustment;
  const pricePerPerson = totalMembers > 0 ? Math.ceil(totalPrice / totalMembers) : 0;

  // Calculate theoretical savings (for display purposes)
  const normalPrice = pricing.individual * totalMembers;
  const savings = normalPrice - totalBase; // Excluding jersey addon from savings

  return {
    basePrice,
    baseMembers,
    freeMembers,
    totalMembers,
    subtotal,
    jerseyAdjustments,
    totalJerseyAdjustment,
    jerseyAddOnTotal: totalJerseyAdjustment,
    totalBase,
    totalPrice,
    pricePerPerson,
    savings
  };
}