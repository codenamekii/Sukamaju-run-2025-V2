// app/registration/community/types/price.ts

export interface JerseyAdjustment {
  memberName: string;
  size: string;
  adjustment: number;
}

export interface CommunityPriceCalculationResult {
  basePrice: number;
  baseMembers: number;
  freeMembers: number;
  totalMembers: number;
  subtotal: number;
  jerseyAdjustments: JerseyAdjustment[];
  totalJerseyAdjustment: number;
  totalPrice: number;
  savings: number;
  pricePerPerson: number;
  // Legacy fields for backward compatibility
  jerseyAddOnTotal: number;
  totalBase: number;
}